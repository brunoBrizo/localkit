# LocalKit

Offline, paste-safe developer toolbox (Vite, React, TypeScript), with a Tauri 2 desktop app (Rust). Proprietary and solely owned by Bruno Brizolara. The repo is public for review, but it is not open source.

## Rules that never break

- Never add network calls, accounts, telemetry, analytics, crash reporting, cloud sync or sharing. The app must stay paste-safe.
- Don't weaken the CSP in `vite.config.ts` or `src-tauri/tauri.conf.json`. They stay identical. The only difference ever allowed is a desktop-only addition on an explicit allowlist in `src/csp.test.ts` (Tauri's IPC origin, only if the Sprint 2 spike shows commands need it). The web policy never gets it.
- No Tauri plugins, capabilities or Rust crates beyond what a feature needs, and never network-capable ones (`npm run check:no-network` enforces this). Native features are Rust commands that take validated ids or values, never URLs. The page never gets open-URL, file-system or clipboard permissions.
- Never store user input on disk. The only persisted state is the settings schema in `docs/PRIVACY.md`. The only file the app will write is a "Save as" the user starts (planned).
- Never put user input in URLs, deep links, window titles or logs.
- No AI or ML features: no LLM calls or models in the product.
- No security tooling: nothing that cracks, brute-forces or bypasses anything. Decoders only decode. Redactors only mask, and never check a secret with its provider.
- No features built to process other people's personal data, such as PII detection. Tools only transform what the user pastes, in memory.
- No code from any employer, client or company, and nothing under NDA.
- Dependencies follow the license policy in `ROADMAP.md`: no GPL, AGPL or LGPL in shipped code.
- Use only made-up sample data. Never put real passwords, API keys, tokens or anyone's personal data in code, tests, docs, commits or prompts. Test fixtures that must look like secrets use vendor-documented example values or are assembled at test time.
- Keep business information out of the repo. Pricing, sales and positioning notes live in `private/`, which is gitignored. Never commit `private/`, `research_notes/`, `reports/` or signing keys.

## Commands

```bash
npm install
npm run dev               # http://localhost:5173, no CSP
npm test                  # Vitest, single run
npm run build             # tsc --noEmit, then vite build with the CSP
npm run preview           # serves dist/ at http://localhost:4173, with the CSP
npm run test:e2e          # Playwright, Chromium + WebKit, against the production build
npm run tauri dev         # desktop app on the dev server (needs Rust)
npm run tauri build       # desktop app and installers in src-tauri/target/release/bundle/
npm run check:no-network  # fails on network-capable crates or plugins (needs cargo on PATH)
cargo test --manifest-path src-tauri/Cargo.toml   # Rust unit tests
npm run test:desktop      # desktop e2e, Linux only (tauri-driver), runs in CI
```

## Where things live

- `src/tools.ts`: every tool (`run: (input: string) => string`) and `runTool`.
- `src/tools.test.ts`: tests for every tool. `src/csp.test.ts`: web and desktop CSP must match.
- `src/main.tsx`: the whole UI. `src/styles.css`: theme and layout.
- `vite.config.ts`: the build-only CSP plugin and Vitest config.
- `src-tauri/`: desktop app. `tauri.conf.json` (window, bundle, CSP), `src/main.rs` (navigation guard and its tests).
- `e2e/web/`: Playwright tests. `e2e/desktop/`: WebDriver tests for the desktop app.
- `scripts/check-no-network.sh`: the dependency guard.
- `docs/`: `ARCHITECTURE.md`, `PRIVACY.md`, `ADDING-A-TOOL.md`.
- `ROADMAP.md`: milestones, sprints, license policy and what is not planned. `CHANGELOG.md`: release notes.
- `private/`, `research_notes/`, `reports/`: local only, gitignored.

## How to work

- Each change starts from a GitHub issue with acceptance criteria (see "How work lands" in `ROADMAP.md`). A PR changes both code and tests, and a bug fix starts with a test that fails before the fix.
- Tools are pure functions in `src/tools.ts` with a test in `src/tools.test.ts`. Follow `docs/ADDING-A-TOOL.md`.
- Docs must match the code. Label planned features as planned.
- If you find a bug or a mismatch, report it; don't silently change behavior.
- Before calling a change done, run `npm test`, `npm run build` and `npm run test:e2e`, plus the Rust checks when `src-tauri/` changes. Update the README, ROADMAP and CHANGELOG when behavior or plans change.
- `main` is protected: changes land through a PR with a green `test` check. Sprint 2 makes the desktop checks required too.
