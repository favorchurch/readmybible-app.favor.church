# Read My Bible: Copy

Voice: speak-like-favor. Warm, plain, no Christianese, no em dashes, no "please" in invitations,
lowercase pronouns for God and Jesus, `Connect Group` on first mention then `Connect`.

## Brand

- App name: **Read My Bible**
- Tagline: **Read anywhere. Grow together.**
- Campaign line: **Matthew, one chapter a day, all of October.**

## Login

- Title: **Hey! Let's read together.**
- Body: Log in with the same account you use for Favor. Your Connect Group is already waiting.
- Button: **Log in**

## Not found in Rock

- Title: **We couldn't find you yet.**
- Body: Your login worked, but we don't have your Favor record connected yet. Reach out to your
  Connect Group leader and they'll get you sorted.
- Secondary: **Try another account**

## Today tab

Composition changes by `displayPhase` (M3 note: this replaces the old single "before/after
October" pair with four dedicated compositions; see `components/screens/today-screen.tsx`).

### Pre-launch (`data-section="prelaunch-hero"` etc.)

- Hero: **Matthew starts October 1.** Sub: One chapter a day. 28 chapters. Your Connect Group
  grows a shared home as you read together.
- Day 1 preview (`day1-preview`): **Day 1**, **Matthew 1**, the day's long date (for example
  "Thursday, October 1"), key passage via Quick Verse. No check-in control.
- Readiness card (`readiness`): heading **Set up before October 1**; three rows: Avatar (**Set**
  or **Default**), Connect Group (group name or **Join with a leader code**), Bible translation.
- Home preview (`home-preview`, when grouped): **Your home starts as a Tent on October 1.**
- How this works (`how-it-works`): **Read.** One Matthew chapter a day, starting October 1.
  **Check in.** A quick, honor-based tap once you've read. **Watch your home grow.** Your Connect
  Group's home grows as the group reads together.
- Roadmap link (`roadmap-link`): **See the full roadmap**

### Active

- Header: **Make space for the Word today.** (read state: **You made space for the Word today.**)
- Day label: **DAY 8 OF 28** (dynamic)
- Reading card title (`reading-card`): **Matthew 8**
- Card sub: Earns 10 coins for your group's home.
- Key verse label: **Quick verse**
- Popup link: **Open in Bible.com**
- Check-in button: **I read today**
- Done state: **Read. Nice one.**
- Catch-up card title: **Yesterday's chapter is still open** (done: **Caught up**)
- Catch-up body: Grace for the missed days. Joy in the next one.
- Catch-up button: **Mark Matthew 7 read**
- Honor note: This is an honor-based check-in. Take your time.
- Who read strip (`readers-today`): **{n} of {m} have read today**
- Streak: **{n} day streak**
- Home snapshot heading (`home-snapshot`): **We're building this together**

### Grace (October 29 to 31, `grace-dashboard`)

- Hero varies by days remaining: **Three catch-up days.** / **Two catch-up days.** / **One
  catch-up day.** Sub: **{n} chapters left to finish Matthew.**, or when all 28 are read:
  **You've read every chapter. Well done.**
- Stat: **{n} / 28 chapters complete**
- Unread chapters render as chips: **Matthew {n}** (opens the catch-up flow)
- All 28 read: **All 28 chapters. Well done.**
- Group status (when grouped): **{stage} · {pct}% complete**

### Closed (`closed-summary`, November onward)

- Hero: **That's Matthew, start to finish.** Sub: Thank you for reading with us this October.
- Stats: **{n} of 28 chapters read**, **{n} medal(s) earned**, and when grouped, **{stage}** ·
  **{Group name}'s final home**
- Link: **Review your Progress**

## Connect tab

- Header: **{Group name}**
- Sub: {Campus} · {n} members
- Home caption stages: Tent "A humble beginning". Trailer "Making room". Cabin "Feels like home".
  Apartment "Room to grow". House "Growing together". Mansion "Look what we built".
- Next stage bar: **{pct}% to {next stage}** (or **All stages reached**)
- Roster heading by phase (`roster`): pre-launch **Reading together this October**; active
  **{n} of {m} have read**; grace **Finishing Matthew together**; closed **Matthew, finished
  together**. Grace and closed sub: **{pct}% of Matthew completed · {n} members**.
- Roster empty: Nobody yet. Be the first one today.
- Read state (active phase): check glyph plus the word **Read** so meaning is not color-only;
  waiting members show **Waiting**.
- "How your home grows" trigger (`home-growth-trigger`): **How your home grows** (opens `home-growth-sheet`)
- Home-growth sheet copy: Every chapter your Connect Group reads adds to your shared progress.
  Your home grows by the percentage of Matthew your group has completed, so a group of 5 and a
  group of 15 grow at the same pace. **Coins celebrate every chapter. Group completion percentage
  decides the home stage.** How progress is calculated: group check-ins divided by members times
  28. Stage list: Tent, Trailer, Cabin, Apartment, House, Mansion, current stage marked.
- Privacy trigger (`reading-visibility-trigger`): **Who can see this?** (opens `reading-visibility`)
- Privacy sheet copy: People in your Connect Group can see whether you've checked in today. This
  app does not show how long you read or what Bible app you used.
- 3D home rotate hint: Drag, swipe, or use the arrows to look around. Buttons: **Rotate left**,
  **Rotate right**, **Reset view**.
- Leader box title (`leader-tools`): **Bring someone in**
- Leader box body: pre-launch **Share this before October 1.**; active/grace/closed **Show this
  code or QR to anyone in the room who isn't in a Connect Group yet. They enter it in the app and
  they're in.**
- Leader code label: **Group code**
- Leader nudge title: **Still reading**
- Leader nudge body: {names} haven't checked in today. A quick message goes a long way.
- Anti-ranking note: We cheer for groups, not against people.
- Connect portal link (leaders only): **Manage your group on connect.favor.church**

## Group picker

- Title: **Which group are you reading with?**
- Body: You're in more than one Connect Group. Pick one for October. You can switch later.
- Note: This is the Connect Group your October reading will count toward. Past check-ins stay
  with the group they were recorded with.
- Button: **Read with this group**

## Solo mode

- Title: **You're reading solo for now.**
- Body: Ask a Connect Group leader for their group code and join in. Your coins come with you.
- Note: You can join a Connect Group anytime this October. Chapters you've already read stay
  counted.
- Button: **Enter a group code**

## Join by code

- Title: **Join a Connect Group**
- Input label: **Group code**
- Confirm title: **Join {Group name}?**
- Confirm body: {Leader names} lead this group at {Campus}. Once you're in, your reading counts
  toward their home.
- Note: Joining here adds you to this Connect Group in Favor's records.
- Button: **Join group**
- Success: **You're in. Welcome to {Group name}.**
- Invalid code: That code didn't match a group. Check it with your leader and try again.
- Already member: You're already part of {Group name}.
- Error: Something went wrong on our side. Try again in a bit.

## Rewards tab

- Header: **Rewards**
- Pre-launch eyebrow (`rewards-shelf`): **Starts October 1**; sub: Rewards celebrate your own consistency. Your
  group's home is a separate journey. Silhouettes shown at readable contrast (outline treatment,
  not grayscale), never the word "locked".
- Active sub: Rewards celebrate consistency, not comparison.
- Medals: **3 chapters** First steps. **7 chapters** One week in. **14 chapters** Halfway there.
  **21 chapters** Three weeks strong. **28 chapters** All of Matthew.
- Unearned: **{n} chapters**; earned: **Earned**

## Progress tab

- Header: **Your October**
- Pre-launch plan facts (`plan-facts`, replaces the zero statistics): **28 chapters**, **1 chapter
  a day**, **October 1 to 28 reading days**, **October 29 to 31 catch-up days**.
- Page title: **Keep showing up.** Sub: Grace for the missed days. Joy in the next one.
- Calendar title: **October** (eyebrow **MATTHEW · OCTOBER 2026**)
- Calendar legend (`calendar-legend`, four non-color-only states): **Read** (check glyph),
  **Today** (ring plus screen-reader text), **Catch up** (tag text), **Upcoming** (plain number).
- Day-preview sheet (`day-preview`, upcoming days): **Day {n}**, **Matthew {n}**, the day's long
  date, title, key passage. Read days show **Read on {long date}.** Upcoming days show **Read
  ahead any time. Check-in opens October {n}.** and offer no check-in control.
- Stats: **Chapters** {n}/28. **Coins** {n}. **Streak** {n} days.
- Leaderboard title: **Groups on the same journey** (eyebrow **{Campus} Connect Groups**)
- Leaderboard sub: Cheer them on.
- Leaderboard row: {Group name} · {pct}% · {stage}
- Leaderboard empty: No groups on the board yet. October's coming.

## Profile editor

- Title: **Your avatar**
- Name label: **Display name**
- Translation label: **Bible translation**
- Translation help: Used for quick verses in the app. Links still open in Bible.com.
- Reading data disclosure (`reading-data-note`): **About your reading data** (details toggle);
  Your chapter check-ins power your personal progress and your Connect Group's shared progress.
  Your Connect Group can see today's check-in status. Section leaders see group totals in their
  dashboard, not your private reading details.
- Save: **Save**

## Admin

- Title: **Connect Group progress**
- Scope card (`admin-scope`): heading **Your view**. Global: You have access to the full Connect
  Group tree for this dashboard. Section: You're seeing the Connect Groups under the section or
  sections you lead in Favor's records. This dashboard shows group totals for your scope only.
  Second line: Sections shown: {section names, Oxford-comma joined}.
- Progress disclosure (`admin-progress-note`): **How progress is calculated** (details toggle);
  Progress is completed chapter check-ins divided by active members x 28 chapters. This keeps
  group sizes comparable.
- Columns / mobile card labels: Group, Campus, Members, Read today, Progress, Home
- Chart title: **Daily progress since October 1**
- Chart pre-launch empty state (`admin-chart-empty`): **The chart starts filling in on October
  1.** (a genuinely empty scope, no groups at all, instead shows **No groups to chart for this
  view.**)
- Export: **Download CSV**
- No access title: **This page is for section leaders.**
- No access body: If you lead a department, cluster, or region and can't get in, message the
  Tech Team.

## Completion flow

- Step 1: **I read today** button, honor note: This is an honor-based check-in. Take your time.
- Success eyebrow: **TODAY'S READING COMPLETE** (catch-up: **CAUGHT UP**)
- Success title: **Read. Nice one.** (catch-up: **Matthew {n} is done!**)
- Success body: Matthew {n} is complete. Your faithful step is helping {Group name} build
  together. (catch-up: This chapter counts toward finishing Matthew with {Group name}.)
- Coins chip: **+10**, **COINS ADDED**, **To {Group name}**
- Trophy progress: **NEXT TROPHY**, **{n} chapters**, **{n} more chapters to unlock**
- Home progress line (when grouped): **{pct}% → {pct}%** of {Group name}'s shared home, now a
  {stage}.
- Stage-up celebration (`stage-up`, one time, only when the group's stage actually changed):
  **{Group name}** grew from a {from stage} to a {to stage}.
- Close: **Close**

## Errors and misc

- Offline: You're offline. We'll save your check-in when you're back.
- Rock slow: Favor's records are taking a moment. Hang tight.
- Logout: **Log out**
- Admin footer: Favor Church · connect.favor.church
