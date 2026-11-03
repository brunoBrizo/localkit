# Architecture

LocalKit is a single-page React app. All logic lives in one list of tools; the UI is a thin shell around it.

```text
index.html ──► src/main.tsx (UI) ──► src/tools.ts (tools + runTool)
                    └── src/styles.css
vite.config.ts ── adds the CSP to index.html at build time
```

Stack: Vite 7, React 19, TypeScript 5 (strict), Vitest 3, Node.js 24. Runtime dependencies: `react` and `react-dom` only.

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

The exported `tools` array is the registry. Its order is the sidebar order, and the first entry is the tool selected at startup. Ids are permanent: the planned desktop app will save the last-used id.

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

- `apply: 'build'`: it runs only for `vite build`, so for `npm run build` and what `npm run preview` serves.
- `transformIndexHtml` adds `<meta http-equiv="Content-Security-Policy">` with `injectTo: 'head-prepend'`, so the policy comes before any script.

A `<meta>` policy works on any static host and inside a desktop webview, with no server headers to configure.

**Why dev differs:** Vite's dev server injects an inline React Fast Refresh script and opens a WebSocket for hot reload, and the policy would block both. Check privacy against the built app, never against the dev server. [PRIVACY.md](PRIVACY.md) explains what the policy blocks, what it doesn't cover, and how to verify it.

## Desktop app (planned, v0.2)

The desktop app will wrap the same `dist/` build in Tauri 2. The no-network guarantee carries over like this:

- **Same policy.** The webview loads the bundled `dist/`, so the `<meta>` CSP comes with it. The same policy is also set in Tauri's own config (`app.security.csp`). Tauri's IPC uses a local custom protocol, so `connect-src` will likely need Tauri's in-process IPC origin. Sprint 1 confirms the exact policy; no network origin will be added.
- **No network on the Rust side.** CSP only governs the webview. No network-capable Tauri plugins (HTTP, updater, WebSocket) and no HTTP crates. A CI step fails the build if one appears in the dependency tree.
- **Least permission.** Tauri capabilities grant only what features need: window, global shortcut, clipboard read and settings storage.
- **No navigation.** Navigation to any URL outside the app is refused.
- **No in-app updates.** "Check for updates" opens the download page in the default browser.

## Testing

- [Vitest](https://vitest.dev) in the default Node environment; there is no DOM in tests. All tests are in [`src/tools.test.ts`](../src/tools.test.ts).
- Tests call tools by id through `runTool`, the same path the UI uses, so they check both `output` and `error`.
- Every tool covers a known input with an exact expected output, invalid input producing an error, a round trip for encode/decode pairs, and relevant edge cases (non-ASCII text, missing Base64 padding, the UUID cap of 1000).
- A registry test checks that tool ids are unique.
- CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) runs `npm ci`, `npm test` and `npm run build` on Node 24 for every push and pull request.
- No UI tests yet. Planned for Sprint 4: property-based round-trip tests with fast-check.

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

## Key decisions

| Decision | Why |
|---|---|
| Tools are plain functions in one file | Easy to test, no UI knowledge, easy to audit for network or storage use. Split into one module per tool before there are 15 tools (Sprint 4). |
| CSP in a `<meta>` tag added at build time | Works on any static host and inside Tauri, with no server headers. |
| No CSP in dev | Vite's hot reload needs an inline script and a WebSocket. |
| React and Vite, no UI library | Two runtime dependencies to audit, small bundle, fast startup. |
| Tauri 2 for the desktop app (planned) | Uses the system webview, which keeps downloads small, and has explicit, deny-by-default permissions. |
| No in-app updater | An update check is a network request. "Check for updates" opens the browser instead. |
