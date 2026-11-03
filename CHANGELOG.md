# Changelog

Notable changes to LocalKit. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org).

## [Unreleased]

### Added

- Documentation: architecture, privacy, adding a tool, product notes, and a sprint-based roadmap.
- JSDoc on `Tool` and `runTool`, and comments on the timestamp heuristic and Base64 decoding. No behavior change.

### Changed

- Vitest upgraded from 3 to 5, which clears the npm audit advisories in its dependencies (dev-only, not shipped).

## [0.1.0] - 2026-11-03

### Added

- Web shell: tool sidebar, input and output boxes, light and dark mode, stacked layout below 640 px.
- Tools: JSON format, JSON minify, Base64 encode, Base64 decode (UTF-8; accepts URL-safe and unpadded input), URL encode, URL decode, timestamp convert (seconds, milliseconds, date strings) and UUID v4 (1 to 1000 at a time).
- Build-time Content-Security-Policy with `connect-src 'none'`, so the built app can't make network requests.
- Unit tests for every tool (Vitest), and CI that installs, tests and builds on every push and pull request.
