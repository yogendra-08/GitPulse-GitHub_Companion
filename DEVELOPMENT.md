# Development guide

## Setup

```bash
npm install
npm run dev        # UI at http://localhost:5173/app.html and /popup.html
```

Outside Chrome there is no `chrome.*` API. `shared/storage.ts` falls back to `localStorage`, and the background worker is not exercised. To test the real extension, run `npm run build` and load `dist/` unpacked; after each rebuild click the reload icon on the extension card.

## Layout rules

- `src/shared/` must stay DOM-free (no `document`, no React). The service worker imports it.
- `src/lib/` is pure logic and should have unit tests.
- Pages compose `QueryBoundary` + row components; data hooks live in `features/data/queries.ts`.
- Colors come from CSS variables (`styles/index.css`) mapped in `tailwind.config.js`. Don't hardcode hex values in components. Charts read the live tokens through `useChartColors`.

## Adding a GitHub endpoint

1. Add a typed function in `shared/github/api.ts`.
2. Add a hook in `features/data/queries.ts` with a cache key and TTL.
3. Render it with `QueryBoundary` so loading, error and stale states come for free.

## Testing

`npm test` runs Vitest: pure logic (`lib`), the API client with mocked `fetch` (`shared`), and a jsdom smoke test that renders the popup against a mocked GitHub API.

Needs a real account and Chrome (not covered by automated tests):

- Connecting a token and the error messages for bad or expired tokens
- Notifications: badge count, desktop alerts, mark read / done / all
- Contribution calendar with a fine-grained token
- Rate-limit display
- Visual QA in light and dark themes

## Releasing

Bump `version` in `package.json` and `public/manifest.json`, then `npm run package` and upload `release/GitPulse-extension-<version>.zip`.
