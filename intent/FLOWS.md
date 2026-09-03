# Read My Bible — User Flows

## Login and landing

```mermaid
flowchart LR
  A[Open app] --> B{Session?}
  B -- no --> C[Auth0 login<br/>email OTP / Google / Facebook]
  C --> D[Rock post-login Action<br/>sets rock_person_id claim]
  D --> E{rock_person_found?}
  E -- no --> F[Not-found screen<br/>link to connect.favor.church]
  E -- yes --> G[Server: active GT25 memberships<br/>cached 5 min]
  G -- one --> H[Today tab]
  G -- many --> I[Group picker<br/>leader group default]
  G -- none --> J[Solo mode<br/>+ Join by code]
```

## Daily check-in

```mermaid
sequenceDiagram
  participant U as Reader
  participant A as App (server action)
  participant DB as Supabase
  participant R as Redis
  U->>A: checkIn(chapter, readingDate, tz)
  A->>A: validate date window, tz, membership
  A->>DB: insert checkin (unique person+chapter)
  A->>R: DEL group:{id}:stats, campus:{id}:board
  A-->>U: coins, streak, medals, group stage
```

## Join a group by code

```mermaid
sequenceDiagram
  participant L as Leader
  participant M as Member
  participant A as App
  participant Rock as Rock REST (prod)
  L->>A: open Connect tab
  A-->>L: code F52A + QR to /join/F52A
  M->>A: /join/F52A (login required)
  A->>Rock: GET GroupMembers?PersonId & GroupId
  alt not a member
    A->>Rock: POST GroupMembers role 23 Active
  else inactive
    A->>Rock: PATCH status Active
  end
  A->>A: bust person cache
  A-->>M: Today tab in the new group
```

Codes are four characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, one per group, created the
first time a leader opens the tab. Joining is allowed only while logged in with a Rock person.

## Admin dashboard

```mermaid
flowchart TD
  A[/admin] --> B{Allowlist or active GT24 member?}
  B -- no --> C[403 with link home]
  B -- yes --> D[Resolve scope<br/>allowlist = global root<br/>GT24 = own sections]
  D --> E[Rock: section subtree, GT25 groups, member counts<br/>cached 15 min]
  E --> F[Hierarchy tree<br/>per group: campus, members, readers today, ratio, stage]
  E --> G[Timeline chart<br/>daily ratio Oct 1 → today]
  F --> H[CSV export]
```
