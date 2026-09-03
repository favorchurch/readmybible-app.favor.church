# Read My Bible — Intent

Owner: Favor Church Tech Team (Rico Tiongson). Repo: favorchurch/readmybible-app.favor.church.
Status: approved 2026-09-03 after a two-round grilling (see DECISIONS.md).

## Why

In October 2026 Favor Church reads the Gospel of Matthew together, one chapter a day, inside
Connect Groups. The app turns that shared habit into a small game: each person checks in a
chapter, coins pool into the group's shared home, and the group watches it grow from a tent to a
mansion. The point is encouragement inside a Connect Group, not competition between people.

## Who

- **Connect Group member.** Logs in with the Rock Auth0 login, sees their own group, checks in.
- **Connect Group leader or assistant leader.** Same view plus a join code and QR for people in
  the room, and a quiet list of who has not read today.
- **Section leaders** (department, cluster, region, campus; Rock Group Type 24). See an admin
  dashboard with the groups under them and a progress timeline.
- **Person with no Connect Group.** Sees solo progress and the campus group leaderboard, and can
  join a group with a code shown by the leader during the meeting.

## Success

1. A real Favor person logs in on `readmybible-app.favor.church` via Auth0 and lands on their own
   Connect Group with the real roster from Rock.
2. Check-ins persist, coins and the home stage update for everyone in the group.
3. Join by code adds the person to the group in Rock and the app reflects it.
4. Admin dashboard shows the section hierarchy with per-group ratios and a timeline chart.
5. Layout works on phone and tablet.
6. Live and tested by Sunday 2026-09-06, leaders onboard from 2026-09-20, campaign starts
   2026-10-01.

## Non-goals for launch

Push or email reminders, multiple reading plans, social sharing, Tagalog scripture, Rock photo
avatars, individual rankings of any kind.

## Constraints

- Rock production is the source of truth for people, groups, roles, campus.
- Only two kinds of Rock writes: the rico+test fixture memberships, and the "join by code"
  GroupMember insert.
- Everything else lives in Supabase `shared-apps-favor-church`, schema `readmybible`.
- Redis on redis.favor.church, every key prefixed `readmybible:<env>:`.
- Never mention Fluro anywhere.
- Copy follows the speak-like-favor brand voice.
