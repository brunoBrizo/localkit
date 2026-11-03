# LocalKit

An offline, paste-safe developer toolbox: format JSON, encode Base64 and URLs, convert timestamps and generate UUIDs in one fast app that never touches the network.

**Status:** early (v0.1.0). The web shell and 8 tools work. The desktop app for macOS, Windows and Linux is planned; see the [roadmap](ROADMAP.md).

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
3. In the DevTools console, run `fetch('https://example.com')`. It fails with a Content-Security-Policy error.

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

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload at <http://localhost:5173>. No CSP. |
| `npm test` | Runs the unit tests once (Vitest). |
| `npm run build` | Typechecks (`tsc --noEmit`), then builds to `dist/` with the CSP. |
| `npm run preview` | Serves `dist/` at <http://localhost:4173> so you can check the built app. |

CI runs `npm ci`, `npm test` and `npm run build` on every push and pull request ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## Project structure

```text
.
├── index.html               HTML entry point; the build adds the CSP here
├── vite.config.ts           Vite config and the paste-safe CSP plugin
├── src/
│   ├── tools.ts             every tool, as a function from text to text
│   ├── tools.test.ts        unit tests for every tool
│   ├── main.tsx             the whole UI: tool sidebar, input and output
│   └── styles.css           light and dark theme, narrow-screen layout
├── docs/                    architecture, privacy, adding a tool, product notes
├── .github/workflows/ci.yml install, test and build on every push and PR
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

- **v0.2 Desktop:** Tauri app for macOS, Windows and Linux, with a command palette, global shortcut and signed builds.
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
