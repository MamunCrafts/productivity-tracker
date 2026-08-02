"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchRoutine } from "@/store/routineSlice";
import { formatDuration, routineNow } from "@/lib/routine";
import { to12Hour } from "@/lib/time";
import { useClock } from "@/components/useClock";
import { cn } from "@/lib/utils";

/**
 * What the routine says you should be doing, on every page.
 *
 * The routine used to be answerable only by going to `/routine` and reading a
 * column, which is the wrong shape for the question — it gets asked constantly
 * and in passing. So it moves into the shell: the block you are inside now, or
 * when the next one starts if you are between them.
 *
 * A thin strip under the nav, where the clock and the weather used to be. The
 * clock has moved into the nav itself and the weather is gone, so this row is
 * the routine's alone and gets the whole width for a label.
 *
 * Client-only, like everything that reads a wall clock: a server-rendered
 * "22m left" is already wrong by the time it arrives.
 */
export function RoutineStrip() {
  const dispatch = useAppDispatch();
  const blocks = useAppSelector((state) => state.routine.blocks);
  const status = useAppSelector((state) => state.routine.status);
  const loaded = useAppSelector((state) => state.routine.loaded);
  const habits = useAppSelector((state) => state.habit.habits);
  const now = useClock();

  // The shell is now the first thing to need the routine, so it is the thing
  // that fetches it. `/routine` dispatches the same thunk on mount; this guard
  // means the shell asks once and the page's own fetch is the refresh.
  useEffect(() => {
    if (!loaded && status !== "loading") dispatch(fetchRoutine());
  }, [dispatch, loaded, status]);

  const answer = now && blocks.length > 0 ? routineNow(blocks, now) : null;
  const block = answer?.current ?? answer?.next ?? null;

  // Height is held open while the answer is unknown and collapsed only once we
  // know there is nothing to say. Rendering nothing until the fetch lands would
  // drop the whole page 36px on every load for everyone; this way only a
  // genuinely empty routine ever moves anything, and then upward, once. Nothing
  // rather than "no blocks" in that case: an empty routine is a fact about the
  // app, not about the day.
  if (!answer || !block) {
    return loaded && blocks.length === 0 ? null : <Strip />;
  }

  const { current, minutesLeft, overlapping, nextDayOffset } = answer;
  const running = Boolean(current);
  const colour = habits.find((h) => h.id === block.habitId)?.color;

  return (
    <Strip>
      <Link
        href="/routine"
        className="mx-auto flex h-9 max-w-7xl items-center gap-x-2 overflow-hidden px-4 text-xs transition-colors hover:bg-surface/70 sm:gap-x-3 sm:px-6"
      >
        {/* Filled while a block runs, hollow between them — the state is in the
            glyph as well as the word, so it survives a glance. The halo breathes
            on the running one only, at the focus-mode pacing; `globals.css`
            stops it under `prefers-reduced-motion`. */}
        <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
          {running && (
            <span
              aria-hidden
              className="absolute h-3.5 w-3.5 animate-breathe rounded-full opacity-35"
              style={{ backgroundColor: colour ?? "hsl(var(--amber))" }}
            />
          )}
          <span
            aria-hidden
            className={cn("h-1.5 w-1.5 rounded-full", !running && "border border-ink-3")}
            style={running ? { backgroundColor: colour ?? "hsl(var(--amber))" } : undefined}
          />
        </span>

        <span
          className={cn(
            "shrink-0 text-[10px] font-medium uppercase tracking-[0.14em]",
            running ? "text-ink-2" : "text-ink-3"
          )}
        >
          {running ? "Now" : "Next"}
        </span>

        {/* The only part allowed to truncate; everything after it is `shrink-0`
            so the time never gets eaten by a long label. */}
        <span className="min-w-0 truncate text-ink">{block.label}</span>

        {/* Overlaps are surfaced everywhere else in the routine; the strip would
            otherwise quietly pick one of two things happening at once. */}
        {overlapping > 0 && (
          <span
            className="shrink-0 text-ink-3"
            title={`${overlapping} more block${overlapping === 1 ? "" : "s"} at the same time`}
          >
            +{overlapping}
          </span>
        )}

        <Dot />

        {/* Running: what's left of it. Between blocks: when the next one starts.
            A bare "6:00 pm" leaves you doing the arithmetic the strip exists to
            save, so the gap is spelled out beside it wherever there is room. */}
        <span className="shrink-0 font-mono tnum text-ink-2">
          {running ? `${formatDuration(minutesLeft)} left` : to12Hour(block.startTime)}
        </span>

        {!running && (
          <span className="hidden shrink-0 text-ink-3 sm:inline">
            {nextDayOffset === 0
              ? `in ${formatDuration(minutesLeft)}`
              : nextDayOffset === 1
                ? "tomorrow"
                : `in ${nextDayOffset} days`}
          </span>
        )}

        <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
        <span className="sr-only">Open the routine</span>
      </Link>
    </Strip>
  );
}

/** The rule and background, with or without anything in it yet. */
function Strip({ children }: { children?: React.ReactNode }) {
  return (
    <div className="border-b border-line bg-surface/40">
      {children ?? <div className="h-9" />}
    </div>
  );
}

function Dot() {
  return (
    <span aria-hidden className="shrink-0 text-line-2">
      ·
    </span>
  );
}
