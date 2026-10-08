# OmniPost "Editorial Dispatch" redesign — handoff

Paste the **Prompt** section into a new session. Everything below it is the
reference that prompt points at.

---

## Prompt

> I'm continuing a multi-phase frontend redesign of OmniPost. Two sibling
> repos, both on branch `editorial-redesign` (already pushed, Phase A done):
>
> - `omnipost-ui` — https://github.com/suryaanshrai/omnipost-ui (Vite 6, React 19, TS strict, Tailwind v4 CSS-first, shadcn/ui, react-router v7 declarative, TanStack Query)
> - `omnipost-api` — https://github.com/suryaanshrai/omnipost-api (Django 5.1 + DRF, `Authorization: Token <key>`, routes at root, no `/api` prefix)
>
> Clone both side by side (the UI's `npm run gen:api` reads `../omnipost-api/schema.yml`)
> and check out `editorial-redesign` in each. Read `omnipost-ui/REDESIGN_HANDOFF.md`
> fully before writing code — it has the design spec, every decision already made,
> what's done, and the gotchas I hit.
>
> Implement Phases B through G in order. After each phase run the verification
> steps in the handoff, fix everything they report, and commit on
> `editorial-redesign` with a message ending in the repo's attribution line.
> Don't re-litigate the decisions listed in the handoff. If the backend needs a
> change, make it in `omnipost-api` with a test, regenerate `schema.yml`, then
> `npm run gen:api` in the UI.

---

## 1. Why this exists

Two Claude Design files define the look:
`App v2.dc.html` and `Landing Page v2.dc.html` in Claude Design project
`2d5f77c7-a090-4d77-a094-ca4f9ac877d5`
(https://claude.ai/design/p/2d5f77c7-a090-4d77-a094-ca4f9ac877d5).
Rendered previews: https://claude.ai/code/artifact/02fe07de-160c-4e4d-9c92-de11b0bbfc53
and https://claude.ai/code/artifact/fe090d55-5aff-4b17-b254-baa781adc19b.
If you have the Claude Design MCP, read those files; otherwise §3 below is a
faithful extraction. `support.js` / `image-slot.js` in that project are the
design-canvas runtime (`x-dc`, `sc-if`, `sc-for`, `DCLogic`) — not product
code, don't port them.

**Critical context:** the original UI was written against an API that no
longer exists. Backend commit `dd2826d` ("Rebuild backend") replaced
`/post/`, `/drafts/`, `/platform_instance/`, `/publish/`, `/notifications`
with a `workspaces → channels → posts → post-targets` model. Only `/auth/*`
survived. So every screen except login/register is dead today and is being
**rebuilt**, not restyled.

---

## 2. Decisions already made (don't relitigate)

| | |
|---|---|
| Scope | The design's screens **and** new screens in the same language for calendar/queue/blackouts, approvals, AI composer, analytics. |
| Routing | Landing owns `/`; app lives under `/app/*`; old paths redirect (already wired). |
| Compose | The design's two-step **modal** replaces the six `/app/post-*` composer pages (Phase E deletes them and their routes, keeping redirects to `/app?compose=<kind>`). |
| Publish confirm | Keep the "Dispatch this draft" modal, **drop the password field** (no backend gate exists). Show which channels it goes to. |
| Draft targeting | Channel chips on the Drafts screen toggle targets via `PATCH /posts/{id}/` with `target_specs` (backend support added in Phase A; only allowed on draft/failed). |
| Connections | **All** connectors from `GET /connectors/` (11 today), real OAuth round-trip + BYO app credentials for LinkedIn/X, manual credential form where `credential_fields` is non-empty. |
| Custom cursor | Landing page only. Never inside `/app`. |
| Day/Night | Binary toggle in the app sidebar (Day default). Landing is Day-only. |
| Pacing | The user normally wants one phase at a time with a go-ahead between; they have explicitly authorized B→G in one run for this handoff. |

---

## 3. Design spec

### Tokens (already in `src/index.css`)
Day: page `#EAE3D7`, ink `#12100E`, hair `rgba(18,16,14,.14)`, ink-55/45/38 = ink at .6/.45/.38.
Night: page `#14110D`, ink `#EAE3D7`, hair `rgba(234,227,215,.16)`, ink-* = bone at same alphas.
Accent rust `#C4501E` (on paper), ember `#E0602A` (on dark). Platform dots: Instagram `#C4501E`, Facebook `#1877F2`, LinkedIn `#0A66C2`; row tints = same hues at `.09` alpha.
Tailwind utilities available: `bg-page text-ink text-ink-55 border-hair text-rust text-ember`, `font-display`, `eyebrow`, `display`, `film-grain`. Radius is 0 everywhere. **No cards, no shadows** — structure comes from 1px hairlines.

### Type
Display: Instrument Serif 400, `letter-spacing:-0.02em`, line-height .92–1.14; the emphasised word is *italic + rust*.
UI/body: Manrope 300–700. Eyebrows/labels/buttons: 9.5–12.5px, tracking .14–.24em, uppercase, 700. Body 14.5–17px, line-height 1.6, `text-wrap:pretty`.
Buttons: primary = ink block, page text, uppercase 10.5–12.5px tracked, padding ~15–19px × 26–34px, hover → rust. Secondary = text link with 1px underline rule. Inputs: borderless, 1px bottom rule, rule turns rust on focus, label is an eyebrow above.

### Motifs (components already built in `src/components/editorial/`)
- `FilmGrain` — opacity .26 app / .30 landing.
- `CursorRing` — landing only.
- `Constellation density={…}` — auth panel 0.9, landing hero 1.0, landing CTA 0.62. Sits on `#14110D`.
- `Reveal delayMs` / `useReveal()` — fade+rise once; stagger rows 70ms × index; manifesto words 42ms × index behind an `overflow:hidden` mask (`translateY(112%)` → 0).
- `MagneticLink` — primary CTAs.
- `HoverRow` (+ `.Num .Title .Desc .Arrow`, optional `tint`) — the row-inversion hover.
- `Banner` — ink bottom-center toast (sonner reskin; keep calling `toast()`).
- Section header pattern everywhere: eyebrow `01 · Published` above a serif h1 (~44px app / clamp(30px,3.4vw,46px) landing), count/label right-aligned in eyebrow style, hairline under it.

### Landing Page v2 (Phase B) — copy and structure
- Fixed nav (padding 26px 40px): wordmark "OmniPost" (serif 23px) + "v1" eyebrow; right: "Pricing" link (underline grows on hover), "Sign in" → `/login`, magnetic ink "Get started" → `/register`. If a token exists, show "Dashboard" → `/app` instead of Sign in.
- Fixed left rail (left:40px, vertically centred): 56px vertical progress line (rust fill = scroll %), then vertical-rl labels `01 Intro, 02 Craft, 03 Flow, 04 Platforms, 05 Pricing` linking `#top #craft #flow #platforms #pricing`; active one rust (section top ≤ 45% viewport).
- **Hero `#top`** (min-h 100vh, 2-col 1.05fr/.95fr, padding 150px 40px 70px 108px): blip dot + eyebrow "Publishing infrastructure for one voice"; h1 clamp(56px,7.4vw,116px) "One post,<br/>*every* platform."; p (max 404px) "Write once. OmniPost dispatches it to Instagram, Facebook, and LinkedIn on your schedule, and tells you exactly what landed." — **update to reflect 11 platforms** (e.g. "to every network you keep"); CTAs "Start publishing" (magnetic, → /register) + "See the craft" (→ #craft). Right: `#14110D` panel, height min(78vh,660px), bleeds to right edge, Constellation density 1, bottom-left blip "Live dispatch · three channels" (make it "every channel"), top-right stacked channel labels. Bottom rule row: "Three platforms, one composer" / "Scroll".
- **Manifesto `#product`**: serif clamp(30px,4.3vw,62px), word-by-word masked reveal: "You write the thought once. OmniPost carries it to every feed you keep, on the hour you choose, and reports back what actually landed."
- **Marquee**: hairline-bounded strip, 34s linear infinite, alternating "One post, every platform" / platform names joined by " · ".
- **Craft `#craft`** "What it does, precisely" / "05 capabilities": HoverRow grid `104px 1fr 1.06fr 56px`, big serif number (44px, ink at .22):
  1. One composer, every format — Text, image, video, short video, and story posts written once and shaped per platform.
  2. Scheduling that holds — Pick the hour. The queue publishes without you being at the desk.
  3. Drafts that wait — Save now, choose the accounts later, publish when the moment is right.
  4. Honest delivery reports — Per-platform confirmations and plain-language errors, not a silent failure.
  5. Multiple instances — Several accounts per platform, each addressable on its own.
  (Feel free to swap one for AI variants / queue slots / approvals — the backend has them.)
- **Flow `#flow`** dark `#14110D` band "From one draft to three feeds" / "The flow": 3 columns, each top-ruled with an ember dot, offsets 0/54/108px, serif number 76px at .24: 01 Connect — "Link each account you publish to." 02 Compose — "Write the caption, attach media, set the hour it should go out." 03 Dispatch — "OmniPost publishes to every selected channel and reports what landed."
- **Platforms `#platforms`** "Where it publishes" / "Official APIs": HoverRow with `tint`, grid `1fr 1fr 150px`: serif name clamp(30px,3.6vw,50px), description, formats count eyebrow. Use `GET /connectors/`? No — landing is public/unauthenticated; hardcode the list (that endpoint requires auth).
- **Pricing `#pricing`** "Pricing, without the theatre" / "Placeholder tiers": 3 columns separated by vertical hairlines. Free $0/mo "One account per platform, unlimited drafts." [1 instance per platform, Unlimited drafts, Manual publishing, Delivery notifications] CTA "Start free". Pro $19/mo (rust dot = featured) "For anyone posting across every platform, every week." [Unlimited instances, Scheduled publishing, Priority queue, Full delivery history, Email support] "Start trial". Team $49/mo "Shared drafts and publishing for small teams." [Everything in Pro, 5 seats, Shared draft library, Role permissions] "Talk to us". Price serif 60px.
- **CTA band** dark, min-h 88vh, Constellation 0.62 at opacity .62: eyebrow "Ready when you are", h2 clamp(42px,6.4vw,104px) "Stop posting the<br/>same thing *thrice*." (ember italic), bone button "Start publishing" (hover ember).
- **Footer** grid 1.4fr 1fr 1fr: wordmark + "© 2026 · One post, every platform"; links Capabilities/Platforms; Pricing/Sign in.
- Must reflow cleanly ≤1280px and on mobile (stack the hero, hide the rail <1024px, 16px gutters, no horizontal scroll).

### Auth (Phase C) — `/login` and `/register`, one component, tab = route
2-col 50/50, full height. Left (padding 44px 48px, space-between): wordmark+v1; middle (max 390px, riseIn): blip + eyebrow ("Welcome back" / "New account"), h1 serif 46px ("One post, every platform." / "Start publishing everywhere."), underline tabs "Sign in" / "Create account" (active ink + rust 1px underline; tabs navigate between routes), form. Login: Username, Password → "Enter". Register: Username, Email, Password (send as `password1` and `password2`) → "Create account". Bottom rule row "Three platforms, one composer" / "2026". Right: `#14110D` + Constellation 0.9, bottom-left blip "Live dispatch · three channels". Mobile: hide right panel.
API: `POST /auth/login/ {username,password}` → `{key}`; `POST /auth/registration/ {username,email,password1,password2}` → `{key}`. Use `apiFetch(..., {anonymous:true})`, store via `setToken`, update auth context, then navigate to `location.state.from` or `/app`. Show `ApiError.fieldErrors` inline under fields. Retire `login-form.tsx`, `registration-form.tsx`, `pages/Login.tsx`, `pages/Register.tsx` and the `framer-motion` dependency once nothing imports them.

### App shell (Phase D)
Root: `flex h-screen overflow-hidden`, FilmGrain .26, **no custom cursor**. Sidebar 252px, right hairline, padding 28px 24px 24px: wordmark (21px) + v1; full-width ink "Compose +" (opens compose modal); nav rows grid `26px 1fr auto`, each hairline-separated, padding 15px 2px: serif number (rust when active), uppercase 12px label (ink active / ink-55 idle, slides 4px on hover), rust count badge. Nav: 01 Posts `/app`, 02 Drafts `/app/drafts` (badge = draft count), 03 Calendar, 04 Connections, 05 Analytics, 06 Settings (Approvals appears between Drafts and Calendar only when `activeWorkspace.approval_workflow_enabled`, badge = in_review count). Spacer. Footer: top hairline, rust 30px circle avatar with initial, username + live clock (`en-GB`, `02 Oct, 14:05`) as eyebrow; workspace switcher if >1 workspace; buttons "Night"/"Day" toggle and "Exit" (bordered, hover rust). Mobile: sidebar becomes a `Sheet` (`ui/sheet.tsx` + `hooks/use-mobile.ts`). Content pane: `flex-1 overflow-y-auto`, padding 52px 56px 90px, **not** vertically centred (the old `<main>` had `items-center justify-center` — don't port that). Mount `WorkspaceProvider` here (inside RequireAuth), **never** in `main.tsx`. Delete `ui/sidebar.tsx` and `mode-toggle.tsx` (and `ui/skeleton.tsx` if nothing else uses it).

### Screens
**Posts `/app`** — header eyebrow "01 · Published", h1 "Your posts", right "N published". List max-w 760px, each entry hairline-bottom, padding 32px 0: top row = kind (rust eyebrow) + timestamp (`Aug 24 · 10:00 AM`) left, bordered "Delivery" button right with a 6px rust pip if any target failed; optional 220px media band; body 17px/1.6 max 600px; channel chips (5px platform dot + channel display name + status, failed in rust); expandable delivery log (left hairline, ✓ ink-38 / ✕ rust, message = attempt status + `error_detail`). Data: posts with status published/publishing/failed/scheduled? — show published + failed + publishing here; scheduled belongs to Calendar/Drafts. Delivery log from `GET /publish-attempts/` (no filter param exists — fetch and match `post_target` ids client-side, or add a `post_target`/`post` filter to `PublishAttemptViewSet` in the API — recommended). Failed target → "Retry" action → `POST /posts/{id}/retry-target/{target_id}/`. While any target is pending/publishing, `refetchInterval` ~4s.

**Drafts `/app/drafts`** — eyebrow "02 · Waiting", "Drafts", "N waiting". Entries: kind + schedule label, media, body, eyebrow "Publish to", channel toggle chips (selected = ink fill/page text; idle = transparent/ink-55/hair border) → debounced `PATCH /posts/{id}/ {target_specs:[{channel}]}`; actions "Dispatch now" (ink) → confirm modal → `POST /posts/{id}/schedule/` (no body = now; if the draft has `scheduled_for` in the future, label it "Schedule" and send `run_at`), "Add to queue" → `POST /posts/{id}/queue/`, "Edit" (reopens compose modal prefilled → PATCH), "Delete" → `DELETE /posts/{id}/` with confirm. When approval workflow is on: "Submit for review" instead of dispatch. Empty state is one sentence: "Nothing waiting. Anything you save from Compose lands here."

**Compose modal** — overlay `rgba(18,16,14,.55)` + `backdrop-blur(3px)`, square paper panel 560px, bordered, padding 40px. Step one "What are you posting?": HoverRow list 01 Text, 02 Image, 03 Video, 04 Short video, 05 Story (backend kinds: `text|image|video|short_video|story`). Step two "Write it once" (eyebrow "Step two · <Kind>"): textarea (or media dropzone + caption), channel chips (filter to connectors whose `post_kinds` include the kind), optional schedule (`datetime-local`, or restyled `ui/datetime-picker.tsx`), live per-channel findings from debounced `POST /validate/ {channel,text,post_kind,link,media}` (blocking findings in rust, disable save). Media: `POST /media/` multipart `{workspace, file, kind}` (try `POST /media/presign/` first only if you want S3; 501 means not configured). Footer: "← Back" left; "Cancel" + "Save draft" (ink) right. Save = `POST /posts/ {workspace, kind, base_text, base_media, scheduled_for?, target_specs}`. Open via sidebar button and via `/app?compose=<kind>` query param (redirect the old `/app/post-*` and `/post-*` routes there, then delete the six `create-*.tsx` files, `PostCard.tsx`, `DraftCard.tsx`, `src/types.ts`, `lib/handle-api-response.ts`, `react-player`, `react-icons` if unused, `ui/card.tsx` once nothing imports it).

**Connections `/app/connections`** — eyebrow "04 · Accounts", "Connections", right "Official APIs". Connector rows from `GET /connectors/` (HoverRow with tint; serif 32px name; Connect button bordered → inverts ink on hover). Connect behaviour per connector:
- `requires_own_app` and no `AppCredential` for this workspace/slug → modal step "Register your own app" (client id, client secret, label) → `POST /app-credentials/`, then continue.
- `supports_oauth` → if `oauth_extra_fields` non-empty, collect them (Mastodon: instance domain) → `POST /oauth/start/ {connector_slug, workspace, display_name, redirect_uri: `${location.origin}/oauth/callback`, extra}` → stash `{connector_slug, redirect_uri}` in `sessionStorage` → `window.location = authorize_url`. A `MissingAppCredential` comes back as a 400 — route to the register-app step, not an error toast.
- `credential_fields` non-empty (Bluesky, Discord, Telegram; Mastodon as alternative) → design's Connect modal: one bottom-ruled input per field (humanise labels: IDENTIFIER → "Handle", APP_PASSWORD → "App password", WEBHOOK_URL, BOT_TOKEN, CHAT_ID, ACCESS_TOKEN, INSTANCE_DOMAIN) + "Account name" → `POST /channels/ {workspace, connector_slug, display_name, credentials}`.
`/oauth/callback` page: read `code`, `state`, `error` from query + stashed slug/redirect_uri → `POST /oauth/complete/ {connector_slug, code, redirect_uri, state}` → invalidate channels → navigate `/app/connections` with a Banner toast; show errors on the page with a back link. Below the rows: eyebrow "Linked channels" list — health dot (healthy ink-38 / needs_attention rust / broken rust filled), display name, connector eyebrow, `health_detail` if any, "Remove" → `DELETE /channels/{id}/` with confirm. Row click → `/app/connections/:id`.

**Channel detail `/app/connections/:id`** — health + token expiry; timezone and `min_gap_minutes` (PATCH); queue slots (`/queue-slots/` CRUD; weekday 0=Mon, `time_of_day` "HH:MM"); best times (`GET /channels/{id}/best-times/` → `[{weekday,hour,sample_size,avg_engagement}]`, honest empty state: needs ≥5 published posts and metrics support).

**Calendar `/app/calendar`** (Phase G) — `GET /posts/calendar/?workspace&start&end` (ISO, end exclusive) → PostTarget[]; hairline week grid (7 cols × hours or day rows), entries placed by `run_at`; prev/next week; queue slots as ghosted marks; blackout windows (`/blackout-windows/` CRUD, `channel` null = all) as hatched bands; also CSV import (`POST /posts/import-csv/` multipart `file` + `workspace`, shows `{created, errors:[{row,detail}]}`) and recurrence rules (`/recurrence-rules/` CRUD: channel, kind, variants[], interval_hours, next_run_at, end_at).

**Approvals** (Phase G, only when `workspace.approval_workflow_enabled`) — in_review posts with "Approve" (`/approve/`) and "Request changes" (`/request-changes/`). With the workflow on, schedule/queue require `approved|failed`.

**AI composer** (Phase G, inside the compose modal step two) — "Draft with AI" panel: brief → `POST /ai/variants/ {workspace, brief, channels:[ids], voice_profile?}` → `{variants:[{channel,text,findings}]}`, write each into that target's `text_override`; "Repurpose" (`/ai/repurpose/ {workspace, source_text|source_url, target_formats}`); alt text per media (`/ai/alt-text/ {media}`); image generation (`/ai/images/ {workspace, prompt, aspect?}` → MediaAsset). Quota eyebrow from `GET /ai/usage/?workspace=` (`limit:null` = unlimited). AI errors come back as 400 `{detail}` (quota/not configured) or 502 — show `detail` verbatim.

**Analytics `/app/analytics`** (Phase G) — per-post `GET /posts/{id}/performance/` (latest metric per published target; targets without metrics omitted) and per-target history `GET /post-targets/{id}/performance/`; per-channel best times. **`fetch_metrics()` is only implemented for Bluesky and Mastodon** — every other connector will show nothing; say so in the UI rather than drawing empty charts.

**Settings `/app/settings`** (Phase G) — workspace name/timezone/`approval_workflow_enabled` (PATCH `/workspaces/{id}/`), create another workspace, members (`/memberships/`, read-only list is fine), voice profiles (`/voice-profiles/` CRUD), AI provider keys (`/provider-keys/` — create does a live validation ping; `api_key` write-only), app credentials (`/app-credentials/`).

**NotFound** — restyle to the editorial language (serif "404", one sentence, link home).

---

## 4. Current state (Phase A — done, pushed on `editorial-redesign`)

### omnipost-api
- `Meta.ordering = ["-created_at"]` on Post, Channel, PostTarget, PublishAttempt, MediaAsset (migration `0005`).
- `PostViewSet`: `?status=a,b` and `?workspace=` filters; prefetch `targets__channel`.
- `PostSerializer.update()` honours `target_specs` (replace-all), 400 unless draft/failed.
- `GET /connectors/` → slug, display_name, requires_own_app, **supports_oauth, credential_fields, oauth_extra_fields**, max_text_length, supports_link/alt_text/threads/scheduling_native, post_kinds, media rules. Bluesky `[IDENTIFIER, APP_PASSWORD]`; Discord `[WEBHOOK_URL]`; Telegram `[BOT_TOKEN, CHAT_ID]`; Mastodon OAuth (`instance_domain`) or `[ACCESS_TOKEN, INSTANCE_DOMAIN]`; Instagram/Facebook/Threads/LinkedIn/X/TikTok/YouTube OAuth only; LinkedIn and X `requires_own_app`.
- Fixed: `POST /workspaces/ {name}` used to 400 (organization/slug required). Now derives both.
- `@extend_schema` on all custom actions, OAuth, validate and AI views; `ENUM_NAME_OVERRIDES`. `schema.yml` committed at repo root. One cosmetic warning remains (a `provider` enum named `Provider4baEnum`).
- 256 tests pass; ruff and mypy clean.

### omnipost-ui
- Tokens/fonts/utilities in `src/index.css`; FOUC script + `/favicon.png` in `index.html`.
- `src/components/editorial/*` motif components (see §3).
- `src/lib/api.ts` (`apiFetch<T>`, `ApiError {status, detail, fieldErrors}`, `getToken/setToken`, `Page<T>`; 401 clears token and hard-redirects `/login`; plain-object bodies JSON-encoded, FormData passed through; `anonymous:true` skips auth header).
- `src/lib/queryClient.ts` (no retry on 4xx), mounted in `main.tsx`.
- `src/lib/workspace.tsx` — `WorkspaceProvider` + `useWorkspace()`; **not mounted yet** (Phase D). Never auto-creates a workspace (every create makes a new Organization) — shows a create prompt instead.
- `src/types/schema.d.ts` generated; `src/types/api.ts` holds aliases — add more there per phase (`components["schemas"]["Post"]`, etc.).
- Router (`src/router.tsx`): `/` Landing placeholder, `/login`, `/register`, `/oauth/callback` placeholder, `/app` (RequireAuth + old App shell) with index Home, `drafts`, `connections`, `post-*`; old bare paths redirect.
- Old dead-API screens still mounted under `/app` until their phase replaces them.

---

## 5. Gotchas

- **Windows + Git Bash + Docker:** prefix docker commands with `export MSYS_NO_PATHCONV=1` and use Windows host paths in `-v` (`-v "D:\…\omnipost-api:/app"`), or MSYS mangles `/app` into `C:/Program Files/Git/app`.
- Backend verification container needs `libmagic1` (python-magic import) and `ffmpeg` (media tests). `manage.py` and mypy need `DJANGO_DEBUG=1` outside pytest. Running `poetry config … --local` writes a `poetry.toml` into the repo — delete it, or use `POETRY_VIRTUALENVS_CREATE=false` env instead.
- Docker Desktop on this machine sometimes isn't running / hangs when C: is full (`wsl --shutdown`, relaunch).
- `tsconfig` has `erasableSyntaxOnly` (no enums, no parameter properties), `verbatimModuleSyntax` (`import type`), `noUnusedLocals/Parameters`. Build = `tsc -b && vite build`.
- Dynamic intrinsic tags + refs break TS inference (`as` prop on Reveal had to go).
- List endpoints are `LimitOffsetPagination`, PAGE_SIZE 25, `{count,next,previous,results}`. Only `/posts/` has filters. `/posts/calendar/` is unpaginated. `/connectors/` is a plain array.
- `MediaAsset.file` is a storage-relative path with local storage and an absolute URL with S3 — prefix relative paths with the API origin. Dimensions/mime fill in asynchronously after upload.
- `CORS_ALLOW_CREDENTIALS=True` → `DJANGO_CORS_ALLOWED_ORIGINS` must list the dev origin (DEBUG defaults to localhost:5173).
- Constellation: browsers cap ~16 WebGL contexts; the component already loses its context on unmount — don't bypass it.
- Membership roles are stored but never enforced server-side.

---

## 6. Verification (every phase)

UI (in `omnipost-ui`):
```bash
npm install
npm run gen:api      # if the API schema changed
npm run lint         # 0 errors
npm run build        # tsc -b && vite build must pass
```

API (in `omnipost-api`), via a throwaway container:
```bash
export MSYS_NO_PATHCONV=1
docker run -d --name omnipost-verify -v "<abs path>/omnipost-api:/app" -w /app python:3.12-slim sleep infinity
docker exec omnipost-verify bash -c "apt-get update -qq && apt-get install -y -qq libmagic1 ffmpeg && pip install -q poetry && POETRY_VIRTUALENVS_CREATE=false poetry install --no-interaction --with dev"
docker exec -w /app omnipost-verify python -m pytest app -q
docker exec -w /app omnipost-verify python -m ruff check app
docker exec -e DJANGO_DEBUG=1 -e PYTHONPATH=/app/app -w /app omnipost-verify python -m mypy app/omnipost_api app/connectors
docker exec -e DJANGO_DEBUG=1 -w /app/app omnipost-verify python manage.py makemigrations --check --dry-run
docker exec -e DJANGO_DEBUG=1 -w /app omnipost-verify python app/manage.py spectacular --file schema.yml
```

End to end (from the `omnipost` orchestration repo, with `.env` filled in — see its README):
`docker compose up -d --wait`, then in a browser: landing renders (constellation, reveals, rail, no horizontal scroll at 375px and 1280px); register → lands on `/app` → create workspace prompt if none; connect a Bluesky/Discord/Telegram channel by credentials; compose a text draft targeting it; it appears in Drafts; dispatch; it moves to Posts with a delivery log; Day/Night toggles with no flash on reload; no custom cursor anywhere under `/app`; navigate landing ↔ app repeatedly and the constellation keeps rendering.

Commit per phase on `editorial-redesign` in whichever repo(s) changed. Commit messages end with the attribution line your environment specifies.
