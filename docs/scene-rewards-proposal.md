# Scene rewards proposal

Status: Rico explicitly selected **B — First contribution unlock** on September 16, 2026. A and C remain unselected alternatives.

## Choose a coherent experience

| Decision | A — Open gathering (recommended) | B — First contribution | C — Daily gathering |
| --- | --- | --- | --- |
| Scene access | Always available, as today | Available once this group's existing chapter count is greater than zero | Available when at least one current member has read today's chapter |
| Member appearance | Everyone remains visible; existing read-today indication | Everyone remains visible; existing read-today indication | Today's readers appear; full roster stays accessible through People and Classic |
| Home progression | Existing overall group completion, unchanged | Same | Same |
| Reward feedback | Explain next home and existing chapter coins; no new currency | Locked teaser and first-contribution message, then existing progress | Empty morning teaser, readers arriving through the day, existing progress |

A preserves belonging and avoids daily disappearance. B adds anticipation without a daily reset. C most closely expresses the daily gathering idea, but absent members become conspicuous and daily boundaries need explicit agreement.

## State and sample copy

| Moment | A | B | C |
| --- | --- | --- | --- |
| Before any contribution | Full gathering: “Your group's reading grows this home.” | Empty teaser: “Your first shared chapter opens the gathering.” | Empty teaser: “Today's gathering begins with a chapter.” |
| First qualifying check-in | Existing progress updates | Scene becomes accessible to the whole group; everyone appears | Scene becomes accessible; qualifying reader appears |
| Later that day | Everyone stays; read-today status updates | Access remains; everyone stays | Additional qualifying readers appear |
| Next day | Everyone stays; read-today status resets | Access remains while the group's contribution count is positive | Scene returns to the daily teaser until a qualifying reader appears |

## Existing evidence and proposed boundaries

The completion signal is the existing honor-based chapter check-in. It is unique per person and chapter forever. Opening or scrolling the reader is not an independent completion signal for these rules. Coins are derived display values (10 per chapter); medals remain the personal 3/7/14/21/28 chapter ladder. Home stages remain Tent → Trailer → Cabin → Apartment → House → Mansion under the existing overall group ratio.

For B, use the current group's authoritative chapter total, not local storage. Reload reconstructs the same state. Switching groups evaluates the destination group's total; it does not carry access from another group. Catch-up chapters count. A zero-contribution destination group shows the teaser. No permanently stored unlock is proposed.

For C, use the existing campus-day group aggregate and current roster's `readToday`, not browser time or the viewer's personal timezone. Catch-up on a different chapter does not qualify as today's chapter. Repeated events do not duplicate arrivals. Reload derives current membership. Group switches evaluate the destination roster. New members appear only if included in that group's authoritative read-today data. During pre-launch, grace and closed phases, show an ungated preview/full gathering rather than an impossible daily unlock. These are proposed boundaries, not decisions.

Unavailable or loading data must not be called “locked.” Classic, roster profiles, saved avatars and reading navigation stay accessible for every option. New persistence or changes to existing reward formulas require a separate scope amendment.

## Approved implementation contract

Access derives exclusively from `GroupStats.checkinCount`, passed from Today and Connect into the shared `sceneEligibility` function. The aggregate counts existing check-in rows attributed to the current group. No stored unlock, new currency, or threshold change is introduced.

| Transition | Example | Result |
| --- | --- | --- |
| Known zero → first check-in | Count 0 → 1 | Empty alternate-scene teaser becomes the full roster gathering for all viewers |
| Positive → more check-ins | Count 1 → 2 | Gathering remains open; existing stage and coins update |
| Repeated check-in | Count 1 → 1 | No duplicated reward or arrival; gathering remains open |
| Reload / next day | Count remains 1 | Gathering remains open, including members who have not read today |
| Group switch | Destination count 0 | Destination teaser; source-group access does not transfer |
| Missing aggregate → known count | null → 0 or 1 | Unavailable message becomes teaser or full gathering |

Daily rollover and personal/campus timezone disagreement never affect access. Catch-up contributions qualify because any existing chapter check-in counts. Pre-launch, active, grace and closed phases all use the same count rule; when reading is not currently offered, the teaser points to the reading plan. Empty groups can preview the home; a positive historic contribution count still opens the gathering even when the current roster is empty. New members join an already-unlocked gathering immediately. A group switch never moves check-in history.

The teaser shows the home, fire and environment, with no people. Classic and People keep the full roster and profile access. Once open, everyone remains visible with existing read-state semantics. Feedback explains the first check-in, confirms belonging inside expanded progress, and retains existing next-home thresholds, chapter coins, and personal medal rewards. Loading/unavailable aggregates are not mislabeled as locked. No one-time celebration is persisted or replayed.

## Unresolved

- No product decisions remain for option B. The daily-only option C is not being implemented.
- New automated tests are omitted under Rico's current instruction; existing checks and browser verification still run.
