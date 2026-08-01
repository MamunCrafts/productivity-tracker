"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, DataTable, EmptyPlot, VizTooltip } from "./ChartCard";
import { useViz } from "@/components/theme/useViz";
import { formatHours } from "@/lib/analytics";

type Row = { label: string; hours: number; sessions: number };

/**
 * One series across seven nominal categories, so every column takes the same
 * accent hue — except the best day, which is the point of the chart and gets
 * emphasis. The rest recede to a de-emphasis step of the same hue.
 */
export function WeekdayChart({ data }: { data: Row[] }) {
  // Literal colours for Recharts, swapped with the theme.
  const viz = useViz();
  const total = data.reduce((sum, d) => sum + d.hours, 0);
  const peak = Math.max(...data.map((d) => d.hours));
  const best = data.find((d) => d.hours === peak && d.hours > 0);

  return (
    <ChartCard
      title="Best days of the week"
      subtitle={
        best
          ? `${best.label} is your strongest day`
          : "Hours logged by day of week"
      }
      table={
        total === 0 ? (
          <p className="py-6 text-sm text-ink-3">No time logged in this range.</p>
        ) : (
          <DataTable
            columns={["Day", "Hours", "Sessions"]}
            rows={data.map((d) => [d.label, d.hours.toFixed(2), d.sessions])}
          />
        )
      }
    >
      {total === 0 ? (
        <EmptyPlot message="No time logged in this range." />
      ) : (
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }} barCategoryGap={16}>
              <CartesianGrid stroke={viz.grid} strokeWidth={1} vertical={false} />
              <XAxis
                dataKey="label"
                stroke={viz.muted}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={viz.muted}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as Row;
                  return (
                    <VizTooltip
                      label={row.label}
                      rows={[
                        {
                          name: `across ${row.sessions} session${row.sessions === 1 ? "" : "s"}`,
                          value: formatHours(row.hours),
                          color: viz.accent,
                        },
                      ]}
                    />
                  );
                }}
              />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
                {data.map((row) => (
                  <Cell
                    key={row.label}
                    fill={viz.accent}
                    fillOpacity={best && row.label === best.label ? 1 : 0.35}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
