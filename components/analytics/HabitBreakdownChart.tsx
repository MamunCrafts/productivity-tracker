"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, DataTable, EmptyPlot, VizTooltip } from "./ChartCard";
import { VIZ } from "@/lib/viz";
import { formatHours, HabitTotal } from "@/lib/analytics";

// Kept short: the label gutter plus the value gutter is fixed, so on a phone a
// long habit name would leave the bars almost no room to grow into.
const truncate = (value: string, max = 14) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export function HabitBreakdownChart({ data }: { data: HabitTotal[] }) {
  const withTime = data.filter((d) => d.hours > 0);
  // Rows are one series across nominal categories; the y-axis label carries
  // identity. Color is the habit's own persisted hue so a habit looks the same
  // here as on its card — it never encodes rank.
  const rows = withTime.map((d) => ({ ...d, tick: truncate(d.title) }));
  const height = Math.max(rows.length * 40 + 32, 200);

  return (
    <ChartCard
      title="Where the time went"
      subtitle="Total hours per habit"
      table={
        withTime.length === 0 ? (
          <p className="py-6 text-sm text-ink-3">No time logged in this range.</p>
        ) : (
          <DataTable
            columns={["Habit", "Hours", "Sessions", "Share"]}
            rows={withTime.map((d) => {
              const total = withTime.reduce((sum, r) => sum + r.hours, 0);
              return [
                d.title,
                d.hours.toFixed(2),
                d.sessions,
                total > 0 ? `${((d.hours / total) * 100).toFixed(1)}%` : "—",
              ];
            })}
          />
        )
      }
    >
      {rows.length === 0 ? (
        <EmptyPlot message="No time logged in this range." />
      ) : (
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 0, right: 44, bottom: 0, left: 0 }}
              barCategoryGap={12}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="tick"
                stroke={VIZ.muted}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={104}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as HabitTotal;
                  return (
                    <VizTooltip
                      label={row.title}
                      rows={[
                        {
                          name: `across ${row.sessions} session${row.sessions === 1 ? "" : "s"}`,
                          value: formatHours(row.hours),
                          color: row.color,
                        },
                      ]}
                    />
                  );
                }}
              />
              <Bar dataKey="hours" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
                {rows.map((row) => (
                  <Cell key={row.id} fill={row.color} />
                ))}
                <LabelList
                  dataKey="hours"
                  position="right"
                  offset={8}
                  fill={VIZ.textSecondary}
                  fontSize={12}
                  formatter={(value: unknown) => formatHours(Number(value) || 0)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
