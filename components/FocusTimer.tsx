"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { stopTimerAsync } from "@/store/habitSlice";
import { Button } from "@/components/ui/button";
import { Square, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatElapsed(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function useElapsed(startTime: string) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
  );

  useEffect(() => {
    const started = new Date(startTime).getTime();
    const id = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return elapsed;
}

/**
 * Mounts the session with `key={logId}` so each new session gets a fresh
 * component. The old version reset its clock with a setState inside an effect,
 * which cascades renders; remounting is both cheaper and simpler to read.
 */
export function FocusTimer() {
  const activeTimer = useAppSelector((state) => state.habit.activeTimer);
  if (!activeTimer) return null;
  return <Session key={activeTimer.logId} />;
}

function Session() {
  const activeTimer = useAppSelector((state) => state.habit.activeTimer);
  const habits = useAppSelector((state) => state.habit.habits);
  const dispatch = useAppDispatch();
  const [immersive, setImmersive] = useState(false);

  const startTime = activeTimer?.startTime ?? new Date().toISOString();
  const elapsed = useElapsed(startTime);

  if (!activeTimer) return null;

  const habit = habits.find((h) => h.id === activeTimer.habitId);
  const color = habit?.color ?? "hsl(var(--amber))";
  const stop = () => dispatch(stopTimerAsync());

  return (
    <>
      {/* Docked strip at the edge of the page rather than a card floating over
          the work — present without being something to look at. */}
      <AnimatePresence>
        {!immersive && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-line-2 bg-surface/95 backdrop-blur-xl"
          >
            <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
              <span
                aria-hidden
                className="h-8 w-[3px] shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink-3">
                  In session
                </p>
                <p className="truncate font-display text-base text-ink">
                  {habit?.title ?? "Focus"}
                </p>
              </div>

              <p className="font-mono text-2xl text-ink tnum">
                {formatElapsed(elapsed)}
              </p>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setImmersive(true)}
                  title="Enter focus mode"
                >
                  <Maximize2 className="h-4 w-4" />
                  <span className="sr-only">Enter focus mode</span>
                </Button>
                <Button variant="outline" onClick={stop} className="gap-2">
                  <Square className="h-3.5 w-3.5" fill="currentColor" />
                  Stop &amp; save
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focus mode: the page goes away. One habit, one clock, one way out. */}
      <DialogPrimitive.Root open={immersive} onOpenChange={setImmersive}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-base data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            aria-label="Focus session"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0"
          >
            <DialogPrimitive.Title className="sr-only">
              Focusing on {habit?.title ?? "your habit"}
            </DialogPrimitive.Title>

            <div className="relative flex items-center justify-center">
              {/* A 10s pacer, about six breaths a minute. Ambient and ignorable,
                  and it stops entirely under prefers-reduced-motion. */}
              <span
                aria-hidden
                className="animate-breathe absolute h-[420px] w-[420px] rounded-full blur-2xl"
                style={{ backgroundColor: color, opacity: 0.14 }}
              />
              <span
                aria-hidden
                className="animate-breathe absolute h-[300px] w-[300px] rounded-full border"
                style={{ borderColor: color, opacity: 0.25 }}
              />

              <div className="relative z-10 text-center">
                <p className="font-display text-2xl font-normal text-ink-2">
                  {habit?.title ?? "Focus"}
                </p>
                <p className="mt-4 font-mono text-7xl font-light text-ink tnum sm:text-8xl">
                  {formatElapsed(elapsed)}
                </p>
                {habit && (
                  <p className="mt-3 text-sm text-ink-3">
                    Today&apos;s goal <span className="tnum">{habit.perDayHours}h</span>
                    {habit.timeSlot ? ` · ${habit.timeSlot}` : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-16 flex items-center gap-3">
              <Button variant="ghost" onClick={() => setImmersive(false)} className="gap-2">
                <Minimize2 className="h-4 w-4" />
                Exit focus mode
              </Button>
              <Button variant="outline" onClick={stop} className="gap-2">
                <Square className="h-3.5 w-3.5" fill="currentColor" />
                Stop &amp; save
              </Button>
            </div>

            <p className="mt-6 text-xs text-ink-3">
              Your time keeps counting either way. Esc leaves focus mode.
            </p>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
