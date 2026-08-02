"use client";

import { useAppSelector } from "@/store/hooks";
import { dayKey, formatHours, toHours } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

/**
 * One sentence answering "where am I today" before any list appears. It keeps
 * the header useful without another row of stat boxes to read past.
 *
 * Positioning is the caller's — it sits in a grid cell on `/habits` and the
 * spacing above it is that grid's row gap, not a margin baked in here.
 */
export function TodayLine({ className }: { className?: string }) {
  const logs = useAppSelector((state) => state.habit.logs);
  const status = useAppSelector((state) => state.habit.status);

  const today = dayKey(new Date());
  const seconds = logs
    .filter((l) => l.date === today)
    .reduce((sum, l) => sum + l.durationSeconds, 0);
  const hours = toHours(seconds);

  return (
    <p className={cn("text-ink-2", className)}>
      <span className="text-ink-3">{format(new Date(), "EEEE, d MMMM")}</span>
      <span className="mx-2 text-ink-3">·</span>
      {/* The clause is held together on a phone: wrapped between the figure and
          its unit of meaning, "2.3h" alone on a line reads as a heading. */}
      {status === "loading" ? (
        <span className="text-ink-3">counting today&apos;s hours…</span>
      ) : hours > 0 ? (
        <span className="whitespace-nowrap">
          <span className="font-mono text-ink tnum">{formatHours(hours)}</span>{" "}
          logged today
        </span>
      ) : (
        <span>nothing logged yet today</span>
      )}
    </p>
  );
}
