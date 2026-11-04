# Roadmap

LocalKit ships in milestones, and each milestone is split into two-week sprints. Sprints are numbered, not dated: the next one starts when the current one is done.

The roadmap was re-planned after Sprint 1. The checks that back the no-network promise are made to fail closed and the tools are made correct in every engine before new features, and v0.3 now starts with paste-safe inspectors for what developers paste that leaks most: tokens, HAR files, logs, SAML responses and certificates.

Legend: `[x]` done, `[ ]` planned. *(added)* marks items added after the first roadmap, *(changed)* items reworded or rescoped, and *(moved)* items that changed sprint.

## How work lands

- Each item, or a small cluster of items, is a GitHub issue with its acceptance criteria as the checklist.
- A pull request closes it and changes both code and tests. A bug fix starts with a test that fails before the fix and passes after.
- `main` is protected: a pull request merges only when the required checks are green.

## Definition of done (every sprint)

- `npm test`, `npm run build` and `npm run test:e2e` pass, locally and in CI.
- When `src-tauri/` changes, `cargo test --manifest-path src-tauri/Cargo.toml` and `npm run check:no-network` pass too. From Sprint 2, so do `cargo deny check` and the tool tests in Chromium and WebKit.
- New tools follow [docs/ADDING-A-TOOL.md](docs/ADDING-A-TOOL.md), with tests.
- The no-network checks in [docs/PRIVACY.md](docs/PRIVACY.md#how-to-verify) still pass.
- Every dependency follows the [license policy](#dependency-license-policy) and contains no network code.
- README, CHANGELOG and this file reflect what shipped.

## Dependency license policy

- **Allowed in shipped code:** MIT, BSD-2-Clause, BSD-3-Clause, ISC, Apache-2.0, Zlib, Unicode-3.0 and 0BSD.
- **MPL-2.0:** only for unmodified transitive dependencies and dev-only tools. Tauri already ships five MPL-2.0 crates (`cssparser`, `cssparser-macros`, `dtoa-short`, `option-ext`, `selectors`).
- **Never in shipped code:** GPL, AGPL and LGPL.
- Enforced by `cargo deny` and an npm license check from Sprint 2. A third-party notices file ships from v0.2.

## Overview

| Milestone | Sprints | Outcome |
|---|---|---|
| v0.1 Seed | 0 | ✅ Web shell, 8 tools, network-blocking CSP, tests, CI |
| v0.2 Desktop you can verify | 1–5 | Sprint 1 ✅. Checks that fail closed, tools that behave the same in every engine, tool contract v2 with an off-thread runner, a keyboard-first UI, and signed builds with checksums, provenance and SBOMs |
| v0.3 Paste-safe inspectors | 6–11 | JWT decoder, secret redaction, HAR, SAML and X.509 first; then the planned data, text, converter and generator tools, and a 10 MB input target |
| v1.0 Launch | 12–14 | Offline license keys, managed settings and enterprise installers, Flatpak and Snap with no network access, Portuguese and Spanish, per-tool web pages |
| v1.x Workflow surfaces (planned) | 15–16 | A command-line tool with no network access, in-memory pipelines |

---

## v0.1 Seed (done)

### Sprint 0: Seed ✅

- [x] Web shell: tool sidebar, input and output, light and dark mode, stacked layout on narrow screens
- [x] 8 tools: JSON format and minify, Base64 encode and decode, URL encode and decode, timestamp convert, UUID v4
- [x] Build-time Content-Security-Policy with `connect-src 'none'`
- [x] Unit tests for every tool (Vitest)
- [x] CI: install, test and build on every push and pull request

---

## v0.2 Desktop you can verify

**Goal:** LocalKit as a signed desktop app on all three platforms, with the same no-network guarantee as the web build, and checks a security reviewer can trust.

### Sprint 1: Tauri shell ✅

- [x] Wrap the web shell in Tauri 2 (macOS, Windows, Linux)
  - The app opens on all three platforms from CI-built artifacts.
  - The webview loads the bundled `dist/`, never a remote URL.
  - Tauri's CSP matches the web build's. (Identical string, checked by `src/csp.test.ts`. Whether commands will need an IPC origin is settled in Sprint 2.)
  - No network-capable Tauri plugins (HTTP, updater, WebSocket) or Rust HTTP crates.
  - Navigation to any URL outside the app is refused.
- [x] CI builds desktop artifacts for macOS, Windows and Linux *(added)*
- [x] CI step that fails if a network-capable crate or plugin enters the dependency tree *(added)*
- [x] README documents the Rust toolchain and the desktop commands *(added)*
- [x] Unit tests for the navigation guard and CSP parity; web e2e in Chromium and WebKit; desktop e2e on Linux *(added)*

### Sprint 2: Foundations *(added)*

- [ ] The no-network check fails closed
  - `scripts/check-no-network.sh` checks the exit status of each `cargo tree` call and uses `--locked`. It fails when `cargo` is missing, a target errors, or the crate list lacks `tauri` or looks truncated. It prints the count of unique crates.
  - `cargo deny check` (bans, licenses, sources, advisories) runs in the required `test` job. Bans cover HTTP clients and servers (including `tiny_http` and `axum`), `sentry`, and the Tauri `http`, `updater`, `websocket`, `upload`, `shell`, `opener`, `localhost` and `deep-link` plugins.
  - CI fails on any `src-tauri/capabilities/*.json` not on an allowlist, and on `std::net`, `TcpStream` or `UdpSocket` in `src-tauri/src`.
  - A CI self-test shows that each failure mode makes the check fail.
- [ ] CI can't merge a red desktop build
  - Branch protection requires `test` and the three `desktop` jobs, or `cargo test` moves into `test`.
  - CI runs on pull requests and on pushes to `main`, once per commit, with `cancel-in-progress` concurrency.
  - Explicit read-only permissions, job timeouts, `retention-days` on installer artifacts, actions pinned to commit SHAs, `ubuntu-24.04`, and a cached `tauri-driver`.
  - GitHub secret scanning with push protection is on.
- [ ] Tool correctness fixes, each with a failing test first
  - ISO 8601 and RFC 3339 dates are parsed explicitly with range checks, so `2026-02-30` is rejected in every engine.
  - JSON numbers that overflow (`1e400`) are rejected instead of becoming `null`.
  - 16- and 19-digit timestamps are read as microseconds and nanoseconds. Out-of-range values get their own message.
  - Base64 decode keeps a leading byte-order mark.
  - Text with a lone surrogate is rejected with the tool's own message in Base64 encode and URL encode.
  - The UUID count is parsed strictly (`1e3`, `1,000` and `5abc` are errors), with a note when it is capped at 1000.
  - The tool suite also runs in Chromium and WebKit, and its error messages are the same in Node, Chromium and WebKit.
- [ ] CSP hardening *(moved from Sprint 4)*
  - Both policies add `form-action 'none'; base-uri 'none'; object-src 'none'`.
- [ ] Test and comment wording
  - The web e2e test name says what the CSP blocks (fetch, XHR, WebSocket and remote resources), not "every request".
  - The desktop e2e asserts a `securitypolicyviolation` event instead of any `fetch` failure.
  - The id comment in `src/tools.ts` says the settings storage is planned, not the desktop app.
  - The `v0.1.0` release is tagged.
- [ ] Rules for native features, settled before the first Tauri command
  - A spike under `connect-src 'none'` on macOS, Windows and Linux records whether Tauri's IPC works through its `postMessage` fallback and what it logs.
  - `src/csp.test.ts` compares parsed directives against an explicit list of desktop-only additions. The list stays empty unless the spike shows the IPC origin is needed, and the web policy never gets it.
  - A versioned settings schema with the allowlisted keys in [PRIVACY.md](docs/PRIVACY.md#what-will-be-saved-planned), and a test that drops any other key.
  - A short design note for the Rust-side clipboard read and the fixed-URL "Check for updates" command.
  - `app.security.capabilities` is set explicitly, and `tauri` is pinned to a minor version.
- [ ] Reproducible dev environment
  - A dev container pins Node 24, Rust, the Playwright browsers and WebKitGTK.
  - `npm run verify` runs the unit tests, build, web e2e, Rust tests and dependency checks in one command.
  - Vite uses `strictPort`, Playwright reuses an existing preview server, and `package.json` declares `engines`.

### Sprint 3: Tool contract v2 and off-thread runner *(moved from Sprint 4)*

- [ ] Tool contract v2 *(changed)*
  - Tools gain `description`, `keywords`, `example` and `category`, an options schema (direction, algorithm, case style, seconds or milliseconds), an optional second input (diff, regex) and async `run` (WebCrypto hashing).
  - A result is an output or an error with a `code` and a message the tool owns, so errors match across engines and can be translated.
  - One input normalization policy covers byte-order marks, whitespace-only input and lone surrogates.
  - Output can be plain text or structured (highlighted matches, diff hunks) for the UI to render.
  - The 8 existing tools migrate with unchanged known-output tests, and `runTool` still never throws.
- [ ] UI state and accessibility basics *(added)*
  - Output is computed outside render and debounced, and stale results are dropped.
  - Generator output stays the same until you press Regenerate.
  - Invalid input keeps the last good output. The error appears in a `role="status"` line that starts with "Error:", and the input gets `aria-invalid`.
  - Copy, Clear and Regenerate buttons. Focus moves to the input after a tool switch, and the sidebar marks the current tool with `aria-current`.
  - Dark-mode accent text reaches 4.5:1 contrast and field borders 3:1. `color-scheme` is set, and a `data:` favicon stops the `/favicon.ico` request.
- [ ] Off-thread runner *(moved from Sprints 4 and 8)*
  - Tools run in a same-origin module Web Worker with a per-tool timeout (2 s by default) that stops the worker and says so.
  - A desktop e2e test shows the worker loads in the desktop app.
- [ ] Lossless JSON format and minify *(moved)*
  - A single-pass tokenizer with no new dependency. Integers above 2^53, `1.0`, `1e400`, `-0` and key order are kept exactly as written.
  - Duplicate keys are kept and reported with line and column.
  - Property test: minifying the formatted output equals minifying the input.
- [ ] One module per tool and one string table *(moved from Sprints 4 and 10)*
  - One file per tool with its test next to it, one registry, and every UI string and error message in one table.
  - No behavior change.
- [ ] Property-based tests *(changed)*
  - fast-check (MIT, dev only) checks round trips over well-formed Unicode for Base64, URL and every new pair, plus targeted cases for byte-order marks and lone surrogates.
  - A property for every tool: `runTool` never throws.

### Sprint 4: Keyboard-first *(was Sprint 2)*

- [ ] Command palette (⌘K) to search tools
  - Opens with ⌘K on macOS and Ctrl+K elsewhere, from anywhere in the app.
  - Matches tool names and keywords as you type; Enter opens the tool and Esc closes the palette.
  - Works without a mouse, using the ARIA combobox and listbox pattern, covered by an accessibility-tree snapshot test.
- [ ] Global shortcut to open LocalKit from anywhere *(changed)*
  - Registered from Rust; the page gets no global-shortcut permission.
  - A default shortcut per OS, changed in settings through one command that validates it.
  - Brings the window to the front with focus in the input.
- [ ] Settings store *(changed)*
  - Rust writes one versioned file in the OS app-config folder with the allowlisted keys only. Unknown keys are dropped when it loads.
  - Input and output are never saved, and nothing uses `localStorage`.
  - Deleting the settings file restores the defaults.
- [ ] Per-tool input, in memory only *(added)*
  - Each tool keeps its own input until the app quits.
  - An e2e test confirms the settings file doesn't change when you type.
- [ ] Keyboard-only navigation and screen-reader labels *(changed)*
  - Every action is reachable by keyboard, with a visible focus ring, and every control has a label.
  - CI runs accessibility-tree snapshots and light and dark screenshots.
  - VoiceOver (macOS) and NVDA (Windows) smoke-test results are recorded.

### Sprint 5: Ship v0.2 *(was Sprint 3)*

- [ ] Clipboard detection: open the right tool for what is on the clipboard *(changed)*
  - Off by default; turned on in settings.
  - Rust reads the clipboard text when the window gains focus, capped at 1 MB, and sends only the matching tool id to the page. The content is pasted only when you choose to.
  - The page gets no clipboard permission, and nothing is saved.
- [ ] Signed builds *(changed)*
  - The macOS build is signed and notarized, so Gatekeeper opens it.
  - The Windows build is code-signed or distributed through the Microsoft Store.
  - A manual check confirms the UUID tool works in the signed macOS app.
- [ ] Updates without network: "Check for updates" *(changed: was "Auto-update that is off by default", but an update check is a network request)*
  - A Rust command with a fixed download URL and no parameters opens the download page in the default browser. No `opener` or `shell` plugin.
  - LocalKit itself makes no request.
- [ ] Release integrity and third-party notices *(added)*
  - Every release asset has a SHA-256 checksum, a build provenance attestation, and CycloneDX SBOMs for the npm and Rust dependencies.
  - `dist/` is built twice in CI and the hashes are compared.
  - A third-party notices file is generated in CI and ships in the About screen and the installers.
- [ ] Package channels *(added)*
  - Homebrew cask, winget manifest and Microsoft Store listing. The stores deliver updates; the app checks nothing.
- [ ] "Prove it" self-test *(added)*
  - A screen tries a `fetch`, a WebSocket, an EventSource, a beacon and an image, all to a reserved `.invalid` host, and shows each one blocked with its CSP violation. On desktop it also shows a refused navigation.
  - The code lives in one file, the only place allowed to call network APIs. The source check in PRIVACY excludes only that file.
- [ ] Linux sandbox spike *(added)*
  - A written result: does the Linux app work inside Flatpak and Snap with no network access? It decides the Sprint 13 item.
- [ ] Release v0.2.0 with a CHANGELOG entry

---

## v0.3 Paste-safe inspectors *(changed: was "v0.3 Tools")*

**Goal:** safe, offline tools for the artifacts developers paste that leak most, then the planned data, text, converter and generator tools on contract v2, without freezing the UI.

### Sprint 6: Sensitive artifacts I *(added)*

- [ ] JWT decoder *(moved from Sprint 8)*
  - Prints the header and payload without changing them, and shows `exp`, `iat` and `nbf` as UTC and local dates, with "expired N minutes ago".
  - Detects encrypted tokens (JWE) and says they can't be decoded.
  - Says plainly that decoding isn't verification. Never verifies, signs or modifies a token.
- [ ] Redact secrets before sharing *(added)*
  - Finds known token prefixes and a ported subset of the Gitleaks rules (MIT; the notice ships), plus an entropy check on the captured value with an allowlist for placeholders.
  - Masks all findings or one at a time, and summarizes them by type.
  - Detects and masks credentials only: no personal-data detection, no ML, and it never checks whether a secret is live.
  - Runs in the worker, and a 10 MB log finishes within a stated time budget.
  - Per-rule tests with synthetic fixtures, plus a corpus of look-alikes that must not match.
- [ ] Hash and checksum *(moved from Sprint 8)*
  - SHA-1, SHA-256 and SHA-512 through WebCrypto. MD5 from a small, vetted implementation, since WebCrypto has none.
  - Hex output, labeled as checksums.

### Sprint 7: Sensitive artifacts II *(added)*

- [ ] HAR viewer and sanitizer
  - Parses HAR 1.2 and shows a table of requests.
  - By default it redacts cookies, the `Authorization` and `Set-Cookie` headers, JWTs, and query and POST parameters, with a toggle per category.
  - A report lists every redaction and anything still flagged. The output is valid HAR.
  - A 100 MB synthetic HAR is processed in the worker without freezing the UI.
  - Never replays a request.
- [ ] SAML and OIDC decoder
  - URL-decodes, Base64-decodes and inflates (`DecompressionStream`), then pretty-prints the XML.
  - Shows the issuer, subject, audience, conditions and validity window. An `id_token` opens in the JWT decoder.
  - Never validates or alters signatures.
- [ ] X.509 certificate, PEM and CSR decoder
  - Shows the subject, SANs, validity with days left, key usage and fingerprints, for certificates, chains and CSRs.
  - A pasted private key is detected and not displayed.
  - No OCSP, CRL or AIA fetching. The parsing library passes the license and network-code review first.
- [ ] File input *(added)*
  - Drag-and-drop and a file picker. The file is read as a stream in the worker, with progress, and nothing is written to disk.
  - A spike checks Tauri's drag-and-drop behavior first.
- [ ] Save output as a file *(added)*
  - Only when you choose "Save as": a Rust command opens the OS save dialog and writes the output there.
  - The page gets no file-system permission, and the app never writes a file on its own.

### Sprint 8: Data formats *(was Sprint 5)*

- [ ] JSON ↔ YAML
- [ ] JSON ↔ CSV
- [ ] JSON to TypeScript types
- [ ] JSON path query
  - Large integers stay exact, using `JSON.parse` source text where the engine supports it.
- [ ] Query string ↔ JSON
- [ ] Kubernetes Secret decoder *(added)*
  - Decodes `data:` values, including Helm's double Base64 with gzip, TLS PEM and `.dockerconfigjson`, with values masked until you reveal them.

Acceptance for the sprint: round-trip tests wherever the formats allow, and parse errors that show line and column when the parser provides them.

### Sprint 9: Diff, regex and large input *(changed)*

- [ ] Text diff (side by side and inline) *(moved from Sprint 6)*
  - Two inputs; side-by-side and inline views.
  - Two 5,000-line inputs diff without freezing the UI.
- [ ] JSON structural diff *(added)*
  - Compares two JSON documents by path, ignoring key order and formatting.
- [ ] Regex tester with match highlighting and groups *(moved from Sprint 6)*
  - Uses JavaScript regex syntax, and the UI says so.
  - Shows every match with numbered and named groups.
  - Runs in the worker with a timeout, so a runaway pattern can't freeze the app.
- [ ] Large input handling *(moved from Sprint 8, changed)*
  - A Playwright test on the production build formats 10 MB of JSON while keystroke latency stays under 50 ms.
  - Output is virtualized (CodeMirror 6, MIT, read-only, checked under the CSP) or capped in the live preview.
  - CI enforces a gzip bundle-size budget.

### Sprint 10: Converters and text utilities *(was Sprints 6 and 7)*

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
- [ ] String case converter (camel, snake, kebab, title)
- [ ] Line tools: sort, dedupe, reverse, count
- [ ] HTML entity encode / decode
- [ ] Lorem ipsum generator

### Sprint 11: Generators and viewers, ship v0.3 *(was Sprint 8)*

- [ ] ULID, nanoid and UUID v7 generators *(changed: UUID v7 added)*
- [ ] QR code generator (offline)
- [ ] SQL formatter
- [ ] Markdown preview
  - Raw HTML is sanitized, and remote images stay blocked by the CSP.
- [ ] Release v0.3.0 with a CHANGELOG entry

---

## v1.0 Launch *(changed: was "v1.0 Paid launch")*

**Goal:** licensing that works fully offline, and an app an IT team can approve and deploy.

### Sprint 12: Licensing *(was Sprint 9)*

- [ ] Offline license keys *(changed)*
  - A key is a signed payload (format version, key id, random license id, tier, seats, issue date, updates-until date) with an Ed25519 signature. Rust checks it against public keys built into the app, using `ed25519-dalek` (BSD-3-Clause).
  - No activation server and no network request.
  - Keys contain no personal name or email. A team key may carry an organization name the buyer chooses.
  - A build is covered while its build date is before the key's updates-until date.
  - Two public keys are built in, so the signing key can be rotated. Release builds reject the test key, and leaked keys are blocked by a list in later builds.
  - The page sees only the tier, the seats and the updates-until date. The key is stored as an allowlisted setting.
  - The key decoder is fuzzed with cargo-fuzz.
- [ ] Team license
  - One key covers a set number of seats, with the same offline check and no seat-tracking server.
- [ ] Unlicensed copies *(changed)*
  - No time-limited trial, no countdown and no stored first-run date.
- [ ] Buying happens on the website, outside the app *(changed)*
  - The app never contacts a payment provider.

### Sprint 13: Enterprise deployment and Linux sandbox *(added)*

- [ ] Managed settings
  - Reads a macOS managed-preferences domain and a Windows policy registry key for an allowlisted set of settings, such as turning clipboard detection off or deploying a team key.
  - Managed values win and are labeled as managed in the app.
- [ ] Enterprise installers
  - A signed macOS `.pkg`, and a per-machine Windows MSI that bundles WebView2 (offline installer mode), so installing downloads nothing.
- [ ] Security documentation
  - A security and privacy whitepaper built from PRIVACY.md, prepared answers to common security questionnaires, the SBOM, a vulnerability disclosure policy with `security.txt`, and an accessibility statement (WCAG 2.2 AA target and known gaps).
- [ ] Flatpak and Snap with no network access *(if the Sprint 5 spike passes)*
  - CI asserts that the Flatpak manifest has no `--share=network` and the Snap has no `network` plug.
  - PRIVACY shows how to check it with `flatpak info --show-permissions` and `snap connections`.
  - The Flatpak manifest is written by hand, and AI assistance in the code is disclosed as Flathub requires. If Flathub declines, the Flatpak is self-hosted.

### Sprint 14: Launch *(was Sprint 10)*

- [ ] Localization: Portuguese and Spanish
  - Uses the string table from Sprint 3. The language follows the OS, with an override in settings.
- [ ] Per-tool web pages *(changed)*
  - A static site where each tool page runs the same tool code in the browser, under the same CSP, served with real HTTP headers (a `<meta>` policy can't set `frame-ancestors`).
  - No analytics and no third-party scripts.
  - A "verify it yourself" page.
- [ ] Release v1.0.0 with a CHANGELOG entry

---

## v1.x Workflow surfaces (planned) *(added)*

### Sprint 15: Command-line tool

- [ ] `localkit <tool-id>` reads stdin and writes stdout, using the same tool code as the app
  - Built with `deno compile` with no network or write permission, and read access only to files named on the command line.
  - A CI test shows `fetch` is denied inside the binary.
  - Signed for each OS.

### Sprint 16: Pipelines and detection

- [ ] Typed pipelines such as `base64-decode › json-format`, with live previews
  - Never saved and never put in a URL.
- [ ] Detect inside the paste
  - Marks JWTs, Base64, timestamps, UUIDs, PEM blocks and secrets found inside a pasted log.
- [ ] "Copy as" a string literal for common languages

### Unscheduled

Weaker evidence or unverified feasibility: a Raycast extension, a VS Code extension, deep links that carry only a tool id, clipboard writes marked as concealed, macOS Services, and a Windows AppContainer spike.

---

## Not planned

| Idea | Why not |
|---|---|
| A Mac App Store sandbox build as proof of no network | WKWebView needs the outgoing-network entitlement even for bundled content, and that entitlement opens the network for the whole app. Only Flatpak and Snap can enforce no network at the OS level. |
| Extension marketplace or user scripts | Third-party code breaks the no-network proof. |
| Checking whether a found secret is live, or revoking it | Network calls, and close to security tooling. |
| Personal-data (PII) detection | Keeps LocalKit clearly out of processing other people's personal data. ML-based detection would also break the no-AI rule. |
| WASM builds (curlconverter, a Rust core compiled to WASM) | They need `'wasm-unsafe-eval'` in the CSP. |
| Monaco editor | A multi-megabyte bundle and several workers. CodeMirror 6 is planned instead. |
| Tauri `http`, `updater`, `localhost`, `shell` or `opener` plugins; file, dialog or clipboard access from the page | Network access, local servers, or a way to send input out. |
| `single-instance` before a feature needs it | It opens a local socket that accepts arguments from any local process. |
| In-app update checks | An update check is a network request. |
| Recipe or deep-link URLs that carry input; persistent scratchpads; clipboard history; OCR | They store or transmit input, and OCR usually needs ML. |
| JWT signing or verification; brute-force operations; network tools (HTTP client, DNS, WHOIS, port scans, GeoIP) | Project rules: no network, and nothing that cracks or bypasses anything. |
| Time-limited trials | They need a stored first-run date. |
| Distribution channels that collect device data or replace offline licensing | They break the no-telemetry and no-network rules. |
| License keys checked online by a payment provider | A network call. |
