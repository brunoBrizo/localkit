# Project rules

- Never add network calls, accounts, telemetry, analytics or crash-reporting SDKs. The app must stay paste-safe.
- Never store user input on disk. Settings (last tool, window size) are the only persisted state.
- Tools are pure functions in `src/tools.ts` with a test in `src/tools.test.ts`.
- Use only made-up sample data. Never paste real secrets, keys or anyone's personal data.
- Run `npm test` and `npm run build` before calling a change done.
