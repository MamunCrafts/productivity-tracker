"use client";

import type { Task, TaskStatus } from "@/types";
import { COLUMNS } from "@/lib/board";
import { cn } from "@/lib/utils";

/**
 * Which column a phone is looking at.
 *
 * Below `sm` the board shows one column at a time instead of scrolling three
 * past the edge of the screen. Two of the three were always hidden, and you
 * could not tell how much was in them without swiping to look — so the counts
 * live on the control itself and the whole board is legible without moving.
 *
 * Shaped after `RangeFilter`: a full-width segmented control, three equal
 * thirds of 360px, each well over the 44px touch minimum.
 */
export function ColumnSwitcher({
  value,
  onChange,
  columns,
}: {
  value: TaskStatus;
  onChange: (next: TaskStatus) => void;
  columns: Record<TaskStatus, Task[]>;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Board column"
      className="mb-4 grid w-full grid-cols-3 gap-1 rounded-lg border border-line bg-surface/60 p-1 sm:hidden"
    >
      {COLUMNS.map(({ status, label }) => {
        const count = columns[status].length;
        const selected = value === status;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${label}, ${count} ${count === 1 ? "card" : "cards"}`}
            onClick={() => onChange(status)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-md px-1 text-sm font-medium transition-colors",
              selected ? "bg-line text-ink" : "text-ink-2 hover:text-ink"
            )}
          >
            <span aria-hidden>{label}</span>
            {/* The count is the reason this control replaces the scroller, so
                it is never the thing that gets dropped for width. */}
            <span aria-hidden className="font-mono text-xs tnum text-ink-3">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
