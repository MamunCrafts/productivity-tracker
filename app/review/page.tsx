"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useAppSelector } from "@/store/hooks";
import { formatHours, weekSummary, FOCUS_RATINGS } from "@/lib/analytics";
import { PageHeader, PageShell } from "@/components/PageFrame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShimmerStat } from "@/components/ui/shimmer";
import { ChevronLeft, ChevronRight, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) {
    return <span className="text-xs text-ink-3">level with last week</span>;
  }
  const up = diff > 0;
  return (
    <span className={cn("text-xs tnum", up ? "text-amber" : "text-ink-3")}>
      {up ? "+" : "−"}
      {formatHours(Math.abs(diff))} vs last week
    </span>
  );
}

export default function ReviewPage() {
  const { habits, logs, status } = useAppSelector((state) => state.habit);
  const [offset, setOffset] = useState(0);

  const { week, previous } = useMemo(
    () => ({
      week: weekSummary(habits, logs, offset),
      previous: weekSummary(habits, logs, offset + 1),
    }),
    [habits, logs, offset]
  );

  const missed = week.perHabit.filter((h) => !h.met);
  const met = week.perHabit.filter((h) => h.met);

  return (
    <PageShell width="4xl">
      <PageHeader
        title="Weekly review"
        lead={
          <>
            {format(week.start, "d MMM")} – {format(week.end, "d MMM yyyy")}
            {offset === 0 && <span className="ml-2 text-ink-3">(this week)</span>}
          </>
        }
        action={
          // Compact on a phone, where the pair shares the header's first row
          // with a two-word title.
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10"
              onClick={() => setOffset((o) => o + 1)}
              title="Earlier week"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Earlier week</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(o - 1, 0))}
              title="Later week"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Later week</span>
            </Button>
          </div>
        }
        className="sm:mb-8"
      />

      {status === "loading" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ShimmerStat key={i} delay={i * 140} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-sm text-ink-2">Hours logged</p>
              <p className="mt-2 font-mono text-4xl text-ink tnum">
                {week.totalHours.toFixed(1)}
              </p>
              <p className="mt-1">
                <Delta current={week.totalHours} previous={previous.totalHours} />
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-ink-2">Days practised</p>
              <p className="mt-2 font-mono text-4xl text-ink tnum">
                {week.activeDays}
                <span className="text-xl text-ink-3">/7</span>
              </p>
              <p className="mt-1 text-xs text-ink-3">
                {week.sessions} session{week.sessions === 1 ? "" : "s"}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-ink-2">Best day</p>
              {week.bestDay ? (
                <>
                  <p className="mt-2 font-display text-2xl text-ink">
                    {format(parseISO(week.bestDay.date), "EEEE")}
                  </p>
                  <p className="mt-1 font-mono text-xs text-ink-3 tnum">
                    {formatHours(week.bestDay.hours)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-ink-3">Nothing logged</p>
              )}
            </Card>
          </section>

          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-ink">
              Targets {met.length}/{week.perHabit.length} met
            </h2>
            {week.perHabit.length === 0 ? (
              <p className="text-sm text-ink-3">No habits to review.</p>
            ) : (
              <ul className="space-y-2.5">
                {[...met, ...missed].map((habit) => (
                  <li key={habit.id} className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: habit.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {habit.title}
                    </span>
                    <span className="shrink-0 font-mono text-sm text-ink-2 tnum">
                      {formatHours(habit.hours)}
                    </span>
                    <span
                      className={cn(
                        "flex w-24 shrink-0 items-center justify-end gap-1 text-xs",
                        habit.met ? "text-amber" : "text-ink-3"
                      )}
                    >
                      {habit.met ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> target met
                        </>
                      ) : (
                        <>
                          <Minus className="h-3.5 w-3.5" /> short
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-ink">
                What you wrote down
              </h2>
              {week.averageRating !== null && (
                <p className="text-xs text-ink-3">
                  Average focus{" "}
                  <span className="font-mono text-ink-2 tnum">
                    {week.averageRating.toFixed(1)}
                  </span>{" "}
                  /5
                </p>
              )}
            </div>

            {week.notes.length === 0 ? (
              <p className="text-sm text-ink-3">
                No session notes this week. Notes are written when a session ends —
                they turn hours into something you can reread.
              </p>
            ) : (
              <ul className="space-y-4">
                {week.notes.map((note) => {
                  const rating = FOCUS_RATINGS.find((r) => r.value === note.focusRating);
                  return (
                    <li key={note.id} className="border-l-2 pl-3" style={{ borderColor: note.color }}>
                      <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-ink-3">
                        <span className="text-ink-2">{note.habitTitle}</span>
                        <span>{format(parseISO(note.date), "EEE, MMM d")}</span>
                        {rating && <span>· {rating.label}</span>}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                        {note.note}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </PageShell>
  );
}
