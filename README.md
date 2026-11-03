# LocalKit

An offline, paste-safe developer toolbox: format JSON, encode Base64 and URLs, convert timestamps and generate UUIDs in one fast app that never touches the network.

**Status:** early (v0.1.0). The web app and 8 tools work, and the desktop app (Tauri) builds for macOS, Windows and Linux. Signed installers, the command palette and the global shortcut are next; see the [roadmap](ROADMAP.md).

## Why paste-safe

Developers paste tokens, API payloads and logs into online formatters every day, and many companies forbid it. LocalKit keeps what you paste on your machine:

- **No network.** The production build stops the app from making any network request.
- **No storage.** Input lives in memory only. Reload or close the page and it's gone.
- **No accounts, telemetry, analytics or crash reporting.** There is nothing to opt out of.

### How it's enforced

`npm run build` puts this Content-Security-Policy first in the `<head>` of `dist/index.html` (see [`vite.config.ts`](vite.config.ts)):

```text
default-src 'self'; connect-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'
```

`connect-src 'none'` makes the browser refuse every `fetch`, XHR, WebSocket, EventSource and beacon, even to the app's own origin. `default-src 'self'` refuses scripts, fonts and frames from any other host. The dev server does not apply this policy; [docs/PRIVACY.md](docs/PRIVACY.md) explains why and lists what the policy does and doesn't cover.

### Check it yourself

1. Run `npm run build`, then `npm run preview`, and open <http://localhost:4173>.
2. Open DevTools → Network and use a few tools. Every request goes to `localhost:4173`.
3. In the DevTools console, run `fetch('https://example.com', { mode: 'no-cors' })`. Without the policy it would succeed; with it, it fails with a Content-Security-Policy error.

`npm run test:e2e` runs these checks automatically in Chromium and WebKit. The desktop app uses the same policy and adds its own guards; see [docs/PRIVACY.md](docs/PRIVACY.md#the-desktop-app).

## Tools

| Tool | What it does | Status |
|---|---|---|
| JSON format | Pretty-prints JSON with 2-space indentation | ✅ Available |
| JSON minify | Prints JSON on one line with no extra whitespace | ✅ Available |
| Base64 encode | UTF-8 text to standard Base64 | ✅ Available |
| Base64 decode | Standard or URL-safe Base64, padding optional, to UTF-8 text | ✅ Available |
| URL encode / decode | Percent-encodes or decodes a URL component | ✅ Available |
| Timestamp convert | Unix seconds, milliseconds or a date string to ISO 8601 (UTC), seconds and milliseconds | ✅ Available |
| UUID v4 | Generates 1 to 1000 random UUIDs; type how many | ✅ Available |
| Data formats: JSON ↔ YAML, JSON ↔ CSV, JSON to TypeScript, JSON path, query string ↔ JSON | | Planned (v0.3) |
| Text: diff, regex tester, case converter, line tools, HTML entities, lorem ipsum | | Planned (v0.3) |
| Converters: cron, number base, color, chmod, byte size, time zone | | Planned (v0.3) |
| Generators and viewers: hashes, JWT decoder, ULID and nanoid, QR code, SQL formatter, Markdown preview | | Planned (v0.3) |

Known limitations, such as JSON integers above 2^53 losing precision, are listed in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#known-limitations).

## Quick start

Requires Node.js 24 or later.

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>.

### Desktop app

The desktop app also needs Rust (stable, 1.90 or later) and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS: Xcode Command Line Tools on macOS, WebView2 and the MSVC build tools on Windows, and the WebKitGTK development packages on Linux.

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   # installs Rust
npm run tauri dev      # desktop window on top of the dev server, with hot reload
npm run tauri build    # release app and installers in src-tauri/target/release/bundle/
```

On macOS the build produces `LocalKit.app` and a `.dmg`. The builds aren't signed yet (Sprint 3), so macOS asks for confirmation the first time you open one.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload at <http://localhost:5173>. No CSP. |
| `npm test` | Runs the unit tests once (Vitest). |
| `npm run build` | Typechecks (`tsc --noEmit`), then builds to `dist/` with the CSP. |
| `npm run preview` | Serves `dist/` at <http://localhost:4173> so you can check the built app. |
| `npm run test:e2e` | Builds, serves and runs the end-to-end tests in Chromium and WebKit (Playwright). First run: `npx playwright install chromium webkit`. |
| `npm run tauri dev` | Runs the desktop app against the dev server. |
| `npm run tauri build` | Builds the desktop app and installers. |
| `npm run test:desktop` | Desktop end-to-end tests against the release build. Linux only; needs `tauri-driver` and `webkit2gtk-driver` (see [`e2e/desktop/app.test.ts`](e2e/desktop/app.test.ts)). |
| `npm run check:no-network` | Fails if a network-capable crate or plugin enters the desktop app. Needs Rust. |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Rust unit tests for the desktop app's navigation guard. |

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs on every push and pull request. The `test` job runs the unit tests, the build, the no-network check and the web end-to-end tests. The `desktop` job builds the app on macOS, Windows and Linux, uploads the installers as artifacts and, on Linux, runs the desktop end-to-end tests.

## Project structure

```text
.
├── index.html               HTML entry point; the build adds the CSP here
├── vite.config.ts           Vite config and the paste-safe CSP plugin
├── src/
│   ├── tools.ts             every tool, as a function from text to text
│   ├── tools.test.ts        unit tests for every tool
│   ├── csp.test.ts          web and desktop must use the same CSP
│   ├── main.tsx             the whole UI: tool sidebar, input and output
│   └── styles.css           light and dark theme, narrow-screen layout
├── src-tauri/               desktop app (Tauri 2)
│   ├── tauri.conf.json      window, installers and the same CSP
│   ├── src/main.rs          navigation guard and its unit tests
│   └── icons/               app icons, generated from icons/source.svg
├── e2e/
│   ├── web/                 Playwright tests against the production build
│   └── desktop/             WebDriver tests against the desktop app (Linux)
├── scripts/
│   └── check-no-network.sh  fails on network-capable Rust crates or plugins
├── playwright.config.ts     web e2e config (Chromium and WebKit)
├── docs/                    architecture, privacy, adding a tool, product notes
├── .github/workflows/ci.yml tests, builds and desktop installers on every push and PR
├── ROADMAP.md               milestones and sprints
├── CHANGELOG.md             release notes
├── CLAUDE.md                rules for AI coding sessions
└── LICENSE                  proprietary, all rights reserved
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md): the tool contract, UI, CSP, testing and known limitations.
- [Privacy](docs/PRIVACY.md): what happens to your data and how to verify it.
- [Adding a tool](docs/ADDING-A-TOOL.md): step-by-step guide with a worked example.
- [Product notes](docs/PRODUCT.md) (internal): users, positioning and pricing.
- [Roadmap](ROADMAP.md) and [changelog](CHANGELOG.md).

## Roadmap

- **v0.2 Desktop (in progress):** Tauri app for macOS, Windows and Linux (Sprint 1 done), then a command palette, global shortcut and signed builds.
- **v0.3 Tools:** 23 more tools on a richer tool contract.
- **v1.0 Paid launch:** one-time and team licenses, validated offline.

Each milestone is broken into two-week sprints with acceptance criteria in [ROADMAP.md](ROADMAP.md).

## Non-goals

- No network features: no cloud sync, accounts, sharing, telemetry, analytics or crash reporting.
- No AI or machine-learning features.
- No security tooling: nothing that cracks, brute-forces or bypasses anything. The planned JWT decoder only decodes.
- No stored input. Only settings will be saved (planned: last tool and window size).

## Ownership and license

Created and solely owned by Bruno Brizolara as a personal project. It contains no code from any employer, client or company. Proprietary, all rights reserved; see [LICENSE](LICENSE).
