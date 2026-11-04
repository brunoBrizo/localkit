# Privacy

LocalKit is paste-safe: what you paste never leaves your machine and is never saved. This page lists exactly what the app does with data, how that is enforced, and how anyone can check it.

## What the app does with your input

1. Keeps it in memory (React state) while the page is open.
2. Runs the selected tool on it, in the same page, every time the input changes.
3. Shows the result in the output box.

That is all. Reloading the page or closing the app discards the input and the output.

## What the app never does

- Send your input, or anything else, over the network.
- Save your input to disk, `localStorage`, `sessionStorage`, IndexedDB or cookies.
- Use accounts, telemetry, analytics, crash reporting, cloud sync or sharing.
- Call AI or machine-learning services, or run models.
- Collect, keep or look for other people's personal data. Tools only transform the text you paste.

## How "no network" is enforced

The production build (`npm run build`) puts a Content-Security-Policy `<meta>` tag first in the `<head>` of `dist/index.html`, before any script. The policy lives in [`vite.config.ts`](../vite.config.ts):

```text
default-src 'self'; connect-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'
```

| Directive | Effect |
|---|---|
| `connect-src 'none'` | Blocks `fetch`, `XMLHttpRequest`, WebSocket, EventSource and `navigator.sendBeacon` to every host, including the app's own. |
| `default-src 'self'` | Scripts, fonts, frames, workers and media load only from the app's own origin. |
| `img-src 'self' data:` | Images load only from the app or from inline `data:` URLs. No remote images, so no tracking pixels. |
| `style-src 'self' 'unsafe-inline'` | Styles load from the app; inline styles are allowed. Any `url()` inside a style is still limited by `img-src` and `default-src`. |

### What the policy does not cover

`form-action` and `base-uri` don't fall back to `default-src`, and CSP doesn't restrict navigation (links, `window.location`). In the web build, a script that set `window.location` to another site could still reach it. The app has no forms, no links and no code that navigates, and only the app's own scripts can run, so there is no way out today. Planned for Sprint 2: add `form-action 'none'; base-uri 'none'; object-src 'none'`. The desktop app already refuses navigation to any URL outside the app (see [below](#the-desktop-app)).

### Why the dev server is different

`npm run dev` does not apply the policy: Vite's dev server injects an inline script for React Fast Refresh and opens a WebSocket for hot reload, and this policy blocks both. The plugin is marked `apply: 'build'` for that reason. Always check privacy against the built app (`npm run build`, then `npm run preview`), never against the dev server.

## How to verify

1. Build and serve the production app:

   ```bash
   npm run build
   npm run preview
   ```

   Open <http://localhost:4173>.

2. Check that the policy is the first tag in the `<head>`:

   ```bash
   head -4 dist/index.html
   ```

3. Open DevTools → Network and use a few tools. Every request goes to `localhost:4173`: the page, its script and its stylesheet. Some browsers also ask for `/favicon.ico` on their own. Using the tools makes no requests at all.

4. In the DevTools console, run:

   ```js
   fetch('https://example.com', { mode: 'no-cors' })
   ```

   Without the policy, this would succeed with an opaque response. With it, it fails with `TypeError: Failed to fetch`, and Chrome's console logs: `Connecting to 'https://example.com/' violates the following Content Security Policy directive: "connect-src 'none'". The action has been blocked.`

5. Check the source for network and storage APIs. This prints nothing:

   ```bash
   grep -rnE "fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie" src
   ```

   The planned "prove it" self-test (Sprint 5) deliberately calls network APIs to show them blocked. It will live in one file, and this check will exclude only that file.

6. Run the automated checks, which do steps 2 and 4 in Chromium and WebKit:

   ```bash
   npm run test:e2e
   ```

## The desktop app

The desktop app (`src-tauri/`) shows the same built files in a native window, with the same rules:

- **Same policy.** `src-tauri/tauri.conf.json` sets the exact CSP string from `vite.config.ts`, and `npm test` fails if they ever differ.
- **No access to the system from the page.** The app grants the webview no Tauri permissions and has no commands, so page code can't call into the native side.
- **No network on the native side.** The only Rust dependency is `tauri` itself. `npm run check:no-network` fails if an HTTP client, a TLS stack or a network plugin enters the dependency tree for any desktop platform. Run it with `cargo` on your `PATH`: today it reports success when `cargo` is missing, and Sprint 2 makes it fail closed.
- **No navigation.** The window refuses to load any URL that isn't the app's own, and refuses to open other windows.

To check it yourself:

```bash
npm run check:no-network
cargo test --manifest-path src-tauri/Cargo.toml
```

On Linux, the desktop end-to-end tests also drive the real app and check that a `fetch` and a navigation to another site are both refused (`npm run test:desktop`, see [ARCHITECTURE.md](ARCHITECTURE.md#testing)). CI runs all of these on every push.

### Installing on Windows

By default the Windows installer downloads Microsoft's WebView2 runtime if the machine doesn't have it. That happens once, at install time, not in the app. A per-machine MSI that bundles WebView2 and downloads nothing is planned for Sprint 13.

### What the macOS sandbox can't prove

On macOS the system webview needs the outgoing-network entitlement even to show bundled pages, and that entitlement opens the network for the whole app. So a sandboxed macOS build can't serve as proof of no network; the CSP, the navigation guard and the dependency check are the guarantees there. On Linux, Flatpak and Snap builds with no network permission (planned, Sprint 13) will let the OS itself enforce it.

## What will be saved (planned)

The desktop app will save only settings, in one versioned file in the app's config folder on your machine (Sprint 4). Rust writes it, and only these keys are allowed:

| Key | What it holds |
|---|---|
| Schema version | The settings file format |
| Last tool | A tool id from the registry |
| Window geometry | Size and position |
| Global shortcut | The key combination |
| Clipboard detection | On or off |
| Language | An override of the OS language (v1.0) |
| License key | The key you entered (v1.0) |
| Favorites | A list of tool ids |

Any other key is dropped when the file loads, and deleting the file restores the defaults. Input and output are never saved. From v1.0, IT can force some of these settings through macOS managed preferences or a Windows policy registry key; the app reads those and never writes them.

## Privacy rules for planned features

| Feature | Milestone | Rule |
|---|---|---|
| Desktop shortcuts and settings | v0.2 | Rust commands with validated arguments, not Tauri permissions for the page. The desktop CSP may add Tauri's IPC origin only if the Sprint 2 spike shows commands need it, as an explicit difference checked by `src/csp.test.ts`. The web policy never changes for it. |
| Clipboard detection | v0.2 | Off by default. When you turn it on, Rust reads the clipboard when the window gains focus, capped at 1 MB, only to pick a tool. The page gets only the tool id; the content is pasted only when you choose to, and is treated like pasted input: memory only. |
| Updates | v0.2 | No in-app update check. "Check for updates" opens a fixed download URL in your default browser; LocalKit itself makes no request. |
| "Prove it" self-test | v0.2 | Tries a `fetch`, a WebSocket, an EventSource, a beacon and an image to a reserved `.invalid` host, and shows each one blocked. |
| Release verification | v0.2 | Every release has SHA-256 checksums, a build provenance attestation and SBOMs you can check. |
| Secret redaction and HAR sanitizing | v0.3 | Runs in memory only. It detects and masks credentials, never checks them with their provider, and does no personal-data detection. |
| File input | v0.3 | Reads only a file you pick or drop, in memory. |
| Save output as a file | v0.3 | Only when you choose "Save as", through the OS save dialog. The app never writes a file on its own, and the page gets no file-system access. |
| Licensing | v1.0 | License keys are checked offline against public keys built into the app. No activation server. Keys contain no personal name or email; a team key may carry an organization name the buyer chooses. Buying a license happens on the website, outside the app. |
| Flatpak and Snap | v1.0 | Built without network permission. Check with `flatpak info --show-permissions` and `snap connections`. |
| Command-line tool | v1.x | Built with no network or write permission; it reads stdin and files named on the command line, and writes stdout. |
