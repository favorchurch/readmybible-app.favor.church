# Read My Bible UI/UX Audit Spec

Audit date: 2026-09-03
Source issue: https://github.com/favorchurch/readmybible-app.favor.church/issues/32
Repository: `favorchurch/readmybible-app.favor.church`

## Goal

Make Read My Bible feel complete before, during, and after the October 2026 Matthew reading challenge across phone, tablet, and desktop.

The app should preserve its current Favor visual language and game rules while becoming clearer, more responsive, more informative, and more intentional in how it uses motion and interaction.

A first-time reader should be able to answer these questions without guessing:

- What happens on October 1?
- What can I do before October 1?
- What does my Connect Group home mean?
- How does the home grow?
- What do coins do?
- Who can see that I read today?
- Why can I see this Connect Group or admin scope?
- What can I see now versus later?
- What happens if I miss a day?

## Hard constraints

This pass must not:

- change Connect Group structures, group types, membership roles, or section structures in Rock,
- add a new Rock write path,
- change existing Rock role mappings,
- replace the current in-app icon set,
- change font families,
- introduce individual rankings,
- expose `connect.favor.church` to non-leaders,
- weaken server-side access checks,
- weaken future-date check-in validation,
- add persistent reading-location tracking,
- introduce a database migration,
- create large decorative areas of empty space.

The favicon is the only icon exception and may be redesigned.

Font sizes, line heights, card widths, spacing, responsive breakpoints, motion, and information order may change.

## Current-state findings

### Pre-launch Today is too empty

Before October 1, `TodayScreen` currently returns only a header, headline, and one sentence. The app is already live before launch, so this feels like a waiting room instead of a useful product state.

### Desktop alignment is inconsistent

The app uses several width systems at once:

- the top bar uses a wider frame,
- Today and Rewards mostly use a 720px content column,
- Connect and Progress use two-column desktop grids,
- onboarding screens use a focused 560px layout,
- Admin has its own 1120px rules.

The most visible issue is Connect. Its desktop grid reserves a right rail for Leader Tools. Ordinary members do not render Leader Tools, so the layout can leave a large unused rail.

### The home mechanic is under-explained

The UI says chapters add coins to the group home, but the actual home stage is driven by normalized group completion ratio:

`group check-ins / (active group members x 28)`

That is a good fairness rule because group size does not decide who progresses faster, but the current UI makes readers infer it.

### Future reading visibility is conceptually unclear

Progress already shows future days, but it does not clearly distinguish between:

- a future chapter being visible,
- its check-in being unavailable until its assigned date.

The Bible itself should never feel locked.

### Pre-launch zero states look like incomplete states

Before October:

- Connect can show everyone as `Not yet`,
- Rewards is entirely locked,
- Progress emphasizes zero values.

These states are technically correct but experientially wrong before the challenge begins.

### Privacy and scope are not explained enough

Connect members can see whether other members checked in today. Section leaders can see group totals for Rock sections they are authorized to see. These boundaries exist in code but are not explained clearly enough in the interface.

### Motion is uneven

The 3D home, progress bar, modal sheet, and primary button have motion, while many other actionable elements are visually static. Hover, focus, press, reveal, and state-change behavior is inconsistent.

### The completion location picker has no consequence

The completion flow asks where the person read, but that choice is not persisted or used. It looks meaningful without actually affecting the product.

Remove it in this pass.

### Admin mobile depends on horizontal table scrolling

The admin table has a desktop minimum width and scrolls horizontally on narrow screens. This is functional but not a strong mobile dashboard experience.

## Experience model by campaign phase

### Phase A: Pre-launch, before October 1

Goal: prepare, explain, and build anticipation.

Users should be able to:

- confirm their Connect Group,
- join a Connect Group with a leader code,
- set or edit their avatar,
- choose a Bible translation,
- understand how the shared home works,
- see the complete 28-day Matthew roadmap,
- preview future chapter information,
- understand rewards before earning them,
- see clearly that check-ins begin October 1.

Pre-launch should not use language that implies people are already behind.

### Phase B: Active reading, October 1 to 28

Goal: make today's reading the strongest action while keeping group encouragement nearby.

Users should be able to:

- see today's chapter immediately,
- open Quick Verse,
- check in after reading,
- catch up past chapters,
- see what their check-in affected,
- see group momentum,
- preview future days without checking them in,
- understand the next personal reward and next group home milestone.

### Phase C: Grace days, October 29 to 31

Goal: make unfinished reading easy to complete without pressure.

Today should become a catch-up dashboard that shows:

- chapters completed,
- unread chapters,
- the clearest next catch-up action,
- group completion status,
- a completed state for readers already at 28 chapters.

### Phase D: Closed, November 1 onward

Goal: celebrate and preserve the journey.

Today should show a compact final summary with:

- chapters completed,
- rewards earned,
- final Connect Group home,
- an action to review Progress,
- no stale daily check-in language.

## Shared responsive layout system

Introduce one shared page-frame system rather than fixing each page with isolated margins.

### Target viewport groups

- Compact phone: 360 to 389px
- Standard phone: 390 to 479px
- Large phone and small tablet: 480 to 767px
- Tablet: 768 to 1023px
- Desktop: 1024px and wider

These are design targets, not exact device assumptions.

### Shared rules

- Keep the app-shell maximum around 1120px unless visual QA proves a smaller cap is better.
- Align the top bar with the active page grid.
- Use a focused frame for onboarding and simple states.
- Use a full product frame for Today, Connect, Rewards, Progress, and Admin on desktop.
- Avoid empty desktop rails unless they carry meaningful secondary information.
- Do not horizontally scroll core reader experiences at 360px.
- Preserve bottom-nav safe-area handling.
- Make important tap targets roughly 44px or larger where practical.

## Today

### Pre-launch Today

Do not show 28 locked daily cards on Home.

Recommended order:

1. Header and profile.
2. Pre-launch hero.
3. Day 1 preview card.
4. Readiness card.
5. Connect Group home preview.
6. Short `How this works` explainer.
7. Action to view the full roadmap in Progress.

Suggested hero:

**Matthew starts October 1.**

One chapter a day. 28 chapters. Your Connect Group grows a shared home as you read together.

Day 1 preview should show:

- Day 1,
- Matthew 1,
- October 1,
- the key passage preview,
- no check-in action.

Readiness should surface:

- avatar status,
- active Connect Group,
- Bible translation.

### Active Today

Mobile order:

1. Header.
2. Hero.
3. Today's reading.
4. Catch-up, when needed.
5. Connect home snapshot.
6. Readers today.
7. Closing note.

Desktop composition:

- main column: hero, today's reading, catch-up,
- side rail: group home snapshot, readers today, next home milestone.

If there is no active group, the side rail should collapse rather than remain empty.

### Reading-card interaction

- Keep existing iconography.
- Keep Quick Verse secondary but obviously interactive.
- Apply desktop hover only to real controls.
- Animate state changes, not idle cards.
- Do not make the whole reading card behave like a button if only specific controls are actionable.

### Completion flow

Remove the current reading-location picker.

The completion moment should show:

- +10 coins,
- personal reward progress,
- updated group home progress when a group exists.

A home-stage celebration may only be shown when the client can reliably establish that the stage crossed a threshold. Do not change the `checkIn` write contract solely to manufacture a transition animation. If reliable before-and-after values are not already available, refresh the aggregate UI and skip the explicit stage-transition claim.

## Connect

### Pre-launch

Use readiness language instead of daily completion language.

Recommended order:

1. Connect identity.
2. Shared home preview.
3. `How your home grows` explainer.
4. Roster framed as `Reading together this October`.
5. Leader Tools for leaders.

Do not show every person as `Not yet` before the challenge begins.

### Active

Recommended order:

1. Connect identity.
2. Shared home.
3. Today's group read count.
4. Member roster.
5. Leader Tools, when applicable.

### Member desktop layout

Ordinary members should use the available product width.

- No empty Leader Tools rail.
- Home can span full width or use a balanced internal two-column card.
- Roster should use the useful width.

### Leader desktop layout

- Main column: home and roster.
- Side rail: join code, QR, still-reading nudge, and `connect.favor.church` link.

On mobile, Leader Tools should appear after the home and before the full roster.

### Explain home growth

Add a small `How your home grows` action.

Suggested explanation:

**Every chapter your Connect Group reads adds to your shared progress. Your home grows by the percentage of Matthew your group has completed, so a group of 5 and a group of 15 can grow at the same pace.**

Also state:

**Coins celebrate every chapter. Group completion percentage decides the home stage.**

Show the existing stages:

- Tent
- Trailer
- Cabin
- Apartment
- House
- Mansion

### Connect privacy note

Add a discoverable low-emphasis explanation near the roster:

**People in your Connect Group can see whether you've checked in today. This app does not show how long you read or what Bible app you used.**

## Rewards

### Pre-launch

Keep Rewards visible before October because it helps explain the challenge.

Use:

- `Starts October 1` context,
- visible reward silhouettes,
- clear chapter thresholds,
- a short explanation that rewards celebrate personal consistency.

Do not make the shelf feel like a wall of failure.

### Active

- Keep existing reward thresholds.
- Improve locked-state text contrast.
- Use a wider desktop composition.
- Newly earned rewards may receive a one-time visual emphasis when the transition is reliably known.
- Do not add reward types.

## Progress

Progress is the authoritative place to understand the full plan.

### Pre-launch

Replace zero-heavy statistics with plan facts:

- 28 chapters,
- 1 chapter a day,
- October 1 to 28 reading days,
- October 29 to 31 catch-up days.

Then show the full October roadmap.

### Calendar states

Define these states clearly:

- Read
- Today
- Catch up
- Upcoming

Meaning must not depend on color alone.

### Future days

Future chapters stay visible.

Tapping an upcoming day may open a lightweight preview with:

- date,
- Matthew chapter,
- chapter title or key passage,
- `Check-in opens October X.`

Do not show a future check-in action.

The wording must make clear that only the app check-in is date-gated, not Scripture itself.

### Grace days

Represent October 29 to 31 clearly as catch-up days, either through dedicated cells or an adjacent grace-period treatment.

## Profile

Keep Profile focused on avatar and translation.

Add a small `About your reading data` explanation or sheet:

**Your chapter check-ins power your personal progress and your Connect Group's shared progress. Your Connect Group can see today's check-in status. Section leaders see group totals in their dashboard, not your private reading details.**

Do not turn Profile into a general settings dashboard.

## Group picker, solo, and join

### Group picker

Clarify that selecting a group chooses where future app check-ins are attributed while that group is active. It must not imply the picker changes Rock membership.

Suggested explanation:

**This is the Connect Group your October reading will count toward. You can switch later. Past check-ins stay with the group they were recorded with.**

### Solo mode

Clarify that personal progress remains valid:

**You can start solo and join a Connect Group later. Your personal chapter progress stays with you.**

### Join confirmation

Clarify the existing Rock write:

**Joining here adds you to this Connect Group in Favor's records.**

The actual join behavior and Rock membership structure remain unchanged.

## Admin

### Scope card

Replace the current single scope line with a compact explanation.

Section-scoped copy:

**Your view**

You're seeing the Connect Groups under the section or sections you lead in Favor's records. This dashboard shows group totals for your scope only.

Global copy:

**Your view**

You have access to the full Connect Group tree for this dashboard.

The existing server-side `resolveAdminScope()` decision remains authoritative. Client presentation must never be treated as the access boundary.

### Progress calculation

Add a `How progress is calculated` explanation:

**Progress is completed chapter check-ins divided by active members x 28 chapters. This keeps group sizes comparable.**

### Mobile Admin

Below the tablet breakpoint:

- keep the section accordion,
- show groups as stacked data cards,
- include Group, Campus, Members, Read today, Progress, and Home,
- avoid requiring horizontal table scrolling.

Keep the semantic table for wider layouts.

### Chart

- Keep Chart.js.
- Improve legend readability and wrapping.
- Before launch, render an intentional pre-launch empty state rather than implying missing data.

## Motion and interaction language

Motion should explain state, reward, hierarchy, or interactivity.

Recommended motion:

- page entry: subtle fade/translate around 180 to 240ms,
- button press: small scale or position response,
- progress bar: animate only when value changes,
- home transformation: one time when a real stage change is known,
- coin chip: brief count bump after check-in,
- newly earned reward: one-time shine or scale-in,
- calendar hover on fine pointers: border plus slight lift,
- bottom-nav active state: subtle transition.

Avoid:

- looping card floating,
- autoplay confetti,
- scroll-jacking,
- hover-only information,
- motion that causes layout shift,
- decorative animation across large portions of the screen.

Only use hover-specific styling inside a fine-pointer media query such as:

```css
@media (hover: hover) and (pointer: fine) { ... }
```

Do not add hover elevation to non-interactive member cards or static information blocks.

## 3D home interaction

Keep:

- drag and swipe rotation,
- arrow-key rotation,
- Reset view.

Improve discoverability without making drag the only way to inspect the object.

If explicit rotate controls are added, reuse existing directional symbols rather than replacing the icon system.

## Accessibility

- Preserve visible focus states.
- Sheets and dialogs must close with Escape and restore focus where appropriate.
- New motion must honor `prefers-reduced-motion`.
- No meaningful information may depend on hover.
- Calendar states must not rely on color alone.
- Drag must not be the only way to operate an interactive object.
- Mobile tap targets should be comfortably usable.
- Modals and sheets must respect viewport height and safe areas.

## Typography

Font families are frozen.

Allowed changes include:

- larger meaningful small text,
- improved line height,
- stronger body-size minimums,
- responsive heading scale,
- better line lengths,
- less reliance on 8px and 9px text for meaningful information.

Guidance:

- important helper/body copy: roughly 12 to 14px minimum on phones,
- secondary labels: avoid below 10px unless decorative,
- primary body copy: roughly 15 to 17px where space allows.

## Favicon

The existing favicon is visually disconnected from the app.

The favicon may change in this pass.

Direction:

- simple enough to read at 16 to 32px,
- use the existing Read My Bible / Favor palette,
- reference reading plus home or growth,
- prefer a simple book plus home/tent silhouette,
- do not change in-app navigation or feature icons.

## Copy principles

Follow Favor voice:

- warm,
- direct,
- plain language,
- concise,
- no insider-heavy church jargon,
- explain things near the moment of confusion,
- prefer small contextual explanations or optional sheets over a long onboarding tutorial.

## Acceptance criteria

### Pre-launch

- Today is useful before October 1 and contains setup, explanation, and anticipation content.
- No pre-launch screen describes readers as behind or incomplete.
- The full October reading plan is visible from Progress.
- Future days are previewable without implying the Bible itself is locked.
- Future check-ins remain impossible.

### Layout

- Today, Connect, Rewards, Progress, onboarding, and Admin use a coherent horizontal frame.
- Ordinary Connect members do not receive an empty desktop Leader Tools column.
- Core screens do not have accidental large empty rails at 1024px and wider.
- Core reader screens do not horizontally scroll at 360px.

### Information design

- A reader can discover how the home grows.
- A reader can discover what their Connect Group can see about their reading.
- A section leader can discover why their admin scope exists.
- Coins and normalized home-stage progression are clearly distinguished.

### Motion and accessibility

- Interactive controls have coherent hover, focus, and press feedback.
- Reduced motion disables or greatly reduces non-essential motion.
- No meaningful information is hover-only.
- Calendar state meaning does not rely on color alone.
- 3D home inspection is not drag-only.

### Mobile

- Admin group data is readable without a horizontally scrolling table.
- Calendar states remain legible and tappable.
- Modals and sheets fit the viewport and respect safe areas.

### Product integrity

- No Rock group structure changes.
- No Rock role logic changes.
- No new Rock write paths.
- No database migration.
- No font-family changes.
- No in-app icon replacements.
- `connect.favor.church` remains leader-only.
- Existing server-side date and access validation remains authoritative.
