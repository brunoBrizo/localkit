# LocalKit

An offline developer toolbox: JSON, Base64, URL, timestamps, UUIDs and more in one fast app. Planned for macOS, Windows and Linux.

**Paste-safe by design.** Everything runs locally. The production build ships a Content-Security-Policy with `connect-src 'none'`, so the app cannot open a network connection. There are no accounts, no telemetry and no analytics, and nothing you paste is stored.

## Status

Early seed. The web shell and the first tools work; the desktop wrapper (Tauri) is on the [roadmap](ROADMAP.md).

| Tool | Status |
|---|---|
| JSON format / minify | ✅ |
| Base64 encode / decode (UTF-8, URL-safe input) | ✅ |
| URL encode / decode | ✅ |
| Timestamp convert (seconds, ms, ISO 8601) | ✅ |
| UUID v4 generator | ✅ |

## Develop

Requires Node.js 24+.

```bash
npm install
npm run dev     # web shell at http://localhost:5173
npm test        # unit tests
npm run build   # typecheck + production build (with the network-blocking CSP)
```

## Adding a tool

Tools live in [`src/tools.ts`](src/tools.ts). Each is a pure function from input text to output text; throw an `Error` for bad input and the UI shows the message. Add a test for every tool in [`src/tools.test.ts`](src/tools.test.ts).

## Non-goals

- No network features, cloud sync, accounts or telemetry.
- No tools that crack, brute-force or bypass anything.

## Ownership

Created and solely owned by Bruno Brizolara. See [LICENSE](LICENSE).
