# Roadmap

LocalKit ships in milestones, and each milestone is split into two-week sprints. Sprints are numbered, not dated: the next one starts when the current one is done.

Legend: `[x]` done, `[ ]` planned. *(added)* marks items added after the first roadmap; *(changed)* marks items reworded to fit the project rules.

## Definition of done (every sprint)

- `npm test` and `npm run build` pass, locally and in CI.
- New tools follow [docs/ADDING-A-TOOL.md](docs/ADDING-A-TOOL.md), with tests.
- The no-network check in [docs/PRIVACY.md](docs/PRIVACY.md#how-to-verify) still passes.
- Any new dependency has a permissive license (MIT, BSD, ISC or Apache-2.0) and no network code.
- README, CHANGELOG and this file reflect what shipped.

## Overview

| Milestone | Sprints | Outcome |
|---|---|---|
| v0.1 Seed | 0 | ✅ Web shell, 8 tools, network-blocking CSP, tests, CI |
| v0.2 Desktop | 1–3 | Signed desktop app for macOS, Windows and Linux, keyboard-first |
| v0.3 Tools | 4–8 | Tool contract v2 and 23 more tools |
| v1.0 Paid launch | 9–10 | Offline licensing, localization, landing page |

---

## v0.1 Seed (done)

### Sprint 0: Seed ✅

- [x] Web shell: tool sidebar, input and output, light and dark mode, stacked layout on narrow screens
- [x] 8 tools: JSON format and minify, Base64 encode and decode, URL encode and decode, timestamp convert, UUID v4
- [x] Build-time Content-Security-Policy with `connect-src 'none'`
- [x] Unit tests for every tool (Vitest)
- [x] CI: install, test and build on every push and pull request

---

## v0.2 Desktop

**Goal:** LocalKit as a signed desktop app on all three platforms, with the same no-network guarantee as the web build.

### Sprint 1: Tauri shell

- [ ] Wrap the web shell in Tauri 2 (macOS, Windows, Linux)
  - The app opens on all three platforms from CI-built artifacts.
  - The webview loads the bundled `dist/`, never a remote URL.
  - Tauri's CSP matches the web build's. The only allowed addition is Tauri's in-process IPC origin, if commands need it.
  - No network-capable Tauri plugins (HTTP, updater, WebSocket) or Rust HTTP crates.
  - Navigation to any URL outside the app is refused.
- [ ] CI builds desktop artifacts for macOS, Windows and Linux *(added)*
- [ ] CI step that fails if a network-capable crate or plugin enters the dependency tree *(added)*
- [ ] README documents the Rust toolchain and the desktop commands *(added)*

### Sprint 2: Keyboard-first

- [ ] Command palette (⌘K) to search tools
  - Opens with ⌘K on macOS and Ctrl+K elsewhere, from anywhere in the app.
  - Matches tool names as you type; Enter opens the tool and Esc closes the palette.
  - Works without a mouse.
- [ ] Global shortcut to open LocalKit from anywhere
  - A default shortcut per OS that can be changed in settings.
  - Brings the window to the front with focus in the input.
- [ ] Remember last tool and window size locally
  - Only these settings are saved, in the OS app-config folder.
  - Input and output are never saved.
  - Deleting the settings file restores the defaults.
- [ ] Keyboard-only navigation and screen-reader labels
  - Every action is reachable by keyboard, with a visible focus ring.
  - Every control has a label; a VoiceOver (macOS) and NVDA (Windows) smoke test passes.

### Sprint 3: Ship v0.2

- [ ] Clipboard detection: open the right tool for what is on the clipboard
  - Off by default; turned on in settings.
  - Reads the clipboard only when the window opens, matches it locally against the existing tools, and never saves it.
- [ ] Signed and notarized macOS build; signed Windows build
  - The macOS build is signed and notarized, so Gatekeeper opens it.
  - The Windows installer is code-signed.
- [ ] Updates without network: "Check for updates" opens the download page in the default browser *(changed: was "Auto-update that is off by default", but an update check is a network request)*
- [ ] Release v0.2.0 with a CHANGELOG entry

---

## v0.3 Tools

**Goal:** 23 more tools on a tool contract that handles options, two inputs and slow work, without freezing the UI.

### Sprint 4: Foundations

- [ ] Tool contract v2 *(added)*
  - Supports options (direction, algorithm, case style, seconds or milliseconds), a second input (diff, regex) and async `run` (WebCrypto hashing).
  - Output can be plain text or structured (highlighted matches, diff hunks) for the UI to render.
  - Slow tools run in a Web Worker with a timeout.
  - The 8 existing tools keep working with unchanged tests, and `runTool` still never throws.
- [ ] Split `tools.ts` into one module per tool once there are 15+
  - Done before the tool count passes 15: one file per tool with its test next to it, and one registry.
  - No behavior change.
- [ ] Property-based tests for every encode/decode round trip
  - fast-check (dev dependency) checks that decoding the encoded value returns the original, for random Unicode strings, for Base64, URL and every new pair.
- [ ] Lossless JSON format and minify *(added)*
  - Integers above 2^53 and number spelling (`1.0`, `1e2`) are kept exactly as written.
  - Duplicate keys are kept or reported, never silently dropped.
- [ ] CSP hardening: add `form-action 'none'; base-uri 'none'` *(added)*

### Sprint 5: Data formats

- [ ] JSON ↔ YAML
- [ ] JSON ↔ CSV
- [ ] JSON to TypeScript types
- [ ] JSON path query
- [ ] Query string ↔ JSON

Acceptance for the sprint: round-trip tests wherever the formats allow, and parse errors that show line and column when the parser provides them.

### Sprint 6: Text tools

- [ ] Text diff (side by side and inline)
  - Two inputs; side-by-side and inline views.
  - Two 5,000-line inputs diff without freezing the UI.
- [ ] Regex tester with match highlighting and groups
  - Uses JavaScript regex syntax, and the UI says so.
  - Shows every match with numbered and named groups.
  - Runs in a worker with a timeout, so a runaway pattern can't freeze the app.
- [ ] String case converter (camel, snake, kebab, title)
- [ ] Line tools: sort, dedupe, reverse, count
- [ ] HTML entity encode / decode
- [ ] Lorem ipsum generator

### Sprint 7: Converters and reference

- [ ] Cron expression explainer and next-run preview
- [ ] Number base converter (bin, oct, dec, hex)
  - Integers of any size (BigInt), not just up to 2^53.
- [ ] Color converter (HEX, RGB, HSL, OKLCH) with contrast ratio
  - Shows the WCAG contrast ratio between two colors.
- [ ] Unix permissions (chmod) calculator
- [ ] Byte size and unit converter
  - Both SI (1 kB = 1000 B) and IEC (1 KiB = 1024 B) units.
- [ ] Time zone converter
  - Uses the system time zone database through `Intl`; downloads nothing.

### Sprint 8: Generators and viewers, ship v0.3

- [ ] Hash generator (MD5, SHA-1, SHA-256, SHA-512)
  - SHA family through WebCrypto. MD5 from a small, vetted implementation, since WebCrypto has none.
  - Hex output, labeled as checksums.
- [ ] JWT decoder (header and payload only, no verification bypass)
  - Decodes header and payload, and shows `exp`, `iat` and `nbf` as dates.
  - Never verifies, signs or modifies a token.
- [ ] ULID and nanoid generators
- [ ] QR code generator (offline)
- [ ] SQL formatter
- [ ] Markdown preview
  - Raw HTML is sanitized, and remote images stay blocked by the CSP.
- [ ] Large input handling (10 MB JSON without freezing the UI)
  - Formatting 10 MB of JSON finishes while typing stays responsive.
- [ ] Release v0.3.0 with a CHANGELOG entry

---

## v1.0 Paid launch

**Goal:** a product people can buy, with licensing that works fully offline.

### Sprint 9: Licensing

- [ ] One-time license with offline key validation
  - The key is a signed payload (license id, tier, issue date) checked against a public key built into the app.
  - No activation server and no network request.
  - The key contains no name or email.
  - Decide what an unlicensed copy can do (trial or free tier).
- [ ] Team license
  - One key covers a set number of seats, with the same offline check and no seat-tracking server.
- [ ] Purchase flow on the website through a payment provider, outside the app *(added)*

### Sprint 10: Launch

- [ ] Localization: Portuguese and Spanish
  - All UI strings in one place; the language follows the OS, with an override in settings.
- [ ] Landing page with one free web page per tool
  - A static site where each tool page runs the same tool code in the browser, under the same CSP.
  - No analytics and no third-party scripts.
- [ ] Release v1.0.0 with a CHANGELOG entry
