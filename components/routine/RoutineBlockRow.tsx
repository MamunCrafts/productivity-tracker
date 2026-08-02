"use client";

import { useState } from "react";
import { AlertTriangle, Play, Trash2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteRoutineBlock } from "@/store/routineSlice";
import { startTimer } from "@/store/habitSlice";
import { RoutineBlock } from "@/types";
import { RoutineForm } from "@/components/routine/RoutineForm";
import { Button } from "@/components/ui/button";
import {
  crossesMidnight,
  describeRepeat,
  endTime,
  formatDuration,
} from "@/lib/routine";
import { to12Hour } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * One slot in a day.
 *
 * Built like `HabitCard`: a colour rail carrying the habit's identity, the
 * subject in the display face, and the secondary controls recessive at
 * `opacity-70` rather than hidden — touch has no hover, so nothing here is
 * gated behind `group-hover` alone.
 */
export function RoutineBlockRow({
  block,
  clashes,
  /** Only today's rows can start a session; tomorrow's slot isn't now. */
  actionable,
}: {
  block: RoutineBlock;
  clashes: boolean;
  actionable: boolean;
}) {
  const dispatch = useAppDispatch();
  const habit = useAppSelector((state) =>
    block.habitId ? state.habit.habits.find((h) => h.id === block.habitId) : undefined
  );
  const activeTimer = useAppSelector((state) => state.habit.activeTimer);
  const [confirming, setConfirming] = useState(false);

  /**
   * A habit that is finished, paused or soft-deleted can't take a session, so
   * the play control is absent rather than present and inert — the same rule
   * the note page applies to its focus button. A timer already running also
   * takes it away: `startTimer` ignores a second call, and a button that does
   * nothing is worse than no button.
   */
  const canStart =
    actionable &&
    habit &&
    !habit.completed &&
    habit.status !== "Paused" &&
    !activeTimer;

  return (
    <li
      className={cn(
        "group relative flex items-stretch gap-3 rounded-lg border bg-surface px-3 py-2.5 transition-colors",
        clashes ? "border-danger/40" : "border-line hover:border-line-2"
      )}
    >
      {/* The rail is the habit's identity — its own colour, on its card, in its
          chart and here. A block with no habit gets the neutral hairline. */}
      <span
        aria-hidden
        className="w-[3px] shrink-0 rounded-full"
        style={{ backgroundColor: habit?.color ?? "hsl(var(--line-2))" }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {/* Stored 24-hour, written 12-hour. `to12Hour` is the only place that
              conversion happens, so the strip and the routine can't drift. */}
          <time className="font-mono text-sm tnum text-ink">
            {to12Hour(block.startTime)}
          </time>
          <span aria-hidden className="text-ink-3">
            –
          </span>
          <time className="font-mono text-sm tnum text-ink-2">
            {to12Hour(endTime(block))}
          </time>
          {crossesMidnight(block) && (
            // Otherwise an end time earlier than the start reads as a typo.
            <span className="text-[11px] text-ink-3">next day</span>
          )}
        </div>

        <p className="mt-0.5 truncate font-display text-[15px] text-ink">
          {block.label}
        </p>

        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-3">
          <span className="font-mono tnum">{formatDuration(block.durationMinutes)}</span>
          {habit && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{habit.title}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{describeRepeat(block.days)}</span>
        </p>

        {clashes && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
            Overlaps another block
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-start gap-0.5">
        {canStart && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100"
            onClick={() => dispatch(startTimer(habit.id))}
            aria-label={`Start a session on ${habit.title}`}
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
          </Button>
        )}

        <RoutineForm block={block} compact />

        {confirming ? (
          <div className="flex items-center gap-1">
            <Button
              variant="destructive"
              size="sm"
              className="h-8"
              onClick={() => dispatch(deleteRoutineBlock(block.id))}
            >
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setConfirming(false)}
            >
              Keep
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${block.label}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        )}
      </div>
    </li>
  );
}
