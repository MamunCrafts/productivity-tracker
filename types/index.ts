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
  >
>;

export type TimeLogPatch = Partial<
  Pick<TimeLog, "durationSeconds" | "date" | "note" | "focusRating">
>;
