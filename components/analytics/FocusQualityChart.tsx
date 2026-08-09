"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, DataTable, EmptyPlot, VizTooltip } from "./ChartCard";
import { useViz } from "@/components/theme/useViz";
import { focusLabel } from "@/lib/analytics";

type Row = { hours: number; label: string; rating: number; sessions: number };

/**
 * Average self-reported focus against session length. Answers the question raw
 * hours can't: whether your long sessions are actually your good ones.
 */
export function FocusQualityChart({ data }: { data: Row[] }) {
  // Literal colours for Recharts, swapped with the theme.
  const viz = useViz();
  const rated = data.reduce((sum, d) => sum + d.sessions, 0);

  return (
    <ChartCard
      title="Focus quality by session length"
      subtitle="Average rating against how long you sat down for"
      table={
        data.length === 0 ? (
          <p className="py-6 text-sm text-ink-3">No rated sessions in this range.</p>
        ) : (
          <DataTable
            columns={["Session length", "Average focus /10", "Sessions"]}
            rows={data.map((d) => [d.label, d.rating.toFixed(2), d.sessions])}
          />
        )
      }
    >
      {data.length === 0 ? (
        <EmptyPlot message="Rate a session when you stop the timer and it will show up here." />
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
                domain={[0, 10]}
                ticks={[2, 4, 6, 8, 10]}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as Row;
                  return (
                    <VizTooltip
                      label={`${row.label} sessions · ${row.sessions} rated`}
                      rows={[
                        {
                          name: focusLabel(row.rating).toLowerCase(),
                          value: `${row.rating.toFixed(1)}/10`,
                          color: viz.accent,
                        },
                      ]}
                    />
                  );
                }}
              />
              <Bar
                dataKey="rating"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
                fill={viz.accent}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs text-ink-3">
            Based on {rated} rated session{rated === 1 ? "" : "s"}.
          </p>
        </div>
      )}
    </ChartCard>
  );
}
