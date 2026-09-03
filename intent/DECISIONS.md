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
