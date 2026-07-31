"use client";

import { useMemo, useState } from "react";
import { Habit } from "@/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { startTimer, deleteHabitAsync } from "@/store/habitSlice";
import { Button } from "@/components/ui/button";
import { Play, BarChart2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { HabitAnalytics } from "./HabitAnalytics";
import { ManualLogForm } from "./ManualLogForm";
import { motion } from "framer-motion";
import { dayKey, toHours } from "@/lib/analytics";
import { subDays, format, parseISO } from "date-fns";

interface HabitCardProps {
  habit: Habit;
}

const STRIP_DAYS = 21;

export function HabitCard({ habit }: HabitCardProps) {
  const dispatch = useAppDispatch();
  const activeTimer = useAppSelector((state) => state.habit.activeTimer);
  const logs = useAppSelector((state) => state.habit.logs);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isRunning = activeTimer?.habitId === habit.id;
  const someoneElseRunning = Boolean(activeTimer) && !isRunning;

  const { totalHours, percent, strip } = useMemo(() => {
    const mine = logs.filter((l) => l.habitId === habit.id);
    const seconds = mine.reduce((sum, l) => sum + l.durationSeconds, 0);
    const hours = toHours(seconds);

    const byDay = new Map<string, number>();
    for (const log of mine) {
      byDay.set(log.date, (byDay.get(log.date) ?? 0) + log.durationSeconds);
    }

    // Each mark is one day measured against the daily goal — the row carries a
    // record of showing up, not just a running total.
    const goal = habit.perDayHours > 0 ? habit.perDayHours : 1;
    const days = Array.from({ length: STRIP_DAYS }, (_, i) => {
      const date = dayKey(subDays(new Date(), STRIP_DAYS - 1 - i));
      const dayHours = toHours(byDay.get(date) ?? 0);
      return { date, hours: dayHours, fill: Math.min(dayHours / goal, 1) };
    });

    return {
      totalHours: hours,
      percent:
        habit.totalHours > 0 ? Math.min((hours / habit.totalHours) * 100, 100) : 0,
      strip: days,
    };
  }, [logs, habit.id, habit.perDayHours, habit.totalHours]);

  const daysHit = strip.filter((d) => d.hours > 0).length;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-line-2"
    >
      {/* The habit's own color, as a rail rather than a fill — identity without
          putting a saturated block on the page. */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ backgroundColor: habit.color }}
      />

      <div className="flex flex-col gap-5 p-5 pl-6 md:flex-row md:items-center md:gap-6">
        {/* Identity */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h3 className="truncate font-display text-xl font-medium leading-snug text-ink">
              {habit.title}
            </h3>
            {isRunning && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber/12 px-2 py-0.5 text-[11px] font-medium text-amber">
                <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                Focusing
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-ink-2">
            {habit.timeSlot && <span>{habit.timeSlot}</span>}
            {habit.timeSlot && <span className="mx-1.5 text-ink-3">·</span>}
            <span className="tnum">{habit.perDayHours}h</span> a day
            {habit.description && (
              <>
                <span className="mx-1.5 text-ink-3">·</span>
                <span className="text-ink-3">{habit.description}</span>
              </>
            )}
          </p>
        </div>

        {/* Consistency strip — the last 21 days at a glance */}
        <div className="hidden shrink-0 lg:block">
          <div className="flex h-7 items-end gap-[3px]" aria-hidden>
            {strip.map((day) => (
              <span
                key={day.date}
                title={`${format(parseISO(day.date), "MMM d")}: ${day.hours.toFixed(1)}h`}
                className="w-[4px] rounded-[1px]"
                style={{
                  height: day.fill > 0 ? `${Math.max(day.fill * 100, 14)}%` : "3px",
                  backgroundColor: day.fill > 0 ? habit.color : "hsl(var(--line-2))",
                  opacity: day.fill > 0 ? 0.45 + day.fill * 0.55 : 1,
                }}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-ink-3">
            <span className="tnum">{daysHit}</span> of {STRIP_DAYS} days
          </p>
        </div>

        {/* Totals */}
        <div className="shrink-0 md:w-28 md:text-right">
          <p className="font-mono text-lg text-ink tnum">
            {totalHours.toFixed(1)}
            <span className="ml-1 text-sm text-ink-3">hrs</span>
          </p>
          <p className="text-[11px] text-ink-3">
            of <span className="tnum">{habit.totalHours}</span> · {Math.round(percent)}%
          </p>
        </div>

        {/* Actions — one clear primary, the rest recessive until reached for */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            onClick={() => !activeTimer && dispatch(startTimer(habit.id))}
            disabled={Boolean(activeTimer)}
            variant={isRunning ? "secondary" : "default"}
            className="gap-2"
            title={
              someoneElseRunning
                ? "Another session is running — stop it first"
                : undefined
            }
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            {isRunning ? "In session" : "Start focus"}
          </Button>

          <div className="flex items-center gap-0.5 opacity-70 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <ManualLogForm habitId={habit.id} habitTitle={habit.title} />

            <Dialog>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9" title="View progress">
                  <BarChart2 className="h-4 w-4" />
                  <span className="sr-only">View progress for {habit.title}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{habit.title}</DialogTitle>
                  <DialogDescription>
                    Progress and recent activity for this habit.
                  </DialogDescription>
                </DialogHeader>
                <HabitAnalytics habit={habit} />
              </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 hover:bg-danger/12 hover:text-danger"
                  title="Delete habit"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete {habit.title}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete {habit.title}?</DialogTitle>
                  <DialogDescription>
                    It comes off your list right away. The{" "}
                    <span className="tnum">{totalHours.toFixed(1)}</span> hours you
                    logged against it stay in your analytics.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                    Keep it
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      dispatch(deleteHabitAsync(habit.id));
                      setDeleteOpen(false);
                    }}
                  >
                    Delete habit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Progress reads as the row's own baseline instead of another bar. */}
      <div
        className="absolute bottom-0 left-0 h-[2px] transition-[width] duration-700 ease-out"
        style={{
          width: `${percent}%`,
          backgroundColor: habit.color,
          opacity: 0.85,
        }}
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${habit.title}: ${Math.round(percent)}% of goal`}
      />
    </motion.li>
  );
}
