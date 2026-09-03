# Read My Bible — Technical Spec

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js, latest stable that Vercel supports at build time, App Router, TypeScript |
| Hosting | Vercel, team Favor Church, domain `readmybible-app.favor.church` |
| Package manager | pnpm (remove `package-lock.json`) |
| Auth | `@auth0/nextjs-auth0` v4, tenant favorchurch.au.auth0.com, client "Rock Web Apps" |
| Database | Supabase project `shared-apps-favor-church` (ref ixyntblebucvslqexcqh), Postgres schema `readmybible`, Drizzle ORM with `postgres-js`, migrations via drizzle-kit |
| Cache | node-redis v5 against `REDIS_URL`, prefix from `REDIS_KEY_PREFIX` or derived `readmybible:{prod|preview:<branch>|local}:` |
| Charts | Chart.js via react-chartjs-2, admin only |
| Styling | Existing `app/globals.css` and hand-built components, Tailwind v4 available |
| Tests | Vitest for game rules and scripture parsing; `pnpm build` gate; manual QA on phone and tablet viewports |

Removed: vinext, wrangler, `@cloudflare/vite-plugin`, `vite.config.ts`, `.openai/`, `.wrangler/`,
`worker/`, `examples/`, `app/chatgpt-auth.ts`, `tests/rendered-html.test.mjs`, SQLite Drizzle
config. `next.config.ts` stops ignoring TypeScript and lint errors.

## Authentication

1. Middleware from `@auth0/nextjs-auth0` mounts `/auth/login`, `/auth/callback`, `/auth/logout`.
2. Auth0 issuer is `https://auth.favor.church` (custom domain, same as runsheet.favor.church).
3. The Rock post-login Action reads the callback hostname. `readmybible-app.favor.church` is
   added to `SOURCE_CONFIG_BY_HOST` in rock-auth0 mapping to production Rock, and the three
   Actions are redeployed with `pnpm run deploy`. Callback `https://readmybible-app.favor.church/auth/callback`
   and logout `https://readmybible-app.favor.church` are added to the Rock Web Apps client.
4. Claims used: `https://auth.favor.church/rock_person_id`, `rock_person_found`.
   No claim means the not-found screen.
5. Local development: Auth0 maps localhost to rock-preview, whose people differ from prod. So a
   `DEV_MOCK_PERSON_ID` env var, honored only when `NODE_ENV !== "production"`, replaces the
   session with that Rock prod PersonId. Never set on Vercel.
6. Vercel preview URLs are not mapped in Auth0 and cannot log in. Preview deployments are for
   build verification only.

## Rock access

All Rock calls go through `lib/rock/client.ts` using REST v1 with header
`Authorization-Token: ROCK_API_KEY` against `ROCK_API_URL=https://rock.favor.church/api`.
The key is a RestUser named `readmybible-app.favor.church` that Rico provisions and adds to `.env`.
A follow-up issue in rock-security narrows it from Rock Administrator.

Reads, all cached in Redis:

| Read | Endpoint shape | Cache |
|---|---|---|
| Person | `People/{id}` select Id, NickName, FirstName, LastName, PrimaryCampusId | 5 min |
| Memberships | `GroupMembers?$filter=PersonId eq {id} and GroupMemberStatus eq 'Active' and (GroupRoleId eq 23 or 24 or 81)` with `$expand=Group` filtered client-side to `GroupTypeId eq 25`, `IsActive`, not archived | 5 min |
| Section memberships | `GroupMembers?$filter=PersonId eq {id} and GroupMemberStatus eq 'Active'` then keep groups with `GroupTypeId eq 24` | 5 min |
| Roster | `GroupMembers?$filter=GroupId eq {g} and GroupMemberStatus eq 'Active'` `$expand=Person` | 5 min |
| Campus groups | `Groups?$filter=GroupTypeId eq 25 and CampusId eq {c} and IsActive eq true and IsArchived eq false` plus member counts | 15 min |
| Section subtree | `Groups?$filter=ParentGroupId eq {s}` recursively until GroupTypeId 25 | 15 min |

Writes:

| Write | Rule |
|---|---|
| Join by code | `POST GroupMembers` `{GroupId, PersonId, GroupRoleId: 23, GroupMemberStatus: 1}`. If an inactive row exists, `PATCH` it to Active instead. Then bust the person's cache keys. Logged to `join_events`. |
| Fixture | rico+test (PersonId 13358) in group 24077: Member, then Leader 24, then removed. Done by Rico or by me with a heads-up before each write. |

Role IDs 23, 24, 81 and 22, 68 are production values and live in `lib/rock/constants.ts` with a
comment that preview differs.

## Data model (schema `readmybible`)

```sql
profiles (
  rock_person_id  int primary key,
  display_name    text not null,
  avatar          jsonb not null,           -- UserProfile shape from the prototype
  translation     text not null default 'NET',   -- NET | ESV | CSB | NIV | NLT
  active_group_id int null,                 -- chosen group when a person has several
  created_at, updated_at timestamptz
)
checkins (
  id              bigserial primary key,
  rock_person_id  int not null,
  group_id        int null,                 -- Rock group at check-in time
  chapter         smallint not null check (1..28),
  reading_date    date not null,
  timezone        text not null,
  created_at      timestamptz,
  unique (rock_person_id, chapter)
)
join_codes (
  group_id        int primary key,
  code            char(4) unique not null,
  created_by      int not null,
  created_at      timestamptz
)
join_events (
  id bigserial, group_id int, rock_person_id int, code char(4), outcome text, created_at
)
```

Indexes: `checkins (group_id, reading_date)`, `checkins (rock_person_id)`.
The Supabase anon and service roles get no grants on this schema. The app connects with a
dedicated Postgres role `readmybible_app` whose search_path is `readmybible`.

## Server actions and routes

| Route or action | Purpose |
|---|---|
| `/` | Four-tab app. Server component loads session context, client tabs as today |
| `/join/[code]` | Login-gated join. Confirms group name, then joins |
| `/admin` | Section dashboard |
| `/admin/export.csv` | CSV of the visible groups |
| `/not-found-in-rock` | Explains and links to connect.favor.church |
| `action checkIn(chapter, readingDate, tz)` | Validates, inserts, busts cache |
| `action saveProfile(profile)` | Avatar, display name, translation |
| `action chooseGroup(groupId)` | For people in several groups |
| `GET /api/scripture?ref=&t=` | Verse text via provider adapter, Redis 30 days |

## Scripture popups

A curated key passage per Matthew chapter lives in `lib/plan.ts` (28 entries). Tapping it opens
a popup with the text in the reader's translation and an "Open in Bible.com" link
`https://www.bible.com/bible/{id}/MAT.{chapter}.{code}` with ids NET 107, ESV 59, CSB 1713,
NIV 111, NLT 116.

Providers in `lib/scripture/`:

| Translation | Source | Key |
|---|---|---|
| NET | labs.bible.org API | none |
| ESV | api.esv.org | `ESV_API_KEY` |
| NLT | api.nlt.to | `NLT_API_KEY` |
| CSB, NIV | API.Bible | `API_BIBLE_KEY`; NIV subject to their approval |

Missing key or provider error: popup shows the reference and the Bible.com link only.

## Admin dashboard

Access: `ADMIN_PERSON_IDS` env (starts with 152) sees the global Connect root; otherwise any
active Group Type 24 membership sees the subtree of those sections. Others get 403.

Content: a collapsible hierarchy (section title → child sections → Connect Groups) with campus,
members, readers today, ratio, stage per group. A line chart of daily cumulative ratio from
October 1 to today per top-level child of the scope. A CSV export of the group rows.

## Environment variables

```
AUTH0_DOMAIN=auth.favor.church
AUTH0_CLIENT_ID=aX24IzeDb69BQ1KNtTqnilbmvdRxV3TO
AUTH0_CLIENT_SECRET=            # from runsheet.favor.church env, never committed
AUTH0_SECRET=                   # new 32-byte random
APP_BASE_URL=https://readmybible-app.favor.church
ROCK_API_URL=https://rock.favor.church/api
ROCK_API_KEY=                   # provided by Rico
DATABASE_URL=                   # Supabase pooled connection, role readmybible_app
REDIS_URL=                      # same server as runsheet
REDIS_KEY_PREFIX=readmybible:prod:
ADMIN_PERSON_IDS=152
ESV_API_KEY= NLT_API_KEY= API_BIBLE_KEY=   # optional
DEV_MOCK_PERSON_ID=             # local only
```

## Responsive

Phone first (360 to 430 wide), tablet (768 to 1024) gets a two-column layout for Connect and
Progress. The existing CSS already targets phone; tablet breakpoints are added.

## Observability

Vercel logs and analytics only. Server actions log structured one-line JSON on Rock write and on
provider failure.
