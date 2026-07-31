"use client";

import { useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  dailySeries,
  filterByRange,
  formatHours,
  heatmapWeeks,
  hoursByHabit,
  rangeDays,
  RangeKey,
  streaks,
  summarize,
  weekdayTotals,
} from "@/lib/analytics";
import { RangeFilter } from "@/components/analytics/RangeFilter";
import { HeroStat, StatTile } from "@/components/analytics/StatTile";
import { DailyFocusChart } from "@/components/analytics/DailyFocusChart";
import { HabitBreakdownChart } from "@/components/analytics/HabitBreakdownChart";
import { WeekdayChart } from "@/components/analytics/WeekdayChart";
import { ConsistencyHeatmap } from "@/components/analytics/ConsistencyHeatmap";
import { GoalProgress } from "@/components/analytics/GoalProgress";
import { ShimmerStat } from "@/components/ui/shimmer";

export default function Home() {
  const { habits, logs, status } = useAppSelector((state) => state.habit);
  const [range, setRange] = useState<RangeKey>("90d");

  const view = useMemo(() => {
    const days = rangeDays(range, logs);
    const scoped = filterByRange(logs, days);
    return {
      days,
      stats: summarize(scoped, habits, days),
      streak: streaks(scoped),
      daily: dailySeries(scoped, days),
      byHabit: hoursByHabit(habits, scoped),
      weekday: weekdayTotals(scoped),
      heatmap: heatmapWeeks(scoped, days),
      // Goals are lifetime targets, so this one deliberately ignores the range.
      allTime: hoursByHabit(habits, logs),
    };
  }, [habits, logs, range]);

  const isLoading = status === "loading";
  const sparkline = view.daily.slice(-12).map((d) => d.hours);

  return (
    <div className="mx-auto max-w-7xl px-6 py-14 pb-28">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-medium leading-tight text-ink">
          The record
        </h1>
        <p className="mt-2 text-ink-2">
          How your focus time adds up across every habit.
        </p>
      </header>

      <div className="mb-8">
        <RangeFilter value={range} onChange={setRange} />
      </div>

      {isLoading ? (
        <div role="status" aria-busy="true" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ShimmerStat key={i} delay={i * 140} />
            ))}
          </div>
          <div className="h-[340px] rounded-lg border border-line bg-surface/40" />
          <span className="sr-only">Loading analytics</span>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <HeroStat
              label="Total focused"
              value={view.stats.totalHours.toFixed(1)}
              unit="hrs"
              hint={`${view.stats.sessions} session${view.stats.sessions === 1 ? "" : "s"} over ${view.days} days`}
            />
            <StatTile
              label="Current streak"
              value={`${view.streak.current} ${view.streak.current === 1 ? "day" : "days"}`}
              hint={`Longest in range: ${view.streak.longest}`}
            />
            <StatTile
              label="Average active day"
              value={formatHours(view.stats.hoursPerActiveDay)}
              hint={`${view.stats.activeDays} of ${view.days} days had time logged`}
            />
            <StatTile
              label="Consistency"
              value={`${Math.round(view.stats.consistency)}%`}
              hint="Share of days in range with any logged time"
              sparkline={sparkline}
            />
          </section>

          <DailyFocusChart data={view.daily} />

          <div className="grid gap-6 lg:grid-cols-2">
            <HabitBreakdownChart data={view.byHabit} />
            <WeekdayChart data={view.weekday} />
          </div>

          <ConsistencyHeatmap weeks={view.heatmap} />

          <section className="pt-6">
            <div className="mb-6 border-t border-line pt-6">
              <h2 className="text-lg font-semibold text-ink">All-time targets</h2>
              <p className="mt-1 text-sm text-ink-3">
                Lifetime progress toward each habit&apos;s hour goal.
              </p>
            </div>
            <GoalProgress data={view.allTime} />
          </section>
        </div>
      )}
    </div>
  );
}
