"use client";

import { useMemo, useState } from "react";
import { Habit } from "@/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  startTimer,
  deleteHabitAsync,
  updateHabitAsync,
} from "@/store/habitSlice";
import { Button } from "@/components/ui/button";
import {
  Play,
  BarChart2,
  Trash2,
  Pause,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
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
import { HabitForm } from "./HabitForm";
import { motion } from "framer-motion";
import { dayKey, habitPace, toHours } from "@/lib/analytics";
import { subDays, format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface HabitCardProps {
  habit: Habit;
}

const STRIP_DAYS = 21;

/** Today's hours against the daily goal, as a ring rather than another bar. */
function TodayRing({ percent, color }: { percent: number; color: string }) {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(percent, 100) / 100);
  const met = percent >= 100;

  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <circle
        cx="16"
        cy="16"
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-line-2"
        strokeWidth="2.5"
      />
      <circle
        cx="16"
        cy="16"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 16 16)"
        className="transition-[stroke-dashoffset] duration-700 ease-out"
      />
      {met && (
        <circle cx="16" cy="16" r="4" fill={color} />
      )}
    </svg>
  );
}

export function HabitCard({ habit }: HabitCardProps) {
  const dispatch = useAppDispatch();
  const activeTimer = useAppSelector((state) => state.habit.activeTimer);
  const logs = useAppSelector((state) => state.habit.logs);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isRunning = activeTimer?.habitId === habit.id;
  const isPaused = habit.status === "Paused";
  const isFinished = habit.completed;

  const pace = useMemo(() => habitPace(habit, logs), [habit, logs]);

  const strip = useMemo(() => {
    const mine = logs.filter((l) => l.habitId === habit.id);
    const byDay = new Map<string, number>();
    for (const log of mine) {
      byDay.set(log.date, (byDay.get(log.date) ?? 0) + log.durationSeconds);
    }
    const goal = habit.perDayHours > 0 ? habit.perDayHours : 1;
    return Array.from({ length: STRIP_DAYS }, (_, i) => {
      const date = dayKey(subDays(new Date(), STRIP_DAYS - 1 - i));
      const dayHours = toHours(byDay.get(date) ?? 0);
      return { date, hours: dayHours, fill: Math.min(dayHours / goal, 1) };
    });
  }, [logs, habit.id, habit.perDayHours]);

  const daysHit = strip.filter((d) => d.hours > 0).length;
  const dimmed = isPaused || isFinished;

  const setStatus = (status: Habit["status"]) =>
    dispatch(updateHabitAsync({ id: habit.id, patch: { status } }));

  const setFinished = (completed: boolean) =>
    dispatch(
      updateHabitAsync({
        id: habit.id,
        patch: {
          completed,
          completedAt: completed ? new Date().toISOString() : null,
        },
      })
    );

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-line-2",
        dimmed && "opacity-70 hover:opacity-100"
      )}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ backgroundColor: dimmed ? "hsl(var(--ink-3))" : habit.color }}
      />

      <div className="flex flex-col gap-5 p-5 pl-6 md:flex-row md:items-center md:gap-6">
        {/* Today's ring sits beside the name: the first question is always
            "have I done my hours today", not "how's the lifetime total". */}
        {!dimmed && (
          <div className="hidden shrink-0 sm:block" title={`Today: ${pace.todayHours.toFixed(1)}h of ${habit.perDayHours}h`}>
            <TodayRing percent={pace.todayPct} color={habit.color} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-xl font-medium leading-snug text-ink">
              {habit.title}
            </h3>
            {isRunning && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber/12 px-2 py-0.5 text-[11px] font-medium text-amber">
                <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                Focusing
              </span>
            )}
            {isFinished && (
              <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-ink-2">
                Finished
              </span>
            )}
            {isPaused && !isFinished && (
              <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-ink-2">
                Paused
              </span>
            )}
            {!dimmed && !pace.onTrack && (
              <span className="shrink-0 rounded-full bg-danger/12 px-2 py-0.5 text-[11px] text-danger">
                Behind pace
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-sm text-ink-2">
            <span className="tnum">
              {pace.weekActiveDays}/{pace.weekTarget}
            </span>{" "}
            days this week
            {habit.timeSlot && (
              <>
                <span className="mx-1.5 text-ink-3">·</span>
                {habit.timeSlot}
              </>
            )}
            {pace.daysRemaining !== null && !isFinished && (
              <>
                <span className="mx-1.5 text-ink-3">·</span>
                <span className="tnum">{pace.daysRemaining}</span> days left
              </>
            )}
          </p>
        </div>

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

        <div className="shrink-0 md:w-28 md:text-right">
          <p className="font-mono text-lg text-ink tnum">
            {pace.totalHours.toFixed(1)}
            <span className="ml-1 text-sm text-ink-3">hrs</span>
          </p>
          <p className="text-[11px] text-ink-3">
            of <span className="tnum">{habit.totalHours}</span> ·{" "}
            {Math.round(pace.goalPct)}%
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {!isFinished && !isPaused && (
            <Button
              size="sm"
              onClick={() => !activeTimer && dispatch(startTimer(habit.id))}
              disabled={Boolean(activeTimer)}
              variant={isRunning ? "secondary" : "default"}
              className="gap-2"
              title={
                activeTimer && !isRunning
                  ? "Another session is running — stop it first"
                  : undefined
              }
            >
              <Play className="h-3.5 w-3.5" fill="currentColor" />
              {isRunning ? "In session" : "Start focus"}
            </Button>
          )}

          {pace.reachedGoal && !isFinished && (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setFinished(true)}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark finished
            </Button>
          )}

          {isFinished && (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setFinished(false)}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reopen
            </Button>
          )}

          <div className="flex items-center gap-0.5 opacity-70 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            {!isFinished && <ManualLogForm habitId={habit.id} habitTitle={habit.title} />}

            <HabitForm habit={habit} />

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
                    Progress, recent activity, and every logged session.
                  </DialogDescription>
                </DialogHeader>
                <HabitAnalytics habit={habit} />
              </DialogContent>
            </Dialog>

            {!isFinished && (
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9"
                title={isPaused ? "Resume habit" : "Pause habit"}
                onClick={() => setStatus(isPaused ? "Active" : "Paused")}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                <span className="sr-only">
                  {isPaused ? `Resume ${habit.title}` : `Pause ${habit.title}`}
                </span>
              </Button>
            )}

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
                    <span className="tnum">{pace.totalHours.toFixed(1)}</span> hours you
                    logged against it stay in your analytics. To keep it around
                    without deleting, pause it instead.
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

      <div
        className="absolute bottom-0 left-0 h-[2px] transition-[width] duration-700 ease-out"
        style={{
          width: `${pace.goalPct}%`,
          backgroundColor: dimmed ? "hsl(var(--ink-3))" : habit.color,
          opacity: 0.85,
        }}
        role="progressbar"
        aria-valuenow={Math.round(pace.goalPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${habit.title}: ${Math.round(pace.goalPct)}% of goal`}
      />
    </motion.li>
  );
}
