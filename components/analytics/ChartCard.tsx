"use client";

import { ReactNode, useId, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BarChart3, TableProperties } from "lucide-react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Every chart ships a table twin so no value is reachable only by hovering. */
  table: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, table, children, className }: ChartCardProps) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const panelId = useId();

  return (
    <Card className={cn("bg-surface border-line p-6", className)}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-ink-3">{subtitle}</p>}
        </div>
        <div
          role="tablist"
          aria-label={`${title} view`}
          className="flex shrink-0 rounded-md border border-line p-0.5"
        >
          {(
            [
              { key: "chart", label: "Chart", Icon: BarChart3 },
              { key: "table", label: "Table", Icon: TableProperties },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={view === key}
              aria-controls={panelId}
              title={`${label} view`}
              onClick={() => setView(key)}
              className={cn(
                "flex h-7 w-8 items-center justify-center rounded transition-colors",
                view === key
                  ? "bg-line text-ink"
                  : "text-ink-3 hover:text-ink-2"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="sr-only">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div id={panelId} role="tabpanel">
        {view === "chart" ? children : <div className="overflow-x-auto">{table}</div>}
      </div>
    </Card>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (ReactNode[])[];
}) {
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="border-b border-line">
          {columns.map((column, i) => (
            <th
              key={column}
              scope="col"
              className={cn(
                "py-2 font-medium text-ink-2",
                i === 0 ? "text-left" : "text-right"
              )}
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r} className="border-b border-line/60 last:border-0">
            {row.map((cell, c) => (
              <td
                key={c}
                className={cn(
                  "py-2 text-ink-2",
                  c === 0 ? "text-left" : "text-right"
                )}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Values lead, labels follow — the reader already knows the series and wants the
 * number. Series identity rides a short stroke, never colored text.
 */
export function VizTooltip({
  label,
  rows,
}: {
  label: string;
  rows: { name: string; value: string; color: string }[];
}) {
  return (
    <div className="rounded-lg border border-line bg-base/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-xs text-ink-2">{label}</p>
      {rows.map((row) => (
        <div key={row.name} className="mt-1 flex items-center gap-2">
          <span
            aria-hidden
            className="h-0.5 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: row.color }}
          />
          <span className="text-sm font-semibold text-ink tabular-nums">
            {row.value}
          </span>
          <span className="text-xs text-ink-2">{row.name}</span>
        </div>
      ))}
    </div>
  );
}

export function EmptyPlot({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-ink-3">
      {message}
    </div>
  );
}
