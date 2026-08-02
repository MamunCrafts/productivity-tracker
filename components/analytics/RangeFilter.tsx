"use client";

import { cn } from "@/lib/utils";
import { RANGES, RangeKey } from "@/lib/analytics";

/**
 * One filter row above everything it scopes.
 *
 * Two shapes, one set of buttons. On a phone it is a full-width segmented
 * control with abbreviated labels — four equal quarters of 360px clear the
 * 44px touch minimum, which the old pill row didn't, and it no longer scrolls
 * sideways to reach "All time". From `sm` up it collapses back to the compact
 * inline pills with their full labels, because there the row shares space with
 * the export controls.
 *
 * The buttons are not duplicated per breakpoint: both labels are in the DOM and
 * CSS picks one. Rendering the group twice would mean two `radiogroup`s, and a
 * screen reader would hear the date range offered to it four extra times.
 */
export function RangeFilter({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (next: RangeKey) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Date range"
      className="grid w-full grid-cols-4 gap-1 rounded-lg border border-line bg-surface/60 p-1 sm:inline-flex sm:w-auto sm:gap-0"
    >
      {RANGES.map((range) => (
        <button
          key={range.key}
          type="button"
          role="radio"
          aria-checked={value === range.key}
          // The full label is the accessible name at every width, so the
          // abbreviation is never what gets announced.
          aria-label={range.label}
          onClick={() => onChange(range.key)}
          className={cn(
            // `min-h-11` is the touch minimum on a phone; from `sm` the row is
            // pointer-driven and can go back to being compact.
            "flex min-h-11 shrink-0 items-center justify-center rounded-md px-1 text-sm font-medium transition-colors sm:min-h-0 sm:px-3 sm:py-1.5",
            value === range.key ? "bg-line text-ink" : "text-ink-2 hover:text-ink"
          )}
        >
          <span aria-hidden className="sm:hidden">
            {range.short}
          </span>
          <span aria-hidden className="hidden sm:inline">
            {range.label}
          </span>
        </button>
      ))}
    </div>
  );
}
