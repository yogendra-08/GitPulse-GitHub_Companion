# GitPulse – GitHub Companion

> Your GitHub activity, one pulse away.

GitPulse is a Manifest V3 Chrome extension that puts the GitHub information you check every day in one place: what needs your review, what is assigned to you, your unread notifications, your repositories, and how your activity is trending. It talks to GitHub directly from your browser. There is no GitPulse server.

## Problem

Answering "what needs me right now?" on GitHub means visiting the Pulls page, the Issues page, the notification inbox and a handful of repositories. GitPulse ranks those signals in a single list (changes requested, review requested, mentions, assigned issues), keeps it a click away in the toolbar popup, and gives the details a full dashboard tab.

## Features

- **Overview** with a ranked "needs your attention" list, a daily activity strip, recent events and pinned repositories.
- **Pull requests**: created by you, review requested, or assigned; open, merged and closed; draft filter, text filter, sorting; review status (approved, changes requested, commented) for your open PRs.
- **Issues**: assigned, created, or mentioning you; label filter; a "Least recently updated" sort and a *Stale* badge (no update for 30+ days).
- **Notifications**: unread, mentions, review requests, all; per-repository filter; mark as read, mark as done, mark all as read. Toolbar badge and optional desktop alerts from a background worker.
- **Repositories**: search, visibility, language, sort, hide forks/archived, pin favorites.
- **Analytics**: 12-month contribution calendar with streaks, pull request and issue activity by month, repository stats, language mix, recent event mix. Each chart states what it is and is not (see below).
- **Command palette** (`Ctrl/Cmd+K`), keyboard shortcuts, light/dark/system themes, loading skeletons, empty states, error recovery with retry, and cached data that opens instantly.

### Data honesty

GitPulse never fills gaps with invented numbers.

- Language share is the *primary language per repository, counted by repository*, not bytes of code. Repos with no language are reported separately.
- Monthly PR/issue charts use the 100 most recent items. If GitHub has more, earlier months are dropped and a note says so, rather than showing misleadingly low bars.
- The activity strip distinguishes a quiet day (a thin line) from missing data (nothing, plus an explanation). If the contribution calendar is unavailable it falls back to GitHub's events feed and labels it as such.
- The event mix counts *pushes*, not commits.

## Screenshots

> Placeholders. Add real captures to `docs/screenshots/` after loading the extension with your own account.

| View | File |
| --- | --- |
| Overview | `docs/screenshots/overview.png` *(not yet captured)* |
| Pull requests | `docs/screenshots/pulls.png` *(not yet captured)* |
| Popup | `docs/screenshots/popup.png` *(not yet captured)* |
| Analytics | `docs/screenshots/analytics.png` *(not yet captured)* |

## Tech stack

React 18, TypeScript (strict), Vite 5, Tailwind CSS 3, Recharts, React Router (hash routing), lucide-react icons, Geist fonts (bundled, no network fonts), Vitest. GitHub REST API v3 (`2022-11-28`) plus one GraphQL query for the contribution calendar.

## Architecture

```
extension surfaces                 src/
  popup.html      quick glance       popup/        compact popup UI
  app.html        full dashboard     app/          shell, routing, nav
  options.html    settings page      options/      options entry
  background.js   service worker     background/   alarms, badge, desktop alerts
                                     pages/        one file per dashboard page
                                     components/   ui primitives, rows, palette
                                     features/     auth + settings providers, data hooks
                                     hooks/        useQuery (SWR cache), hotkeys, theme
                                     shared/       DOM-free code used by UI *and* worker:
                                                   GitHub client + API, storage, cache, auth
                                     lib/          pure logic (queries, filters, stats) + tests
```

Key decisions:

- **Popup + full tab, no side panel.** The popup is for a five-second check. Everything else needs room, so it lives in a tab. A side panel would duplicate both without adding a distinct job, so it was left out.
- **Setup happens in the dashboard, not the popup.** A popup closes when you switch tabs to create a token, which would discard what you typed.
- **`shared/` is DOM-free** so the service worker and the UI use one GitHub client, one error model and one set of notification helpers.
- **Stale-while-revalidate cache** (`useQuery`) in `chrome.storage.local`: cached data renders immediately, refetches when older than its TTL or on refresh, de-duplicates concurrent requests, and keeps showing saved data with a retry notice if a refresh fails.
- **Cheap polling.** The worker uses `If-Modified-Since`, so unchanged polls return `304` and don't count against the rate limit.

## Installation and loading in Chrome

```bash
git clone https://github.com/yogendra-08/GitPulse-GitHub_Companion.git
cd GitPulse-GitHub_Companion
npm install
npm run build
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and choose the `dist/` folder.
4. The dashboard opens on first install. Pin GitPulse to the toolbar for the popup.

Requires Chrome 116+ and Node 18+.

## GitHub authentication

GitPulse uses a **personal access token (PAT)** that you create. This was chosen over OAuth because a browser extension cannot safely hold an OAuth client secret, and a secure OAuth flow would need a hosted backend. A GitHub Device Flow (no secret required) is a planned improvement.

| | Classic token (recommended) | Fine-grained token |
| --- | --- | --- |
| Scopes / permissions | `repo`, `notifications`, `read:user` (use `public_repo` for public data only) | Metadata: read, Issues: read, Pull requests: read |
| Notifications page, badge, alerts | Yes | **No.** GitHub's notifications API does not accept fine-grained tokens |
| Scope of access | Everything your account can reach | One user or organization, only repositories you select |

[Create a classic token with scopes preselected](https://github.com/settings/tokens/new?scopes=repo,notifications,read:user&description=GitPulse) · [Create a fine-grained token](https://github.com/settings/personal-access-tokens/new)

A classic `repo` scope is broad. GitPulse only reads data, apart from the three notification actions you trigger (mark read, mark done, mark all read). If that is too much access, use a fine-grained token and accept the missing notifications.

To disconnect, use **Settings → Disconnect** (deletes the token and cache from the browser), then delete the token at <https://github.com/settings/tokens>.

## Environment variables

None. No secrets are required or read at build time.

## Development, build and tests

```bash
npm run dev         # Vite dev server (UI in a normal tab; storage falls back to localStorage)
npm run typecheck   # tsc --noEmit
npm test            # Vitest
npm run build       # typecheck + production build into dist/
npm run package     # build + zip dist/ into release/ for Chrome Web Store upload
npm run icons       # regenerate icons (needs Python 3 + Pillow)
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for details.

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Save your token, settings and cached responses locally |
| `alarms` | Schedule the background notification check |
| `notifications` | Show desktop alerts for new GitHub notifications (you can turn this off) |
| `https://api.github.com/*` | Call the GitHub API |

No `tabs`, `history`, `cookies`, `<all_urls>` or content scripts. The extension-page CSP also restricts network requests to `api.github.com`.

## Security and privacy

- No token or secret is in the source. The token is stored only in `chrome.storage.local` on your device. Chrome does not encrypt extension storage, so treat the token like any local credential and prefer an expiry date when creating it.
- The token is sent only to `api.github.com`, in the `Authorization` header.
- There is no analytics, telemetry or GitPulse backend.
- Desktop alert clicks only open `https://github.com/...` URLs.
- A 401 response prompts you to reconnect; rate limits show their reset time.

## Known limitations

- Review status needs one request per PR, so it is limited to 20 open PRs at a time.
- Search-based lists return at most the 100 most recent results per view.
- The contribution calendar uses GraphQL; some fine-grained token configurations may not allow it, in which case GitPulse says so and falls back to the events feed.
- Notifications are limited to classic tokens (GitHub restriction).
- GitHub Enterprise Server is not supported.

## Future improvements

OAuth Device Flow, a side panel, GitHub Enterprise hosts, per-repository notification rules, Actions run status, saved searches, Chrome Web Store listing.

## Contributing

Issues and pull requests are welcome. Please run `npm run typecheck && npm test` before opening a PR, keep UI changes consistent with the existing components in `src/components/ui`, and add tests for new logic in `src/lib` or `src/shared`. Do not add dependencies or permissions without explaining why in the PR.

## License

MIT, see [LICENSE](LICENSE).
