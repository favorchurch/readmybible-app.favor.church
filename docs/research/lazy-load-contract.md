# Lazy-load data contract for the home ladder

Research for ticket #113 (map: #110). Fact-finding against the code as of
`main` @ 6e586b5. Every claim below cites `file:line`. Where something does
not exist today, it says so plainly rather than proposing a replacement.

Scale facts taken as given by the ticket: 287 active Connect Groups
(GroupTypeId 25), GroupTypeId 24 = sections, global root section 22464.
Section counts below were confirmed live against `rock.favor.church`
(read-only `rock_entity` search, 2026-09-16): **118 active, non-archived GT24
sections**.

---

## 1. What `loadSectionSubtree` fetches, and the round-trip cost

`lib/rock/hierarchy.ts:257-264` is a thin cache wrapper. The work happens in
`buildSubtreeForRoot` (`lib/rock/hierarchy.ts:165-249`), and yes — it is
**breadth-first over the entire subtree**, then a second pass for rosters.

Sequence for one root:

1. `fetchGroupsByIds([rootId])` — `lib/rock/hierarchy.ts:110-121`. 1 request.
   Rejects the root if it is not a live GT24 section (`:167`).
2. A BFS `while (frontier.length > 0)` loop (`:184-218`). Each iteration calls
   `fetchGroupsByParentIds(frontier)` (`:124-135`), which issues
   `ceil(frontier.length / 15)` **parallel** requests, one per chunk. Section
   children are pushed onto the next frontier (`:204`); GT25 children are
   recorded as leaves (`:205-214`). Frontier waves are **serial** — wave N+1
   cannot start until wave N returns.
3. After the walk, `fetchActiveMembersByGroupIds(allLeafGroupIds)`
   (`:138-150`, called at `:220`) issues `ceil(leafCount / 15)` parallel
   requests, each with `$expand=Person`.

There is no early exit, no depth limit, and no partial mode. Every descendant
section and every leaf group's full active roster is fetched on every cold
call.

### Measured cost for the global root (22464)

The live GT24 tree is 6 levels deep. Sections per level (118 total):

| Level | Sections | `ceil(n/15)` requests |
|-------|----------|-----------------------|
| root 22464 | 1 | 1 (the `fetchGroupsByIds` seed) |
| frontier `[22464]` | — | 1 |
| L1 (campus roots 39 / 22863 / 22864) = 3 | 3 | 1 |
| L2 (departments) = 11 | 11 | 1 |
| L3 (clusters) = 25 | 25 | 2 |
| L4 = 55 | 55 | 4 |
| L5 = 23 | 23 | 2 |

Walk subtotal: **1 + 11 = 12 requests across 7 serial waves.**
Roster pass: 287 leaf groups / 15 = **20 requests** (one extra wave, all
parallel, each `$expand=Person`).

**Total: ~32 Rock REST requests in 8 serial waves for one cold global-root
call.** A regional-leader scope (one region, avg 2.7 groups) is 3 requests:
seed + one empty-frontier probe + one roster chunk.

Caching: `cached('rock:hierarchy:{rootId}', 900, ...)` —
`lib/rock/hierarchy.ts:260`. **TTL 900s (15 min), one Redis key per root id,
holding the entire serialized subtree as a single JSON blob.** There is no
per-node key. A cache miss on the global root pays the full 32 requests.

### Dead alternative

`getSectionSubtree` (`lib/rock/client.ts:338-356`) is a *different*,
depth-first, fully serial walk — one request per parent node, no chunking,
cached as `rock:subtree:{id}` for 900s. `graft_trace_calls` reports **0
in-edges**: nothing calls it. It is not a usable lazy primitive either; it
still walks the whole subtree, just more slowly (118 serial requests for the
global root).

---

## 2. What `loadAdminStats` fetches from Supabase

`lib/admin/stats.ts:225-250`. It makes **zero Rock calls** — it consumes the
already-materialized tree and only touches Postgres/Redis.

- `flattenGroupNodes(sections)` (`:100-108`, called `:228`) flattens the whole
  tree to every leaf GT25 group id. For the global root that is all 287 ids.
- `loadCheckinTotals(allGroupIds)` — `:180-192`. **One** SQL statement,
  batched over the full id list: `select group_id, count(*) ... where group_id
  in (...) group by group_id` (`:185-189`). Not per-group.
- `loadReadersToday(allGroupIds, today)` — `:195-207`. **One** SQL statement,
  same shape plus `reading_date = today`, `countDistinct(rock_person_id)`
  (`:200-204`). Not per-group.
- Those two run concurrently (`:232-235`).
- `loadDailyCounts` — `:210-222` — is **not** batched over the full list. It is
  called once per top-level series input (`:239-247`), i.e. once per entry from
  `collectTopLevelSeriesInputs` (`:120-146`). Fan-out depends on scope shape:
  a root with child sections yields one query per direct child (global root → 3
  campus queries); a root with no child sections yields **one query per
  Connect Group** (`:133-140`) — a 12-group region issues 12 queries.

So the Supabase side is already close to optimal for a whole subtree: 2 grouped
queries plus N series queries. It is the Rock side that is expensive.

---

## 3. What is already cached

`cached` lives at `lib/cache/redis.ts:118-129`. Cache-aside JSON in Redis;
Redis failures degrade to a miss (`:75-97`), loader errors propagate (`:127`).
Key prefix per environment: `readmybible:prod:` / `:preview:<branch>:` /
`:local:` (`lib/cache/redis.ts:21-32`).

| Key | TTL | Site |
|-----|-----|------|
| `rock:hierarchy:{rootId}` | 900 | `lib/rock/hierarchy.ts:260` |
| `rock:subtree:{sectionGroupId}` | 900 | `lib/rock/client.ts:340` (dead) |
| `rock:roster:{groupId}` | 300 | `lib/rock/client.ts:264` |
| `rock:group:{groupId}` | 900 | `lib/rock/client.ts:273` |
| `rock:campus:{campusId}` | 900 | `lib/rock/client.ts:363` |
| `rock:campusgroups:v2:{campusId}` | 900 | `lib/rock/client.ts:290` |
| `rock:person:v2:{personId}` | 300 | `lib/rock/client.ts:164` |
| `rock:memberships:{personId}` | 300 | `lib/rock/client.ts:231` |
| `rock:sections:{personId}` | 300 | `lib/rock/client.ts:253` |
| `admin:totals:{idsHash}` | 300 | `lib/admin/stats.ts:183-184` |
| `admin:readerstoday:{today}:{idsHash}` | 300 | `lib/admin/stats.ts:198-199` |
| `admin:daily:{fromDate}:{idsHash}` | 300 | `lib/admin/stats.ts:213-214` |
| `group:{groupId}:stats` | 300 | `lib/data/stats.ts:105` |
| `campus:{campusId}:board:v2` | 300 | `lib/data/stats.ts:121` |

### `idsHash` granularity — the important detail

`idsHash` (`lib/admin/stats.ts:255-258`) is `sha1(sorted ids joined by ",")`
truncated to 16 hex chars. **The cache key is bound to the exact id set.** A
cluster's 30-group set and each of its regions' 3-group sets produce entirely
different keys. Admin stats caching is therefore **not composable across
scopes**: warming the global view warms nothing for a region, and a ladder that
walks down one home at a time will miss on every step. It also means an
existing cache entry can never be reused as a partial answer for a subset.

The hierarchy cache has the opposite problem: it is composable only
*downward-whole* — `rock:hierarchy:{X}` exists only if someone loaded X as a
scope root, and holds X's entire subtree, so it is useless as a cheap
"just this node" read.

---

## 4. Cheapest possible unit of fetch for one home plus its occupants

Splitting the requirement in two, because the two halves have very different
answers.

**(a) The home node and its direct children (names, ids, leaf vs section).**
Cheap and already implemented — but as a private helper.
`fetchGroupsByParentIds([homeId])` (`lib/rock/hierarchy.ts:124-135`) is
**one** Rock request for a single home, returns everything needed to classify
children via `isLiveSection` / `isLiveGroup` (`:152-157`). The home's own row
costs a second request via `fetchGroupsByIds` (`:110-121`), or zero if the
parent passed the row down the ladder. Neither function is exported —
`lib/rock/hierarchy.ts` exports only `loadSectionSubtree` (`:257`) and the
re-exported constants (`:37`).

**(b) Each child's aggregate ratio.** This is the blocker. `groupRatio` is
`checkins / (memberCount * 28)`, and the check-in table has no section
dimension: `readmybible.checkins` carries `group_id` only (`db/schema.ts:29-46`),
with `checkins_group_reading_date_idx` on `(group_id, reading_date)` (`:43`).
There is **no group→section mapping stored anywhere in Postgres** and no
denormalized section rollup. Consequently:

- For a **leaf home** (a region whose children are all GT25 groups), the unit
  is cheap and expressible from existing pieces: 1 Rock children request +
  `ceil(childGroups/15)` = 1 roster request (`:138-150`) for member counts +
  the two already-batched Postgres queries `loadCheckinTotals` /
  `loadReadersToday` over just those child ids (`lib/admin/stats.ts:180`,
  `:195`). That is **2 Rock requests + 2 SQL queries per home.**
- For a **non-leaf home** (global / campus / department / cluster) where each
  child section must display its own aggregate ratio, you must know every leaf
  GT25 group id beneath that child, and the only way to learn that today is to
  BFS the child's entire subtree — i.e. exactly `buildSubtreeForRoot`. Showing
  child aggregates at the top of the ladder therefore costs the same as the
  eager load it is meant to replace.

**Does this unit exist today? No.** There is no exported function, route, or
query shape that returns "one section + its direct children + per-child
aggregate". `loadSectionSubtree` is all-or-nothing, the two per-level Rock
helpers are module-private, and the aggregate half has no supporting data
shape at all. Every current consumer —
`components/sections/section-dashboard.tsx:29-30`,
`app/admin/export.csv/route.ts:27-28`, and
`app/actions/getJoinCodeForGroup.ts:44-46` (which loads the whole subtree
merely to answer "is this group in my scope?") — takes the full-subtree path.

---

## 5. Hard blockers

**`server-only` imports.** These modules throw if pulled into a client bundle:
`lib/rock/hierarchy.ts:24`, `lib/cache/redis.ts:14`, `lib/rock/client.ts:9`,
`lib/data/stats.ts:13`, `db/index.ts:1`, `lib/session.ts:1`,
`lib/rock/fixtures.ts:9`, `lib/test-mode-config.ts:1`,
`lib/rock/hierarchy-constants.ts` (no import — see below). Any ladder step that
runs in a client component must reach them through a server action or route
handler, never a direct import.

**`react-server` resolve condition.** `lib/rock/hierarchy-constants.ts:1-6`
exists specifically because `lib/rock/hierarchy.ts` "throws outside a server
component / Node's `react-server` resolve condition" — the constants
(`GLOBAL_ROOT_SECTION_ID = 22464`, `CAMPUS_ROOT_SECTION_IDS = [39, 22863,
22864]`, `:13-16`) were split out so `lib/admin/access.ts` and its unit tests
can use them. `lib/admin/stats.ts` follows the same discipline: no
`server-only` import (stated at `:5-10`) and a lazy `await import()` of
`@/db`, `@/db/schema`, `@/lib/cache/redis` inside `getDb()` (`:170-177`), so
its pure functions and types stay client-importable.
`components/sections/HierarchyChart.tsx:26-28` documents the consequence — it
duplicates the `PLAN_START` literal rather than importing the binding, to avoid
dragging the DB loaders into a `"use client"` bundle. A ladder built as client
components inherits this constraint exactly.

**Rock REST filter length limit — `CHUNK_SIZE = 15`.**
`lib/rock/hierarchy.ts:101`, with the reason at `:98-100`: *"Rock (IIS) rejects
very long OData `$filter` query strings with a plain 400 — chunking at 40 ids
reliably triggered that with long `or` chains of
ParentGroupId/GroupId/Id clauses, so this stays modest."* The limit is on URL /
query-string length, not on a documented id count, and the failure mode is an
opaque 400 with no useful body (`lib/rock/hierarchy.ts:56-59`). 15 is an
empirically safe value, not a Rock-documented one. Any new query shape that
builds `or` chains inherits this ceiling; the `GroupMembers` variant is the
tightest, since it appends `and GroupMemberStatus eq 'Active'` plus
`$expand=Person&$select=...` to the same URL (`:143-146`).

**Other constraints worth recording.**
- `cached` never masks a loader error as a hit (`lib/cache/redis.ts:127`), so a
  Rock 400 mid-ladder surfaces to the caller rather than degrading.
- Redis is best-effort: with `REDIS_URL` unset every step is a cold fetch
  (`lib/cache/redis.ts:38-39`, `:57-59`).
- `adminToday()` uses `Asia/Manila` (`lib/admin/stats.ts:21-30`) via
  `appNow()` from the `server-only` `lib/dev-clock.ts`; any per-home query
  must be handed the same `today` string to share `admin:readerstoday:` keys.
- Fixture mode short-circuits `getSectionSubtree` only
  (`lib/rock/client.ts:339`); `lib/rock/hierarchy.ts` has no fixture path, so a
  ladder built on it has no offline test mode today.

---

## Summary of answers

1. Yes, breadth-first over the whole subtree, plus a roster pass. ~32 Rock
   requests in 8 serial waves for a cold global root; cached whole, 15 min.
2. `loadCheckinTotals` and `loadReadersToday` are each a single grouped query
   batched over all 287 flattened group ids. `loadDailyCounts` is per
   top-level series input, not batched.
3. Hierarchy 900s per root; admin stats 300s per exact id-set hash. The
   `idsHash` scheme makes stats caching non-composable across scopes.
4. Leaf home: 2 Rock requests + 2 SQL queries, assemblable from existing
   private helpers. Non-leaf home with child aggregates: no cheap unit exists —
   there is no group→section mapping in Postgres, so a child aggregate still
   requires walking that child's full subtree.
5. Blockers: `server-only` on hierarchy/redis/db/client, the `react-server`
   split already worked around in `hierarchy-constants.ts`, and
   `CHUNK_SIZE = 15` forced by Rock/IIS returning an opaque 400 on long OData
   `$filter` `or` chains (40 reliably failed).
