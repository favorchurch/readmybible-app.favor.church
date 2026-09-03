# Read My Bible UI/UX Audit Spec

Audit date: 2026-09-03
Audit baseline: `main` at `d597869cb9cb0e055cc62ed4fb1e92c0dac4b760`
Scope: product UX, visual consistency, responsiveness, interaction design, information design, pre-launch behavior, and accessibility polish.

## Goal

Make Read My Bible feel intentional before, during, and after the October reading plan, while preserving the current Favor visual language and product rules.

The app should feel like a complete experience on both phone and desktop, not a phone layout stretched onto a larger canvas. It should explain enough of the game and access model that a first-time reader can answer these questions without guessing:

- What happens on October 1?
- What can I do before October 1?
- What does my Connect Group home mean?
- How does the home grow?
- What do coins do?
- Who can see that I read today?
- Why can I see this Connect Group or admin section?
- What can I see now versus later?
- What happens if I miss a day?

## Product constraints

These are hard constraints for this pass.

- Do not change Connect Group structures, group types, membership roles, or section structures in Rock.
- Do not change the existing icon set in the app.
- The favicon is the only icon exception and may be redesigned.
- Do not change font families or replace the existing typography system.
- Font sizes, line heights, widths, and responsive scale may change.
- Avoid large decorative voids or layouts that feel intentionally sparse.
- Keep individual competition out of the product. Group encouragement stays the core social mechanic.
- Keep future check-ins impossible. Server-side date validation remains authoritative.
- Keep the current bottom navigation labels and core information architecture: Today, Connect, Rewards, Progress.
- Keep `connect.favor.church` leader-only.
- Do not add new Rock writes.
- No database migration is required for this UX pass.

## Audit summary

### 1. Pre-launch Today is too empty

Before October 1, the Today tab currently collapses to a heading and one sentence. The rest of the product still contains October-oriented content, so the first impression feels like a holding screen instead of an onboarding experience.

This is the highest-priority experience gap because the app is live before the campaign begins.

### 2. Desktop layouts do not share one alignment system

The app uses several competing content widths. The top bar, Today content, Connect and Progress grids, Rewards shelf, onboarding screens, and admin each follow different layout rules.

The largest visible issue is Connect on desktop. Its two-column layout reserves the right column for Leader Tools. Ordinary members do not render Leader Tools, so much of the right side can become empty.

The fix should be structural, not a collection of margin tweaks.

### 3. The home mechanic is charming but under-explained

The product says that chapters earn coins for the group home, but the actual home stage is driven by normalized group completion ratio, not raw coin count. That fairness rule is good, but the UI currently requires the reader to infer it.

The app needs a small, friendly explanation of:

- why the group has a home,
- what Tent through Mansion represent,
- how reading grows it,
- why larger groups do not automatically have an advantage.

### 4. Future reading visibility is conceptually unclear

The current Progress calendar shows future days, but there is no strong distinction between "visible" and "available for check-in."

The Bible itself should never feel locked. The correct mental model is:

> The full October plan is visible now. Check-ins open on the assigned day and remain available for catch-up afterward.

Future days should be inspectable, but not check-in-able.

### 5. Pre-launch zero states can read like failure states

Before October, Connect can show everyone as "Not yet," Rewards are fully locked, and personal progress is zero. Those are technically correct but experientially wrong before the challenge starts.

Pre-launch should use readiness language, not incomplete language.

### 6. Privacy and scope are not explained enough

Connect Group members can see whether other group members have checked in today. Section leaders can see group-level progress for the Rock sections under them. The app has these boundaries, but does not explain them clearly.

A reader should know what is shared and what stays personal. An admin should know why their scope exists.

### 7. Interaction polish is concentrated in only a few places

The 3D home, progress bar, modal sheet, and primary button have motion, but much of the rest of the interface is visually static. Hover, focus, press, and reveal states are inconsistent.

The goal is not more animation everywhere. The goal is motion that communicates state, reward, hierarchy, or interactivity.

### 8. Some interactions do not produce meaningful value

The completion modal asks "Where did you read today?" but the selected location is not persisted or used after the modal closes. This creates an interaction that looks meaningful but has no product consequence.

Remove it in this pass rather than pretending it matters. If location becomes a future feature, add it deliberately with an explicit data model and privacy decision.

### 9. Admin mobile layout relies on horizontal table scrolling

The admin table has a desktop minimum width and scrolls horizontally on small screens. That works technically, but it is poor mobile information design for a dashboard that may be checked on the go.

Use cards on narrow screens and retain the table on wider screens.

## Experience model by campaign phase

The app already has four meaningful time periods. Design them as product states rather than only date conditions.

### Phase A: Pre-launch, before October 1

Goal: prepare, explain, and build anticipation.

Users should be able to:

- confirm their Connect Group,
- join a Connect Group if they have a code,
- set or edit their avatar,
- choose a Bible translation,
- understand how the group home works,
- see the entire 28-day Matthew plan,
- preview future chapter information,
- understand rewards before earning them,
- see that check-ins begin October 1.

They should not see repetitive "not yet" or failure-like states.

### Phase B: Active reading, October 1 to 28

Goal: make today's reading unmistakably primary while keeping social encouragement close.

Users should be able to:

- see today's chapter immediately,
- open the quick verse,
- check in after reading,
- catch up past chapters,
- see the effect of their check-in,
- see group momentum,
- inspect future days without checking them in,
- understand the next reward and next home stage.

### Phase C: Grace days, October 29 to 31

Goal: remove pressure while making unfinished chapters easy to finish.

Today should become a catch-up dashboard rather than an empty day.

Show:

- completion status,
- remaining unread chapters,
- the clearest next catch-up action,
- group completion status,
- celebration for readers who are already complete.

### Phase D: Closed, November 1 onward

Goal: celebrate and preserve the journey.

Today should become a compact completion summary with:

- chapters completed,
- rewards earned,
- final group home,
- a link to review Progress,
- no stale daily check-in language.

## Shared layout system

Introduce one responsive page frame and use it consistently.

### Breakpoints

Treat these as design targets, not device-specific hacks.

- Compact phone: 360 to 389px
- Standard phone: 390 to 479px
- Large phone / small tablet: 480 to 767px
- Tablet: 768 to 1023px
- Desktop: 1024px and above

### Width rules

- App shell maximum remains approximately 1120px.
- Header alignment should match the active page grid rather than use an unrelated width.
- Content cards should align to one of two page grids:
  - focused grid for onboarding and simple states,
  - full product grid for Today, Connect, Rewards, Progress, and Admin on desktop.
- Do not leave an empty desktop rail unless that rail communicates useful information.

### Mobile rules

- Primary actions should be easy to tap with a comfortable target of roughly 44px or larger where space allows.
- Preserve bottom-nav safe-area support.
- Avoid horizontal scrolling for core user experiences.
- Admin is the exception only during implementation transition. The finished state should use mobile cards instead of a horizontally scrolling table.

### Desktop rules

Use the width. Desktop should not simply center a 720px phone column inside a 1120px shell.

Prefer:

- purposeful two-column compositions,
- grouped side rails for secondary information,
- wider card internals,
- denser but still breathable vertical rhythm.

## Today tab

### Pre-launch Today

Do not show 28 locked reading cards on Home.

Recommended order:

1. Header and profile.
2. Pre-launch hero.
3. One "Day 1" preview card.
4. Readiness card.
5. Connect Group home preview.
6. Short "How this works" row.
7. Link-style action to view the full plan in Progress.

Suggested hero:

**Matthew starts October 1.**

One chapter a day. 28 chapters. Your Connect Group grows a shared home as you read together.

Suggested Day 1 preview:

- Day 1
- Matthew 1
- Opens October 1
- Quick verse preview is allowed
- No check-in button

Suggested readiness card:

- Avatar: Ready / Set up
- Connect Group: group name / Join a group
- Translation: NET / Edit

This gives the pre-launch user something useful to do without manufacturing daily lock screens.

### Active Today

Mobile order:

1. Header.
2. Hero.
3. Today's reading card.
4. Catch-up card, when needed.
5. Connect progress snapshot.
6. Who has read today.
7. Daily note.

Desktop composition:

- Left column: hero, today's reading, catch-up.
- Right column: Connect home snapshot, readers today, next group milestone.

The desktop right rail should be useful, not decorative.

### Reading card polish

- Keep current iconography.
- Make the whole visual hierarchy feel clearly actionable without making the entire card a button.
- Add a subtle desktop hover to the check-in CTA only.
- Keep Quick Verse visually secondary but clearly interactive.
- Animate the chapter mark and card state only when state changes, not continuously.

### Check-in completion

The completion moment should answer "what changed?"

Show:

- +10 personal/group coins,
- current personal reward progress,
- group home progress delta,
- stage upgrade celebration if the threshold was crossed.

If the home stage changes, animate the home transformation once.

Remove the current location picker in this UX pass.

## Connect tab

### Pre-launch Connect

Replace "Who's read today" with readiness language before October 1.

Recommended sections:

1. Connect Group identity.
2. Shared home preview.
3. "How your home grows" explainer.
4. Group roster as "Reading together this October."
5. Leader Tools for leaders.

Do not label every member "Not yet" before the reading window exists.

### Active Connect

Keep the existing core order but strengthen meaning.

Recommended order:

1. Connect identity.
2. Shared home.
3. Today's group read count.
4. Member roster.
5. Leader Tools, when applicable.

Leader Tools can stay high on desktop in a side rail because they are operational. On mobile, place them after the home and before the full roster.

### Member versus leader desktop layout

Member layout:

- Use the full product width.
- Shared home can span the full width or use a balanced two-column card.
- Roster uses the available width.
- Do not preserve an empty Leader Tools column.

Leader layout:

- Main column: home and roster.
- Side rail: join code, QR, nudge list, connect.favor.church link.

### How your home grows

Add a small action near the home card: **How your home grows**.

Open a modal or bottom sheet with plain-language copy:

**Every chapter your Connect Group reads adds to your shared progress. Your home grows by the percentage of Matthew your group has completed, so a group of 5 and a group of 15 can grow at the same pace.**

Then show the existing stages:

- Tent
- Trailer
- Cabin
- Apartment
- House
- Mansion

Optional secondary line:

**Coins celebrate every chapter. Group completion percentage decides the home stage.**

This distinction should be explicit because coins and stage progression are not the same calculation.

### Connect privacy note

Add a low-emphasis info affordance near the roster:

**People in your Connect Group can see whether you've checked in today. This app does not show how long you read or what Bible app you used.**

Do not over-promote the privacy note, but make it discoverable.

## Rewards tab

### Pre-launch

Keep Rewards visible before October because it helps explain the challenge.

Do not make the shelf feel like a wall of failure.

Use:

- "Starts October 1" context,
- visible reward silhouettes,
- clear chapter thresholds,
- a short line explaining that rewards are personal consistency markers.

### Active

- Earned rewards get a subtle one-time shine or lift when newly reached.
- Locked rewards remain visible but should not be so faded that labels become hard to read.
- On desktop, use a wider composition so the shelf and next-reward context do not feel like a narrow mobile card floating in the middle of the screen.
- Do not add new reward types in this pass.

## Progress tab

Progress is the correct place to show all future reading days.

### Pre-launch Progress

Replace zero-heavy progress statistics with a plan overview:

- 28 chapters
- 1 chapter a day
- October 1 to 28
- October 29 to 31 catch-up days

Then show the full October roadmap.

### Future days

Future days remain visible.

They should not look like unavailable Bible content. Use a neutral future state rather than repeating lock icons.

Tapping a future day can open a lightweight preview containing:

- date,
- Matthew chapter,
- chapter title or key passage,
- "Check-in opens October X."

Do not expose a future check-in action.

### Active calendar states

Define four states clearly:

- Read
- Today
- Catch up
- Upcoming

Use text, shape, border, or icon treatment in addition to color.

### Grace days

Add three explicit catch-up cells or a clear grace-period note after October 28 so users understand why the plan continues through October 31.

### Desktop

Keep the two-column structure, but align card tops and make the right rail carry meaningful secondary progress information.

## Profile

Profile remains the home for avatar and translation settings.

Add a small "About your reading data" section or link if space allows.

Suggested copy:

**Your chapter check-ins power your personal progress and your Connect Group's shared progress. Your Connect Group can see today's check-in status. Section leaders see group totals, not your private reading details.**

Do not make profile into a settings dashboard.

## Group picker, solo mode, and join flow

These screens are already appropriately focused, but can better explain consequences.

### Group picker

Add:

**This is the Connect Group your October reading will count toward. You can switch later. Past check-ins stay with the group they were recorded with.**

Do not change Rock membership from the picker.

### Solo mode

Clarify that solo reading still counts personally:

**You can start solo and join a Connect Group later. Your personal chapter progress stays with you.**

### Join confirmation

Clarify the Rock write in human language:

**Joining here adds you to this Connect Group in Favor's records.**

This is especially important because join by code is not only a local app preference.

## Admin dashboard

### Scope explanation

Replace the single scope sentence with a compact scope card.

For section-scoped users:

**Your view**

You're seeing the Connect Groups under the section or sections you lead in Favor's records. This dashboard shows group totals for your scope only.

For global users:

**Your view**

You have access to the full Connect Group tree for this dashboard.

Do not imply client-side filtering is the security boundary. The existing server-side scope resolution remains authoritative.

### Metric explanation

Add a small "How progress is calculated" affordance:

**Progress is completed chapter check-ins divided by active members x 28 chapters. This keeps group sizes comparable.**

### Mobile admin

Below the tablet breakpoint:

- retain the section accordion,
- render each group as a stacked data card,
- show Group, Campus, Members, Read today, Progress, and Home,
- avoid requiring horizontal table scrolling.

Desktop keeps the table.

### Chart

- Keep the existing Chart.js implementation.
- Improve legend readability and empty states.
- On pre-launch dates, show an intentional empty state rather than a chart that suggests missing data.

## Interaction and motion language

Motion should communicate meaning.

### Recommended motion

- Page enter: subtle fade/translate, approximately 180 to 240ms.
- Buttons: small press response.
- Progress bars: animate only when the value changes.
- Home stage: one-time transform when a stage changes.
- Coin chip: brief count bump after check-in.
- Newly earned reward: one-time shine or scale-in.
- Calendar hover on fine pointers: border and slight lift, no large motion.
- Cards that open sheets: small hover elevation on desktop.
- Bottom nav: active-state transition, no bouncing loop.

### Avoid

- looping decorative animation across large portions of the page,
- constant card floating,
- autoplay confetti,
- scroll-jacking,
- hover-only information,
- animation that shifts content layout.

### Accessibility

Honor `prefers-reduced-motion` for all non-essential motion.

The 3D home already supports keyboard arrow rotation. Keep that. Provide a single-pointer alternative to any drag-dependent action and keep Reset view available.

Use visible focus states on all interactive controls.

## Hover and pointer behavior

Only apply hover-specific motion under a fine-pointer capability query such as `@media (hover: hover) and (pointer: fine)`.

Do not add hover styling to non-interactive member cards or informational blocks because that falsely suggests clickability.

## Typography

Font families are frozen for this pass.

Allowed changes:

- larger small text where readability is weak,
- slightly tighter or wider line lengths,
- responsive heading scale,
- stronger minimum body size,
- improved line height,
- reduced use of 8px and 9px copy for meaningful information.

Recommended minimums:

- important helper/body copy: 12 to 14px minimum on phones,
- secondary labels: avoid dropping below 10px unless purely decorative,
- primary body copy: approximately 15 to 17px where space allows.

## Favicon

The current favicon is a generic blue geometric mark and is visually disconnected from the app.

The favicon may change because it is explicitly in scope.

Direction:

- keep it simple enough to read at 16 to 32px,
- use existing Read My Bible / Favor colors,
- visually reference reading plus home/growth,
- do not replace or redesign the in-app navigation icons.

A simple book plus home/tent silhouette is preferable to detailed illustration.

## Copy principles

Follow Favor voice:

- warm,
- direct,
- plain language,
- no church jargon,
- concise explanations near the moment of confusion,
- no long onboarding tutorial.

Prefer small contextual explanations and optional "How it works" sheets over permanent paragraphs everywhere.

## Acceptance criteria

### Pre-launch

- Today is useful before October 1 and contains setup plus anticipation content.
- No screen describes pre-launch users as behind, missed, or not yet reading.
- Full October reading plan is visible from Progress.
- Future check-ins are impossible.
- Future days can be previewed without implying the Bible content itself is locked.

### Layout

- Today, Connect, Rewards, Progress, onboarding, and Admin use a consistent horizontal frame.
- Ordinary Connect members do not receive an empty desktop Leader Tools column.
- No core user screen has accidental large empty rails on 1024px or wider viewports.
- Core user screens do not horizontally scroll at 360px.

### Information design

- A reader can discover how the home grows.
- A reader can discover what group members can see about their reading.
- A section leader can discover why their admin scope exists.
- Coins and normalized home-stage progress are not presented as the same mechanic.

### Motion

- Interactive components have coherent hover, focus, and press feedback.
- Reduced motion disables or greatly reduces non-essential motion.
- No meaningful information is available only on hover.

### Mobile

- Admin group data is readable without a horizontally scrolling table.
- Calendar states remain legible and tappable.
- Modals and sheets fit within the viewport and respect safe areas.

### Product integrity

- No Rock group structures change.
- No Rock role logic changes.
- No new Rock writes are introduced.
- No font family changes are introduced.
- No in-app icon replacements are introduced.
- Existing server-side date and access validation remains authoritative.
