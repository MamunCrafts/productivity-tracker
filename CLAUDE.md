# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**This project uses yarn.** `yarn.lock` is gitignored (`yarn*` in `.gitignore`), while a stale `package-lock.json` is still committed — so yarn prints a mixed-lockfile warning on every install. Harmless, but don't "fix" it by running `npm install`.

```bash
yarn install
yarn dev         # dev server on :3000
yarn build       # production build — the real gate; `next build` runs TS
yarn start       # serve production build
yarn lint        # eslint (flat config, eslint-config-next core-web-vitals + typescript)
npx tsc --noEmit # fastest full type-check on its own
```

`yarn lint` exits 0 as of 2026-08-01 — the four errors this file used to list (`FocusTimer.tsx` setState-in-effect, `ui/input.tsx` empty interface, two `any`s in `lib/db.ts`) are gone. Treat a non-zero lint exit as your change.

There is no test framework, test script, or test file in this repo. Don't invent one when asked to "run the tests" — say so.

Requires `.env` (or `.env.local`) with **`DATABASE_URL`** (the MongoDB connection string). `lib/db.ts` throws at import time if it is missing, so every API route 500s without it. Note the README says `MONGODB_URI` — that name is wrong; the code reads `DATABASE_URL`.

## Domain model

The README describes "Tasks"; the code has no such concept. The two real entities (`types/index.ts`) are:

- **Habit** — a long-running goal with `totalHours`, `perDayHours`, `totalDays`, `weekFrequency`, a hex `color`, and `status: "Active" | "Deleted"`. `pinnedAt` is a timestamp, not a boolean, so `sortPinnedFirst` (in `store/habitSlice.ts`) can put the *most recently* pinned habit at the top; pinning reorders within a `/habits` section, never across them.
- **TimeLog** — one chunk of focused time against a habit: `habitId`, `durationSeconds`, and `date` (`YYYY-MM-DD`, used as the grouping key for analytics).
- **Task** — a Kanban card. `status: "Todo" | "Doing" | "Done"` *is* the column (there are no user-defined columns), `order` is a **fractional** position within it, and `habitId` is **nullable** — a task may stand alone or borrow a habit's colour and name. Nothing in analytics derives from tasks, which is why they hard-delete.

Both use a client-generated `crypto.randomUUID()` string in an application-level **`id`** field. Mongo's `_id` is never used for lookup — every query, filter, and route param is on `id`. New models should follow this.

## Architecture

**Four routes.** `/` is the analytics overview (`app/page.tsx`), `/habits` is the working list (`app/habits/page.tsx`), `/tasks` is the Kanban board (`app/tasks/page.tsx`), `/review` is the weekly review (`app/review/page.tsx`). `components/Nav.tsx` links them — below `sm` only the current destination shows its label, because four labels overflow a 360px viewport.

**Data flow is entirely client-side.** `app/layout.tsx` wraps every route in `app/StoreProvider.tsx`, which on mount dispatches `fetchHabits()` + `fetchLogs()` + `fetchTasks()` to pull those *full* collections into Redux. Keeping the provider at the layout means one fetch shared across client-side navigation — don't push it back down into a page. Nothing is fetched on the server, and there is no per-habit, filtered, or paginated endpoint. Components read from the store only.

Everything derived — total hours, progress percentage, every chart on `/` — is computed in the browser by filtering `state.habit.logs`. There is no server-side aggregation. This is fine at current scale; if log volume grows, that's where the pressure lands.

**The task board is its own module.** `store/taskSlice.ts` (mounted as `task`), `lib/board.ts`, `components/tasks/`, `models/Task.ts`, `app/api/tasks/`. It depends on `habit` only to look up a linked habit's colour and title; nothing in `habitSlice` or `lib/analytics.ts` knows tasks exist, and it should stay that way.

- **Ordering is fractional, not sequential.** A drop takes the midpoint between its two new neighbours (`orderBetween` in `lib/board.ts`), so one card is written instead of renumbering a column. Don't "fix" this into an index — that turns every drag into N writes.
- **A drag is applied locally before it is saved.** `moveTaskAsync` dispatches `applyMove`, PATCHes, and re-dispatches `applyMove` with the old values if the write fails. A card that snaps back mid-request reads as a failed drag, so don't drop the optimistic step.
- **dnd-kit sensors are tuned for touch**: mouse activates after 6px, touch after a 200ms *hold*. That hold is why cards must **not** carry `touch-action: none` — a plain swipe over a card has to scroll the board.
- Cross-column hovering doesn't reshuffle the target column live; the `DragOverlay` follows the cursor and the card lands correctly on drop. That's a deliberate trade for a fraction of the state juggling.

**Two Redux slices.** `store/habitSlice.ts` (mounted as `habit`) holds `habits`, `logs`, `activeTimer`, and a `status` flag driven only by `fetchHabits` (`HabitList` renders `ShimmerCard`s while `loading`). All mutations are `createAsyncThunk`s that `fetch` the API routes and reconcile local state in `extraReducers`. Always use the typed `useAppSelector` / `useAppDispatch` from `store/hooks.ts`.

**The timer writes one log, at the end.** `startTimer` seeds an in-memory `activeTimer` carrying `phase`, `phaseStartedAt`, and `breakSeconds`; no DB write happens until `stopTimerAsync`, which subtracts break time and POSTs a single `TimeLog`. `store/timerPersistence.ts` mirrors `activeTimer` to `localStorage` on every action and `StoreProvider` rehydrates it, so a refresh no longer loses the session — **sessions older than 12 hours are dropped as abandoned** rather than silently restored. `FocusTimer.tsx` renders from the layout so it survives route changes.

`ManualLogForm` writes a `TimeLog` with `endTime: null`, so **`startTime` is only trustworthy when `endTime !== null`** — don't build time-of-day analysis on it without that filter. That same null is what distinguishes "timed" from "manual" in the session list and the export.

**Delete semantics differ by entity, deliberately.** `DELETE /api/habits/[id]` is soft (`status: "Deleted"`), and the habit's logs are left in place so its hours survive in analytics. `DELETE /api/logs/[id]` and `DELETE /api/tasks/[id]` are hard deletes — a mistyped session is bad data, not history, and a deleted task feeds no total at all.

Note that deleting a habit leaves any task pointing at it with a dangling `habitId`; `TaskCard` renders no habit chip in that case rather than breaking.

**API surface** (`app/api/`):

| Route | Methods |
|---|---|
| `/api/habits` | `GET` (everything not Deleted), `POST` |
| `/api/habits/[id]` | `PATCH`, `DELETE` (soft) |
| `/api/logs` | `GET` (all), `POST` |
| `/api/logs/[id]` | `PATCH`, `DELETE` (hard) |
| `/api/tasks` | `GET` (all, sorted by `order`), `POST` |
| `/api/tasks/[id]` | `PATCH`, `DELETE` (hard) |
| `/api/export` | `GET` — `?format=csv\|json`, sets `Content-Disposition` |

All three `PATCH` routes **whitelist editable fields** (`EDITABLE` array at the top of each) so a client can't reassign `id` or rewrite `createdAt`, and all map Mongoose `ValidationError` to 400 rather than letting it surface as a 500. On Next 16, dynamic route `params` is a Promise — `{ params }: { params: Promise<{ id: string }> }`, then `await params`.

**Changing a Mongoose schema needs a dev-server restart.** The `mongoose.models.X || mongoose.model(...)` hot-reload guard keeps the *old* compiled schema, so new fields get silently stripped on write until the process restarts. If a field you just added reads back as `null`, that's why — not your code.

**Mongoose** connections are cached on `global.mongoose` to survive hot reload (`lib/db.ts`); every route must `await dbConnect()` first. Models use the `mongoose.models.X || mongoose.model(...)` guard for the same reason — copy that pattern in any new model.

## Analytics & charts

`lib/analytics.ts` holds every derivation as a **pure function of `(habits, logs)`** — day buckets, per-habit totals, weekday totals, streaks, the heatmap grid. Add new metrics there, not inside components, and bucket by the log's `date` string (`dayKey`) so everything agrees on local-day boundaries. Two behaviours worth preserving:

- `hoursByHabit` folds logs whose habit was soft-deleted into a single **"Archived habits"** row. Without it those hours count toward page totals but disappear from the breakdown.
- The range filter on `/` scopes every chart *except* goal progress, which is deliberately all-time (the goals are lifetime targets) and is labelled as such.

`lib/viz.ts` holds the chart chrome and the sequential ramp, with the validation results in a comment. Rules that the charts already follow and new ones should too:

- **Habit colors are entity identity**, chosen by the user and persisted — a habit wears the same hue on its card, in its chart, and in the breakdown. Never assign chart color by rank or value.
- Those eight picker hues clear CVD separation and 3:1 contrast on the dark surface but sit above the ideal dark lightness band, so use them on **thin marks** (≤24px bars, 2px lines), never large saturated fills, and always pair them with a non-color identity channel (axis label, legend, or the table view).
- Single-series charts use `VIZ.accent`; magnitude grids use `HEAT_RAMP` (one hue, light→dark). No rainbows, no dual-axis charts.
- Every chart is wrapped in `components/analytics/ChartCard.tsx`, which ships a **table-view twin** — a value must never be reachable only by hovering.

## Design system

Dark-only, and built around long study sessions. The whole theme lives in `app/globals.css` — **use the semantic tokens, never raw `zinc-*`/`black`/`white` utilities.** A stray `bg-zinc-900` will not match the surfaces around it.

| Token | Role |
|---|---|
| `base` → `surface` → `surface-2` | page, card, raised/hover |
| `line`, `line-2` | hairline, stronger border |
| `ink`, `ink-2`, `ink-3` | primary / secondary / muted text |
| `amber`, `amber-deep` | the single accent |
| `danger` | destructive only |

Two rules the palette exists to enforce, both about eye strain — don't undo them:

- **No pure black or pure white.** Primary text sits at 13.4:1 on the card surface, not 21:1. That's still well above WCAG AAA (7:1) but avoids the halation that makes `#fff`-on-`#000` tiring. Everything is warm-shifted (hues 32–42°) to keep high-energy blue off the largest surfaces.
- **Amber is reserved.** It means "focus" or "the primary action" and nothing else. Chart data stays cool blue (`VIZ.accent`) precisely so nothing on a chart looks pressable.

Type has three roles, all set in `layout.tsx`: **Fraunces** (`font-display`) for subject matter — habit names, page and dialog titles; **Geist Sans** for interface chrome; **Geist Mono** (`font-mono`) for hours, timers, and counts. Add `tnum` to any numeral that gets compared down a column. Note `Fraunces()` must not pass both `weight` and `axes` — that combination fails to resolve at build time.

Motion is deliberately slow and skippable. `animate-shimmer` runs ~2.8s per pass and `animate-breathe` 10s (about six breaths a minute, the focus-mode pacer). `globals.css` stops shimmer/ping/pulse/breathe entirely under `prefers-reduced-motion`, and there's one global `:focus-visible` outline in amber — never remove it locally.

## UI conventions

- shadcn-style primitives in `components/ui/` (Radix + `cva` + `cn` from `lib/utils.ts`). `Button`'s `premium` variant is kept only as an alias of `default`; prefer `default`.
- **Tailwind v4, CSS-first.** Theme tokens, keyframes, and the reduced-motion block live in `app/globals.css`; there is no `tailwind.config.ts` (the README claims otherwise).
- **`/habits` is a single-column list, not a grid.** Each habit is one `HabitCard` row: color rail, title, 21-day consistency strip, totals, then one clear primary action with the secondary icons recessive until hover or focus. Progress is the 2px bar along the row's bottom edge, not a separate meter.
- **Loading states** come from `components/ui/shimmer.tsx` (`ShimmerRows`, `ShimmerStat`). Keep new skeletons the same silhouette as the component they replace so nothing shifts on load.
- `framer-motion` for row enter/layout animation, `recharts` for charts, `date-fns` for date math.

## Mobile

Design mobile-first for a ~360px viewport; the app is used on a phone as much as a desk.

- **Nothing may exceed the viewport width.** Two past bugs came from fixed pixel sizes: the focus-mode breathing rings (now `min(420px,88vw)`) and the docked timer's control row. Prefer `min()`/`vw` over fixed `w-[Npx]`, and give wide content (tables, the heatmap, the range filter) its own `overflow-x-auto`.
- **The docked session bar is the tightest space in the app.** It carries a title, a clock, and up to five controls. Button labels collapse to icons below `sm`, and the cadence picker is hidden below `md` — it stays reachable inside focus mode.
- **Recharts reserves gutters in pixels, not percentages.** `HabitBreakdownChart`'s y-axis width plus its right margin is fixed, so long habit names are truncated to keep the bars readable on a phone. Check that arithmetic before widening either.
- Secondary row actions sit at `opacity-70` rather than `0` precisely because touch has no hover — never gate a control behind `group-hover` alone.

## React rules this codebase trips over

`eslint-config-next` enforces the React purity rules, and both bite in timer code:

- **No `Date.now()` during render.** `FocusTimer` keeps the clock in state via `useNow()`, which samples on an interval. Reading the clock in a render body fails `react-hooks/purity`.
- **No synchronous `setState` in an effect body.** Schedule it (`setTimeout(fn, 0)`), use a lazy `useState` initialiser, or remount with a `key` — `FocusTimer` uses `key={logId}` so a new session gets a fresh component instead of an effect resetting the old one.
- Import via the `@/*` alias (maps to repo root).
