# Decisions log (grilling, 2026-09-03)

| # | Decision |
|---|---|
| Q1 | Domain `readmybible-app.favor.church` on Vercel; retire OpenAI Sites and vinext |
| Q2 | Supabase `shared-apps-favor-church`, schema `readmybible`, Drizzle. Neon rejected: no CLI access |
| Q3 | Matthew 1–28 on Oct 1–28, grace days after. Verse popups in-app plus Bible.com link |
| Q4 | Show own GT25 group; picker if several; solo mode plus join by code or QR if none. GT24 leaders get the admin view. connect.favor.church linked where natural |
| Q5 | Group progress by ratio of chapters read to members × 28 |
| Q6 | Backdate any past day in the window, never future. Streak by reading date |
| Q7 | Full Rock roster shown, first name only |
| Q8 | Leaders see join code and a "hasn't read today" list |
| Q9 | Fixture rico+test in group 24077: Member, Leader, removed |
| Q10 | Wayfinder map and tickets as GitHub issues on this repo |
| Q11 | Every active GT25 group, all age groups |
| Q12 | Device timezone decides "today" (multi-campus) |
| Q13 | Latest packages that build on Vercel, Auth0 SDK v4 |
| Q14 | In: admin dashboard with Chart.js. Out: reminders, multiple plans, campus progress tab |
| Q15 | Test by Sunday 2026-09-06; leaders from 2026-09-20; name "Read My Bible" |
| Q16 | Join by code writes the GroupMember row to Rock prod. New REST key, Rock Administrator for now, narrowing issue in rock-security |
| Q17 | Campus-scoped group leaderboard; individuals never ranked; prototype scoring kept |
| Q18 | Campus scope from the group, or PrimaryCampusId when solo |
| Q19 | Translation toggle NET, ESV, CSB, NIV, NLT; default NET; English only |
| Q20 | Admin access: allowlist plus any GT24 membership scoped to its subtree |
| Q21 | Admin is hierarchy titles plus per-group stats and a timeline ratio chart from Oct 1 |
| Q22 | Social share retired |
| Q23 | Auth0 host mapping, Action redeploy, callback URLs approved. Preview URLs unmapped. Local dev uses a mock session |
| Q24 | Everything ships by Sunday |
| Q25 | Q4's "connect.favor.church linked where natural" narrowed (2026-09-03): that portal is internal to Connect Group leaders only, never members or the public. Removed from the not-found screen, auth-error screen, and solo mode; kept only inside the leader-gated Connect tools box |
| Misc | Missing assets may be generated with codex imagegen (luna). Rico adds the REST key to `.env` himself |

## Issue 32 UI/UX audit (2026-09-03, plan `docs/plans/issue-32-ui-ux-implementation.md`)

| # | Decision |
|---|---|
| D2 | Palette may evolve in tones, accents, and neutrals only. The eight named color tokens (`--navy`, `--coral`, `--gold`, `--sage`, `--cream`, `--paper`, `--blue`, `--violet`) keep their hues for the life of the product; new tones of those hues are allowed (for example `--coral-soft`, `--ink-muted`), never a new hue family, dark mode, or a replacement for a primary token. `--ink-muted` was darkened from `#6e716d` to `#646765` during this run to clear the 4.5:1 body-text contrast floor |
| D5 | Dev-only clock override `DEV_MOCK_TODAY` (a `YYYY-MM-DD` date), honored only when `NODE_ENV !== "production"`, the same guard `DEV_MOCK_PERSON_ID` already used. `lib/dev-clock.ts` is the only reader; production behavior is unchanged and a two-sided test proves the guard. Added so active, grace, and closed states could be QA'd before the real October 1 launch |
| D-favicon | Favicon redesigned: an open book with a small tent silhouette, `--navy` on `--cream` with a coral accent, replacing the leftover Next.js starter grid asset. Regenerated at 16px and 32px; no other icon or font asset changed |
| D-location | The reading-location picker (the catch-up flow's "Where did you read?" question, `LOCATIONS` state) was removed. It captured a location that was never sent anywhere and added a step to an honor-based check-in for no product purpose |

## Issue 35 Scripture and debug (2026-09-04, plan `docs/plans/issue-35-scripture-and-debug.md`)

| # | Decision |
|---|---|
| D-csb-niv-source | bolls.life (the source for NET, KRV, and the other six key-passage versions) does not carry CSB at all and only carries NIV 1984, not the 2011 edition Rico specified. CSB and NIV(2011) key passages (#49) were sourced instead from bible.com and biblegateway.com -- two independent licensed republishers of the same copyrighted text -- fetched and cross-checked verse-by-verse per `scripts/build-csb-niv.ts`; a passage is accepted only when every verse in its range agrees between both sources after normalizing each site's own typesetting noise (nbsp padding around quotes/dashes, footnote markers), never by picking a winner on disagreement. All 28 passages agreed for both versions on the run that produced the committed `lib/scripture/data/{CSB,NIV}/key-passages.json`; provenance (source URLs, agreed/omitted status) is in the sibling `provenance.json` in each version's directory |
| D-popup-serif | The Quick Verse passage body renders in Georgia serif at weight 400 in var(--ink); decided by Rico on 2026-09-04 after reviewing amendment 6; rationale is readability plus visual separation of Scripture from app chrome; it is the second sanctioned Georgia exception alongside the verse reference. |
