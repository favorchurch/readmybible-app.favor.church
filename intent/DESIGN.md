# Read My Bible: design system

Machine-readable reference for the M2 lanes (Today, Connect, Progress and Rewards, Admin and
onboarding) and for anyone touching `app/globals.css`, `app/styles/*.css`, or `app/admin/admin.css`
after this run. The palette, fonts, and in-app icon set are frozen (issue 32, D2); this file
documents the tokens, frames, type scale, motion, and interaction states those screens build on.

## 1. Palette rule (D2)

The eight named color tokens keep their hues for the life of this product: `--navy`, `--coral`,
`--gold`, `--sage`, `--cream`, `--paper`, `--blue`, `--violet`. A screen may add a new tone of one
of those hues (a soft tint, a deeper shade, a neutral derived from navy or cream) but never a new
hue family, never dark mode, and never a replacement for a primary token. Fonts (`--font-sans`,
`--font-display`) and the in-app icon set (`components/nav-icon.tsx`, `public/avatar-*`) are
frozen outright: do not touch their values or markup.

## 2. Tokens

Defined in `app/globals.css`'s `:root`.

### Color (existing, unchanged)

| Token | Value | Role |
|---|---|---|
| `--navy` | `#172943` | Primary text, primary button, brand ink |
| `--coral` | `#d96c57` | Accent: reading card, active nav state, focus-adjacent emphasis |
| `--gold` | `#e7a72f` | Reward and focus-ring color |
| `--sage` | `#91a88b` | Success, completed-read state |
| `--cream` | `#f7f0df` | App shell background |
| `--paper` | `#fffaf0` | Card and sheet surface |
| `--blue` | `#7b9caf` | Avatar tint |
| `--violet` | `#9c84ab` | Avatar tint |

### Color (new tones, D2-compliant)

| Token | Value | Role |
|---|---|---|
| `--ink` | `var(--navy)` | Primary text, aliased so screens name intent rather than a hue |
| `--ink-2` | `#687485` | Secondary text: a lightened navy, for text one step below primary |
| `--ink-muted` | `#6e716d` | Existing token, kept: tertiary text, timestamps, helper copy |
| `--surface-1` | `var(--cream)` | Base app background |
| `--surface-2` | `var(--paper)` | Card and sheet surface |
| `--surface-3` | `#eae4d6` | A third, slightly deeper neutral for emphasis surfaces |
| `--line` | `rgba(23, 41, 67, .14)` | Existing token, kept: default hairline border |
| `--line-strong` | `rgba(23, 41, 67, .28)` | A more visible divider, for focus-adjacent outlines |
| `--coral-soft` | `#f4d6d0` | Light coral tint for backgrounds behind coral text or icons |
| `--coral-deep` | `#9c4e3f` | Darker coral for text on a light coral background |
| `--gold-soft` | `#f9e9cb` | Light gold tint for reward backgrounds |
| `--sage-soft` | `#e0e7df` | Light sage tint for success backgrounds |
| `--navy-soft` | `#e3e5e8` | Light navy tint for neutral badges |

### Spacing

4px base unit, nine steps, `--space-1` through `--space-9`: 4, 8, 12, 16, 20, 24, 32, 48, 64px.
Use the scale for new gaps and padding; existing hand-tuned values in `app/styles/*.css` are not
required to migrate to it.

### Radius

`--radius-sm` 4px, `--radius-md` 8px, `--radius-lg` 14px, `--radius-xl` 20px, `--radius-pill`
999px (fully rounded, for pills and dots).

### Motion

`--dur-fast` 120ms (press feedback), `--dur-base` 200ms (page transitions, nav state), `--dur-slow`
320ms (celebratory or attention-drawing motion). `--ease-out` `cubic-bezier(.22, 1, .36, 1)` for
anything entering or responding to input. `--ease-in-out` `cubic-bezier(.65, 0, .35, 1)` for
anything that both starts and ends at rest.

### Shadow

`--shadow-sm` a close, soft shadow for resting cards; `--shadow-md` a wider, slightly darker
shadow for elevated surfaces like open sheets.

## 3. Frame vocabulary

Defined in `app/styles/frame.css`. A frame sets a screen's outer content width; it does not
replace a screen's own internal spacing.

| Class | Width | When to use |
|---|---|---|
| `.frame` | 1040px | The default for a full product screen: Today, Connect, Rewards, Progress, Admin. |
| `.frame--focused` | 560px | A single decision or a short flow with no secondary content: group picker, solo join, onboarding. |
| `.frame--rail` | `.frame`'s width, grid below 1024px collapses to one column | A screen with a main column and an optional secondary rail (Leader Tools, stats). Children are `.frame__main` and `.frame__rail`. |
| `.frame__span` | full width within a `.frame--rail` | An element that should cross both grid tracks, such as a shared heading. |

`.frame--rail` collapses to a single column below 1024px, and also collapses to a single column
above 1024px when `.frame__rail` is absent or empty, via `:has(> .frame__rail)`. This is the fix
for the bug this run exists to close: an ordinary Connect member must never see a reserved,
empty second column where Leader Tools would have been.

Breakpoints are additive: 480, 768, 1024px, on top of the existing 360 to 389px range (the
`max-width: 370px` rules already in the codebase keep behaving).

## 4. Type scale

| Role | Size | Notes |
|---|---|---|
| Display | `clamp(38px, 9vw, 64px)` | Hero headings (`.hero-copy h1` and siblings). Existing, unchanged. |
| H1 | 24 to 27px | Section headings within a screen. |
| H2 | 18 to 24px | Card and subsection headings. |
| H3 | 15 to 16px | Minor headings inside a card. |
| Body | 16px | Paragraph and control copy where space allows. |
| Small | 13px | Secondary labels, metadata, captions. |
| Micro | 11px, decorative only | All-caps eyebrow tags and single-letter abbreviations where the same information is legible from context. Never the only source of meaningful information; anything a reader must read to understand the screen sits at 12px or above. |

### Intentional Georgia exception

Every other Georgia declaration in the codebase is a leftover the sans system in `typography.css`
overrides by naming the selector; `tests/css-rules.test.ts` fails the build if a new one appears
unlisted and unmarked. Two selectors are deliberate exceptions instead of an oversight:
1. `.quick-verse-button strong` (`app/styles/today.css`), the chapter and verse reference inside the
   Quick Verse control (for example "Matthew 8:23-27").
2. `.passage-text` (`app/styles/sheet.css`), the Scripture passage body inside the Quick Verse popup.

Both stay serif to read as Scripture citations or body text, distinct from the app's own
sans-serif chrome around them, and are marked in their declarations with `/* serif-exception */`
so the guard test recognizes them as settled rather than missed.

The floor is enforced by `tests/css-rules.test.ts`: no `font-size` at 11px or below unless the
declaration's line carries `/* decorative */`.

## 5. Interaction states

Every control in the baseline (`.primary-button`, `.secondary-link`, `.close-button`,
`.bottom-nav button`, `.picker-option`, `.header-person`, the calendar buttons) carries:

| State | Rule |
|---|---|
| Default | The control's resting style. |
| Hover | Only inside `@media (hover: hover) and (pointer: fine)`, so touch devices never get a stuck hover state. |
| Focus-visible | A `var(--gold)` outline, 3px, offset 3px. Plain `<button>` elements get this from the global `button:focus-visible` rule; non-button controls (links, custom roles) declare it themselves. |
| Active | `translateY(1px)` or `scale(.98)`, whichever reads better on that control's shape. |
| Disabled | `opacity: .55`, `cursor: not-allowed`, and no hover lift, without any extra markup (the hover rule excludes `:disabled`). |

Controls that trigger a pending action carry `aria-busy` while pending, alongside `disabled`.

## 6. Motion rules

- Every `@keyframes` in the codebase is neutralized by the single global rule inside
  `@media (prefers-reduced-motion: reduce)` in `app/styles/motion.css`: it targets
  `*, *:before, *:after` directly, so a new keyframe never needs its own opt-out.
- No animation loops. `.spark`'s old infinite twinkle now plays once and holds its end state.
- `pageIn` (the screen entrance fade) uses `--dur-base` and `--ease-out`.
- New animation should animate `transform` and `opacity` only, never `width`, `height`, or layout
  properties, so it stays compositor-friendly.
- No autoplay confetti, no scroll-jacking, no decorative animation that repeats on its own.

## 7. What lanes should not reinvent

- Page frames, tokens, the `Sheet` component (Task 6), and the display helpers in `lib/plan.ts`
  and `lib/game.ts` (Task 4 and 5) are shared. Extend them; do not fork a parallel version in a
  lane's own CSS file.
- Lane-local custom properties belong in that lane's own stylesheet, never added to `:root`.
