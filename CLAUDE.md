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

`yarn lint` currently exits 1 on **4 pre-existing errors** — `FocusTimer.tsx:25` (setState in effect), `ui/input.tsx:4` (empty interface), `lib/db.ts:14,17` (two `any`s). A non-zero lint exit is therefore not automatically your change; diff the file list before assuming.

There is no test framework, test script, or test file in this repo. Don't invent one when asked to "run the tests" — say so.

Requires `.env` (or `.env.local`) with **`DATABASE_URL`** (the MongoDB connection string). `lib/db.ts` throws at import time if it is missing, so every API route 500s without it. Note the README says `MONGODB_URI` — that name is wrong; the code reads `DATABASE_URL`.

## Domain model

The README describes "Tasks"; the code has no such concept. The two real entities (`types/index.ts`) are:

- **Habit** — a long-running goal with `totalHours`, `perDayHours`, `totalDays`, `weekFrequency`, a hex `color`, and `status: "Active" | "Deleted"`.
- **TimeLog** — one chunk of focused time against a habit: `habitId`, `durationSeconds`, and `date` (`YYYY-MM-DD`, used as the grouping key for analytics).

Both use a client-generated `crypto.randomUUID()` string in an application-level **`id`** field. Mongo's `_id` is never used for lookup — every query, filter, and route param is on `id`. New models should follow this.

## Architecture

**Two routes.** `/` is the analytics overview (`app/page.tsx`), `/habits` is the habit CRUD dashboard (`app/habits/page.tsx`). `components/Nav.tsx` links them.

**Data flow is entirely client-side.** `app/layout.tsx` wraps both routes in `app/StoreProvider.tsx`, which on mount dispatches `fetchHabits()` + `fetchLogs()` to pull the *full* habit and log collections into Redux. Keeping the provider at the layout means one fetch shared across client-side navigation — don't push it back down into a page. Nothing is fetched on the server, and there is no per-habit, filtered, or paginated endpoint. Components read from the store only.

Everything derived — total hours, progress percentage, every chart on `/` — is computed in the browser by filtering `state.habit.logs`. There is no server-side aggregation. This is fine at current scale; if log volume grows, that's where the pressure lands.

**Single Redux slice** (`store/habitSlice.ts`, mounted as `habit`) holds `habits`, `logs`, `activeTimer`, and a `status` flag driven only by `fetchHabits` (`HabitList` renders `ShimmerCard`s while `loading`). All mutations are `createAsyncThunk`s that `fetch` the API routes and reconcile local state in `extraReducers`. Always use the typed `useAppSelector` / `useAppDispatch` from `store/hooks.ts`.

**The focus timer never persists until stopped.** `startTimer` is a plain reducer that writes `{habitId, startTime, logId}` into in-memory `activeTimer` — no DB write. `stopTimerAsync` reads that state, computes `durationSeconds`, and only then POSTs the `TimeLog`. A page refresh mid-session silently loses the running timer. `FocusTimer.tsx` is a fixed-position overlay rendered from the layout (so it survives route changes) and shows only when `activeTimer` is set. `ManualLogForm` writes a `TimeLog` directly with `endTime: null` and an approximate `startTime` — so **`startTime` is only trustworthy when `endTime !== null`**; don't build time-of-day analysis on it without that filter.

**Soft delete.** `DELETE /api/habits/[id]` sets `status: "Deleted"`; `GET /api/habits` filters `{ status: "Active" }`. Associated `TimeLog`s are deliberately left in place, so a habit's logs survive deletion. Anything listing habits must filter by status.

**API surface** (`app/api/`) is thin — connect, query, return JSON, no validation or error handling:

| Route | Methods |
|---|---|
| `/api/habits` | `GET` (Active only), `POST` |
| `/api/habits/[id]` | `DELETE` (soft) |
| `/api/logs` | `GET` (all), `POST` |

No update endpoint exists for either entity. On Next 16, dynamic route `params` is a Promise — `{ params }: { params: Promise<{ id: string }> }`, then `await params`.

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
- Import via the `@/*` alias (maps to repo root).
