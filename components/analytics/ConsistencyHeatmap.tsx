"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChartCard, DataTable, EmptyPlot } from "./ChartCard";
import { HEAT_EMPTY, HEAT_RAMP, heatColor } from "@/lib/viz";
import { formatHours, HeatCell } from "@/lib/analytics";

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

export function ConsistencyHeatmap({ weeks }: { weeks: HeatCell[][] }) {
  const [hovered, setHovered] = useState<HeatCell | null>(null);

  const cells = weeks.flat().filter((c) => c.inRange);
  const max = Math.max(...cells.map((c) => c.hours), 0);
  const activeDays = cells.filter((c) => c.hours > 0);

  // Month labels sit above the column where a new month starts.
  const monthLabels = weeks.map((week, i) => {
    const first = week.find((c) => c.inRange);
    if (!first) return null;
    const month = format(parseISO(first.date), "MMM");
    const previous = weeks[i - 1]?.find((c) => c.inRange);
    if (!previous) return month;
    return format(parseISO(previous.date), "MMM") === month ? null : month;
  });

  return (
    <ChartCard
      title="Consistency"
      subtitle="Every day in range — darker means nothing logged"
      table={
        activeDays.length === 0 ? (
          <p className="py-6 text-sm text-ink-3">No time logged in this range.</p>
        ) : (
          <DataTable
            columns={["Date", "Hours"]}
            rows={activeDays.map((c) => [
              format(parseISO(c.date), "EEE, MMM d yyyy"),
              c.hours.toFixed(2),
            ])}
          />
        )
      }
    >
      {max === 0 ? (
        <EmptyPlot message="No time logged in this range." />
      ) : (
        <div>
          <p className="mb-3 h-5 text-sm text-ink-2">
            {hovered ? (
              <>
                <span className="font-semibold text-ink tabular-nums">
                  {formatHours(hovered.hours)}
                </span>{" "}
                on {format(parseISO(hovered.date), "EEE, MMM d yyyy")}
              </>
            ) : (
              <span className="text-ink-3">Hover a day for its total</span>
            )}
          </p>

          <div className="overflow-x-auto pb-1">
            <div className="flex gap-[3px]" style={{ minWidth: "min-content" }}>
              <div className="mr-1 flex shrink-0 flex-col gap-[3px] pt-[18px]">
                {DAY_LABELS.map((label, i) => (
                  <span
                    key={i}
                    className="h-[14px] text-[10px] leading-[14px] text-ink-3"
                    style={{ width: 22 }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              {weeks.map((week, w) => (
                <div key={w} className="flex shrink-0 flex-col gap-[3px]">
                  <span className="h-[15px] text-[10px] leading-[15px] text-ink-3">
                    {monthLabels[w]}
                  </span>
                  {week.map((cell) => {
                    if (!cell.inRange) {
                      return <span key={cell.date} className="h-[14px] w-[14px]" />;
                    }
                    const label = `${format(parseISO(cell.date), "EEE, MMM d yyyy")}: ${formatHours(cell.hours)}`;
                    return (
                      <button
                        key={cell.date}
                        type="button"
                        title={label}
                        aria-label={label}
                        onMouseEnter={() => setHovered(cell)}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={() => setHovered(cell)}
                        onBlur={() => setHovered(null)}
                        className="h-[14px] w-[14px] rounded-[3px] transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-2"
                        style={{ backgroundColor: heatColor(cell.hours, max) }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-ink-3">
            <span>Less</span>
            <span
              className="h-[10px] w-[10px] rounded-[2px]"
              style={{ backgroundColor: HEAT_EMPTY }}
            />
            {HEAT_RAMP.map((step) => (
              <span
                key={step}
                className="h-[10px] w-[10px] rounded-[2px]"
                style={{ backgroundColor: step }}
              />
            ))}
            <span>More ({formatHours(max)})</span>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
