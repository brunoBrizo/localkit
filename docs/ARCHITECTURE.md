# Architecture

LocalKit is a single-page React app, wrapped in a Tauri 2 desktop shell. All logic lives in one list of tools; the UI is a thin shell around it, and the desktop app is a thin shell around the UI.

```text
index.html ──► src/main.tsx (UI) ──► src/tools.ts (tools + runTool)
                    └── src/styles.css
vite.config.ts ── adds the CSP to index.html at build time

src-tauri/ ── desktop app: loads the built dist/ in a native window
  ├── tauri.conf.json   window, bundle and the same CSP
  └── src/main.rs       navigation guard (+ its unit tests)
```

Stack: Vite 7, React 19, TypeScript 5 (strict), Vitest 5, Node.js 24, Tauri 2 (Rust). Runtime dependencies: `react` and `react-dom` in the web app, and `tauri` in the desktop app.

## The tool contract

```ts
export type Tool = {
  id: string;   // stable kebab-case key, e.g. "json-format"
  name: string; // sidebar label
  run: (input: string) => string;
};
```

- `run` is synchronous: text in, text out.
- It must not touch the network, storage or the DOM, and must not keep state between calls.
- It is deterministic, except for generators (UUID v4 uses `crypto.randomUUID()`).
- On bad input it throws an `Error` with a short message.

The exported `tools` array is the registry. Its order is the sidebar order, and the first entry is the tool selected at startup. Ids are permanent: the planned settings storage (Sprint 2) will save the last-used id.

## Error handling

`runTool(tool, input)` wraps `tool.run` in `try`/`catch` and returns either `{ output }` or `{ output: '', error }`. It never throws. Anything thrown that isn't an `Error` is converted with `String()`.

The UI shows the error text in the output box, in the danger color. Messages come from two places:

- **The platform**, when its message is clear enough: `JSON.parse` syntax errors, `URI malformed` from the URL functions, the UTF-8 decoder's error for non-text Base64.
- **The tool itself**, when it isn't: the timestamp tool throws `Not a timestamp or date`.

## UI

[`src/main.tsx`](../src/main.tsx) has one component, `App`:

- State: `toolId` (starts as the first tool) and `input`.
- Output is computed on every render: `runTool(tool, input)` when the input isn't empty, otherwise nothing. There are no effects and no memoization. Switching tools re-runs the current input immediately. Generators produce new values on every render, so UUIDs change on each keystroke or tool switch.
- Sidebar: `<nav aria-label="Tools">` with one `<button aria-pressed>` per tool.
- Input: a `<textarea>` with autofocus and spellcheck off. Output: a read-only `<textarea>`, with the `error` class when there's an error.

[`src/styles.css`](../src/styles.css) uses CSS variables for colors, switches to dark mode with `prefers-color-scheme`, and lays out a 220 px sidebar next to the editor. Below 640 px the tool buttons wrap above the editor.

Tools run on the main thread, on every change. That is fine for small input; very large input blocks typing (see [known limitations](#known-limitations)).

## Build-time CSP

[`vite.config.ts`](../vite.config.ts) exports the policy as `CSP` and registers a small inline plugin, `paste-safe-csp`:

- `apply: 'build'`: it runs only for `vite build`, so for `npm run build`, for what `npm run preview` serves, and for the files the desktop app bundles.
- `transformIndexHtml` adds `<meta http-equiv="Content-Security-Policy">` with `injectTo: 'head-prepend'`, so the policy comes before any script.

A `<meta>` policy works on any static host and inside a desktop webview, with no server headers to configure.

**Why dev differs:** Vite's dev server injects an inline React Fast Refresh script and opens a WebSocket for hot reload, and the policy would block both. Check privacy against the built app, never against the dev server. [PRIVACY.md](PRIVACY.md) explains what the policy blocks, what it doesn't cover, and how to verify it.

## Desktop app

[`src-tauri/`](../src-tauri) wraps the same `dist/` build in Tauri 2. Tauri uses each OS's own webview: WebKit (WKWebView) on macOS, WebView2 (Chromium) on Windows and WebKitGTK on Linux. The no-network guarantee carries over like this:

- **Same policy, twice.** The bundled `index.html` carries the `<meta>` CSP, and [`tauri.conf.json`](../src-tauri/tauri.conf.json) sets the identical string in `app.security.csp`, which Tauri applies to every bundled page. [`src/csp.test.ts`](../src/csp.test.ts) fails if the two ever differ. The app makes no IPC calls yet, so the policy needs no IPC origin. When Sprint 2 adds commands (global shortcut, settings), both policies will need Tauri's in-process IPC origin and nothing else.
- **No Tauri APIs in the page.** There are no capability files and no commands, so the webview can't call into Rust at all. `withGlobalTauri` stays off.
- **No network on the Rust side.** The CSP only governs the webview. The only Rust dependency is `tauri` itself, with no plugins. [`scripts/check-no-network.sh`](../scripts/check-no-network.sh) (`npm run check:no-network`) lists the runtime crates for all six desktop targets and fails if an HTTP client, TLS stack or network plugin shows up. Tauri pulls `reqwest` and `rustls` for Android and iOS only, which LocalKit doesn't build. CI runs the check on every push.
- **No navigation.** A small plugin in [`src-tauri/src/main.rs`](../src-tauri/src/main.rs) refuses every navigation whose URL isn't the app's own: `tauri://localhost` on macOS and Linux, `http(s)://tauri.localhost` on Windows, and the Vite dev server only in debug builds.
- **No in-app updates.** "Check for updates" (Sprint 3) will open the download page in the default browser.

`npm run tauri dev` loads the Vite dev server, so like `npm run dev` it runs without the bundled `<meta>` CSP. Check privacy against `npm run tauri build`.

## Testing

| Layer | Tool | Where | Runs |
|---|---|---|---|
| Tool unit tests | Vitest | [`src/tools.test.ts`](../src/tools.test.ts) | `npm test` |
| CSP parity (web and desktop use the same policy) | Vitest | [`src/csp.test.ts`](../src/csp.test.ts) | `npm test` |
| Navigation guard unit tests | `cargo test` | [`src-tauri/src/main.rs`](../src-tauri/src/main.rs) | `cargo test --manifest-path src-tauri/Cargo.toml` |
| Web end-to-end, Chromium and WebKit | Playwright | [`e2e/web/`](../e2e/web) | `npm run test:e2e` |
| Desktop end-to-end, real app binary | `node:test` + tauri-driver | [`e2e/desktop/`](../e2e/desktop) | `npm run test:desktop` (Linux) |
| No network-capable dependencies | shell + `cargo tree` | [`scripts/check-no-network.sh`](../scripts/check-no-network.sh) | `npm run check:no-network` |

- **Tool tests** call tools by id through `runTool`, the same path the UI uses. Every tool covers a known input with an exact expected output, invalid input, a round trip for encode/decode pairs, and relevant edge cases. A registry test checks that ids are unique. Vitest runs in Node, with no DOM.
- **Web e2e** runs against the production build served by `vite preview`, so the CSP is active. It checks the CSP tag, the tool list, typing and errors, tool switching and generators. A network test mocks `https://example.com` and checks that a `fetch` and a remote image are both refused before any request is made. Run against the dev server, which has no CSP, that test fails, so it really tests the policy. WebKit is included because it's the engine behind the desktop app on macOS and Linux.
- **Desktop e2e** drives the real release binary through [tauri-driver](https://v2.tauri.app/develop/tests/webdriver/) with a few lines of plain W3C WebDriver calls (no client library). It checks that the app opens with every tool, formats typed JSON, blocks a `fetch`, and refuses to navigate away or open another window. tauri-driver supports Linux and Windows only, so it runs on Linux in CI.
- **CI** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)): the `test` job (required by branch protection on `main`) runs unit tests, the build, the no-network check and the web e2e. The `desktop` job builds the app on macOS, Windows and Linux, runs the Rust tests, uploads the installers as artifacts and, on Linux, runs the desktop e2e.

## Known limitations

| Area | Limitation | Plan |
|---|---|---|
| JSON format and minify | They use `JSON.parse` and `JSON.stringify`, so they change data: integers above 2^53 lose precision (`12345678901234567890` becomes `12345678901234567000`), duplicate keys collapse to the last one, and numbers are rewritten (`1.0` becomes `1`, `-0` becomes `0`). | Lossless JSON, Sprint 4 |
| Timestamp convert | Numbers with an absolute value below 1e11 are read as seconds, so millisecond values before 1973-03-03 are misread (`86400000` gives 1972-09-27). Non-numeric input goes to the JS `Date` parser, which accepts more than ISO 8601. Date-time strings without an offset are local time; date-only ISO strings are UTC. | Seconds or milliseconds option in tool contract v2, Sprint 4 |
| Base64 | Decode only produces UTF-8 text; binary data fails with the decoder's error. Encode only outputs the standard alphabet with padding. | Options in tool contract v2, Sprint 4 |
| URL decode | `+` stays `+`. It decodes URL components, not form data. | Options in tool contract v2, Sprint 4 |
| UUID v4 | The UI doesn't run a tool on empty input, so you have to type a count. `0` or text gives 1. | Tool contract v2, Sprint 4 |
| Tool contract | One synchronous text input. Planned tools need options (case style, direction), a second input (diff, regex), async work (WebCrypto hashing) and a worker for slow work (regex, diff, large JSON). | Tool contract v2, Sprint 4 |
| Performance | Tools run on the main thread on every change, so very large input blocks typing. | Worker and 10 MB target, Sprints 4 and 8 |
| CSP | `form-action` and `base-uri` aren't set. There's no current path out because the app has no forms or links. | Sprint 4 |
| Desktop tests | Desktop e2e runs only on Linux (WebKitGTK). The macOS and Windows apps are built and unit-tested in CI but not driven end to end; web e2e in WebKit covers the macOS engine. | Revisit when signing lands, Sprint 3 |

## Key decisions

| Decision | Why |
|---|---|
| Tools are plain functions in one file | Easy to test, no UI knowledge, easy to audit for network or storage use. Split into one module per tool before there are 15 tools (Sprint 4). |
| CSP in a `<meta>` tag added at build time | Works on any static host and inside Tauri, with no server headers. |
| No CSP in dev | Vite's hot reload needs an inline script and a WebSocket. |
| React and Vite, no UI library | Few runtime dependencies to audit, small bundle, fast startup. |
| Tauri 2 for the desktop app | Uses the system webview, which keeps downloads small, keeps the UI and tools in TypeScript, and has explicit, deny-by-default permissions. Electron was the fallback: same code, but a bundled Chromium, much larger downloads, and Node.js in the main process with network access by default. |
| Desktop app with no capabilities or plugins (Sprint 1) | Nothing to audit on the Rust side yet. Sprint 2 adds only the plugins it needs. |
| Desktop e2e without a WebDriver client library | W3C WebDriver is plain HTTP and JSON; a few lines of `fetch` replace a large dependency tree. |
| No in-app updater | An update check is a network request. "Check for updates" opens the browser instead. |
