# LocalKit

Offline, paste-safe developer toolbox (Vite, React, TypeScript), with a Tauri 2 desktop app (Rust). Proprietary and solely owned by Bruno Brizolara.

## Rules that never break

- Never add network calls, accounts, telemetry, analytics, crash reporting, cloud sync or sharing. The app must stay paste-safe. Don't weaken the CSP in `vite.config.ts` or `src-tauri/tauri.conf.json`; they must stay identical.
- No Tauri plugins, capabilities or Rust crates beyond what a feature needs, and never network-capable ones (`npm run check:no-network` enforces this).
- Never store user input on disk. Settings (last tool, window size) are the only persisted state.
- No AI or ML features: no LLM calls or models in the product.
- No security tooling: nothing that cracks, brute-forces or bypasses anything.
- No code from any employer, client or company.
- Use only made-up sample data. Never paste real secrets, keys or anyone's personal data.

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
npm run check:no-network  # fails on network-capable crates or plugins
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
- `docs/`: `ARCHITECTURE.md`, `PRIVACY.md`, `ADDING-A-TOOL.md`, `PRODUCT.md` (internal).
- `ROADMAP.md`: milestones and sprints. `CHANGELOG.md`: release notes.

## How to work

- Tools are pure functions in `src/tools.ts` with a test in `src/tools.test.ts`. Follow `docs/ADDING-A-TOOL.md`.
- Docs must match the code. Label planned features as planned.
- If you find a bug or a mismatch, report it; don't silently change behavior.
- Before calling a change done, run `npm test`, `npm run build` and `npm run test:e2e`, plus the Rust checks when `src-tauri/` changes. Update the README, ROADMAP and CHANGELOG when behavior or plans change.
- `main` is protected: changes land through a PR with a green `test` check.
