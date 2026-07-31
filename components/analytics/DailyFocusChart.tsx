"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ChartCard, DataTable, EmptyPlot, VizTooltip } from "./ChartCard";
import { VIZ } from "@/lib/viz";
import { formatHours } from "@/lib/analytics";

type Point = { date: string; label: string; hours: number };

export function DailyFocusChart({ data }: { data: Point[] }) {
  const active = data.filter((d) => d.hours > 0);

  return (
    <ChartCard
      title="Daily focus"
      subtitle="Hours logged across all habits"
      table={
        active.length === 0 ? (
          <p className="py-6 text-sm text-ink-3">No time logged in this range.</p>
        ) : (
          <DataTable
            columns={["Date", "Hours"]}
            rows={active.map((d) => [
              format(parseISO(d.date), "EEE, MMM d yyyy"),
              d.hours.toFixed(2),
            ])}
          />
        )
      }
    >
      {active.length === 0 ? (
        <EmptyPlot message="No time logged in this range." />
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="dailyFocusFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={VIZ.accent} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={VIZ.accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={VIZ.grid} strokeWidth={1} vertical={false} />
              <XAxis
                dataKey="label"
                stroke={VIZ.muted}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke={VIZ.muted}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip
                cursor={{ stroke: VIZ.axis, strokeWidth: 1 }}
                content={({ active: on, payload }) => {
                  if (!on || !payload?.length) return null;
                  const point = payload[0].payload as Point;
                  return (
                    <VizTooltip
                      label={format(parseISO(point.date), "EEE, MMM d yyyy")}
                      rows={[
                        {
                          name: "focused",
                          value: formatHours(point.hours),
                          color: VIZ.accent,
                        },
                      ]}
                    />
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke={VIZ.accent}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="url(#dailyFocusFill)"
                activeDot={{
                  r: 4,
                  fill: VIZ.accent,
                  stroke: VIZ.surface,
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
