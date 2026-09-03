# Read My Bible — Game Rules

Faithful to the prototype in `app/page.tsx`. Numbers below are the ones the copy already uses.

## Reading plan

- Book: Matthew, 28 chapters.
- Day n = October n, 2026 = Matthew chapter n, for n in 1..28.
- October 29–31 are grace days: no new chapter, catch-up allowed.
- The plan window closes at the end of October 31 in the reader's timezone.

## Check-in

- Honor-based. Tap "I read today" and the chapter is marked read.
- One check-in per person per chapter. Re-tapping is a no-op.
- Catch-up: any past day in the window may be marked, never a future day.
- "Today" is the device's local date. The client sends `readingDate` (YYYY-MM-DD) and its IANA
  timezone; the server accepts dates from 2026-10-01 up to the client's local today, with one day
  of tolerance for clock skew.
- A check-in stores the group the person belonged to at that moment (`group_id`), or null for
  solo readers.

## Personal scoring

| Mechanic | Rule |
|---|---|
| Coins | 10 per chapter read |
| Streak | Consecutive reading dates ending today or yesterday, in the reader's timezone |
| Medals | Chapters read reaches 3, 7, 14, 21, 28 |
| Next trophy bar | Progress toward the next medal threshold |

Coins never decrease. Leaving a group keeps personal coins.

## Group scoring

Let `M` = active members of the group per Rock (roles Member 23, Leader 24, Assistant Leader 81)
and `C` = check-ins with this `group_id`.

```
ratio = C / (M × 28)          clamped to [0, 1]
```

Ratio, not raw coins, drives the home so a group of 5 and a group of 15 grow at the same pace.

| Stage | Ratio at least |
|---|---|
| Tent | 0 |
| Trailer | 0.10 |
| Cabin | 0.25 |
| Apartment | 0.45 |
| House | 0.65 |
| Mansion | 0.85 |

The Connect tab shows the group's coin total (`C × 10`), the stage, and a bar to the next stage.
"N of M have read today" counts distinct members with a check-in dated today in their own
timezone.

## Campus leaderboard

- Scope: the Rock campus of the group (`Group.CampusId`). A person without a group is scoped by
  `Person.PrimaryCampusId`.
- Ranks groups by ratio, tie-break by readers today, then by name.
- Individuals are never ranked anywhere. Copy: "We cheer for groups, not against people."

## Copy anchors kept from the prototype

"Make space for the Word today." "Read anywhere. Grow together." "This is an honor-based
check-in. Take your time." "Grace for the missed days. Joy in the next one."
