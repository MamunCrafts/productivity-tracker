"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { Habit } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { useViz } from "@/components/theme/useViz";
import { dayKey, formatHours, habitPace, toHours } from "@/lib/analytics";
import { VizTooltip } from "./analytics/ChartCard";
import { SessionList } from "./SessionList";

interface AnalyticsProps {
  habit: Habit;
}

const WINDOW_DAYS = 21;

function Figure({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-line bg-base p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-3">{label}</p>
      <p className="mt-2 font-mono text-2xl text-ink tnum">{value}</p>
      <p className="mt-1 text-xs text-ink-3">{hint}</p>
    </div>
  );
}

export function HabitAnalytics({ habit }: AnalyticsProps) {
  // Literal colours for Recharts, swapped with the theme.
  const viz = useViz();
  const logs = useAppSelector((state) => state.habit.logs);

  const { data, totalHours, daysHit } = useMemo(() => {
    const mine = logs.filter((l) => l.habitId === habit.id);
    const byDay = new Map<string, number>();
    for (const log of mine) {
      byDay.set(log.date, (byDay.get(log.date) ?? 0) + log.durationSeconds);
    }

    const today = dayKey(new Date());
    const series = Array.from({ length: WINDOW_DAYS }, (_, i) => {
      const date = dayKey(subDays(new Date(), WINDOW_DAYS - 1 - i));
      return {
        date,
        label: date === today ? "Today" : format(parseISO(date), "MMM d"),
        hours: Number(toHours(byDay.get(date) ?? 0).toFixed(2)),
      };
    });

    return {
      data: series,
      totalHours: toHours(mine.reduce((sum, l) => sum + l.durationSeconds, 0)),
      daysHit: series.filter((d) => d.hours > 0).length,
    };
  }, [logs, habit.id]);

  const pace = habitPace(habit, logs);
  const pct =
    habit.totalHours > 0 ? Math.min((totalHours / habit.totalHours) * 100, 100) : 0;
  const hasData = data.some((d) => d.hours > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Figure
          label="Logged"
          value={totalHours.toFixed(1)}
          hint={`of ${habit.totalHours} hrs · ${Math.round(pct)}%`}
        />
        <Figure
          label="This week"
          value={`${pace.weekActiveDays}/${pace.weekTarget}`}
          hint={pace.weekActiveDays >= pace.weekTarget ? "Target met" : "Days practised"}
        />
        <Figure
          label="Needed daily"
          value={
            pace.requiredPerDay === null
              ? "—"
              : `${pace.requiredPerDay.toFixed(1)}h`
          }
          hint={
            pace.daysRemaining === null
              ? "No deadline set"
              : pace.daysRemaining === 0
                ? "Deadline passed"
                : `${pace.daysRemaining} days left`
          }
        />
        <Figure
          label="Days active"
          value={`${daysHit}`}
          hint={`of the last ${WINDOW_DAYS}`}
        />
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-ink">Last {WINDOW_DAYS} days</h3>
          <p className="text-xs text-ink-3">
            Solid bars met the <span className="tnum">{habit.perDayHours}h</span> daily goal
          </p>
        </div>

        {hasData ? (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
                <CartesianGrid stroke={viz.grid} strokeWidth={1} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={viz.muted}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke={viz.muted}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v) => `${v}h`}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as (typeof data)[number];
                    return (
                      <VizTooltip
                        label={format(parseISO(row.date), "EEE, MMM d")}
                        rows={[
                          {
                            name:
                              row.hours >= habit.perDayHours ? "goal met" : "logged",
                            value: formatHours(row.hours),
                            color: habit.color,
                          },
                        ]}
                      />
                    );
                  }}
                />
                <Bar
                  dataKey="hours"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={20}
                  isAnimationActive={false}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.date}
                      fill={habit.color}
                      // Days that met the goal read solid; short days recede.
                      fillOpacity={
                        entry.hours === 0
                          ? 0.14
                          : entry.hours >= habit.perDayHours
                            ? 1
                            : 0.45
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-line text-sm text-ink-3">
            No time logged in the last {WINDOW_DAYS} days.
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-ink">Sessions</h3>
        <SessionList habitId={habit.id} />
      </div>
    </div>
  );
}
