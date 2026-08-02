"use client";

import { RoutineBlock } from "@/types";
import { RoutineBlockRow } from "@/components/routine/RoutineBlockRow";
import {
  blocksForDay,
  formatDuration,
  overlappingIds,
  scheduledMinutes,
} from "@/lib/routine";
import { cn } from "@/lib/utils";

/**
 * One of the two days on the page.
 *
 * The window is deliberately narrow — today and tomorrow — while the model
 * behind it spans the whole week. You plan a routine once and then only ever
 * need to know what is next; a seven-column grid would show the pattern at
 * the cost of the thing you actually open the page for.
 */
export function DayColumn({
  date,
  blocks,
  heading,
  today,
}: {
  date: Date;
  blocks: RoutineBlock[];
  heading: string;
  /** Only today's rows offer to start a session. */
  today: boolean;
}) {
  const dayBlocks = blocksForDay(blocks, date);
  const clashing = overlappingIds(dayBlocks);
  const total = scheduledMinutes(dayBlocks);

  // Fixed locale would fight the rest of the app, which uses date-fns
  // defaults; this is the one place a weekday name is spelled out.
  const dayName = date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <section aria-label={`${heading}, ${dayName}`}>
      <header className="mb-3 flex items-baseline justify-between gap-3 border-b border-line pb-2">
        <div className="min-w-0">
          <h2
            className={cn(
              "font-display text-lg",
              today ? "text-ink" : "text-ink-2"
            )}
          >
            {heading}
          </h2>
          <p className="truncate text-xs text-ink-3">{dayName}</p>
        </div>
        {dayBlocks.length > 0 && (
          <p className="shrink-0 font-mono text-xs tnum text-ink-3">
            {dayBlocks.length} · {formatDuration(total)}
          </p>
        )}
      </header>

      {dayBlocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-2 px-4 py-8 text-center text-sm text-ink-3">
          Nothing scheduled.
        </p>
      ) : (
        <ol className="space-y-2">
          {dayBlocks.map((block) => (
            <RoutineBlockRow
              key={block.id}
              block={block}
              clashes={clashing.has(block.id)}
              actionable={today}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
