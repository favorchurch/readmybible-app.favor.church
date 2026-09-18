# Plan v1 — Issue 183: Notes UX

run_id: f7bfbe59-8042-4293-88c4-7a90f57000c6
family_id: 3b24a697-3cbb-478b-af5a-c78b4db205b5
plan_version: 1
gear: light
playbook: Change
size: M
base_sha: da50f79ab87fc1d3415dfd673c96f8108086b832
repo: /Users/rico/Git/readmybible-app.favor.church/.claude/worktrees/issue-183
branch: worktree-issue-183
tracking_issue: 183
policy_hash: sha256:422ea6004bc30c3d97d96f360942c9cb9aed847868321ad18318b861fb613607
catalog_snapshot_hash: sha256:e2f75d46099e78747ce3b42d0b1ceec5cfb097e7d09c6223c909e033f71440b6
adapter_snapshot_hash: sha256:efffb665e504071f0f84320be6baa4e08000b39b8493b86eb2bd7d807db23d66
effective_config_hash: sha256:cd54ff5834ad5a3b9ea31db504b30ed2003649160b7c2bcd49cae435fd5e9c7f
plugin_commit: 870c84d2ad1f97e988020eed0cfe8bd5c17222a4

## Frozen intent

**goal**
Notes open and are typable instantly; saved notes load in the background and merge as
`TYPED + FETCHED`; a lightweight WYSIWYG with a constrained 4-font selector replaces the
plain textarea; the sharing control is demoted to a muted footer row.

**done_criteria**
1. Editor is usable immediately while the saved-notes request is pending.
2. Cached notes paint immediately and revalidate without blocking editing.
3. Text entered before fetch completion survives and is PREPENDED to fetched notes.
4. A background revalidation cannot duplicate/append the fetched payload again.
5. Existing save/persistence behavior remains correct after a late-fetch merge.
6. Simple WYSIWYG controls available (bold, italic, underline, simple lists).
7. Font selector contains ONLY Favor Sans, Agharti, Arial, Inter.
8. AMENDED: default font is **Inter** at normal weight (user decision; the repo ships only
   FavorSans-Bold.otf and Agharti-Bold.ttf, so "Favor Sans normal weight" is unsatisfiable
   without a new asset). Deviates from issue #183 as originally written.
9. Existing plain-text notes remain compatible and editable.
10. "Share with my connect & leaders" is at the bottom and visually muted/subtle, wording exact.
11. Keyboard/mobile note-taking remains responsive during fetching and saving.
12. AMENDED: the 1000-character limit measures VISIBLE TEXT, not HTML markup (user decision).
    A separate raw-HTML abuse cap guards storage.
13. IN SCOPE (not in the issue): the read-only shared-note viewer renders sanitized rich text
    rather than raw markup.

**blast_radius**
Touched:
- components/notes/notebook-modal.tsx  (editor surface, share row, viewer)
- components/notes/notes.css
- components/notes/use-note-query.ts   (new)
- lib/notes/rich-text.ts               (new, shared contract)
- app/actions/notes.ts                 (validation + sanitize on write)
- app/layout.tsx, app/globals.css      (Inter via next/font/google, QueryClientProvider)
- package.json / pnpm-lock.yaml
- tests/

Not touched: db/schema.ts (content column is unbounded `text`; no migration), Rock
integration, auth/session, any other route or component.

Evidence for the boundary:
- `grep -rn "Share with my"` matches exactly one file (notebook-modal.tsx:274).
- getNote/saveNote are consumed only by notebook-modal.tsx.
- notes content column: db/schema.ts:99 `text("content").notNull().default("")` — unbounded,
  so the 1000 cap is purely app-level (app/actions/notes.ts zod `.max(1000)`).

**named_actions**
- add npm dependencies (@tanstack/react-query, @tiptap/*, an HTML sanitizer)
- write/modify the files listed under blast_radius
- run pnpm install, pnpm lint, tsc, vitest run, pnpm build
- drive a local dev server + browser for UI evidence
- open a PR against main (human merges)

**non_goals**
- full document/page-layout editing
- arbitrary fonts, font uploads, advanced typography
- making sharing a primary CTA
- any DB migration or schema change
- merging to main

## model_assignments

- orchestrator: invocation `claude-opus-5[1m]`, model_id `claude-opus-5`, effort high,
  harness `claude-code@local`, inline. Rationale: entry model owns the lifecycle; gear
  `light` does not fund a separate orchestrator route.
- planner: same identity as orchestrator, **inline**. Rationale: gear `light` does not fund a
  dedicated planner; repository reconnaissance was cheap (5 targeted greps) and the two
  contradictions found were resolved directly with the user.
- executor: **agy**, routed at dispatch per explicit user instruction; route notice published
  immediately before dispatch.
- reviewer: a separate identity from the executor. No self-approval.

## Waves

Wave 1 (foundation; T1 and T2 touch disjoint files)
- T1 Dependencies + providers + Inter
  Depends on: none
  Touches: package.json, pnpm-lock.yaml, app/layout.tsx, app/globals.css,
           components/providers/query-provider.tsx (new)
- T2 Pin shared contract lib/notes/rich-text.ts
  Depends on: none
  Touches: lib/notes/rich-text.ts (new)
  Exports (PINNED CONTRACT — T3/T4/T5 consume this exact surface):
    export const NOTE_FONTS: readonly { id: string; label: string; stack: string }[]
      // exactly 4 entries, ids: "inter" | "favor-sans" | "agharti" | "arial"
    export const DEFAULT_NOTE_FONT_ID = "inter"
    export function sanitizeNoteHtml(html: string): string
    export function plainTextLength(html: string): number
    export function htmlToPlainText(html: string): string
    export function isLegacyPlainText(content: string): boolean
    export function legacyPlainTextToHtml(content: string): string
    export const NOTE_TEXT_LIMIT = 1000
    export const NOTE_HTML_LIMIT = 8000

Wave 2 (parallel over the pinned T2 contract)
- T3 Server action validation + sanitization
  Depends on: T2
  Touches: app/actions/notes.ts
- T4 React Query note hook + prepend-merge with one-shot guard
  Depends on: T2
  Touches: components/notes/use-note-query.ts (new)

Wave 3 (integration)
- T5 NotebookModal rewrite
  Depends on: T1, T2, T3, T4
  Touches: components/notes/notebook-modal.tsx, components/notes/notes.css

Wave 4
- T6 Tests
  Depends on: T5
  Touches: tests/

## Known-bad behavior tests (required)

KB1  A revalidation delivering the same fetched payload a second time must NOT append it
     again. Assert the merged content contains the fetched body exactly once.
KB2  A note whose sanitized HTML exceeds 1000 characters but whose visible text does not
     must SAVE successfully (proves the limit moved off raw markup).
KB3  A legacy plain-text note must load into the editor as readable text, not as escaped
     markup, and must remain editable and savable.
KB4  Typing before the fetch resolves must yield exactly `TYPED + FETCHED`, in that order.

## Validation strategy

Ordered gates, all run in the worktree:
1. pnpm lint
2. pnpm exec tsc --noEmit
3. pnpm vitest run          (baseline: 70 files / 675 tests green at da50f79)
4. pnpm build               (RAW, not `rtk next build` — rtk reports false failures)
5. Browser evidence via ego-browser: open the notebook, screenshot the immediate-typing
   state, the font selector contents, and the muted footer share row.

## Rollback / restore

Branch `worktree-issue-183` off `da50f79`. All changes are additive plus one modal rewrite.
Rollback = drop the branch / reset to da50f79. No DB or external state is mutated, so no
backup is required. Merge to main stays with the human.

## Protected paths

db/schema.ts, lib/rock/**, lib/session.ts, app/auth-*/** — must not be modified by this run.
