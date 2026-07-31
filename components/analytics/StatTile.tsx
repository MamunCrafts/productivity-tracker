"use client";

import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { VIZ } from "@/lib/viz";

/** 12-point trend, de-emphasised, with the latest point in the accent hue. */
export function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const width = 120;
  const height = 28;
  const max = Math.max(...points, 0.0001);
  const step = width / (points.length - 1);
  const y = (v: number) => height - 2 - (v / max) * (height - 4);
  const path = points.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const lastX = width;
  const lastY = y(points[points.length - 1]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-7 w-full"
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      <path d={path} fill="none" stroke={VIZ.axis} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX - 2} cy={lastY} r={3} fill={VIZ.accent} stroke={VIZ.surface} strokeWidth={2} />
    </svg>
  );
}

export function StatTile({
  label,
  value,
  hint,
  sparkline,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  sparkline?: number[];
}) {
  return (
    <Card className="bg-surface border-line p-5">
      <p className="text-sm text-ink-2">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
      {sparkline && sparkline.length > 1 && (
        <div className="mt-3">
          <Sparkline points={sparkline} />
        </div>
      )}
    </Card>
  );
}

/** The one number the page leads with. Exactly one per view. */
export function HeroStat({
  label,
  value,
  unit,
  hint,
  className,
}: {
  label: string;
  value: string;
  unit: string;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("bg-surface border-line p-5", className)}>
      <p className="text-sm text-ink-2">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-5xl font-semibold leading-none text-ink">{value}</span>
        <span className="text-xl font-medium text-ink-3">{unit}</span>
      </p>
      {hint && <p className="mt-2 text-xs text-ink-3">{hint}</p>}
    </Card>
  );
}
