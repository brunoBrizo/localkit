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

The exported `tools` array is the registry. Its order is the sidebar order, and the first entry is the tool selected at startup. Ids are permanent: the planned settings store (Sprint 4) will save the last-used id.

Tool contract v2 (planned, Sprint 3) adds metadata (`description`, `keywords`, `example`, `category`), an options schema, an optional second input, async `run`, structured output, and errors with a `code` and a message the tool owns. It also adds one input normalization policy for byte-order marks, whitespace-only input and lone surrogates. See the [roadmap](../ROADMAP.md#sprint-3-tool-contract-v2-and-off-thread-runner-moved-from-sprint-4).

## Error handling

`runTool(tool, input)` wraps `tool.run` in `try`/`catch` and returns either `{ output }` or `{ output: '', error }`. It never throws. Anything thrown that isn't an `Error` is converted with `String()`.

The UI shows the error text in the output box, in the danger color. Messages come from two places:

- **The platform:** `JSON.parse` syntax errors, `URI malformed` from the URL functions, the UTF-8 decoder's error for non-text Base64.
- **The tool itself:** the timestamp tool throws `Not a timestamp or date`.

Platform messages depend on the engine. Chromium's are readable, but WebKit, which runs the desktop app on macOS and Linux, gives terse messages such as `URI error` and `Type error`, and its JSON errors have no position. Tool-owned messages for every error are planned in contract v2 (Sprint 3).

## UI

[`src/main.tsx`](../src/main.tsx) has one component, `App`:

- State: `toolId` (starts as the first tool) and `input`.
- Output is computed on every render: `runTool(tool, input)` when the input isn't empty, otherwise nothing. There are no effects and no memoization. Switching tools re-runs the current input immediately. Generators produce new values on every render, so UUIDs change on each keystroke or tool switch.
- Sidebar: `<nav aria-label="Tools">` with one `<button aria-pressed>` per tool.
- Input: a `<textarea>` with autofocus and spellcheck off. Output: a read-only `<textarea>`, with the `error` class when there's an error.

[`src/styles.css`](../src/styles.css) uses CSS variables for colors, switches to dark mode with `prefers-color-scheme`, and lays out a 220 px sidebar next to the editor. Below 640 px the tool buttons wrap above the editor.

Tools run on the main thread, on every change. That is fine for small input; very large input blocks typing (see [known limitations](#known-limitations)). Sprint 3 moves output out of render and into a Web Worker.

## Build-time CSP

[`vite.config.ts`](../vite.config.ts) exports the policy as `CSP` and registers a small inline plugin, `paste-safe-csp`:

- `apply: 'build'`: it runs only for `vite build`, so for `npm run build`, for what `npm run preview` serves, and for the files the desktop app bundles.
- `transformIndexHtml` adds `<meta http-equiv="Content-Security-Policy">` with `injectTo: 'head-prepend'`, so the policy comes before any script.

A `<meta>` policy works on any static host and inside a desktop webview, with no server headers to configure. It can't set `frame-ancestors`, so the planned per-tool web pages (Sprint 14) will send the policy as a real HTTP header.

**Why dev differs:** Vite's dev server injects an inline React Fast Refresh script and opens a WebSocket for hot reload, and the policy would block both. Check privacy against the built app, never against the dev server. [PRIVACY.md](PRIVACY.md) explains what the policy blocks, what it doesn't cover, and how to verify it.

## Desktop app

[`src-tauri/`](../src-tauri) wraps the same `dist/` build in Tauri 2. Tauri uses each OS's own webview: WebKit (WKWebView) on macOS, WebView2 (Chromium) on Windows and WebKitGTK on Linux. The no-network guarantee carries over like this:

- **Same policy, twice.** The bundled `index.html` carries the `<meta>` CSP, and [`tauri.conf.json`](../src-tauri/tauri.conf.json) sets the identical string in `app.security.csp`, which Tauri applies to every bundled page. [`src/csp.test.ts`](../src/csp.test.ts) fails if the two ever differ. The app makes no IPC calls yet, so the policy needs no IPC origin. Tauri's IPC can fall back to `postMessage` when the policy blocks its custom protocol, so a Sprint 2 spike checks whether commands work under `connect-src 'none'`. If they don't, the desktop policy alone gets Tauri's IPC origin, as an explicit allowlisted difference that `csp.test.ts` checks directive by directive. The web policy never gets it, because in a browser `http://ipc.localhost` would point at the machine's own loopback.
- **No Tauri APIs in the page.** There are no capability files and no commands, so the webview can't call into Rust at all. `withGlobalTauri` stays off.
- **No network on the Rust side.** The CSP only governs the webview. The only Rust dependency is `tauri` itself, with no third-party plugins; the navigation guard is a small inline plugin. [`scripts/check-no-network.sh`](../scripts/check-no-network.sh) (`npm run check:no-network`) lists the runtime crates for all six desktop targets and fails if an HTTP client, TLS stack or network plugin shows up. Tauri pulls `reqwest` and `rustls` for Android and iOS only, which LocalKit doesn't build. CI runs the check on every push. The check has known gaps, listed under [known limitations](#known-limitations), which Sprint 2 closes.
- **No navigation.** A small plugin in [`src-tauri/src/main.rs`](../src-tauri/src/main.rs) refuses every navigation whose URL isn't the app's own: `tauri://localhost` on macOS and Linux, `http(s)://tauri.localhost` on Windows, and the Vite dev server only in debug builds. New windows (`window.open`) are refused because LocalKit sets no new-window handler, which is the webview library's default on all three OSes.
- **No in-app updates.** "Check for updates" (Sprint 5) will be a Rust command with a fixed download URL and no parameters, which opens the download page in the default browser.

`npm run tauri dev` loads the Vite dev server, so like `npm run dev` it runs without the bundled `<meta>` CSP. Check privacy against `npm run tauri build`.

### Planned native features

Native features land as Rust commands, never as Tauri permissions granted to the page. Commands take validated ids or values, never URLs.

| Feature | Sprint | Design |
|---|---|---|
| Settings store | 4 | Rust writes one versioned file in the OS app-config folder with only the keys allowlisted in [PRIVACY.md](PRIVACY.md#what-will-be-saved-planned). Unknown keys are dropped when it loads. |
| Global shortcut | 4 | Registered from Rust. One command sets the shortcut after validating it. |
| Clipboard detection | 5 | Rust reads the clipboard when the window gains focus, capped at 1 MB, and sends only the matching tool id to the page. |
| Check for updates | 5 | A command with a hard-coded URL and no parameters. No `opener` or `shell` plugin. |
| Save output as a file | 7 | Only on "Save as": a command opens the OS save dialog and writes the output. The page gets no file-system permission. |
| License keys | 12 | Rust verifies Ed25519-signed keys offline and tells the page only the tier, the seats and the updates-until date. |

## Testing

| Layer | Tool | Where | Runs |
|---|---|---|---|
| Tool unit tests | Vitest | [`src/tools.test.ts`](../src/tools.test.ts) | `npm test` |
| CSP parity (web and desktop use the same policy) | Vitest | [`src/csp.test.ts`](../src/csp.test.ts) | `npm test` |
| Navigation guard unit tests | `cargo test` | [`src-tauri/src/main.rs`](../src-tauri/src/main.rs) | `cargo test --manifest-path src-tauri/Cargo.toml` |
| Web end-to-end, Chromium and WebKit | Playwright | [`e2e/web/`](../e2e/web) | `npm run test:e2e` |
| Desktop end-to-end, real app binary | `node:test` + tauri-driver | [`e2e/desktop/`](../e2e/desktop) | `npm run test:desktop` (Linux) |
| No network-capable dependencies | shell + `cargo tree` | [`scripts/check-no-network.sh`](../scripts/check-no-network.sh) | `npm run check:no-network` |

- **Tool tests** call tools by id through `runTool`, the same path the UI uses. Each tool has a known input with an expected output, and encode/decode pairs have a round trip. Some cases are still missing, such as invalid input for JSON minify and UUID, URL-safe and line-wrapped Base64, whitespace, byte-order marks and lone surrogates; Sprint 2 adds them. A registry test checks that ids are unique. Vitest runs in Node, with no DOM, so engine differences (see [known limitations](#known-limitations)) aren't caught yet.
- **Web e2e** runs against the production build served by `vite preview`, so the CSP is active. It checks the CSP tag, the tool list, typing and errors, tool switching and generators. A network test mocks `https://example.com` and checks that a `fetch` and a remote image are both refused before any request is made. Run against the dev server, which has no CSP, that test fails, so it really tests the policy. WebKit is included because it's the engine behind the desktop app on macOS and Linux.
- **Desktop e2e** drives the real release binary through [tauri-driver](https://v2.tauri.app/develop/tests/webdriver/) with a few lines of plain W3C WebDriver calls (no client library). It checks that the app opens with every tool, formats typed JSON, blocks a `fetch`, and refuses to navigate away or open another window. tauri-driver supports Linux and Windows only, so it runs on Linux in CI.
- **CI** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)): the `test` job runs unit tests, the build, the no-network check and the web e2e. The `desktop` job builds the app on macOS, Windows and Linux, runs the Rust tests, uploads the installers as artifacts and, on Linux, runs the desktop e2e. Branch protection on `main` requires only `test` today; Sprint 2 makes the desktop jobs required too.

Planned test layers: tool tests in Chromium and WebKit, and `cargo deny` (Sprint 2); fast-check property tests (Sprint 3); accessibility-tree snapshots and light and dark screenshots (Sprint 4); latency and bundle-size budgets (Sprint 9); fuzzing of the license-key decoder (Sprint 12).

## Known limitations

| Area | Limitation | Plan |
|---|---|---|
| JSON format and minify | They use `JSON.parse` and `JSON.stringify`, so they change data: integers above 2^53 lose precision (`12345678901234567890` becomes `12345678901234567000`), numbers too large for a double become `null` (`1e400`), duplicate keys collapse to the last one, and numbers are rewritten (`1.0` becomes `1`, `-0` becomes `0`). A leading byte-order mark is a syntax error. | Overflow rejected, Sprint 2; lossless JSON, Sprint 3 |
| Timestamp convert | Numbers with an absolute value below 1e11 are read as seconds, so millisecond values before 1973-03-03 are misread (`86400000` gives 1972-09-27). Microsecond values give a far-future date (`1793707200000000` gives year 58810) and nanosecond values an error. `Number()` also accepts `0x10` and `1e3`. Non-numeric input goes to the JS `Date` parser, which differs by engine: `2026-02-30` becomes 2 March in Chromium and is rejected in WebKit. Date-time strings without an offset are local time; date-only ISO strings are UTC. | Explicit ISO 8601 parsing and µs/ns detection, Sprint 2; seconds or milliseconds option, Sprint 3 |
| Base64 | Decode only produces UTF-8 text; binary data fails with the decoder's error. Decode drops a leading byte-order mark. Encode replaces a lone surrogate with U+FFFD, and only outputs the standard alphabet with padding. | BOM and surrogate fixes, Sprint 2; options, Sprint 3 |
| URL encode and decode | Encode throws `URI malformed` on a lone surrogate. Decode leaves `+` as `+`: it decodes URL components, not form data. A pasted trailing newline is encoded as `%0A`. | Surrogate fix, Sprint 2; options, Sprint 3 |
| UUID v4 | The UI doesn't run a tool on empty input, so you have to type a count. The count uses `parseInt`, so `1e3` and `1,000` give 1, `5abc` gives 5, and values above 1000 are capped without a note. | Strict count, Sprint 2; Regenerate button, Sprint 3 |
| Error messages | Platform messages differ by engine, and WebKit's are terse (see [error handling](#error-handling)). Errors are shown by color only and replace the last good output. | Sprint 3 |
| Tool contract | One synchronous text input. Planned tools need options (case style, direction), a second input (diff, regex), async work (WebCrypto hashing) and a worker for slow work (regex, diff, large JSON). | Tool contract v2, Sprint 3 |
| Performance | Tools run in render, on the main thread, on every change. With 3.6 MB of JSON each keystroke takes about 320 ms in Chromium and 430 ms in WebKit. | Worker, Sprint 3; 10 MB target, Sprint 9 |
| Accessibility | The selected tool in dark mode has 2.74:1 contrast, below WCAG AA, and field borders are below 3:1. There's no copy button. | Sprint 3 |
| CSP | `form-action`, `base-uri` and `object-src` aren't set. There's no current path out because the app has no forms, links or plugins. | Sprint 2 |
| No-network check | `check-no-network.sh` reports success when `cargo` is missing or `cargo tree` fails. It matches exact crate names only, so local HTTP servers, raw sockets and URL-opening plugins wouldn't be caught. It doesn't scan capability files. The crate count includes duplicates. | Fail closed and `cargo deny`, Sprint 2 |
| CI | Only the `test` job is required to merge, so the Rust tests and desktop e2e can fail on a merged PR. | Sprint 2 |
| Windows installer | By default the installer downloads the WebView2 runtime from Microsoft if it's missing. This happens at install time, not in the app. | Offline-installer MSI for enterprises, Sprint 13 |
| Desktop tests | Desktop e2e runs only on Linux (WebKitGTK). The macOS and Windows apps are built and unit-tested in CI but not driven end to end; web e2e in WebKit covers the macOS engine. | Revisit when signing lands, Sprint 5 |

## Key decisions

| Decision | Why |
|---|---|
| Tools are plain functions in one file | Easy to test, no UI knowledge, easy to audit for network or storage use. Split into one module per tool in Sprint 3. |
| CSP in a `<meta>` tag added at build time | Works on any static host and inside Tauri, with no server headers. |
| No CSP in dev | Vite's hot reload needs an inline script and a WebSocket. |
| React and Vite, no UI library | Few runtime dependencies to audit, small bundle, fast startup. |
| Tauri 2 for the desktop app | Uses the system webview, which keeps downloads small, keeps the UI and tools in TypeScript, and has explicit, deny-by-default permissions. Electron was the fallback: same code, but a bundled Chromium, much larger downloads, and Node.js in the main process with network access by default. |
| Desktop app with no capabilities or third-party plugins (Sprint 1) | Nothing to audit on the Rust side yet. Later sprints add Rust commands, not page permissions (see [planned native features](#planned-native-features)). |
| Desktop e2e without a WebDriver client library | W3C WebDriver is plain HTTP and JSON; a few lines of `fetch` replace a large dependency tree. |
| No in-app updater | An update check is a network request. "Check for updates" opens the browser instead. |
| The macOS sandbox isn't used as proof of no network | WKWebView needs the outgoing-network entitlement even for bundled content, and that entitlement opens the network for the whole app. Flatpak and Snap builds with no network permission (Sprint 13) are the OS-level proof. |
| CodeMirror 6, not Monaco, for large output (Sprint 9) | Monaco is a multi-megabyte bundle with several workers. |
| No WASM | Loading WASM needs `'wasm-unsafe-eval'` in the CSP. |
| Command-line tool built with `deno compile` (v1.x) | The tool code stays in TypeScript, and the binary is built without network or write permission, which a test can check. |
| No `single-instance` or deep links yet | `single-instance` opens a local socket that accepts arguments from any local process. Deep links, if added, will carry only a tool id, never input. |
