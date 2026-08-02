"use client";

import { formatTimeOfDay } from "@/lib/time";
import { useClock } from "@/components/useClock";

/**
 * The time and date, in the nav, where the wordmark used to be.
 *
 * The wordmark went because it was the least useful thing in the bar — you
 * know which app you are in, the mark beside this still says so, and the tab
 * title says it again. The clock earns the same space: it is the one piece of
 * context every page wants and none of them own.
 *
 * It reserves its height and renders nothing until mounted. A server-rendered
 * clock hydrates to a different minute, and the nav is the worst place in the
 * app for a hydration mismatch — it is sticky, so a reflow there moves the
 * whole page under it.
 *
 * The time is always here; the date comes and goes with the room for it. Below
 * `sm` the tabs are behind the menu button, so there is width for `Sun 3 Aug`;
 * from `xl` there is width for the long form. Between the two the bar is
 * carrying the wordmark and six spelled-out tabs, and the date is what gives
 * way — the time alone is ambiguous by the next morning, but only just, and a
 * nav that wraps is worse.
 */
export function NavClock() {
  const now = useClock();

  // `min-w-0` and the truncate below: at 360px this shares the bar with a 44px
  // menu button and must give way to it rather than push it off the edge.
  if (!now) return <span className="h-5 min-w-0" aria-hidden />;

  return (
    <span className="flex min-w-0 items-baseline gap-1.5 text-xs">
      {/* `tnum` so the minute changing doesn't shuffle the date beside it by a
          pixel. The hour has no leading zero, so the row still shifts once a
          day between 9:59 am and 10:00 am — padding it to "09:59 am" to avoid
          that would look worse all day to fix a jump nobody watches for. */}
      <time
        dateTime={now.toISOString()}
        className="shrink-0 font-mono tnum text-ink-2"
      >
        {formatTimeOfDay(now)}
      </time>
      <span aria-hidden className="shrink-0 text-line-2 sm:hidden xl:inline">
        ·
      </span>
      <span className="truncate text-ink-3 sm:hidden">{short(now)}</span>
      <span className="hidden truncate text-ink-3 xl:inline">{long(now)}</span>
    </span>
  );
}

const long = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const short = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
