import { cn } from "@/lib/utils";

/**
 * Low-glare skeletons.
 *
 * Design constraints, in priority order:
 *  1. Low luminance amplitude. The placeholder sits a step or two off the card
 *     surface instead of the near-white gray-100 it used to use. Several
 *     near-white blocks pulsing on a dark page is a glare source, and glare is
 *     what makes a loading state tiring to look at.
 *  2. Slow, low-frequency motion. One pass every ~2.8s — far under the 3 Hz
 *     flash threshold (WCAG 2.3.1) and slow enough to read as breathing rather
 *     than blinking, so it doesn't pull the eye away from the page.
 *  3. Staggered, not synchronised, so a list ripples instead of strobing.
 *  4. Same silhouette as the real row, so nothing jumps when data lands.
 *  5. Honours `prefers-reduced-motion` (see globals.css): the animation stops
 *     and the flat tint remains, which is still a perfectly good skeleton.
 */

interface ShimmerProps {
  className?: string;
  delay?: number;
}

export function Shimmer({ className, delay = 0 }: ShimmerProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer bg-gradient-to-r from-surface-2 via-line-2 to-surface-2 bg-[length:200%_100%]",
        className
      )}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

/** Mirrors a habit row: color rail, title, meta, strip, totals, actions. */
export function ShimmerRow({ delay = 0 }: { delay?: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface">
      <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-line-2" />
      <div className="flex flex-col gap-5 p-5 pl-6 md:flex-row md:items-center md:gap-6">
        <div className="min-w-0 flex-1 space-y-2">
          <Shimmer className="h-5 w-40 rounded" delay={delay} />
          <Shimmer className="h-3 w-56 rounded" delay={delay + 60} />
        </div>
        <div className="hidden shrink-0 lg:block">
          <Shimmer className="h-7 w-[125px] rounded" delay={delay + 120} />
        </div>
        <div className="shrink-0 space-y-2 md:w-28">
          <Shimmer className="h-5 w-16 rounded md:ml-auto" delay={delay + 180} />
          <Shimmer className="h-2.5 w-20 rounded md:ml-auto" delay={delay + 210} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Shimmer className="h-9 w-28 rounded-md" delay={delay + 270} />
          <Shimmer className="h-9 w-9 rounded-md" delay={delay + 300} />
          <Shimmer className="h-9 w-9 rounded-md" delay={delay + 330} />
          <Shimmer className="h-9 w-9 rounded-md" delay={delay + 360} />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for a stat tile on the analytics view. */
export function ShimmerStat({ delay = 0 }: { delay?: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <Shimmer className="h-3 w-24 rounded" delay={delay} />
      <Shimmer className="mt-3 h-8 w-28 rounded" delay={delay + 90} />
      <Shimmer className="mt-3 h-2.5 w-36 rounded" delay={delay + 180} />
    </div>
  );
}

/**
 * One live region for the whole list — announced once, rather than a screen
 * reader walking several empty rows.
 */
export function ShimmerRows({
  count = 4,
  label = "Loading habits",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerRow key={i} delay={i * 140} />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
