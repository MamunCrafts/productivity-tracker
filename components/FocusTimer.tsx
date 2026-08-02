"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  stopTimerAsync,
  clearTimer,
  beginBreak,
  resumeWork,
  StopTimerInput,
} from "@/store/habitSlice";
import { Button } from "@/components/ui/button";
import { Square, Maximize2, Minimize2, Coffee, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SessionWrapUp } from "./SessionWrapUp";
import { STALE_AFTER_HOURS } from "@/store/timerPersistence";

/** Work / break lengths in minutes. "Continuous" opts out of intervals. */
const CADENCES = [
  { key: "off", label: "Continuous", work: 0, rest: 0 },
  { key: "25/5", label: "25 / 5", work: 25, rest: 5 },
  { key: "50/10", label: "50 / 10", work: 50, rest: 10 },
] as const;

type CadenceKey = (typeof CADENCES)[number]["key"];
const CADENCE_STORAGE_KEY = "productivity-tracker:cadence";

function formatElapsed(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function humanDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/**
 * The clock lives in state rather than being read during render — `Date.now()`
 * in a render body is impure and makes the component non-idempotent. The first
 * sample is scheduled rather than called inline so the effect never sets state
 * synchronously.
 */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = setTimeout(update, 0);
    const id = setInterval(update, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [intervalMs]);

  return now;
}

function readStoredCadence(): CadenceKey {
  if (typeof window === "undefined") return "off";
  try {
    const stored = window.localStorage.getItem(CADENCE_STORAGE_KEY);
    return stored && CADENCES.some((c) => c.key === stored)
      ? (stored as CadenceKey)
      : "off";
  } catch {
    return "off";
  }
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
  const [wrapUpOpen, setWrapUpOpen] = useState(false);
  // Session only mounts once a timer exists, which is always after hydration,
  // so reading localStorage in the initialiser can't cause a mismatch.
  const [cadenceKey, setCadenceKey] = useState<CadenceKey>(readStoredCadence);
  const [dismissedPhase, setDismissedPhase] = useState<string | null>(null);

  const tickedNow = useNow();

  const chooseCadence = (key: CadenceKey) => {
    setCadenceKey(key);
    window.localStorage.setItem(CADENCE_STORAGE_KEY, key);
  };

  if (!activeTimer) return null;

  const habit = habits.find((h) => h.id === activeTimer.habitId);
  const color = habit?.color ?? "hsl(var(--amber))";
  const cadence = CADENCES.find((c) => c.key === cadenceKey) ?? CADENCES[0];
  const onBreak = activeTimer.phase === "break";

  const startedAt = new Date(activeTimer.startTime).getTime();
  const phaseStartedAt = new Date(activeTimer.phaseStartedAt).getTime();
  // Before the first tick lands (one frame), fall back to the start time so the
  // clock reads 00:00 rather than a nonsense value.
  const now = tickedNow || startedAt;

  const wallClock = Math.max(0, Math.floor((now - startedAt) / 1000));
  const phaseSeconds = Math.max(0, Math.floor((now - phaseStartedAt) / 1000));
  const pendingBreak = onBreak ? phaseSeconds : 0;
  // What will actually be written: wall clock minus every break.
  const workSeconds = Math.max(
    wallClock - activeTimer.breakSeconds - pendingBreak,
    0
  );

  const isStale = wallClock > STALE_AFTER_HOURS * 3600 * 0.5;
  const phaseLimit = onBreak ? cadence.rest * 60 : cadence.work * 60;
  const phaseDue = phaseLimit > 0 && phaseSeconds >= phaseLimit;
  const phaseId = `${activeTimer.phase}-${activeTimer.phaseStartedAt}`;
  const showPrompt = phaseDue && dismissedPhase !== phaseId;

  const save = (input: StopTimerInput) => {
    dispatch(stopTimerAsync(input));
    setWrapUpOpen(false);
    setImmersive(false);
  };

  const discard = () => {
    dispatch(clearTimer());
    setWrapUpOpen(false);
    setImmersive(false);
  };

  const cadencePicker = (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Session cadence">
      {CADENCES.map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={cadenceKey === option.key}
          onClick={() => chooseCadence(option.key)}
          className={cn(
            "rounded px-2 py-1 text-xs font-medium transition-colors",
            cadenceKey === option.key
              ? "bg-surface-2 text-ink"
              : "text-ink-3 hover:text-ink-2"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  /** Labels collapse to icons on narrow screens so the dock stays one row. */
  const breakControls = onBreak ? (
    <Button
      variant="default"
      onClick={() => dispatch(resumeWork())}
      className="gap-2 px-3 sm:px-4"
      title="Back to work"
    >
      <Play className="h-3.5 w-3.5" fill="currentColor" />
      <span className="hidden sm:inline">Back to work</span>
    </Button>
  ) : (
    <Button
      variant="ghost"
      onClick={() => dispatch(beginBreak())}
      className="gap-2 px-3 sm:px-4"
      title="Take a break"
    >
      <Coffee className="h-4 w-4" />
      <span className="hidden sm:inline">Take a break</span>
    </Button>
  );

  return (
    <>
      <AnimatePresence>
        {!immersive && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            // Lifted by the mobile tab bar's height so the two stack rather
            // than one burying the other; `--tabbar-h` is 0 from `sm` up, where
            // there is no bar, so this still sits flush on the desk.
            style={{ bottom: "var(--tabbar-h)" }}
            className="fixed inset-x-0 z-40 border-t border-line-2 bg-surface/95 backdrop-blur-xl"
          >
            {showPrompt && (
              <div className="border-b border-line bg-amber/10 px-6 py-2 text-center text-sm text-amber">
                {onBreak
                  ? `Break's up — ${cadence.rest} minutes done.`
                  : `${cadence.work} minutes of focus. Take a break?`}
                <button
                  type="button"
                  onClick={() =>
                    onBreak ? dispatch(resumeWork()) : dispatch(beginBreak())
                  }
                  className="ml-3 underline underline-offset-2"
                >
                  {onBreak ? "Back to work" : "Start break"}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedPhase(phaseId)}
                  className="ml-3 text-ink-2 underline underline-offset-2"
                >
                  Keep going
                </button>
              </div>
            )}

            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:gap-x-4 sm:px-6">
              <span
                aria-hidden
                className="h-8 w-[3px] shrink-0 rounded-full"
                style={{ backgroundColor: onBreak ? "hsl(var(--ink-3))" : color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink-3">
                  {onBreak ? "On a break" : "In session"}
                </p>
                <p className="truncate font-display text-base text-ink">
                  {habit?.title ?? "Focus"}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    "font-mono text-xl tnum sm:text-2xl",
                    onBreak ? "text-ink-3" : "text-ink"
                  )}
                >
                  {formatElapsed(onBreak ? phaseSeconds : workSeconds)}
                </p>
                {activeTimer.breakSeconds > 0 && !onBreak && (
                  <p className="text-[11px] text-ink-3 tnum">
                    {humanDuration(activeTimer.breakSeconds)} on breaks
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                {cadence.work > 0 && breakControls}
                {/* The cadence picker lives in focus mode on small screens —
                    four extra controls would wrap the dock onto three rows. */}
                <div className="hidden md:flex">{cadencePicker}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setImmersive(true)}
                  title="Enter focus mode"
                >
                  <Maximize2 className="h-4 w-4" />
                  <span className="sr-only">Enter focus mode</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setWrapUpOpen(true)}
                  className="gap-2 px-3 sm:px-4"
                  title="Stop and save"
                >
                  <Square className="h-3.5 w-3.5" fill="currentColor" />
                  <span className="hidden sm:inline">Stop &amp; save</span>
                </Button>
              </div>
            </div>

            {isStale && (
              <p className="border-t border-line px-6 py-2 text-center text-xs text-ink-3">
                This session has been running for {humanDuration(wallClock)}. If you
                left it going by accident, discard it from the wrap-up.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focus mode: the page goes away. One habit, one clock, one way out. */}
      <DialogPrimitive.Root open={immersive} onOpenChange={setImmersive}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-base data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            aria-label="Focus session"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0"
          >
            <DialogPrimitive.Title className="sr-only">
              Focusing on {habit?.title ?? "your habit"}
            </DialogPrimitive.Title>

            <div className="relative flex w-full max-w-full items-center justify-center">
              {/* A 10s pacer, about six breaths a minute. Ambient and ignorable,
                  and it stops entirely under prefers-reduced-motion. Sized
                  against the viewport so the rings never push the page wider
                  than the screen on a phone. */}
              <span
                aria-hidden
                className="animate-breathe absolute h-[min(420px,88vw)] w-[min(420px,88vw)] rounded-full blur-2xl"
                style={{ backgroundColor: onBreak ? "hsl(var(--ink-3))" : color, opacity: 0.14 }}
              />
              <span
                aria-hidden
                className="animate-breathe absolute h-[min(300px,66vw)] w-[min(300px,66vw)] rounded-full border"
                style={{ borderColor: onBreak ? "hsl(var(--ink-3))" : color, opacity: 0.25 }}
              />

              <div className="relative z-10 max-w-full px-2 text-center">
                <p className="truncate font-display text-xl font-normal text-ink-2 sm:text-2xl">
                  {onBreak ? "Break" : habit?.title ?? "Focus"}
                </p>
                <p className="mt-4 font-mono text-6xl font-light text-ink tnum sm:text-7xl md:text-8xl">
                  {formatElapsed(onBreak ? phaseSeconds : workSeconds)}
                </p>
                {habit && !onBreak && (
                  <p className="mt-3 text-sm text-ink-3">
                    Today&apos;s goal <span className="tnum">{habit.perDayHours}h</span>
                    {habit.timeSlot ? ` · ${habit.timeSlot}` : ""}
                  </p>
                )}
                {showPrompt && (
                  <p className="mt-4 text-sm text-amber">
                    {onBreak
                      ? `Break's up — ${cadence.rest} minutes done.`
                      : `${cadence.work} minutes of focus. Take a break?`}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
              {cadence.work > 0 && breakControls}
              <Button variant="ghost" onClick={() => setImmersive(false)} className="gap-2">
                <Minimize2 className="h-4 w-4" />
                Exit focus mode
              </Button>
              <Button variant="outline" onClick={() => setWrapUpOpen(true)} className="gap-2">
                <Square className="h-3.5 w-3.5" fill="currentColor" />
                Stop &amp; save
              </Button>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              {cadencePicker}
              <p className="text-xs text-ink-3">
                Your time keeps counting either way. Esc leaves focus mode.
              </p>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <SessionWrapUp
        open={wrapUpOpen}
        onOpenChange={setWrapUpOpen}
        habitTitle={habit?.title ?? "this habit"}
        duration={humanDuration(workSeconds)}
        onSave={save}
        onDiscard={discard}
      />
    </>
  );
}
