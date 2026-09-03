# Read My Bible — Delivery Plan

Target: everything live on `readmybible-app.favor.church` by Sunday 2026-09-06.
Planner: this Claude session (decider). One executor per repo, fresh Opus low code review per leg.

## Routing

| Role | Brand and model | Why |
|---|---|---|
| Planner, gate holder, live-system writes in Auth0 and Vercel | claude opus (session) | Decisions and production-facing changes |
| Executor for this repo | codex `gpt-5.6-luna` high, CLI, this worktree | Long backend and data chain: auth, Rock client, Drizzle, server actions |
| Copy | claude session with speak-like-favor | Brand voice needs the approved decisions in context |
| Mechanical work: GitHub issues, asset generation | claude haiku in-session, codex imagegen luna | Cheap, verifiable artifacts |
| Code review | claude opus low, fresh agent | Independence from the writer |
| Research lookups the executor needs | executor runs `npx ctx7@latest` itself | Cheaper than a separate scout round-trip |

agy is not used as an executor: the work is one long chain, its documented weakness.

## Legs

Each leg is one codex dispatch with an explicit Touches list, followed by `pnpm lint`,
`pnpm test`, `pnpm build`, then Opus review. Fixes go back to the same executor.

### Leg 0 — Planner prep (inline, before the executor starts)

| # | Task | Owner |
|---|---|---|
| 0.1 | Add `readmybible-app.favor.church` to rock-auth0 `SOURCE_CONFIG_BY_HOST`, deploy Actions, verify read-back | planner |
| 0.2 | Add callback and logout URLs to Auth0 client Rock Web Apps via `auth0` CLI | planner |
| 0.3 | Create Supabase schema `readmybible` and role `readmybible_app`, capture `DATABASE_URL` into `.env.local` | planner |
| 0.4 | Copy `AUTH0_CLIENT_SECRET` and `REDIS_URL` from runsheet env into `.env.local`, generate `AUTH0_SECRET` | planner |
| 0.5 | Write `intent/COPY.md` with speak-like-favor | planner |
| 0.6 | File wayfinder map and tickets on GitHub | haiku worker |

### Leg A — Foundation (codex)

Touches: package.json, pnpm-lock.yaml, next.config.ts, tsconfig.json, eslint config, drizzle.config.ts,
`db/`, `drizzle/`, `lib/`, `middleware.ts`, `app/layout.tsx`, `app/not-found-in-rock/`, `vitest.config.ts`,
deletions listed in SPEC.

1. Convert to pnpm, remove vinext, wrangler, Cloudflare, OpenAI Sites, ChatGPT stub, stale test.
2. Upgrade all packages to latest stable that builds on Vercel. Verify with ctx7 for Next and Auth0 v4.
3. Auth0 v4 client and middleware, session helper exposing `rockPersonId`, `DEV_MOCK_PERSON_ID`.
4. `lib/rock/client.ts`, typed reads from SPEC, `lib/rock/constants.ts`.
5. `lib/cache/redis.ts` ported from connect.favor.church with prefix derivation.
6. Drizzle Postgres schema and first migration, applied to Supabase.
7. `lib/game.ts` pure functions: streak, medals, ratio, stage, leaderboard sort. Vitest covers them.
8. `lib/plan.ts` with 28 chapters and key passages.
9. Server actions: checkIn, saveProfile, chooseGroup. Session context loader with cache.

Exit: `pnpm build` green, `pnpm test` green, `/` renders with a mock person and real roster.

### Leg B — App wiring (codex)

Touches: `app/page.tsx` split into `app/(app)/` components, `app/globals.css`, `app/join/`,
`components/`.

1. Replace mock members, "Connect 24", "Mia" with session context and roster.
2. Today, Connect, Rewards, Progress on live data. Group picker. Solo mode.
3. Leader extras: join code, QR (qrcode lib, no external service), hasn't-read list.
4. `/join/[code]` with Rock write and cache bust.
5. Campus leaderboard on Progress.
6. Copy from `intent/COPY.md`. Tablet breakpoints.

Exit: phone and tablet QA pass on the mock person, rico+test fixture as Member and Leader.

### Leg C — Admin (codex)

Touches: `app/admin/`, `lib/rock/hierarchy.ts`, `lib/admin/`.

1. Access resolution: allowlist and Group Type 24 subtree.
2. Hierarchy tree with per-group stats, timeline chart, CSV export.

### Leg D — Scripture and polish (codex)

Touches: `lib/scripture/`, `app/api/scripture/`, popup component, profile translation toggle,
`public/` assets.

1. Provider adapters, Redis 30-day cache, graceful fallback.
2. Translation toggle in profile editor.
3. Favicon, apple-touch-icon, OG image; generate missing ones with codex imagegen.

### Leg E — Ship (planner)

1. Vercel project under Favor Church, env vars, domain, production deploy.
2. Auth0 login end to end on the prod domain with rico+test. Fixture sequence with read-backs.
3. rock-security issue for narrowing the REST key.
4. Update intent docs with what shipped. Save durable lessons to memory.

## Timeline

| When | Milestone |
|---|---|
| Thu 09-03 | Leg 0, Leg A |
| Fri 09-04 | Leg B, Leg C start |
| Sat 09-05 | Leg C, Leg D, Vercel deploy, fixture tests |
| Sun 09-06 | Rico tests on prod, fixes |

## Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Latest Next major breaks Auth0 v4 middleware or Drizzle | Executor verifies via ctx7 first; fall back one major and record why |
| R2 | Rock REST key not yet in `.env` | Leg A builds against a recorded fixture; live calls start when the key lands |
| R3 | API.Bible keys for NIV and CSB not approved by Sunday | Fallback popup with Bible.com link is the default path |
| R4 | Rock roster reads slow at scale | 5-minute Redis cache, one OData call per screen |
| R5 | Three-day window | Admin timeline chart is the first thing to cut, and I say so if it happens |

## Shipped (2026-09-03)

Production: readmybible-app.favor.church on Vercel project `favor-church/readmybible-app`, deployed
from `main` at dbebb45. Smoke script 9/9 (login redirect, Auth0 authorize URL, scripture API, admin
redirect, join redirect, assets, headers).

What changed against the plan above:

- Executors ran on claude sonnet high in herdr panes, not codex (weekly quota exhausted 09-03).
  Reviews ran on fresh Opus low. agy Flash high wrote the smoke script.
- Three review rounds (Leg A, Leg C, Leg B fix round of 7) plus a final pre-ship review: APPROVED.
- NET provider moved from labs.bible.org to bolls.life. labs.bible.org is behind a Cloudflare
  challenge and returns an empty body to server clients. bolls.life also serves ESV, NIV, NLT, and
  CSB (`CSB17`) keyless; using it for those four is a licensing decision, not made.
- `middleware.ts` renamed to `proxy.ts` for Next 16.
- `/admin` now redirects logged-out visitors to login instead of rendering the no-access page.

Fixed 2026-09-03 (post-ship): Rico's first real prod login landed on
`/not-found-in-rock` despite his Rock person record and the Auth0 Action both
being correct. Root cause: `@auth0/nextjs-auth0` v4 filters `session.user`
down to a fixed default claim set (`sub`, `name`, `email`, ...) and silently
drops every other ID token claim — including the Action's namespaced
`rock_person_found`/`rock_person_id` — unless the client defines
`beforeSessionSaved`. `lib/auth0.ts` had none. Fixed by adding the hook
(f50e341). Verified live via a logged-in browser check: lands on the Today
tab. Also narrowed Q4: connect.favor.church is leader-only, never shown to
members or the public (65e55b5, see DECISIONS.md Q25).

Open before Sunday 2026-09-06:

- Rico: run the fixture sequence on rico+test (PersonId 13358) in group 24077:
  Member (role 23) → Leader (role 24) → removed. Each Rock write gets a heads-up first.
- ESV_API_KEY, NLT_API_KEY, API_BIBLE_KEY (plus CSB/NIV bibleIds) are unset; those translations
  show the Bible.com link only.
- Redis and Supabase reads have not been exercised by a logged-in user on prod yet.
