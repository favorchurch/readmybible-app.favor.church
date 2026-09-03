# Read My Bible UI/UX Implementation Plan

Plan date: 2026-09-03
Source spec: `intent/UI-UX-SPEC.md`
Baseline: `main` at `d597869cb9cb0e055cc62ed4fb1e92c0dac4b760`

## Objective

Implement the UI/UX audit without changing the core reading-plan rules, Rock structures, access model, fonts, or in-app icon set.

This should be treated as one coordinated experience pass, not a pile of isolated CSS fixes.

## Non-negotiable constraints

Do not:

- change Connect Group types, group membership structures, section structures, or role mappings in Rock,
- add Rock writes,
- replace in-app navigation or feature icons,
- change font families,
- weaken server-side access checks,
- weaken server-side future-date check-in validation,
- introduce individual rankings,
- expose `connect.favor.church` to non-leaders,
- add persistent reading-location collection,
- create a large amount of decorative negative space.

The favicon may change.

## Primary files likely to change

### Core app

- `components/app-shell.tsx`
- `components/completion-flow.tsx`
- `components/rotatable-home.tsx`
- `components/profile-editor.tsx`
- `components/progress-bar.tsx`
- `app/globals.css`

### Date and plan helpers

- `components/use-today.ts`
- `lib/plan.ts`
- `lib/game.ts` only if a new pure display helper is genuinely needed

### Admin

- `app/admin/page.tsx`
- `app/admin/SectionTree.tsx`
- `app/admin/admin.css`

### Join/onboarding

- `app/join/[code]/page.tsx`
- `components/join-confirm.tsx`

### Assets

- `public/favicon.svg`
- `public/favicon.ico` if regenerated from the SVG
- `public/apple-touch-icon.png` only if visual consistency requires it

### Documentation

- `intent/COPY.md`
- `intent/FLOWS.md` only if UI flow descriptions materially change
- `intent/DECISIONS.md` only for new durable product decisions

## Implementation sequence

## Phase 1: Build the shared responsive page frame

### Goal

Remove the current pattern where each screen invents its own desktop width and alignment rules.

### Work

1. Introduce shared CSS layout primitives in `app/globals.css`, for example:
   - focused content frame,
   - full product frame,
   - two-column product grid,
   - secondary rail,
   - full-width span utility.
2. Align the top bar to the active screen frame.
3. Normalize vertical rhythm between header, hero/page title, and first card.
4. Add explicit breakpoint behavior for 360, 390, 480, 768, and 1024+ classes of viewport without overfitting to exact devices.
5. Keep the existing 1120px app-shell maximum unless visual QA proves it should shrink slightly.

### Acceptance

- Switching between Today, Connect, Rewards, and Progress no longer visibly shifts the main horizontal alignment system.
- At 1024px and wider, no screen looks like a narrow mobile column floating inside a large blank shell unless it is intentionally an onboarding screen.
- At 360px, no core screen horizontally scrolls.

## Phase 2: Make campaign phase a first-class presentation state

### Goal

Give pre-launch, active, grace-day, and closed states intentional UI behavior.

### Work

1. Keep `planPhase()` as the source of pre-launch / active / closed truth.
2. Add a display-level helper for grace days if needed, based on active phase plus October day 29 to 31.
3. Avoid coupling visual components directly to ad hoc date-string checks.
4. Pass phase-aware state into Today, Connect, Rewards, and Progress where necessary.

### Tests

Add or update pure tests for:

- Sep 30 => pre-launch,
- Oct 1 => active day 1,
- Oct 28 => active day 28,
- Oct 29 to 31 => active grace period with no new chapter,
- Nov 1 => closed.

Do not change check-in validation semantics.

## Phase 3: Rebuild pre-launch Today

### Goal

Turn Today from a holding screen into onboarding and anticipation.

### Work in `components/app-shell.tsx`

Replace the current pre-launch early return with a composed screen containing:

1. Header.
2. Hero:
   - `Matthew starts October 1.`
   - short challenge explanation.
3. Day 1 preview card:
   - Matthew 1,
   - October 1,
   - key passage preview allowed,
   - no check-in action.
4. Readiness card:
   - avatar status,
   - active Connect Group status,
   - translation status.
5. Shared home preview.
6. Short 3-step explainer:
   - Read a chapter.
   - Check in.
   - Grow your Connect Group's home together.
7. Action that switches to Progress to view the full plan.

### Interaction

- Clicking avatar readiness opens the existing Profile Editor.
- Connect status is informational when already in a group.
- Do not invent a new Rock membership-management flow.

### Desktop

Use a useful two-column composition:

- left: hero and Day 1 preview,
- right: readiness, home preview, how-it-works.

### Mobile

Stack in the order above.

## Phase 4: Make active Today stronger on desktop

### Goal

Use desktop width without changing the mobile hierarchy.

### Work

1. Keep today's reading as the primary content.
2. At desktop breakpoint, split into:
   - main column: hero, reading, catch-up,
   - secondary rail: group home snapshot, readers today, next home milestone.
3. Ensure the right rail disappears naturally when there is no active group rather than leaving an empty column.
4. Keep Quick Verse secondary but clearly interactive.

### Motion

- Reading-card state transition on completed check-in.
- Progress-bar change animation.
- Coin count bump.
- No looping animation.

## Phase 5: Improve the completion flow

### Goal

Make the post-check-in experience explain the consequence of the action.

### Work in `components/completion-flow.tsx`

1. Remove the reading-location picker.
2. Keep the honor-based check-in message.
3. On successful completion show:
   - +10 coins,
   - personal next reward progress,
   - group home progress if in a group.
4. Detect whether the home stage changed across refresh if practical without adding persisted state.
   - Preferred approach: have the server action return enough post-write aggregate information for the current group, if this can be done without broadening data writes.
   - Simpler acceptable approach: animate the updated home after router refresh and do not claim a stage transition if it cannot be reliably known.
5. If a new reward threshold is crossed, allow a one-time reward emphasis.

### Caution

Do not add new database fields solely to track whether a celebration has already been seen. Repeated page visits should not autoplay celebrations.

## Phase 6: Fix Connect member and leader layouts

### Goal

Eliminate the empty desktop right column for non-leaders and improve role-specific hierarchy.

### Work

1. Add a role-sensitive class to the Connect screen, for example:
   - `connect-screen member-layout`,
   - `connect-screen leader-layout`.
2. Member desktop:
   - home uses full or balanced width,
   - roster spans the useful width,
   - no phantom Leader Tools rail.
3. Leader desktop:
   - main column: home plus roster,
   - side rail: Leader Tools.
4. Mobile leader order:
   - home,
   - Leader Tools,
   - roster.
5. Keep `connect.favor.church` inside the leader-only tools block.

## Phase 7: Add home-mechanic explanation

### Goal

Explain the difference between coins and normalized home progression.

### Work

1. Add `How your home grows` action near the home card.
2. Reuse the existing modal/sheet visual language rather than introducing a new pattern.
3. Explain:
   - every chapter contributes,
   - group completion percentage drives stage,
   - group size is normalized,
   - coins celebrate chapter check-ins,
   - stages run Tent to Mansion.
4. Use the existing home stage visuals where possible.

### Accessibility

- Button must be keyboard reachable.
- Sheet must close with Escape and restore focus.
- No information is hover-only.

## Phase 8: Make Connect phase-aware

### Pre-launch

1. Replace `Who's read today` with `Reading together this October`.
2. Show roster without read/not-read dimming.
3. Remove `Still reading` leader nudge before October 1.
4. Keep join code and QR useful before launch.
5. Add the home explainer.

### Active

Keep current read status and leader nudges.

### Grace period

Change today's framing to completion/catch-up language where appropriate.

### Closed

Keep final home and roster summary but remove stale daily-nudge language.

## Phase 9: Add privacy and scope microcopy

### Connect

Add a low-emphasis info action near the roster:

- group members can see today's check-in status,
- the app does not expose reading duration or Bible app choice.

### Profile

Add `About your reading data` copy or sheet:

- personal progress follows the person,
- Connect Group sees today's check-in status,
- section leaders see group totals,
- avoid promising privacy properties that are not enforced by the current backend.

### Join confirmation

Add explicit copy that joining writes membership into Favor's records.

### Group picker

Clarify that choosing an active group is a reading-attribution preference and does not rewrite existing Rock memberships.

## Phase 10: Reframe Rewards for pre-launch and desktop

### Work

1. Keep Rewards visible before launch.
2. Add a compact pre-launch intro:
   - `Rewards start October 1.`
   - `They celebrate consistency, not comparison.`
3. Increase locked-state text contrast enough to remain readable.
4. Add one-time visual emphasis for newly earned rewards only when state transition is known.
5. Improve desktop composition:
   - use available width,
   - keep shelf as the visual hero,
   - pair next reward/context alongside or beneath based on width.

Do not add reward types.

## Phase 11: Rebuild Progress as the reading roadmap

### Goal

Make Progress the authoritative place to understand the full 28-day plan.

### Pre-launch

Replace zero-dominant stats with plan facts:

- 28 chapters,
- one chapter a day,
- Oct 1 to 28,
- Oct 29 to 31 catch-up.

### Calendar

Define explicit rendering states:

- read,
- today,
- catch-up,
- upcoming.

Future entries:

- visible,
- tappable for preview,
- never check-in enabled.

### Future-day preview

Create a small reusable sheet/modal displaying:

- date,
- chapter,
- title/key passage,
- `Check-in opens October X.`

Do not imply that scripture cannot be read early. Only the app check-in is date-gated.

### Grace period

Add clear visual treatment for Oct 29 to 31 as catch-up days.

### Desktop

Keep a two-column layout, but align major cards and avoid uneven top offsets.

## Phase 12: Improve onboarding and join flows

### Group picker

Add copy explaining:

- this group receives future reading attribution while active,
- past check-ins remain with the group recorded at the time,
- choosing here does not change Rock membership.

### Solo mode

Add:

- personal progress remains valid,
- the user can join later with a leader's code.

### Join page

Add:

- `Joining here adds you to this Connect Group in Favor's records.`

Keep the existing login requirement and Rock write path unchanged.

## Phase 13: Improve admin information design

### Scope card

In `app/admin/page.tsx`:

1. Replace the plain scope line with a compact card.
2. Section scope copy:
   - explain that visible groups come from sections the person leads in Favor's records.
3. Global scope copy:
   - explain full-tree access.
4. Add `How progress is calculated` affordance.

### Mobile data cards

In `SectionTree.tsx`:

1. Preserve semantic table for tablet/desktop.
2. Add a mobile card representation below 768px.
3. Do not render both as visible content simultaneously.
4. Each card shows:
   - Group,
   - Campus,
   - Members,
   - Read today,
   - Progress,
   - Home.

### Chart

- Add intentional pre-launch empty state.
- Improve legend wrapping and readability.
- Do not add new chart libraries.

## Phase 14: Standardize interaction states

### Buttons and clickable cards

Add consistent:

- hover,
- focus-visible,
- active/press,
- disabled states.

Use hover-only styles inside:

```css
@media (hover: hover) and (pointer: fine) { ... }
```

### Do not fake affordances

Do not add hover elevation to:

- non-clickable member cards,
- static information cards,
- purely decorative rewards that do not open anything.

### Motion tokens

Add a small set of custom properties or consistent durations:

- fast press: ~120 to 160ms,
- normal state change: ~180 to 240ms,
- progress/home transform: ~300 to 500ms.

Keep existing reduced-motion support and extend it to all new animations.

## Phase 15: Improve 3D home interaction

### Keep

- drag/swipe rotation,
- arrow-key rotation,
- reset control.

### Improve

1. Make the rotation hint more discoverable on first view without increasing permanent clutter.
2. Consider explicit left/right rotation buttons on touch devices only if user testing shows drag is unclear.
3. If buttons are added, reuse existing directional symbols rather than introducing a new icon set.
4. Keep keyboard support.
5. Never make drag the only way to inspect the home.

## Phase 16: Typography readability pass

### Goal

Improve readability without changing fonts.

### Work

Audit all 8px and 9px meaningful text in `app/globals.css` and `app/admin/admin.css`.

Raise sizes where the text communicates actual product meaning, especially:

- helper copy,
- status labels,
- member state labels,
- reward descriptions,
- calendar labels,
- admin metadata,
- rotate instructions.

Decorative eyebrow labels may remain small when contrast and spacing are sufficient.

## Phase 17: Favicon refresh

### Goal

Replace the generic blue geometric favicon with a Read My Bible-specific mark.

### Direction

- simple book + home/tent concept,
- existing Favor palette,
- recognizable at 16 to 32px,
- no detailed illustration,
- do not change in-app icons.

### Files

- `public/favicon.svg`
- regenerate `public/favicon.ico`
- review `apple-touch-icon.png` only for consistency, not because it is mandatory.

## Phase 18: Copy synchronization

Update `intent/COPY.md` so the implementation has one approved copy source.

Add sections for:

- pre-launch Today,
- readiness card,
- how the home grows,
- future-day preview,
- privacy note,
- admin scope explanation,
- progress calculation explanation,
- join writes to Favor records,
- pre-launch Rewards,
- grace-day Today.

Run Favor copy QA:

- English only,
- no em dash,
- no `fam`,
- `Connect Group` on first mention,
- plain language,
- no unnecessary church jargon.

## Phase 19: Accessibility QA

### Keyboard

Verify:

- all buttons and tab navigation,
- Quick Verse,
- home explainer,
- privacy explainer,
- future-day previews,
- profile editor,
- completion flow,
- 3D home rotation,
- admin accordions.

### Focus

- visible focus on every interactive element,
- modal focus restoration,
- no focus trapped behind a sheet.

### Motion

- `prefers-reduced-motion` suppresses new non-essential motion.

### Pointer

- no drag-only requirement,
- mobile targets are comfortably tappable,
- hover is never required to discover content.

### Visual states

Calendar and status meaning must not rely on color alone.

## Phase 20: Responsive QA matrix

Manually verify at minimum:

- 360 x 800
- 390 x 844
- 430 x 932
- 768 x 1024
- 1024 x 768
- 1280 x 800
- 1440 x 900

Test these user states:

1. Pre-launch member with one Connect Group.
2. Pre-launch Connect leader.
3. Person in multiple Connect Groups.
4. Solo reader.
5. Active reader, not yet checked in today.
6. Active reader, checked in today.
7. Reader with a missed chapter.
8. Oct 29 to 31 grace day.
9. Closed plan.
10. Section-scoped admin.
11. Global admin.
12. No-admin-access user.

## Phase 21: Automated test coverage

Add tests where behavior is pure or stable enough to protect.

### Date/state tests

- campaign phase,
- future-day rendering helper,
- grace-day helper.

### Game-copy logic

If any new helper determines:

- home progress text,
- stage transitions,
- future/check-in state,

cover it with Vitest.

### Component tests

Only add if the repository already has a lightweight established pattern. Do not introduce a large testing framework solely for this pass.

## Phase 22: Build and review gates

Before merge:

1. `pnpm lint`
2. `pnpm test`
3. `pnpm build`
4. manual responsive QA matrix
5. logged-in production-like test with a member
6. logged-in test with a Connect leader
7. admin test with section scope
8. reduced-motion check
9. keyboard-only pass

## Suggested implementation slices

To keep reviewable diffs, execute in these slices.

### Slice A: Layout foundation + phase state

- shared frame,
- breakpoint cleanup,
- phase helper,
- Today pre-launch.

### Slice B: Connect + home explanation

- member/leader desktop layouts,
- pre-launch Connect,
- home explainer,
- privacy copy.

### Slice C: Progress + future-day previews

- pre-launch roadmap,
- future states,
- grace days,
- preview sheet.

### Slice D: Rewards + completion flow

- remove location picker,
- stronger completion consequence,
- pre-launch Rewards,
- new reward motion.

### Slice E: Admin + onboarding copy

- admin scope card,
- mobile admin cards,
- group picker/solo/join explanations.

### Slice F: Interaction polish + favicon + QA

- hover/focus/press consistency,
- typography readability,
- 3D interaction polish,
- favicon,
- docs sync,
- full QA.

## Self-review checklist

Before considering the implementation finished, answer yes to all of these.

- Does pre-launch feel like a real product state rather than a disabled product?
- Is Today still clearly the primary daily action during October?
- Can a person understand the home mechanic without reading technical documentation?
- Are coins and home-stage progression clearly distinguished?
- Can a person see the full future reading plan without being able to check future chapters in?
- Does Connect avoid empty desktop space for ordinary members?
- Are leaders' operational controls easy to reach without dominating member UX?
- Does pre-launch avoid labeling people as behind or incomplete?
- Can a reader understand what the group can see about their reading?
- Can a section leader understand why they see their admin subtree?
- Is mobile admin usable without horizontal scrolling?
- Are all new hover effects limited to real interactive controls?
- Does reduced motion meaningfully reduce motion?
- Are font families unchanged?
- Are in-app icons unchanged?
- Are Rock structures and role mappings unchanged?
- Are future check-ins still blocked server-side?
- Is `connect.favor.church` still leader-only?
- Did no new Rock write path get introduced?
- Does `pnpm build` pass?

## Deliberately deferred

These are reasonable future ideas but should not be smuggled into this pass.

- reminders or notifications,
- new reward types,
- social sharing,
- persistent reading-location tracking,
- new Bible plans,
- Rock photo avatars,
- changes to Connect Group structure,
- individual leaderboards,
- full PWA/offline redesign,
- new font families,
- replacement of the established icon set.
