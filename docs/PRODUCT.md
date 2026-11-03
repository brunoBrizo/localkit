# Product notes (internal)

Who LocalKit is for, how it's positioned, and how it will be sold. These are working notes, not user-facing copy.

## The problem

Developers reach for online formatters and decoders many times a day. Pasting a token, an API payload or a production log into a random website hands it to a third party. Many companies forbid this, so developers either write throwaway scripts or break the rule.

## Target users

- **Developers at companies with data-handling rules** (finance, health, B2B SaaS, agencies working on client data) who are told not to paste data into online tools.
- **Privacy-minded individual developers** who want one fast, keyboard-driven app instead of a folder of bookmarks.
- **Team leads and IT** who approve tools. They need a privacy story they can check and a license they can buy for a team.

## Positioning

Facts checked on 2026-11-03.

| | LocalKit | DevUtils | DevToys | CyberChef |
|---|---|---|---|---|
| Platforms | macOS, Windows, Linux (planned, v0.2) | macOS only | Windows, macOS, Linux (since 2.0, preview from June 2024) | Web app |
| Price | One-time license, about $29 (idea) | Free tier with a few tools; paid license (about £27 for one device on the UK App Store); also on Setapp | Free, open source | Free, open source |
| Style | Small, focused tools, keyboard-first | Small, focused tools | Small, focused tools, with extensions | Chained "recipes" for power users |

DevToys is also cross-platform and DevUtils also promises that pasted data stays local. So "cross-platform" and "offline" alone aren't the pitch. The angle is:

1. **Offline you can prove, not just a promise.** The built app can't make network requests (CSP `connect-src 'none'`), and anyone can verify that in two minutes ([PRIVACY.md](PRIVACY.md#how-to-verify)). That is something a developer can hand to a security reviewer.
2. **Keyboard-first and fast:** global shortcut, command palette, clipboard detection (planned, v0.2).
3. **Cross-platform with one license.** DevUtils is Mac-only.
4. **Easy for teams to buy:** one-time and team licenses with no accounts and no activation server.

## Pricing (idea, not final)

- Personal: one-time license, about $29.
- Team: licenses for several seats.
- Decided in Sprint 9: exact prices, what an unlicensed copy can do (trial or free tier), and the payment provider.

## Distribution

- Direct download from the LocalKit website. Purchase through a payment provider on the website, outside the app.
- One free web page per tool on the website (planned, v1.0), running the same tool code in the browser with the same CSP and no analytics. These pages bring in search traffic and lead to the desktop app.

## Constraints that never change

- Solely and personally owned by Bruno Brizolara. No code from any employer, client or company.
- No other people's personal data: no accounts, telemetry, analytics, crash reporting, cloud sync or user-shared content.
- No AI or machine-learning features in the product.
- Not security tooling: nothing that cracks, brute-forces or bypasses anything.

## Non-goals

Everything ruled out by the constraints above, plus in-app updates: an update check is a network request, so "Check for updates" opens the download page in the browser instead.

## Risks

| Risk | Response |
|---|---|
| DevToys is free and covers many of the same tools. | Win on speed, polish, verifiable privacy and licenses teams can buy. |
| One-time pricing limits revenue. | Team licenses. |
| Code signing costs (Apple Developer Program, Windows certificate). | Planned for v0.2 Sprint 3. |
| Too many tools, too little quality. | Every tool follows [ADDING-A-TOOL.md](ADDING-A-TOOL.md) and ships with tests. |

## Sources

- [DevToys 2.0 with macOS and Linux support (AlternativeTo, June 2024)](https://alternativeto.net/news/2024/6/devtoys-2-0-released-with-macos-and-linux-support-extensions-and-command-line-integration)
- [Announcing DevToys v2.0 Preview](https://devtoys.app/blog/announcing-devtoys-2.0-preview)
- [DevUtils on the App Store](https://apps.apple.com/us/app/id1533756032)
