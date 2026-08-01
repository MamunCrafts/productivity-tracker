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

- **Note** — imported markdown. `content` is the original file kept byte-for-byte; `blocks` is the parsed JSON tree the reader renders. `blocks`, `excerpt` and `wordCount` are **derived server-side from `content` on every write** and are absent from the PATCH whitelist, so the two can't drift. `habitId` is nullable like a task's, and notes hard-delete for the same reason.

- **Category** — a folder for notes. Stored **flat** with a `parentId` (null at the root) and walked into a tree at render time by `lib/tree.ts`, so moving a folder is one write rather than rewriting a path on every descendant. Arbitrary depth.

All of them use a client-generated `crypto.randomUUID()` string in an application-level **`id`** field. Mongo's `_id` is never used for lookup — every query, filter, and route param is on `id`. New models should follow this.

## Architecture

**Five top-level routes.** `/` is the analytics overview (`app/page.tsx`), `/habits` is the working list (`app/habits/page.tsx`), `/tasks` is the Kanban board (`app/tasks/page.tsx`), `/notes` is the markdown shelf (`app/notes/`, with `/notes/import` and `/notes/[id]` under it), `/review` is the weekly review (`app/review/page.tsx`). `components/Nav.tsx` links them — below `sm` only the current destination shows its label, because five labels overflow a 360px viewport. Nav marks a tab active with `startsWith`, not equality, so `/notes` stays lit inside its children; `/` is the one exact match.

`/login` and `/register` sit outside that set and outside the app shell: `components/ChromeOnly.tsx` returns null for them, so nav, docked timer and colophon don't render. It gates on the **route only**, never on signed-in state — the server can't read `localStorage`, so gating on that would strip the nav from every page's server-rendered HTML and let it pop in after hydration on every load.

**Auth is real, and it is a single-account gate.** Auth.js v5 (`next-auth@5` beta) with a Credentials provider and a **JWT session** — no database adapter, because every adapter brings its own collections and id shape, which would fight the application-level `id` convention every model here uses.

- **The config is split in two, and that split is load-bearing.** `auth.config.ts` is Edge-safe and holds the `authorized` callback; `auth.ts` adds the Credentials provider, which needs mongoose and bcrypt. `middleware.ts` may only import the former — the Edge runtime has neither of those packages.
- **Route protection lives entirely in middleware**, which is why no API route repeats the check. The matcher covers everything except `api/auth` (Auth.js's endpoints *and* `/api/auth/register`, which must work while signed out) and static assets. A signed-out request never reaches a handler or gets any markup.
- **There is exactly one account.** `POST /api/auth/register` returns 409 once a user exists. Nothing else in the schema is scoped to a user — no `Habit`, `TimeLog`, `Task`, `Note` or `Category` carries a `userId` — so a second account would see the first one's data. Adding real multi-user means a `userId` on all five models plus a filter on every query, and a backfill for existing rows.
- `passwordHash` is `select: false`, so it is absent unless a query asks for it. Only `auth.ts` does.
- Sign-in failures are deliberately indistinguishable: a wrong password and an unknown email give the same message, and `authorize` compares against a constant hash when no user matches so both take the same time. Response timing otherwise reveals which emails exist.
- `AUTH_SECRET` is required in `.env` alongside `DATABASE_URL`; without it Auth.js throws at startup.
- `components/ChromeOnly.tsx` hides nav, timer and colophon on the auth routes, keyed off `AUTH_ROUTES` from `auth.config.ts` so the guard and the chrome can't disagree. The root layout is `async` and reads `auth()` so the nav's sign-out control is correct in the server HTML rather than appearing after hydration — which is also why every route now renders dynamically.

**Notes are their own module too.** `store/noteSlice.ts` (mounted as `note`), `lib/markdown.ts`, `lib/noteView.ts`, `components/notes/`, `models/Note.ts`, `app/api/notes/`. Like tasks it touches `habit` only for a linked habit's colour and title.

- **The markdown is parsed once, at write time, on the server.** `parseNote()` turns the file into `Block[]` (`types/notes.ts` is that schema, not Mongoose — the field is a single `Mixed`). The reader is a `switch` over block types with the theme tokens applied directly, so there is no prose stylesheet and no markdown parser in the read path. Add a new element by extending the union in `types/notes.ts`, the flattener in `lib/markdown.ts`, and `BlockRenderer.tsx`.
- **`lib/markdown.ts` and `lib/noteView.ts` are split on purpose.** The first imports remark; the second (`MAX_NOTE_BYTES`, `isRenderableImage`, `tableOfContents`, `readingMinutes`) imports nothing. Client components must import from `noteView`, or the whole parser lands in their bundle. Only `/notes/import` loads the parser, via a dynamic `import()`.
- **Nothing the flattener can't model is dropped.** Unknown nodes become a `raw` block holding their original source and render visibly, because a note that silently loses a section is worse than one showing a block you can see.
- **Import is preview-then-confirm.** A dropped file is read with `file.text()`, parsed in the browser, and rendered through the *same* `NoteBody` the reader uses; nothing is written until Save. There is no upload endpoint and no multipart body — only the text is ever sent, which is why a typed note and an imported one take the identical path.
- **Folders live in the notes slice, not their own.** `state.note.categories` is the flat table; `lib/tree.ts` (`buildTree`, `subtreeIds`, `pathOf`, `wouldCycle`, `countsBySubtree`) is every derivation over it, and each function tolerates a broken table — an orphan re-roots, a cycle breaks rather than hangs.
- **Selecting a folder includes its descendants**, which is why the sidebar counts are subtree totals. A parent reading "0" while its children hold notes looks empty when it isn't.
- **Deleting a folder never deletes its contents.** Subfolders and notes are lifted to the deleted folder's parent (`movedTo` in the response tells the store where to re-home the rows it already holds), so a mistap costs a move, not content. `PATCH` refuses a move into the folder's own subtree — that would detach the branch from the root and it would simply vanish.
- **The reader drops a leading `# H1` that matches the note's title** (`dropRedundantTitle`), because the page already prints the title above the body. Matched at render, not stripped at import: `content` stays intact, so renaming a note brings its original heading back rather than leaving it headless.
- Relative image paths (`./img/x.png`) can't resolve — the folder was never imported — so they render as a placeholder rather than a broken image.

**Three Redux slices.** `store/habitSlice.ts` (mounted as `habit`) holds `habits`, `logs`, `activeTimer`, and a `status` flag driven only by `fetchHabits` (`HabitList` renders `ShimmerCard`s while `loading`). All mutations are `createAsyncThunk`s that `fetch` the API routes and reconcile local state in `extraReducers`. Always use the typed `useAppSelector` / `useAppDispatch` from `store/hooks.ts`.

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
| `/api/notes` | `GET` (metadata only — projects `-content -blocks`), `POST` |
| `/api/notes/[id]` | `GET` (full, body included), `PATCH`, `DELETE` (hard) |
| `/api/auth/[...nextauth]` | `GET`, `POST` — Auth.js: session, csrf, sign-in/out callbacks |
| `/api/auth/register` | `POST` — creates the one account; 409 if one exists |
| `/api/categories` | `GET` (flat), `POST` |
| `/api/categories/[id]` | `PATCH` (rejects cycles), `DELETE` (lifts contents to the parent) |
| `/api/export` | `GET` — `?format=csv\|json`, sets `Content-Disposition` |

All five `PATCH` routes **whitelist editable fields** (`EDITABLE` array at the top of each) so a client can't reassign `id` or rewrite `createdAt`, and all map Mongoose `ValidationError` to 400 rather than letting it surface as a 500. On Next 16, dynamic route `params` is a Promise — `{ params }: { params: Promise<{ id: string }> }`, then `await params`.

**Changing a Mongoose schema no longer needs a dev-server restart** (as of 2026-08-01). It used to: the bare `mongoose.models.X || mongoose.model(...)` guard handed back a model compiled from the *old* schema, because `mongoose.models` lives on the mongoose singleton, which sits on `global` specifically so it survives hot reload — so any field added since was silently stripped on write, with no error, until the Node process was killed. `registerModel` in `lib/db.ts` now drops the cached model in development before rebuilding it, so saving the file is enough. Production keeps the cache untouched, since nothing is re-evaluated there.

**Mongoose** connections are cached on `global.mongoose` to survive hot reload (`lib/db.ts`); every route must `await dbConnect()` first. Models are registered through **`registerModel(name, schema)`** from the same file — copy that, not a bare `mongoose.models.X ||` guard, in any new model; see the note above for what the bare guard costs.

## Analytics & charts

`lib/analytics.ts` holds every derivation as a **pure function of `(habits, logs)`** — day buckets, per-habit totals, weekday totals, streaks, the heatmap grid. Add new metrics there, not inside components, and bucket by the log's `date` string (`dayKey`) so everything agrees on local-day boundaries. Two behaviours worth preserving:

- `hoursByHabit` folds logs whose habit was soft-deleted into a single **"Archived habits"** row. Without it those hours count toward page totals but disappear from the breakdown.
- The range filter on `/` scopes every chart *except* goal progress, which is deliberately all-time (the goals are lifetime targets) and is labelled as such.

`lib/viz.ts` holds the chart chrome and the sequential ramp — **one `VizPalette` per theme**, with the validation results in a comment. Recharts writes colours into SVG paint attributes, so charts can't inherit the CSS tokens; they read `useViz()` instead, which swaps the whole object. Note the heat ramp **reverses direction** between themes: on a dark surface more hours read lighter, on paper they read darker. Rules that the charts already follow and new ones should too:

- **Habit colors are entity identity**, chosen by the user and persisted — a habit wears the same hue on its card, in its chart, and in the breakdown. Never assign chart color by rank or value.
- Those eight picker hues clear CVD separation and 3:1 contrast on the dark surface but sit above the ideal dark lightness band, so use them on **thin marks** (≤24px bars, 2px lines), never large saturated fills, and always pair them with a non-color identity channel (axis label, legend, or the table view).
- **They were never validated for the light surface, and one of them fails on it**: the yellow swatch (`#eab308`) lands about 1.9:1 on paper, so a 3px habit rail in it is close to invisible in the light theme. They are left as they are because a habit's colour is user-chosen identity and is already persisted on existing rows — changing the swatch would only affect new habits anyway. Fix it by swapping that one picker option for a darker gold, not by adjusting colours per theme.
- Single-series charts use `VIZ.accent`; magnitude grids use `HEAT_RAMP` (one hue, light→dark). No rainbows, no dual-axis charts.
- Every chart is wrapped in `components/analytics/ChartCard.tsx`, which ships a **table-view twin** — a value must never be reachable only by hovering.

## Design system

Two themes, both built around long study sessions. The whole theme lives in `app/globals.css` — **use the semantic tokens, never raw `zinc-*`/`black`/`white` utilities.** A stray `bg-zinc-900` will not match the surfaces around it, and it will not follow the theme.

**How the theme switches.** `:root` declares the dark palette, `:root[data-theme="light"]` overrides the same token names, and every utility resolves `hsl(var(--token))` at the use site — so overriding the variables is the entire mechanism. Nothing needs a `dark:` variant.

- `lib/theme.ts` owns the state. `THEME_SCRIPT` runs **blocking, in `<head>`, before first paint** — that's what stops a frame of the wrong theme on load, and why `<html>` carries `suppressHydrationWarning`. The document element is the source of truth; `localStorage` only persists the choice, and the OS preference is the default.
- `components/theme/useTheme.ts` reads it with `useSyncExternalStore` (server snapshot `"dark"`, matching plain `:root`). `ThemeToggle` decides which glyph to show **in CSS** via `.theme-dark-only` / `.theme-light-only`, so it can't flash the wrong icon before hydration.
- Anything that assumed a dark backdrop is now a theme-scoped class rather than a literal: `.lamp-glow` (the desk-lamp wash) and `.elev-lift` (dragged card, dialog — pure black at 40% reads as a bruise on paper). `color-scheme` is declared per theme on `:root`, so don't re-add `[color-scheme:dark]` to inputs.

Both palettes keep the same two rules, and the light one is measured to sit alongside the dark rather than under it — ink 13.66:1 vs 13.41:1, amber 5.37:1, pale text on the amber button 5.28:1. **Amber inverts role between them**: a light fill carrying dark text on the dark surface, a dark fill carrying pale text on paper, which is why `--primary-foreground` flips too.

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

**The app mark is in two places and they have to stay in step.** `app/icon.svg` is the favicon — ring, lit core, on a `#201D18` tile, with literal hex because it lands on browser chrome we don't control and the dark theme's amber would wash out on a white tab strip. `components/Mark.tsx` is the same mark in the nav and on the auth screens, without the tile and in `currentColor`, so it follows the amber token through both themes. Same internal ratios (core/ring 0.35, stroke/ring 0.39), different crop. Change one, change the other.

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
