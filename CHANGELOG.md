# Changelog

Notable changes to LocalKit. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org).

## [Unreleased]

### Added

- Desktop app (Tauri 2) for macOS, Windows and Linux, with its own icon. It uses the same CSP as the web build, grants the page no Tauri permissions, has no plugins, and refuses navigation to any URL outside the app.
- `npm run check:no-network`: fails if an HTTP client, a TLS stack or a network plugin enters the desktop app's dependencies.
- Tests: CSP parity between web and desktop (Vitest), navigation guard unit tests (Rust), web end-to-end tests in Chromium and WebKit (Playwright), and desktop end-to-end tests on Linux (tauri-driver).
- CI builds the desktop installers on macOS, Windows and Linux and uploads them as artifacts.
- Documentation: architecture, privacy, adding a tool, and a sprint-based roadmap.
- JSDoc on `Tool` and `runTool`, and comments on the timestamp heuristic and Base64 decoding. No behavior change.

### Changed

- Vitest upgraded from 3 to 5, which clears the npm audit advisories in its dependencies (dev-only, not shipped).
- Roadmap re-planned: Sprint 2 now makes the no-network check fail closed and fixes tool edge cases, tool contract v2 moves to Sprint 3, v0.3 starts with paste-safe inspectors (JWT, secret redaction, HAR, SAML, X.509), and v1.0 adds enterprise deployment and Flatpak and Snap builds with no network access. Adds a dependency license policy and a "Not planned" list.
- Docs now state the known limitations found in a full audit: JSON overflow to `null`, engine-dependent dates and error messages, microsecond timestamps, Base64 byte-order marks, lone surrogates, UUID count parsing, the no-network check passing without `cargo`, and only `test` being required in CI.
- The README's network claim now lists what the CSP blocks, and links to what it doesn't cover.
- The settings that will be saved are now an explicit allowlist in PRIVACY.md.

## [0.1.0] - 2026-11-03

### Added

- Web shell: tool sidebar, input and output boxes, light and dark mode, stacked layout below 640 px.
- Tools: JSON format, JSON minify, Base64 encode, Base64 decode (UTF-8; accepts URL-safe and unpadded input), URL encode, URL decode, timestamp convert (seconds, milliseconds, date strings) and UUID v4 (1 to 1000 at a time).
- Build-time Content-Security-Policy with `connect-src 'none'`, so the built app can't make network requests.
- Unit tests for every tool (Vitest), and CI that installs, tests and builds on every push and pull request.
