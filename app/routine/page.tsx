"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { RoutineBlock } from "@/types";
import { fetchRoutine } from "@/store/routineSlice";
import { fetchHabits } from "@/store/habitSlice";
import { DayColumn } from "@/components/routine/DayColumn";
import { RoutineForm } from "@/components/routine/RoutineForm";
import { ShimmerRows } from "@/components/ui/shimmer";
import { describeRepeat, formatDuration } from "@/lib/routine";
import { to12Hour } from "@/lib/time";

/**
 * The routine: what the next two days are shaped like.
 *
 * Two days rather than seven on purpose. The recurrence behind a block spans
 * the whole week — set it once for every weekday and it lands on all five —
 * but the question you open this page to answer is "what is next", and a
 * seven-column grid answers a different one at the cost of legibility on a
 * phone. The full pattern is on every row (`describeRepeat`) and in the
 * summary at the foot.
 */
export default function RoutinePage() {
  const dispatch = useAppDispatch();
  const blocks = useAppSelector((state) => state.routine.blocks);
  const status = useAppSelector((state) => state.routine.status);

  /**
   * Lazy initialiser, not a bare `new Date()` in the render body: reading the
   * clock during render fails `react-hooks/purity`, the rule the timer code
   * exists to respect. Held as a timestamp so the value is comparable.
   */
  const [todayStamp, setTodayStamp] = useState(() => startOfToday().getTime());

  useEffect(() => {
    // Left open past midnight the page would keep calling yesterday "Today".
    // Checking every minute is far cheaper than the alternative of getting it
    // wrong, and the setState is inside a callback rather than the effect body.
    const timer = setInterval(() => {
      const current = startOfToday().getTime();
      setTodayStamp((previous) => (previous === current ? previous : current));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const today = useMemo(() => new Date(todayStamp), [todayStamp]);
  const tomorrow = useMemo(() => {
    const next = new Date(todayStamp);
    next.setDate(next.getDate() + 1);
    return next;
  }, [todayStamp]);

  useEffect(() => {
    dispatch(fetchRoutine());
    // The rows need habit colours and titles, and this page can be the first
    // one opened in a session.
    dispatch(fetchHabits());
  }, [dispatch]);

  const loading = status === "loading" && blocks.length === 0;
  const weekMinutes = useMemo(
    () => blocks.reduce((sum, b) => sum + b.durationMinutes * b.days.length, 0),
    [blocks]
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-14 pb-28">
      <header className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-medium leading-tight text-ink">
            Routine
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            The shape of a day. Set a block once and it lands on every day you
            choose.
          </p>
        </div>
        <RoutineForm />
      </header>

      {status === "failed" && blocks.length === 0 ? (
        <p role="alert" className="text-sm text-danger">
          The routine didn&apos;t load. Refresh to try again.
        </p>
      ) : loading ? (
        <ShimmerRows count={4} label="Loading your routine" />
      ) : blocks.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* One column on a phone, two from `md`. Stacking rather than
              scrolling sideways: nothing in the app exceeds the viewport. */}
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-8">
            <DayColumn date={today} blocks={blocks} heading="Today" today />
            <DayColumn
              date={tomorrow}
              blocks={blocks}
              heading="Tomorrow"
              today={false}
            />
          </div>

          <WeekSummary blocks={blocks} weekMinutes={weekMinutes} />
        </>
      )}
    </div>
  );
}

/** Local midnight. The day boundary everything on this page agrees on. */
function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-line-2 px-6 py-14 text-center">
      <h2 className="font-display text-xl text-ink">No routine yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">
        Add your first block — a time, how long it runs, and the days it
        repeats. Link it to a habit from{" "}
        <Link
          href="/habits"
          className="underline decoration-line-2 underline-offset-[3px] transition-colors hover:decoration-ink-2"
        >
          Practice
        </Link>{" "}
        and you can start a session straight from the slot.
      </p>
      <div className="mt-6 flex justify-center">
        <RoutineForm />
      </div>
    </div>
  );
}

/**
 * The part the two-day window can't show: every block, and what the week
 * actually costs. A routine that totals sixty hours is worth seeing as a
 * number before you try to live in it.
 */
function WeekSummary({
  blocks,
  weekMinutes,
}: {
  blocks: RoutineBlock[];
  weekMinutes: number;
}) {
  const sorted = useMemo(
    () => [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [blocks]
  );

  return (
    <section className="mt-14 border-t border-line pt-8">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg text-ink">Whole routine</h2>
        <p className="font-mono text-xs tnum text-ink-3">
          {blocks.length} {blocks.length === 1 ? "block" : "blocks"} ·{" "}
          {formatDuration(weekMinutes)} a week
        </p>
      </header>

      {/* Wide content gets its own scroller — the page body never scrolls
          sideways, per the mobile rule. */}
      <div className="-mx-6 overflow-x-auto px-6">
        <table className="w-full min-w-[26rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-2 text-left">
              <th scope="col" className="py-2 pr-3 font-medium text-ink">
                Time
              </th>
              <th scope="col" className="py-2 pr-3 font-medium text-ink">
                What
              </th>
              <th scope="col" className="py-2 pr-3 font-medium text-ink">
                Repeats
              </th>
              <th scope="col" className="py-2 text-right font-medium text-ink">
                Per week
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((block) => (
              <tr key={block.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap py-2 pr-3 font-mono tnum text-ink-2">
                  {to12Hour(block.startTime)}
                </td>
                <td className="py-2 pr-3 text-ink">{block.label}</td>
                <td className="py-2 pr-3 text-ink-2">{describeRepeat(block.days)}</td>
                <td className="whitespace-nowrap py-2 text-right font-mono tnum text-ink-2">
                  {formatDuration(block.durationMinutes * block.days.length)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-ink-3">
        Scheduled time is the plan. Hours you actually put in come from the
        timer and appear in{" "}
        <Link
          href="/"
          className="underline decoration-line-2 underline-offset-[3px] transition-colors hover:decoration-ink-2"
        >
          Analytics
        </Link>
        .
      </p>
    </section>
  );
}
