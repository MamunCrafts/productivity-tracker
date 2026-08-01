export * from "./notes";

/**
 * The single account. `passwordHash` is deliberately absent — it never leaves
 * the server, and no client type should imply it might.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export type HabitStatus = "Active" | "Paused" | "Deleted";

export interface Habit {
  id: string;
  title: string;
  description: string;
  totalHours: number; // Goal for the total duration in hours
  perDayHours: number; // Goal for daily duration in hours
  timeSlot: string; // e.g., "Morning", "10:00-12:00"
  weekFrequency: number; // days per week the habit is expected
  totalDays: number; // Duration of the challenge
  createdAt: string; // ISO Date string
  completed: boolean;
  completedAt: string | null; // ISO Date string, set when marked finished
  color: string; // Hex color for UI
  status: HabitStatus; // Paused hides it from the working list; Deleted is a soft delete
  // ISO Date string set when pinned, null when not. A timestamp rather than a
  // boolean so the most recently pinned habit can sort to the very top.
  pinnedAt: string | null;
}

export interface TimeLog {
  id: string;
  habitId: string;
  startTime: string; // ISO Date string
  endTime: string | null; // ISO Date string; null for manually entered time
  durationSeconds: number;
  date: string; // YYYY-MM-DD
  note: string; // What actually happened in the session
  focusRating: number | null; // 1-5, self-reported focus quality
}

/** Fields a client may change after creation. Anything else is ignored server-side. */
export type HabitPatch = Partial<
  Pick<
    Habit,
    | "title"
    | "description"
    | "totalHours"
    | "perDayHours"
    | "timeSlot"
    | "weekFrequency"
    | "totalDays"
    | "color"
    | "status"
    | "completed"
    | "completedAt"
    | "pinnedAt"
  >
>;

export type TimeLogPatch = Partial<
  Pick<TimeLog, "durationSeconds" | "date" | "note" | "focusRating">
>;

/** The three Kanban columns. The board has no user-defined columns by design. */
export type TaskStatus = "Todo" | "Doing" | "Done";

export const TASK_STATUSES: TaskStatus[] = ["Todo", "Doing", "Done"];

export interface Task {
  id: string;
  title: string;
  notes: string;
  /** Optional link to a habit — gives the card its colour and its context. */
  habitId: string | null;
  status: TaskStatus;
  /**
   * Position within the column, ascending. Fractional on purpose: a drop
   * lands halfway between its neighbours, so only the moved card is written
   * instead of renumbering the whole column.
   */
  order: number;
  dueDate: string | null; // YYYY-MM-DD
  createdAt: string; // ISO Date string
  completedAt: string | null; // ISO Date string, set on the move into Done
}

export type TaskPatch = Partial<
  Pick<
    Task,
    | "title"
    | "notes"
    | "habitId"
    | "status"
    | "order"
    | "dueDate"
    | "completedAt"
  >
>;
