# Roadmap

## Desktop app
- [ ] Wrap the web shell in Tauri 2 (macOS, Windows, Linux)
- [ ] Global shortcut to open LocalKit from anywhere
- [ ] Clipboard detection: open the right tool for what is on the clipboard
- [ ] Command palette (⌘K) to search tools
- [ ] Remember last tool and window size locally
- [ ] Signed and notarized macOS build; signed Windows build
- [ ] Auto-update that is off by default

## Tools
- [ ] JSON ↔ YAML
- [ ] JSON ↔ CSV
- [ ] JSON to TypeScript types
- [ ] JSON path query
- [ ] Text diff (side by side and inline)
- [ ] Regex tester with match highlighting and groups
- [ ] Cron expression explainer and next-run preview
- [ ] Number base converter (bin, oct, dec, hex)
- [ ] Color converter (HEX, RGB, HSL, OKLCH) with contrast ratio
- [ ] Hash generator (MD5, SHA-1, SHA-256, SHA-512)
- [ ] JWT decoder (header and payload only, no verification bypass)
- [ ] HTML entity encode / decode
- [ ] String case converter (camel, snake, kebab, title)
- [ ] Line tools: sort, dedupe, reverse, count
- [ ] Lorem ipsum generator
- [ ] SQL formatter
- [ ] Markdown preview
- [ ] Query string ↔ JSON
- [ ] Unix permissions (chmod) calculator
- [ ] Byte size and unit converter
- [ ] Time zone converter
- [ ] ULID and nanoid generators
- [ ] QR code generator (offline)

## Quality
- [ ] Split `tools.ts` into one module per tool once there are 15+
- [ ] Property-based tests for every encode/decode round trip
- [ ] Keyboard-only navigation and screen-reader labels
- [ ] Large input handling (10 MB JSON without freezing the UI)
- [ ] Localization: Portuguese and Spanish
- [ ] Landing page with one free web page per tool

## Business
- [ ] One-time license with offline key validation
- [ ] Team license
