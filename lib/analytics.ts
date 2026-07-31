import { format, subDays, startOfWeek, addDays, parseISO } from "date-fns";
import { Habit, TimeLog } from "@/types";

/** Logs store `date` as a local-time YYYY-MM-DD key; every bucket here uses the same key. */
export const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
export const toHours = (seconds: number) => seconds / 3600;

export type RangeKey = "30d" | "90d" | "365d" | "all";

export const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "365d", label: "12 months", days: 365 },
  { key: "all", label: "All time", days: null },
];

/**
 * Number of days the range covers. "All time" spans from the earliest log to
 * today so downstream charts always get a concrete window; empty data yields 30
 * so the page renders an honest empty state rather than collapsing.
 */
export function rangeDays(range: RangeKey, logs: TimeLog[]): number {
  const preset = RANGES.find((r) => r.key === range)?.days;
  if (preset) return preset;
  if (logs.length === 0) return 30;
  const earliest = logs.reduce((min, l) => (l.date < min ? l.date : min), logs[0].date);
  const spanned =
    Math.round((Date.now() - parseISO(earliest).getTime()) / 86_400_000) + 1;
  return Math.max(spanned, 7);
}

export function filterByRange(logs: TimeLog[], days: number): TimeLog[] {
  const from = dayKey(subDays(new Date(), days - 1));
  return logs.filter((l) => l.date >= from);
}

/** One entry per day in the window, zero-filled, oldest first. */
export function dailySeries(logs: TimeLog[], days: number) {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) buckets.set(dayKey(subDays(new Date(), i)), 0);
  for (const log of logs) {
    const current = buckets.get(log.date);
    if (current !== undefined) buckets.set(log.date, current + log.durationSeconds);
  }
  const today = dayKey(new Date());
  return Array.from(buckets, ([date, seconds]) => ({
    date,
    label: date === today ? "Today" : format(parseISO(date), "MMM d"),
    hours: Number(toHours(seconds).toFixed(2)),
  }));
}

export type HabitTotal = {
  id: string;
  title: string;
  color: string;
  hours: number;
  goalHours: number;
  /** Share of the goal met, capped at 100 for the meter; `hours` keeps the true value. */
  goalPct: number;
  sessions: number;
  archived: boolean;
};

const ARCHIVED_COLOR = "#898781";

/**
 * Totals per habit, largest first. Logs whose habit was soft-deleted have no
 * matching record (the API only returns Active), so they are folded into a
 * single "Archived habits" row — otherwise their hours would show up in the
 * page total but vanish from the breakdown.
 */
export function hoursByHabit(habits: Habit[], logs: TimeLog[]): HabitTotal[] {
  const known = new Set(habits.map((h) => h.id));
  const totals = new Map<string, { seconds: number; sessions: number }>();
  let orphanSeconds = 0;
  let orphanSessions = 0;

  for (const log of logs) {
    if (!known.has(log.habitId)) {
      orphanSeconds += log.durationSeconds;
      orphanSessions += 1;
      continue;
    }
    const entry = totals.get(log.habitId) ?? { seconds: 0, sessions: 0 };
    entry.seconds += log.durationSeconds;
    entry.sessions += 1;
    totals.set(log.habitId, entry);
  }

  const rows: HabitTotal[] = habits.map((habit) => {
    const entry = totals.get(habit.id) ?? { seconds: 0, sessions: 0 };
    const hours = toHours(entry.seconds);
    return {
      id: habit.id,
      title: habit.title,
      color: habit.color,
      hours: Number(hours.toFixed(2)),
      goalHours: habit.totalHours,
      goalPct: habit.totalHours > 0 ? Math.min((hours / habit.totalHours) * 100, 100) : 0,
      sessions: entry.sessions,
      archived: false,
    };
  });

  if (orphanSeconds > 0) {
    rows.push({
      id: "__archived__",
      title: "Archived habits",
      color: ARCHIVED_COLOR,
      hours: Number(toHours(orphanSeconds).toFixed(2)),
      goalHours: 0,
      goalPct: 0,
      sessions: orphanSessions,
      archived: true,
    });
  }

  return rows.sort((a, b) => b.hours - a.hours);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayTotals(logs: TimeLog[]) {
  const seconds = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  for (const log of logs) {
    const index = parseISO(log.date).getDay();
    seconds[index] += log.durationSeconds;
    counts[index] += 1;
  }
  // Monday-first reads better for a work-habit tracker.
  return [1, 2, 3, 4, 5, 6, 0].map((index) => ({
    label: WEEKDAYS[index],
    hours: Number(toHours(seconds[index]).toFixed(2)),
    sessions: counts[index],
  }));
}

/**
 * Consecutive days with at least one log. The current streak tolerates "nothing
 * logged yet today" so an active streak isn't reported as broken before evening.
 */
export function streaks(logs: TimeLog[]) {
  const active = new Set(logs.filter((l) => l.durationSeconds > 0).map((l) => l.date));
  if (active.size === 0) return { current: 0, longest: 0 };

  const sorted = Array.from(active).sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const previous = dayKey(addDays(parseISO(sorted[i]), -1));
    run = sorted[i - 1] === previous ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  let current = 0;
  const today = new Date();
  let cursor = active.has(dayKey(today)) ? today : subDays(today, 1);
  while (active.has(dayKey(cursor))) {
    current += 1;
    cursor = subDays(cursor, 1);
  }

  return { current, longest };
}

export type HeatCell = { date: string; hours: number; inRange: boolean };

/**
 * Week columns (Monday-first rows) covering the window, oldest column first.
 * Cells outside the window are rendered as gaps so the grid stays rectangular.
 */
export function heatmapWeeks(logs: TimeLog[], days: number) {
  const totals = new Map<string, number>();
  for (const log of logs) {
    totals.set(log.date, (totals.get(log.date) ?? 0) + log.durationSeconds);
  }

  const today = new Date();
  const first = subDays(today, days - 1);
  const gridStart = startOfWeek(first, { weekStartsOn: 1 });
  const firstKey = dayKey(first);
  const todayKey = dayKey(today);

  const weeks: HeatCell[][] = [];
  for (let cursor = gridStart; dayKey(cursor) <= todayKey; cursor = addDays(cursor, 7)) {
    const column: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = dayKey(addDays(cursor, d));
      column.push({
        date,
        hours: Number(toHours(totals.get(date) ?? 0).toFixed(2)),
        inRange: date >= firstKey && date <= todayKey,
      });
    }
    weeks.push(column);
  }
  return weeks;
}

export function summarize(logs: TimeLog[], habits: Habit[], days: number) {
  const totalSeconds = logs.reduce((sum, l) => sum + l.durationSeconds, 0);
  const activeDays = new Set(logs.filter((l) => l.durationSeconds > 0).map((l) => l.date)).size;
  const totalHours = toHours(totalSeconds);
  return {
    totalHours,
    sessions: logs.length,
    activeDays,
    /** Averaged over days actually worked, not calendar days — the honest "when I show up" number. */
    hoursPerActiveDay: activeDays > 0 ? totalHours / activeDays : 0,
    hoursPerCalendarDay: days > 0 ? totalHours / days : 0,
    consistency: days > 0 ? (activeDays / days) * 100 : 0,
    trackedHabits: habits.length,
  };
}

export function formatHours(hours: number) {
  if (hours === 0) return "0h";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
}
