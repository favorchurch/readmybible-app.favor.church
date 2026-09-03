# Improve Read My Bible pre-launch, responsive, and information UX - Implementation Plan

## Source

- Issue: https://github.com/favorchurch/readmybible-app.favor.church/issues/32
- Spec: `intent/UI-UX-SPEC.md`
- Repository: `favorchurch/readmybible-app.favor.church`

## Goal

Implement the UI/UX audit as one coordinated experience pass so Read My Bible feels intentional before, during, and after the October Matthew challenge across phone, tablet, and desktop without changing the reading rules, Rock structures, permissions model, fonts, or in-app icon set.

## Scope

### In scope

- Rebuild pre-launch Today into useful onboarding and anticipation.
- Keep the full October roadmap visible while future check-ins remain unavailable.
- Introduce a consistent responsive page-frame system.
- Fix ordinary-member Connect desktop layouts so they do not inherit an empty Leader Tools rail.
- Improve Connect leader layout and ordering.
- Explain home growth, coins versus normalized group progress, reading visibility, and admin scope.
- Make Rewards and Progress phase-aware before launch.
- Improve completion feedback and remove the non-persistent reading-location picker.
- Improve mobile Admin information design.
- Standardize hover, focus, press, motion, and reduced-motion behavior.
- Improve small-text readability without changing font families.
- Refresh the favicon only.
- Update approved copy and relevant intent documentation when the implementation changes user-facing behavior.

### Out of scope

- Connect Group structure, group types, section structure, or role changes in Rock.
- New Rock write paths.
- Database migrations or new persisted reading-location data.
- Changes to the check-in date rules.
- Changes to server-side admin scope or authorization semantics.
- Individual rankings.
- New reward types.
- Social sharing, reminders, or notifications.
- New Bible plans.
- Font-family replacement.
- Replacement of the established in-app icon set.
- Exposure of `connect.favor.church` to non-leaders.

## Current state

### App shell and navigation

`components/app-shell.tsx` owns the four core tabs and most of the current user-facing screen composition.

- `TodayScreen` has a special pre-launch early return with only a headline and one sentence.
- `ConnectScreen` renders role-gated Leader Tools inside the same desktop grid used by ordinary members.
- `RewardsScreen` always renders the reward shelf from current chapter count.
- `ProgressScreen` always emphasizes progress values and the October calendar.
- Bottom navigation is shared across the app.

### Campaign date state

`components/use-today.ts` derives the device-local date and calls helpers in `lib/plan.ts`.

`lib/plan.ts` defines:

- `PLAN_START = 2026-10-01`,
- `PLAN_END = 2026-10-31`,
- Matthew 1 to 28 on October 1 to 28,
- October 29 to 31 as active grace days with no new chapter,
- pre-launch, active, and closed phases.

Future-date check-in validation is server-side and must remain authoritative.

### Game mechanics

`lib/game.ts` defines:

- 10 coins per chapter,
- personal reward thresholds at 3, 7, 14, 21, and 28 chapters,
- group home stages from Tent to Mansion,
- group stage based on normalized completion ratio rather than raw coin count.

The current UI exposes coins and home stages but does not explain the distinction clearly.

### Check-in action

`app/actions/checkIn.ts` currently returns only:

- `{ ok: true }`, or
- `{ ok: false, error }`.

It inserts one check-in row per person/chapter, derives the reading date server-side, and clears group/campus caches.

The UX pass should not broaden this write contract just to enable celebratory animation. If a before-and-after stage transition cannot be established reliably from already available read-only state, refresh the aggregate UI and skip the explicit stage-change claim.

### Connect and Rock behavior

The app reads active Connect Group memberships and roster data from Rock.

- Member role: 23
- Leader role: 24
- Assistant Leader role: 81

Join-by-code is an existing Rock write and remains unchanged.

`connect.favor.church` is leader-only and stays inside Leader Tools.

### Admin

`app/admin/page.tsx` resolves scope server-side through `resolveAdminScope()`.

- allowlisted admins see the global Connect tree,
- active Group Type 24 section members see only their authorized subtrees,
- other users do not receive admin access.

`app/admin/SectionTree.tsx` renders a semantic table with a minimum desktop width, which currently requires horizontal scrolling on narrow screens.

### Styling and interaction

`app/globals.css` already contains:

- safe-area-aware bottom navigation,
- responsive breakpoints,
- page-enter animation,
- button hover/press states,
- progress animation,
- modal-sheet animation,
- 3D home interaction,
- `prefers-reduced-motion` handling.

The current issue is consistency and responsive composition rather than absence of a styling system.

## Target state

After implementation:

- pre-launch is a useful product mode rather than a holding screen,
- Today remains the strongest daily action during October,
- Progress is the authoritative full-plan roadmap,
- future chapters are visible and previewable but future check-ins remain impossible,
- Connect has intentionally different desktop compositions for members and leaders,
- readers can discover how the home grows and what other people can see,
- section leaders can understand why their admin scope exists,
- desktop width is used intentionally without excessive empty rails,
- mobile Admin is readable without horizontal table scrolling,
- motion supports meaning and honors reduced-motion preferences,
- fonts and in-app icons remain unchanged,
- Rock and database structures remain unchanged.

## Implementation approach

### 1. Create shared responsive layout primitives

Primary file:

- `app/globals.css`

Likely component touchpoints:

- `components/app-shell.tsx`
- `app/admin/admin.css`

Work:

1. Define a small shared page-frame vocabulary for:
   - focused content,
   - full product content,
   - main + side-rail layouts,
   - full-width spans.
2. Align the top bar to the active page frame.
3. Normalize spacing between header, hero/title, and first major card.
4. Preserve the app-shell maximum near 1120px.
5. Treat 360, 390, 480, 768, and 1024+ as layout targets without building device-specific hacks.
6. Keep hover-only presentation inside `@media (hover: hover) and (pointer: fine)`.

Validation:

- Today, Connect, Rewards, and Progress no longer visibly jump between unrelated horizontal frames.
- Ordinary desktop screens use the available width without decorative voids.
- No core reader screen horizontally scrolls at 360px.

### 2. Make campaign phase a first-class presentation concern

Primary files:

- `components/use-today.ts`
- `lib/plan.ts`
- `components/app-shell.tsx`

Work:

1. Keep `planPhase()` as the source for pre-launch, active, and closed state.
2. Add a pure display helper for grace days if useful rather than scattering date-string checks across components.
3. Feed phase state consistently into Today, Connect, Rewards, and Progress.
4. Do not change check-in validation rules.

Tests:

- Sep 30: pre-launch.
- Oct 1: active, Matthew 1.
- Oct 28: active, Matthew 28.
- Oct 29 to 31: active grace days with no new chapter.
- Nov 1: closed.

### 3. Rebuild Today by phase

Primary file:

- `components/app-shell.tsx`

Supporting files as needed:

- `app/globals.css`
- existing Quick Verse and profile components

#### Pre-launch

Replace the current minimal early return with:

1. Header and profile.
2. `Matthew starts October 1.` hero.
3. Day 1 preview for Matthew 1.
4. Readiness card for avatar, Connect Group, and translation.
5. Shared-home preview when a group exists.
6. Short `How this works` explainer.
7. Action to open Progress and view the full roadmap.

Do not create 28 locked cards on Today.

The Day 1 preview may open the existing key-passage preview but must not expose a check-in action.

Desktop:

- main column: hero and Day 1 preview,
- side rail: readiness, home preview, and how-it-works.

Mobile:

- stack in the same semantic order.

#### Active

Mobile order remains reading-first.

Desktop:

- main column: hero, today's reading, catch-up,
- side rail: group home snapshot, readers today, next milestone.

If no active group exists, collapse the rail rather than leave blank space.

#### Grace days

Turn Today into a catch-up dashboard:

- completed chapters,
- remaining unread chapters,
- next catch-up action,
- group status if applicable,
- completed state when all 28 chapters are done.

#### Closed

Show:

- final chapter count,
- rewards earned,
- final home if grouped,
- action to review Progress,
- no stale daily check-in wording.

### 4. Improve completion feedback without expanding write scope

Primary file:

- `components/completion-flow.tsx`

Related existing action:

- `app/actions/checkIn.ts`

Work:

1. Remove the reading-location picker and its local state.
2. Keep the honor-based check-in copy.
3. Show +10 coins and personal reward progress after success.
4. Show refreshed group-home progress when a group exists.
5. Only show an explicit stage-up transition when a reliable before-and-after comparison is available from existing read-only state.
6. Do not add database fields or change the `checkIn` result contract solely for animation.
7. Do not autoplay repeated celebration on normal page revisits.

### 5. Rework Connect for phase and role

Primary files:

- `components/app-shell.tsx`
- `app/globals.css`
- `components/rotatable-home.tsx` if interaction hints change

#### Role-sensitive desktop layout

Member:

- home and roster use the full useful width,
- no phantom Leader Tools column.

Leader:

- main column: home + roster,
- side rail: join code, QR, still-reading nudge, leader-only portal link.

Mobile leader order:

1. Home.
2. Leader Tools.
3. Roster.

#### Pre-launch Connect

- Frame roster as `Reading together this October`.
- Remove read/not-read dimming.
- Do not show `Still reading` nudges.
- Keep join code and QR useful for leaders.

#### Active Connect

Keep the daily read status and leader nudge behavior.

#### Grace and closed states

Remove stale daily pressure language and emphasize finishing/final progress appropriately.

#### Home explanation

Add a keyboard-accessible `How your home grows` control that reuses the current sheet/dialog visual language.

Explain:

- every chapter contributes,
- normalized group completion drives the stage,
- group size is accounted for,
- coins celebrate chapters but do not directly determine the stage,
- stages run Tent to Mansion.

#### Reading-visibility explanation

Add a low-emphasis info action near the roster explaining that group members can see today's check-in status, not reading duration or Bible-app choice.

### 6. Reframe Rewards and Progress

Primary files:

- `components/app-shell.tsx`
- `app/globals.css`
- `lib/plan.ts` only for pure display helpers

#### Rewards

Pre-launch:

- keep the shelf visible,
- explain that rewards begin October 1,
- keep thresholds legible,
- avoid failure-like locked treatment.

Active:

- improve locked-state contrast,
- use a wider desktop composition,
- add a one-time earned-state emphasis only when the transition is known.

Do not add reward types.

#### Progress pre-launch

Replace zero-heavy personal statistics with plan facts:

- 28 chapters,
- one chapter a day,
- Oct 1 to 28 reading days,
- Oct 29 to 31 catch-up days.

#### Calendar state model

Represent:

- Read
- Today
- Catch up
- Upcoming

Do not rely on color alone.

#### Future-day preview

Future days remain visible and may open a lightweight sheet with:

- date,
- chapter,
- title or key passage,
- `Check-in opens October X.`

No future check-in button may be rendered.

Wording must not imply Scripture is locked.

#### Grace period

Make October 29 to 31 visibly understandable as catch-up days.

### 7. Clarify profile, group selection, solo, and join behavior

Primary files:

- `components/profile-editor.tsx`
- `components/app-shell.tsx`
- `app/join/[code]/page.tsx`
- `components/join-confirm.tsx`

Profile:

- add a compact `About your reading data` explanation,
- keep Profile focused on avatar and translation.

Group picker:

- explain that the picker chooses where future app check-ins are attributed,
- make clear that it does not rewrite existing Rock membership,
- make clear past check-ins keep their recorded group.

Solo:

- explain that personal progress remains valid and a reader can join later.

Join confirmation:

- state clearly that joining adds the person to the Connect Group in Favor's records,
- do not change the existing Rock membership write behavior.

### 8. Improve Admin information design

Primary files:

- `app/admin/page.tsx`
- `app/admin/SectionTree.tsx`
- `app/admin/HierarchyChart.tsx` if empty-state or legend behavior requires it
- `app/admin/admin.css`

Scope card:

- explain section scope as derived from sections the person leads in Favor's records,
- explain global access separately,
- preserve `resolveAdminScope()` as the server-side authority.

Metric explanation:

- explain normalized progress as completed check-ins divided by active members x 28.

Mobile:

- keep the section hierarchy,
- render group data as stacked cards below the tablet breakpoint,
- keep the semantic table for larger screens,
- do not require horizontal table scrolling for the final mobile state.

Chart:

- keep Chart.js,
- improve legend readability,
- show a deliberate pre-launch empty state.

### 9. Standardize interaction, accessibility, and typography polish

Primary files:

- `app/globals.css`
- `app/admin/admin.css`
- touched components that introduce new controls

Interaction:

- coherent hover, focus-visible, active/press, and disabled states,
- no hover styling on static cards that would falsely imply clickability,
- no hover-only information.

Motion:

- use consistent fast/normal/longer state-change durations,
- animate progress only when values change,
- keep page entry subtle,
- no looping card animation or autoplay confetti,
- extend existing reduced-motion handling to every new animation.

3D home:

- keep drag/swipe,
- keep arrow-key rotation,
- keep Reset view,
- improve discoverability,
- do not make drag the only usable interaction.

Typography:

- audit meaningful 8px and 9px text,
- increase helper/status sizes where readability suffers,
- keep existing font families,
- preserve decorative small labels only where they remain readable.

### 10. Refresh favicon and synchronize copy docs

Assets:

- `public/favicon.svg`
- `public/favicon.ico`
- review `public/apple-touch-icon.png` only if consistency requires it

Favicon direction:

- simple book + home/tent idea,
- existing Favor palette,
- legible at 16 to 32px,
- no in-app icon redesign.

Documentation:

- update `intent/COPY.md` with approved new microcopy,
- update `intent/FLOWS.md` only if user-flow descriptions materially change,
- update `intent/DECISIONS.md` only when implementation requires a new durable product decision.

Favor copy QA:

- English only,
- no em dash,
- no `fam`,
- `Connect Group` on first mention,
- plain language,
- no unnecessary church jargon.

## Data and migration considerations

No schema migration is expected.

No Rock data migration is expected.

No new persistent data collection is approved.

The existing join-by-code Rock write remains the only user-facing membership write in this scope.

If implementation appears to require a new persisted field, new Rock write, or changed check-in contract, stop and treat that as scope expansion rather than silently adding it.

## Security and permissions

- Keep Auth0/session behavior unchanged.
- Keep `resolveAdminScope()` server-side and authoritative.
- Do not implement admin scope as client-side filtering.
- Keep `connect.favor.church` leader-only.
- Do not expose additional person-level reading details in Admin.
- Keep future check-in enforcement server-side.
- Keep the existing Rock join-by-code authorization and membership checks unchanged.

## Validation

### Automated gates

Run:

```text
pnpm lint
pnpm test
pnpm build
```

Add or update Vitest coverage for pure behavior introduced by the pass, especially:

- campaign phase boundaries,
- grace-day display helper,
- future/upcoming state helper,
- any pure helper that determines home-progress or stage-transition copy.

Do not introduce a large new component-testing framework solely for this work.

### Responsive visual matrix

Verify at minimum:

- 360 x 800
- 390 x 844
- 430 x 932
- 768 x 1024
- 1024 x 768
- 1280 x 800
- 1440 x 900

### User-state matrix

Verify:

1. Pre-launch member with one Connect Group.
2. Pre-launch Connect leader.
3. Person in multiple Connect Groups.
4. Solo reader.
5. Active reader before today's check-in.
6. Active reader after today's check-in.
7. Reader with a missed chapter.
8. October 29 to 31 grace day.
9. Closed plan.
10. Section-scoped admin.
11. Global admin.
12. No-admin-access user.

### Interaction and accessibility pass

Verify:

- keyboard-only navigation,
- visible focus states,
- Escape and focus restoration for new sheets/dialogs,
- Quick Verse access,
- future-day preview access,
- home explainer access,
- privacy explainer access,
- profile editor,
- completion flow,
- 3D home keyboard rotation,
- admin accordions,
- reduced-motion behavior,
- touch target usability,
- calendar states without color-only meaning.

### Environment strategy

Vercel preview deployments are useful for build/render verification but the current Auth0 mapping does not support preview-domain login.

Interactive logged-in QA should therefore use:

- local development with the existing non-production `DEV_MOCK_PERSON_ID` mechanism where appropriate,
- then a targeted production smoke pass after merge/deploy.

Do not alter Auth0 preview mapping as part of this issue.

## Acceptance criteria

- [ ] Pre-launch Today provides setup, explanation, and anticipation rather than a holding screen.
- [ ] No pre-launch screen frames readers as behind or incomplete.
- [ ] Progress shows the full October roadmap before launch.
- [ ] Future days are previewable while future check-ins remain impossible.
- [ ] Future-day wording does not imply Scripture itself is locked.
- [ ] Today, Connect, Rewards, Progress, onboarding, and Admin use a coherent responsive frame.
- [ ] Ordinary Connect members do not get an empty desktop Leader Tools rail.
- [ ] No core reader screen has accidental large empty rails at 1024px and wider.
- [ ] No core reader screen horizontally scrolls at 360px.
- [ ] Readers can discover how the shared home grows.
- [ ] Coins and normalized home-stage progression are clearly distinguished.
- [ ] Readers can discover what their Connect Group can see about today's reading status.
- [ ] Section leaders can discover why their admin scope exists.
- [ ] Mobile Admin group data is readable without horizontal table scrolling.
- [ ] Calendar states are legible and do not rely on color alone.
- [ ] Interactive controls have coherent hover, focus, and press feedback.
- [ ] New motion honors `prefers-reduced-motion`.
- [ ] No meaningful information is hover-only.
- [ ] 3D home inspection remains usable without drag alone.
- [ ] Completion flow no longer asks for non-persisted reading location.
- [ ] No Rock structure or role changes are introduced.
- [ ] No new Rock write path is introduced.
- [ ] No database migration is introduced.
- [ ] No font family is changed.
- [ ] No in-app icon set is replaced.
- [ ] `connect.favor.church` remains leader-only.
- [ ] Server-side date and access enforcement remains authoritative.
- [ ] `pnpm lint`, `pnpm test`, and `pnpm build` pass.

## Rollout and rollback

### Rollout

1. Implement on this PR branch in reviewable slices.
2. Keep the branch deployable after each coherent slice where practical.
3. Use Vercel preview for build/render checks.
4. Use local mocked authenticated QA for member/leader/admin interaction states.
5. Merge only after automated gates and the responsive/user-state matrix pass.
6. Run a targeted production smoke test after deployment.

### Rollback

This is an app-only UI/UX change with no planned data migration.

If production behavior regresses:

1. redeploy the previous known-good Vercel production deployment or revert the implementation PR,
2. verify login, Today, Connect, check-in, join-by-code, and Admin access paths,
3. no Rock or database rollback should be necessary because this plan introduces no new data mutation or migration.

## Implementation slices

Use these review slices on the same PR branch:

1. Layout foundation + phase state + pre-launch Today.
2. Connect role layouts + home explanation + privacy copy.
3. Progress roadmap + future-day previews + grace days.
4. Rewards + completion flow.
5. Admin + onboarding/join explanations.
6. Interaction polish + typography + favicon + docs + full QA.

Do not create a new branch or disposable PR per slice.

## Risks and assumptions

### Risk: scope expands through animation needs

A stage-change celebration could tempt implementation to change the check-in action contract or add persistence.

Mitigation: only claim a transition when reliable before-and-after data is already available. Otherwise refresh aggregate state and skip the explicit transition animation.

### Risk: phase-aware UI duplicates date logic

Mitigation: keep date semantics in pure helpers and pass derived presentation state into screens.

### Risk: mobile Admin duplicates markup

A mobile card view plus desktop table can drift.

Mitigation: derive both presentations from the same section/group data and keep shared row/card formatting helpers where practical.

### Risk: new explanatory copy becomes clutter

Mitigation: prefer short contextual actions and reusable sheets over permanent long paragraphs.

### Risk: responsive cleanup becomes a visual rewrite

Mitigation: preserve existing colors, fonts, icon system, visual vocabulary, and core information architecture. Change layout and hierarchy only where the issue requires it.

### Assumption: no new product decision is required

The issue, spec, existing intent docs, and Rock role model provide enough resolved product direction to implement this pass. If execution uncovers a need for a new Rock write, data field, permission rule, or reading-rule change, stop and resolve that separately rather than inventing it inside this PR.

## Review record

Self-review completed against the PR Plan review checklist.

Internal adversarial fallback completed because this runtime does not expose a separate subagent reviewer.

Findings incorporated before the initial commit:

- Source issue #32 is explicit in both documents.
- Completion-stage animation may not expand the check-in contract solely for presentation.
- Preview-domain Auth0 limitations are reflected in the validation strategy.
- Rollout and rollback are explicit.
- Acceptance criteria map to concrete automated, responsive, user-state, and accessibility validation.

No critical unresolved product, data, security, migration, or operational decisions remain.
