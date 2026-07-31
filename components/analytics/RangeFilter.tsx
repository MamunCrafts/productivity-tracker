"use client";

import { cn } from "@/lib/utils";
import { RANGES, RangeKey } from "@/lib/analytics";

/** One filter row above everything it scopes; presets before any custom range. */
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
      className="inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-surface/60 p-1"
    >
      {RANGES.map((range) => (
        <button
          key={range.key}
          type="button"
          role="radio"
          aria-checked={value === range.key}
          onClick={() => onChange(range.key)}
          className={cn(
            "shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3",
            value === range.key
              ? "bg-line text-ink"
              : "text-ink-2 hover:text-ink"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
