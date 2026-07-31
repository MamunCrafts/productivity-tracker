# Roadmap

Proposed features for Productivity Tracker, ordered by value against effort.
Each item notes what it touches in the current codebase.

---

## Fix first

Gaps that cause real data loss or dead ends today.

- **Persist the running timer**
  - `activeTimer` lives only in Redux memory — a refresh or closed tab loses the session with no trace
  - Write `{habitId, startTime, logId}` to `localStorage` on start; reconcile on load
  - Touches: `store/habitSlice.ts`, `app/StoreProvider.tsx`
  - Effort: small

- **Edit habits and logs**
  - No `PUT`/`PATCH` route exists for either entity — a habit's title and goals are frozen after creation
  - A mistyped manual log (300 minutes instead of 30) is permanent and silently skews every chart
  - Needs `PATCH /api/habits/[id]`, plus `PATCH` and `DELETE` on logs
  - Touches: `app/api/`, `store/habitSlice.ts`, `HabitForm`, `ManualLogForm`
  - Effort: medium

- **Session notes**
  - Add `note` to `TimeLog`; prompt for one line when the timer stops
  - Turns "I logged 200 hours" into a practice journal worth rereading — hours alone don't say whether they were any good
  - Touches: `types/index.ts`, `models/TimeLog.ts`, `FocusTimer`, `ManualLogForm`
  - Effort: small

---

## Make it a study tool, not a stopwatch

- **Pomodoro structure in focus mode**
  - 25/5 intervals with a gentle break prompt; exclude break time from logged hours
  - The focus overlay already owns the session, so this is a natural extension
  - Touches: `components/FocusTimer.tsx`
  - Effort: medium

- **Session quality rating**
  - A 1–5 tap when you stop, stored on the log
  - Lets analytics plot hours against focus quality — usually more revealing than volume
  - Touches: `types/index.ts`, `models/TimeLog.ts`, `FocusTimer`, `app/page.tsx`
  - Effort: medium

- **Use the two dead fields**
  - `weekFrequency` and `totalDays` are collected by the form and stored in Mongo, but read by nothing
  - `weekFrequency` ("4 days a week") would let a habit show *on track* vs *behind* instead of only a lifetime percentage
  - Touches: `lib/analytics.ts`, `HabitCard`
  - Effort: medium

- **Today's target**
  - `perDayHours` exists but nothing compares it to today's actual hours
  - A small ring per habit row closes the daily loop
  - Touches: `components/HabitCard.tsx`
  - Effort: small

---

## Later

- **Goal completion and archiving**
  - `Habit.completed` exists and is never set to `true`
  - Reaching the hour goal should mark it done and move it to a "finished" section — today the only exit is deletion
  - `status` could grow a `Paused` value for habits you're not currently working
  - Touches: `models/Habit.ts`, `app/api/habits/`, `HabitList`
  - Effort: medium

- **Weekly review**
  - Sunday summary: hours, best day, what slipped, notes from the week
  - Pairs naturally with session notes
  - Effort: medium

- **Export**
  - CSV/JSON download of logs, so the practice record isn't trapped in one Mongo instance
  - Effort: small

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
