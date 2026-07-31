"use client";

import { ChartCard, DataTable, EmptyPlot } from "./ChartCard";
import { formatHours, HabitTotal } from "@/lib/analytics";

/**
 * A meter per habit: the fill is the habit's hue, the unfilled track the same
 * hue at low alpha, so the state reads across the whole bar. Every value is
 * written beside its meter — the bar is never the only way to read it.
 */
export function GoalProgress({ data }: { data: HabitTotal[] }) {
  const rows = data.filter((d) => !d.archived);

  return (
    <ChartCard
      title="Goal progress"
      subtitle="Lifetime hours against each habit's target — not scoped by the range filter"
      table={
        rows.length === 0 ? (
          <p className="py-6 text-sm text-ink-3">No active habits yet.</p>
        ) : (
          <DataTable
            columns={["Habit", "Logged", "Target", "Complete"]}
            rows={rows.map((d) => [
              d.title,
              d.hours.toFixed(2),
              d.goalHours > 0 ? d.goalHours.toFixed(0) : "—",
              d.goalHours > 0 ? `${d.goalPct.toFixed(1)}%` : "—",
            ])}
          />
        )
      }
    >
      {rows.length === 0 ? (
        <EmptyPlot message="No active habits yet." />
      ) : (
        <ul className="space-y-5">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="truncate text-sm font-medium text-ink">
                    {row.title}
                  </span>
                </div>
                <span className="shrink-0 text-sm text-ink-2 tabular-nums">
                  <span className="font-semibold text-ink">
                    {formatHours(row.hours)}
                  </span>
                  {row.goalHours > 0 && <> / {row.goalHours}h</>}
                </span>
              </div>
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: `${row.color}26` }}
                role="progressbar"
                aria-valuenow={Math.round(row.goalPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${row.title} goal progress`}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${row.goalPct}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
