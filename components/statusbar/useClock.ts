"use client";

import { useEffect, useState } from "react";

/**
 * The wall clock, sampled on an interval.
 *
 * Not `new Date()` in a render body — reading the clock during render fails
 * `react-hooks/purity`, the same rule `FocusTimer` exists to respect. The lazy
 * initialiser runs once, and every value after it comes from the interval.
 *
 * Ticks every 10 seconds rather than every second: the strip shows `HH:MM`, so
 * a per-second tick would re-render the whole shell 59 times out of 60 to
 * change nothing. Ten seconds bounds the visible lag on a minute rollover to
 * that, which nobody reads a status strip closely enough to notice.
 */
export function useClock(intervalMs = 10_000): Date | null {
  /**
   * Null on the server and on the first client render, so the two agree and
   * hydration has nothing to reconcile — the time is filled in by the effect
   * immediately after mount. Rendering a real time here instead would mean the
   * server stamping one minute into HTML that the client re-renders to another.
   */
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Scheduled, not called in the effect body: a synchronous setState there
    // is the other React rule this codebase keeps tripping over.
    const timer = setTimeout(() => setNow(new Date()), 0);
    const interval = setInterval(() => setNow(new Date()), intervalMs);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [intervalMs]);

  return now;
}
