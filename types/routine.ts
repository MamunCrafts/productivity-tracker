/**
 * A routine is a *shape for a day*, not a list of dated events.
 *
 * One `RoutineBlock` is a single recurring slot — "06:30, 45 minutes, Linux,
 * on weekdays". There is deliberately no row per occurrence: a block that
 * repeats every day for a year is one document, and changing its time is one
 * write rather than 365. Which days a block lands on is derived at render
 * time from `days`, the same way `lib/tree.ts` derives the folder tree from a
 * flat table.
 *
 * That also means a routine has no history and nothing in analytics derives
 * from it. Hours come from `TimeLog`, which is written by the timer; a block
 * is the intention, a log is what happened. Deleting a block is therefore a
 * hard delete, like a task.
 */

/** `Date.getDay()` order: 0 is Sunday. Stored as-is so no remapping is needed. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Sunday-first matches `getDay()`, but a week that *reads* Monday-first is
 * what most routines are planned around — so the picker orders these by
 * `order` while the value stays the raw `getDay()` index.
 */
export const WEEKDAYS: {
  value: Weekday;
  short: string;
  label: string;
}[] = [
  { value: 1, short: "M", label: "Monday" },
  { value: 2, short: "T", label: "Tuesday" },
  { value: 3, short: "W", label: "Wednesday" },
  { value: 4, short: "T", label: "Thursday" },
  { value: 5, short: "F", label: "Friday" },
  { value: 6, short: "S", label: "Saturday" },
  { value: 0, short: "S", label: "Sunday" },
];

export interface RoutineBlock {
  id: string;
  /**
   * The habit this slot is for. Nullable like a task's: a routine holds the
   * whole day, and "Breakfast" or "Commute" earn their place in it without
   * being something you track hours against. A linked habit lends the block
   * its colour and lets the slot start a timer.
   */
  habitId: string | null;
  label: string;
  /** `HH:MM`, zero-padded 24-hour. Sorts lexicographically, so no parsing to order a day. */
  startTime: string;
  durationMinutes: number;
  /** Which days it recurs on. All seven is "every day"; the UI says so rather than listing them. */
  days: Weekday[];
  createdAt: string;
}

/** What a client may change. `id` and `createdAt` are identity. */
export type RoutineBlockPatch = Partial<
  Pick<RoutineBlock, "habitId" | "label" | "startTime" | "durationMinutes" | "days">
>;
