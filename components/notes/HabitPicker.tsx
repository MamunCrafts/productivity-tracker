"use client";

import type { Habit } from "@/types";
import { cn } from "@/lib/utils";

/**
 * The habit a note is about, or none. Mirrors `CategoryPicker` deliberately —
 * the two sit side by side wherever a note is filed, and a picker that answered
 * "where does this live" in one shape and "what is this about" in another would
 * read as two unrelated controls.
 */
export function HabitPicker({
  habits,
  value,
  onChange,
  rootLabel = "No habit",
  className,
  id,
}: {
  habits: Habit[];
  value: string | null;
  onChange: (habitId: string | null) => void;
  rootLabel?: string;
  className?: string;
  id?: string;
}) {
  // Deleting a habit is soft, and `GET /api/habits` skips the deleted ones — so
  // a note that outlived its habit holds an id with no option to match it. Left
  // to itself the select renders blank, which is indistinguishable from "No
  // habit" and quietly invites you to overwrite a link you couldn't see. Naming
  // it keeps the row honest and the choice yours.
  const archived = value !== null && !habits.some((habit) => habit.id === value);

  return (
    <select
      id={id}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        "w-full rounded-md border border-line-2 bg-base px-3 py-2 text-ink outline-none focus:border-amber",
        className
      )}
    >
      <option value="">{rootLabel}</option>
      {archived && <option value={value}>Archived habit</option>}
      {habits.map((habit) => (
        <option key={habit.id} value={habit.id}>
          {habit.title}
        </option>
      ))}
    </select>
  );
}
