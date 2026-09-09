---
version: alpha
name: Read My Bible
description: Design tokens and deep modular architecture specification for Read My Bible.
colors:
  primary: "#172943"
  paper: "#fffaf0"
  cream: "#f7f0df"
  coral: "#d96c57"
  coral-deep: "#9c4e3f"
  coral-soft: "#f4d6d0"
  gold: "#e7a72f"
  gold-soft: "#f9e9cb"
  sage: "#91a88b"
  sage-soft: "#e0e7df"
  blue: "#7b9caf"
  violet: "#9c84ab"
  ink-muted: "#646765"
  ink-secondary: "#687485"
  surface-elevated: "#eae4d6"
typography:
  display:
    fontFamily: Agharti
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: 0.012em
  h1:
    fontFamily: Favor Sans
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  h2:
    fontFamily: Favor Sans
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.018em
  body-lg:
    fontFamily: Favor Sans
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: Favor Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.008em
  body-sm:
    fontFamily: Favor Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  button:
    fontFamily: Favor Sans
    fontSize: 14px
    fontWeight: 800
    lineHeight: 1.2
  caption:
    fontFamily: Favor Sans
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  label-sm:
    fontFamily: Favor Sans
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.08em
  scripture-body:
    fontFamily: Georgia
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.7
rounded:
  xs: 3px
  sm: 4px
  md: 8px
  lg: 14px
  xl: 20px
  full: 999px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  7: 32px
  8: 48px
  9: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.xs}"
    height: 55px
    padding: 17px
  reading-card:
    backgroundColor: "{colors.coral}"
    rounded: "{rounded.md}"
    padding: 18px
  reading-card-complete:
    backgroundColor: "{colors.sage}"
    rounded: "{rounded.md}"
    padding: 18px
  celebration-mark:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.primary}"
    size: 78px
    rounded: "{rounded.full}"
  modal-sheet:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 20px
  surface-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 16px
  badge-coral-container:
    backgroundColor: "{colors.coral-soft}"
    rounded: "{rounded.sm}"
    padding: 6px
  subhead-coral:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.coral-deep}"
    typography: "{typography.label-sm}"
  badge-gold:
    backgroundColor: "{colors.gold-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
  badge-sage:
    backgroundColor: "{colors.sage-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
  avatar-badge-blue:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.primary}"
    size: 50px
    rounded: "{rounded.full}"
  avatar-badge-violet:
    backgroundColor: "{colors.violet}"
    size: 50px
    rounded: "{rounded.full}"
  caption-block:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
  label-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.body-sm}"
  chip-emphasis:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 8px
---

# Read My Bible Design System & Architecture

## Overview

Read My Bible is a mobile-first, communal scripture reading experience built for Favor Church. It balances the timeless intimacy of physical scripture with the shared accountability of Connect Groups on a joint journey through God's Word.

The visual thesis is **a warm campfire map on tactile paper**. Rather than an austere utility dashboard or high-contrast neon app, the interface evokes warm limestone, aged stationery, and physical community marks. It intentionally avoids dark mode, harsh artificial saturation, and disposable visual trends.

Visual identity rules (D2 immutability):
- The eight core color hues are frozen for the life of the product: Navy, Coral, Gold, Sage, Cream, Paper, Blue, and Violet.
- Screens may introduce subtle tonal variations (soft tints or deep contrast shades) derived from these hues, but never foreign hue families.
- Typefaces and SVG icon systems are strictly curated to preserve visual unity and high performance.

## Colors

The palette is rooted in tactile paper neutrals balanced by deep maritime ink and meaningful narrative accents.

- **Primary (`#172943`):** Deep Navy ink. Serves as the primary anchor for headlines, base text, high-emphasis buttons, and brand iconography. Contrast on Paper is 14.07:1, providing peerless readability.
- **Paper (`#fffaf0`):** Warm stationery white. The foundation for elevated content cards, bottom sheets, reading panes, and interactive selections.
- **Cream (`#f7f0df`):** Limestone parchment neutral. The ambient backdrop of the entire app shell, providing an organic, non-glare canvas.
- **Coral (`#d96c57`):** Passionate terracotta accent. Signals active daily reading cards, primary navigation indicators, and energetic points of engagement.
- **Coral Deep (`#9c4e3f`):** Dense earthy terracotta. Used for high-contrast text labels (5.65:1 on Paper) where standard coral would fall below WCAG thresholds.
- **Coral Soft (`#f4d6d0`):** Gentle terracotta wash. Applied as a background fill for notification badges, step counters, and category pills.
- **Gold (`#e7a72f`):** Radiance and celebration. Marks completed reading streaks, awards, milestone badges, and universal focus rings (`outline: 3px solid var(--gold)`).
- **Gold Soft (`#f9e9cb`):** Warm sunshine tint. Background container for reward progress and streak milestones.
- **Sage (`#91a88b`):** Quiet flourishing green. Denotes verified completed reading chapters, personal progress, and communal health.
- **Sage Soft (`#e0e7df`):** Muted meadow wash. Subtle background container for completed journey states.
- **Blue (`#7b9caf`) & Violet (`#9c84ab`):** Atmospheric identity tones reserved for avatar personalization, cosmetic accessories, and member diversity.
- **Muted Ink (`#646765`):** Secondary neutral. Exceeds WCAG AA with 5.04:1 contrast on Cream, reserved for metadata, timestamps, and supportive captions.
- **Line Dividers (`rgba(23, 41, 67, 0.14)`):** Semi-transparent navy hairline borders that frame cards without visual clutter.

## Typography

Typography establishes an intentional distinction between modern UI controls and contemplative scripture reading.

- **Display (Agharti Bold):** Used strictly in lowercase for heroic display moments (`.hero-copy h1`, page titles, and brand wordmark). Agharti gives the app a distinct communal and friendly voice.
- **Sans-Serif Headings & Body (Favor Sans):** The foundational UI workhorse across all screens, dialogs, buttons, and rosters. Renders with tight negative letter-spacing on headings (`-0.02em`) and relaxed tracking (`0.008em`) on body text.
- **Serif Scripture Exception (Georgia):** Two intentional exceptions in the system preserve Georgia serif styling:
  1. The chapter and verse reference in Quick Verse (`.quick-verse-button strong`, e.g., "Matthew 8:23-27").
  2. The Scripture passage body (`.passage-text`) in modal reading panes.
  Both are annotated with `/* serif-exception */` in stylesheets and verified by automated regression tests to keep Scripture distinct from app chrome.
- **Legibility Floor:** Text is maintained at 12px or larger for readable content. 11px micro-text is strictly limited to decorative eyebrow chips and verified with `/* decorative */` annotations.

## Layout

Layout follows a disciplined frame system defined in `app/styles/frame.css` with responsive breakpoints at 370px, 480px, 768px, and 1024px.

- **Standard Frame (`.frame`):** Capped at 1040px maximum width for primary tab screens (Today, Connect, Progress, Rewards, Leader Tools).
- **Focused Frame (`.frame--focused`):** Narrow 560px column centered for solo actions, sign-in confirmations, onboarding, and profile edits.
- **Rail Frame (`.frame--rail`):** Two-column split layout for larger viewports (≥1024px), allocating primary content to `.frame__main` and contextual tools (Leader tools, campus boards) to `.frame__rail`. On mobile and tablet, the rail collapses beneath the main track or disappears completely when empty.
- **Full-Width Span (`.frame__span`):** Spans both grid columns in rail views for persistent screen titles and hero banners.
- **Touch Targets:** All interactive controls maintain a strict minimum hit target of 44px (`min-height: 44px`, `min-width: 44px`) ensuring touch accuracy across mobile devices.
- **Spacing Scale:** Built on a 4px modular grid (`--space-1: 4px` through `--space-9: 64px`) ensuring rhythm across padding, margin, and layout flex gaps.

## Elevation & Depth

Read My Bible uses **tonal layering and tactile texture** rather than aggressive dropshadows to convey hierarchy:

- **Subtle Radial Noise (`.paper-noise`):** A fixed, pointer-events-none noise layer at 16% opacity blended with multiply mode (`radial-gradient(rgba(23,41,67,.35) .45px, transparent .55px)`), giving surfaces the natural texture of physical print.
- **Three-Layer Surface Stacking:**
  1. Ambient base: `--cream` (`--surface-1`, `#f7f0df`)
  2. Elevated modules: `--paper` (`--surface-2`, `#fffaf0`) with 1px `--line` hairline borders
  3. Interactive inset surfaces: `--surface-3` (`#eae4d6`) for recessed chips, streaks, and counter tracks
- **Elevation Shadows:**
  - Resting cards (`--shadow-sm`): `0 2px 6px rgba(23, 41, 67, 0.1)`
  - Elevated drawers & sheets (`--shadow-md`): `0 8px 24px rgba(23, 41, 67, 0.16)`
  - Active modals: `0 -12px 50px rgba(23, 41, 67, 0.2)` against a 58% navy backdrop blur

## Shapes

Shapes communicate approachable warmth through softened geometry:

- **Sharp Micro-Radius (`3px` / `4px`):** Primary buttons, scripture links, and inline chips feature subtle 3–4px corners, evoking book spines and stamped ink.
- **Card Containers (`8px`):** Content cards, calendar grids, and group summary tiles use an 8px radius (`--radius-md`) to frame content cleanly without childish ballooning.
- **Sheets & Drawers (`14px`):** Bottom sheets and modal presentation cards use a 14px top radius (`--radius-lg`), docking against the bottom viewport edge on mobile and floating centered on desktop.
- **Pills & Dots (`999px`):** Avatar rings, streak dots, action toggles, and status badges utilize complete pill rounding.

## Components

The system implements core reusable patterns engineered for both accessibility and aesthetic cohesion:

- **Primary Button (`.primary-button`):** Full-width, 55px tall navy button with high-contrast paper typography (`#fffaf0` on `#172943`), gold focus-visible ring, and scale feedback on tap (`transform: scale(0.98)`).
- **Daily Reading Card (`.reading-card`):** Bold terracotta card presenting today's book, chapter number in decorative watermark, and completion toggle. Dynamically transitions to calming sage upon completion.
- **Modal Sheet (`Sheet` / `.modal-sheet`):** Accessible portal drawer supporting touch drag-to-dismiss via header handle, fluid swipe physics, scroll-vs-drag disambiguation, keyboard Tab trapping, and background scroll locking.
- **Connect Switcher (`ConnectSwitcher`):** Compact header control enabling multi-group leaders to toggle between groups with instantaneous optimistic updates.
- **Avatar System (`Avatar`):** Generative procedural SVG/CSS avatars rendering skin tones, hairstyles, facial hair, and glasses from deterministic seeds without network latency.
- **Stage Mini (`StageMini`):** Memoized SVG representations of camp progression houses depicting group growth milestones.

## Do's and Don'ts

### Do's
- **Do** test color contrast with WCAG AA tools before pairing background and text colors (minimum 4.5:1 for standard copy).
- **Do** wrap interactive hover styles inside `@media (hover: hover) and (pointer: fine)` so mobile tap states never get stuck.
- **Do** provide an unmistakable `outline: 3px solid var(--gold)` with 3px offset on `:focus-visible` for keyboard navigation.
- **Do** ensure all tap targets satisfy the 44px touch floor (`min-height: 44px`, `min-width: 44px`).
- **Do** annotate intentional Georgia font uses with `/* serif-exception */` and sub-12px text with `/* decorative */`.
- **Do** respect user motion preferences by allowing `app/styles/motion.css` to collapse animations under `@media (prefers-reduced-motion: reduce)`.

### Don'ts
- **Don't** add dark mode, saturated primary hues, or neon accents that contradict the warm campfire stationery identity.
- **Don't** use infinite CSS animation loops; celebrations must trigger once and settle at rest.
- **Don't** attach drag-to-dismiss gestures to scrollable sheet content; reserve drag-to-close exclusively to the designated `.sheet-drag-handle`.
- **Don't** fork global tokens or modal containers inside individual screen stylesheets; reuse shared modules.
- **Don't** render full names or private member metrics on public shared rosters; maintain privacy by design.

## Codebase Design: Deep Modules & Seams

In accordance with deep module engineering principles, this codebase organizes behavior behind clean seams that provide high leverage for callers, locality for maintainers, and direct testability.

### Principles & Terminology

- **Module:** Anything with an interface and an implementation. In this codebase, modules span from low-level UI primitives to full data domain routers.
- **Interface:** Everything a caller must know to use the module correctly: parameter types, invariants, ordering constraints, accessibility roles, and lifecycle guarantees.
- **Implementation:** The internal code that callers do not need to understand or interact with.
- **Depth:** Leverage at the interface. A module is **deep** when substantial complex logic sits behind a concise, intuitive surface.
- **Seam:** The specific location where an interface lives and where behavior can be altered or verified without modifying callers. Michael Feathers defines a seam as an alteration point; here it represents the clear line between caller expectations and module execution.
- **Adapter:** A concrete component or function that satisfies an interface at a seam.
- **Leverage:** Callers learn a tiny API once and gain immense capabilities across multiple screens.
- **Locality:** Fixes, edge cases, and performance tuning are isolated inside the module rather than scattered across call sites.

### Key Deep Modules in Read My Bible

#### 1. Accessible Sheet Module (`components/sheet.tsx`)
- **Seam:** Rendered at `createPortal(..., document.body)`.
- **Small Interface:**
  ```tsx
  <Sheet
    open={isOpen}
    onClose={() => setIsOpen(false)}
    labelledBy="dialog-title-id"
    initialFocusRef={optionalRef}
    immersive={false}
  >
    {children}
  </Sheet>
  ```
- **Deep Implementation:**
  - Multi-dialog stacking and backdrop layering.
  - Automatic focus trapping (`Tab` and `Shift+Tab`) wrapping from last to first element.
  - Escape key listener with top-of-stack inspection.
  - Active element caching and restoration upon dismissal.
  - Global body scroll locking with reference-counted lock tracking across multiple concurrent sheets.
  - High-performance pointer gesture tracking with touch velocity calculation, threshold-based dismissal, and critical distinction between inner list flick scrolling vs handle dragging.
  - Zero dependencies on external bulky modal libraries.
- **Leverage:** Call sites (Scripture popup, Day preview, Member profile, Connect switcher, Avatar editor) write zero lines of focus management or gesture code.

#### 2. Deterministic Avatar Generator (`components/avatar.tsx` & `lib/avatar.ts`)
- **Small Interface:**
  ```tsx
  <Avatar seed={personId} gender={gender} size={50} />
  ```
- **Deep Implementation:**
  - Deterministic PRNG hashing derived from the person's unique identifier.
  - Gender-aware hairstyle distribution avoiding mismatched cosmetic seeds.
  - Pure CSS and SVG layered structure (ears, face, hair, back hair, glasses, beard, body).
  - 100% vector-based with zero external image requests, CDN latencies, or broken asset fallbacks.
- **Locality:** Hair, skin tone, or facial feature improvements immediately update across rosters, header buttons, leader boards, and 3D tent gatherings without altering caller props.

#### 3. Connect Group Switcher (`components/connect-switcher.tsx`)
- **Small Interface:**
  ```tsx
  <ConnectSwitcher currentGroup={group} availableGroups={groups} onSwitch={handleSwitch} />
  ```
- **Deep Implementation:**
  - Contextual trigger rendering with group title clamping and badge status.
  - Drawer presentation and selection state tracking.
  - Optimistic UI updates with asynchronous rollback upon network failure.
  - Automatic session cookie refreshing and join code synchronizing.
- **Test Surface:** The interface serves as the exact test boundary (`tests/connect-switcher-ui.test.ts`), allowing exhaustive testing of switching workflows without mocking deep DOM subtrees.

#### 4. Stage Miniature Milestone Tracker (`components/stage-mini.tsx`)
- **Small Interface:**
  ```tsx
  <StageMini stageIndex={currentStage} size={24} />
  ```
- **Deep Implementation:**
  - Vector path definitions for progressive camp structures (tent, cabin, stone lodge, home).
  - React memoization and icon capping to prevent rendering bottlenecks when listing hundreds of campus Connect Groups.
- **Leverage:** Provides instant visual milestone indicators on leader dashboards and member cards with uniform rendering speed.
