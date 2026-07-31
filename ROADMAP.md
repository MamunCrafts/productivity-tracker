# Roadmap

Proposed features for Productivity Tracker, ordered by value against effort.
Each item notes what it touches in the current codebase.

---

## Shipped

Everything below the "Fix first" and "Make it a study tool" headings has been
built. Kept here as a record of what each change was for.

- **Persist the running timer** — `activeTimer` now carries phase and break
  state and is mirrored to `localStorage` by `store/timerPersistence.ts`, then
  rehydrated in `StoreProvider`. Sessions older than 12 hours are treated as
  abandoned rather than silently restored.
- **Edit habits and logs** — `PATCH /api/habits/[id]`, `PATCH` and `DELETE` on
  `/api/logs/[id]`. Both routes whitelist editable fields, so a client can't
  reassign `id` or rewrite `createdAt`. `HabitForm` doubles as an edit form;
  `SessionList` (inside the per-habit dialog) is where a session gets corrected
  or removed.
- **Session notes** — `TimeLog.note`, collected by `SessionWrapUp` when a timer
  stops and by `ManualLogForm` for untimed entries.
- **Pomodoro structure** — 25/5 and 50/10 cadences in `FocusTimer`, with break
  time banked separately and subtracted from the logged duration.
- **Session quality rating** — `TimeLog.focusRating` (1–5), surfaced as the
  "Focus quality by session length" chart on `/`.
- **The two dead fields** — `habitPace()` in `lib/analytics.ts` turns
  `weekFrequency` and `totalDays` into a days-this-week count, a required
  hours/day figure, and a "Behind pace" flag on the card.
- **Today's target** — a ring per habit row comparing today's hours to
  `perDayHours`.
- **Goal completion and archiving** — `completed` / `completedAt` are now set by
  a "Mark finished" action, `status` gained `Paused`, and `HabitList` groups
  into In progress / Paused / Finished.
- **Weekly review** — `/review`, with week-over-week deltas, targets met, and
  the week's session notes collected in one place.
- **Export** — `GET /api/export?format=csv|json`, reachable from the analytics
  header.

---

## Not a feature — a real risk

- **There is no authentication**
  - `GET /api/habits` and `POST /api/logs` are open to anyone who knows the deployed URL
  - They can read the data or write junk into it
  - Fine for a private experiment; not fine once the link is shared
  - Effort: large (touches every route and the store)

---

## Scaling notes

Not urgent at current data volume, but this is where pressure lands first:

- Every page load fetches the **full** habit and log collections — there is no pagination or filtered endpoint
- All aggregation (totals, streaks, charts) runs in the browser over the complete log array
- The fix, when needed: server-side aggregation endpoints and a date-bounded log query

---

## Suggested first slice

**Session notes + timer persistence.** Both are small, they compound, and together
they turn the app from a stopwatch into something worth consulting later.
