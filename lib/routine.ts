import type { RoutineBlock, Weekday } from "@/types/routine";

/**
 * Every derivation over a routine, as pure functions of `(blocks, day)` —
 * the same split `lib/analytics.ts` keeps. Components ask questions here
 * rather than computing schedules inline, so "what is on Tuesday" has exactly
 * one answer no matter who asks.
 *
 * Imports nothing but the types on purpose: the page, the form and the day
 * column all need these, and none of them should pull a date library in to
 * find out when a block ends.
 */

export const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

const WEEKDAY_SET: Weekday[] = [1, 2, 3, 4, 5];
const WEEKEND_SET: Weekday[] = [0, 6];

/** `HH:MM` → minutes past midnight. Returns 0 for anything malformed. */
export function minutesOf(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return 0;
  return hours * 60 + minutes;
}

/** Minutes past midnight → `HH:MM`, wrapping so a block can run past midnight. */
export function clockOf(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** When a block finishes. Wraps past midnight rather than clamping — a late session is real. */
export function endTime(block: RoutineBlock): string {
  return clockOf(minutesOf(block.startTime) + block.durationMinutes);
}

/** True when the block runs into the next day, which the card marks so the time isn't read as earlier. */
export function crossesMidnight(block: RoutineBlock): boolean {
  return minutesOf(block.startTime) + block.durationMinutes >= 1440;
}

/** `90` → `1h 30m`. Whole hours drop the minutes; under an hour drops the hours. */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * The day's slots, in the order they happen.
 *
 * Sorted by start time, then by the longer block first so a short slot nested
 * inside a long one reads as being *within* it, then by label so the order is
 * stable across renders rather than dependent on insertion order.
 */
export function blocksForDay(blocks: RoutineBlock[], date: Date): RoutineBlock[] {
  const weekday = date.getDay() as Weekday;
  return blocks
    .filter((block) => block.days.includes(weekday))
    .sort(
      (a, b) =>
        minutesOf(a.startTime) - minutesOf(b.startTime) ||
        b.durationMinutes - a.durationMinutes ||
        a.label.localeCompare(b.label)
    );
}

/** Total scheduled time for a day. The header shows it so a 14-hour routine is visible as one. */
export function scheduledMinutes(blocks: RoutineBlock[]): number {
  return blocks.reduce((sum, block) => sum + block.durationMinutes, 0);
}

const sameDays = (a: Weekday[], b: Weekday[]) =>
  a.length === b.length && b.every((day) => a.includes(day));

/**
 * How a repeat reads in one line. "Every day" and "Weekdays" are named rather
 * than spelled out as seven or five abbreviations — the whole point of the
 * recurrence is that you set it once and stop thinking about it.
 */
export function describeRepeat(days: Weekday[]): string {
  if (days.length === 0) return "Never";
  if (sameDays(days, EVERY_DAY)) return "Every day";
  if (sameDays(days, WEEKDAY_SET)) return "Weekdays";
  if (sameDays(days, WEEKEND_SET)) return "Weekends";

  // Monday-first, matching the picker, not `getDay()` order.
  const order: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return order
    .filter((day) => days.includes(day))
    .map((day) => names[day])
    .join(", ");
}

/**
 * Blocks whose times run into each other on this day.
 *
 * Returned as a set of ids rather than a boolean so the day can mark exactly
 * which slots clash. A clash isn't an error and nothing is blocked on it — two
 * things genuinely can share a half hour — but a routine you can't keep is
 * worth seeing before the day starts rather than at 09:15.
 */
export function overlappingIds(dayBlocks: RoutineBlock[]): Set<string> {
  const clashing = new Set<string>();
  for (let i = 0; i < dayBlocks.length; i++) {
    for (let j = i + 1; j < dayBlocks.length; j++) {
      const a = dayBlocks[i];
      const b = dayBlocks[j];
      const aStart = minutesOf(a.startTime);
      const bStart = minutesOf(b.startTime);
      if (aStart + a.durationMinutes > bStart && bStart + b.durationMinutes > aStart) {
        clashing.add(a.id);
        clashing.add(b.id);
      }
    }
  }
  return clashing;
}

/** `YYYY-MM-DD` in local time. Matches `dayKey` in `lib/analytics.ts` without importing date-fns. */
export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}
