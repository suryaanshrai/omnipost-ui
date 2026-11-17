# omnipost-ui

The web app for [OmniPost](https://github.com/suryaanshrai/omnipost): write a
post once, publish it to eleven networks, see exactly what landed.

React 19, Vite, TypeScript (strict), Tailwind v4, TanStack Query, react-router
v7. Talks to [omnipost-api](https://github.com/suryaanshrai/omnipost-api) over
REST with `Authorization: Token <key>`.

## Run it locally

You need the API running (see omnipost-api's README; by default it listens
on `http://localhost:8000`).

```bash
npm ci
npm run dev          # http://localhost:5173
```

Point it at another API with `VITE_API_URL` in `.env` (see `.env.example`).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc -b` only |
| `npm test` | Unit tests (Vitest, jsdom) |
| `npm run e2e` | Playwright smoke test against a running UI + API |
| `npm run gen:api` | Regenerate `src/types/schema.d.ts` from `../omnipost-api/schema.yml` |

## Tests

- **Unit** (`src/**/*.test.ts`): `npm test`. Runs in CI.
- **End to end** (`e2e/`): one new user from sign-up to a published post,
  plus the account pages. It needs the API, a worker and the UI running:

  ```bash
  # in omnipost-api/app
  python manage.py runserver 8000 &
  python manage.py rqworker --with-scheduler publish maintenance default media metrics ai &
  # here
  npm run dev &
  npm run e2e
  ```

  Set `E2E_BASE_URL` to run it against another deployment (for example the
  built image on port 5173).

## Layout

| Path | What's there |
|---|---|
| `src/pages/` | One file per screen; `settings/` holds Settings' sections |
| `src/components/editorial/` | The design system: fields, buttons, modal, rows |
| `src/components/app/` | App-shell pieces: sidebar, alerts, channel chips |
| `src/components/compose/` | The compose modal and AI panel |
| `src/lib/api.ts` | The one fetch wrapper; every request goes through it |
| `src/lib/queries.ts` | Shared TanStack Query hooks |
| `src/types/schema.d.ts` | Generated from the API schema; don't edit by hand |

## Docker

The image is a static build served by unprivileged nginx on port 5173, with
a strict Content-Security-Policy. `VITE_API_URL` is read at container start,
so one image works against any API:

```bash
docker run -p 5173:5173 -e VITE_API_URL=https://api.example.com suryaanshrai515/omnipost-ui
```

`GET /healthz` returns `ok` for health checks.

## License

GPL-3.0. See [LICENSE](LICENSE).
