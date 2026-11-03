# LocalKit

Offline, paste-safe developer toolbox (Vite, React, TypeScript). Proprietary and solely owned by Bruno Brizolara.

## Rules that never break

- Never add network calls, accounts, telemetry, analytics, crash reporting, cloud sync or sharing. The app must stay paste-safe. Don't weaken the CSP in `vite.config.ts`.
- Never store user input on disk. Settings (last tool, window size) are the only persisted state.
- No AI or ML features: no LLM calls or models in the product.
- No security tooling: nothing that cracks, brute-forces or bypasses anything.
- No code from any employer, client or company.
- Use only made-up sample data. Never paste real secrets, keys or anyone's personal data.

## Commands

```bash
npm install
npm run dev       # http://localhost:5173, no CSP
npm test          # Vitest, single run
npm run build     # tsc --noEmit, then vite build with the CSP
npm run preview   # serves dist/ at http://localhost:4173, with the CSP
```

## Where things live

- `src/tools.ts`: every tool (`run: (input: string) => string`) and `runTool`.
- `src/tools.test.ts`: tests for every tool.
- `src/main.tsx`: the whole UI. `src/styles.css`: theme and layout.
- `vite.config.ts`: the build-only CSP plugin.
- `docs/`: `ARCHITECTURE.md`, `PRIVACY.md`, `ADDING-A-TOOL.md`, `PRODUCT.md` (internal).
- `ROADMAP.md`: milestones and sprints. `CHANGELOG.md`: release notes.

## How to work

- Tools are pure functions in `src/tools.ts` with a test in `src/tools.test.ts`. Follow `docs/ADDING-A-TOOL.md`.
- Docs must match the code. Label planned features as planned.
- If you find a bug or a mismatch, report it; don't silently change behavior.
- Run `npm test` and `npm run build` before calling a change done. Update the README, ROADMAP and CHANGELOG when behavior or plans change.
