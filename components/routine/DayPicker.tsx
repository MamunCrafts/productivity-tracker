"use client";

import { WEEKDAYS, type Weekday } from "@/types";
import { EVERY_DAY } from "@/lib/routine";
import { cn } from "@/lib/utils";

/**
 * The recurrence, which is the whole point of the model: you set a slot once
 * here and it lands on every day it belongs to, rather than being copied.
 *
 * Seven toggles plus two shortcuts, not a dropdown of named patterns — "every
 * day except Friday" is an ordinary thing to want and a fixed list of presets
 * can't express it. The shortcuts are conveniences over the same seven bits.
 */
export function DayPicker({
  value,
  onChange,
  id,
}: {
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
  id?: string;
}) {
  const toggle = (day: Weekday) =>
    onChange(
      value.includes(day) ? value.filter((d) => d !== day) : [...value, day]
    );

  const isEveryDay = value.length === 7;

  return (
    <div id={id}>
      {/* `group` semantics for a set of toggles: a screen reader hears one
          control with seven states, not seven unlabelled buttons. */}
      <div role="group" aria-label="Days this repeats" className="flex gap-1.5">
        {WEEKDAYS.map((day) => {
          const on = value.includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => toggle(day.value)}
              aria-pressed={on}
              // The full name is the accessible name; the single letter is
              // decorative, and two days share a letter besides.
              aria-label={day.label}
              className={cn(
                // 44px is the touch minimum — seven of them plus gaps fits
                // inside 360px with room to spare.
                "h-11 flex-1 rounded-md border text-sm font-medium transition-colors",
                on
                  ? "border-amber-deep bg-amber-deep/20 text-ink"
                  : "border-line-2 text-ink-3 hover:border-line-2 hover:text-ink-2"
              )}
            >
              <span aria-hidden>{day.short}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => onChange(isEveryDay ? [] : [...EVERY_DAY])}
          className="text-ink-3 underline decoration-line-2 underline-offset-[3px] transition-colors hover:text-ink-2"
        >
          {isEveryDay ? "Clear all" : "Every day"}
        </button>
        <button
          type="button"
          onClick={() => onChange([1, 2, 3, 4, 5])}
          className="text-ink-3 underline decoration-line-2 underline-offset-[3px] transition-colors hover:text-ink-2"
        >
          Weekdays
        </button>
        <button
          type="button"
          onClick={() => onChange([0, 6])}
          className="text-ink-3 underline decoration-line-2 underline-offset-[3px] transition-colors hover:text-ink-2"
        >
          Weekends
        </button>
      </div>
    </div>
  );
}
