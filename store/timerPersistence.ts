import { Middleware } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import type { ActiveTimer } from "./habitSlice";

export const TIMER_KEY = "productivity-tracker:active-timer";

/**
 * A session started more than this long ago is treated as abandoned rather than
 * silently restored — otherwise a tab left open overnight would offer to log
 * fourteen hours of "focus" the next morning.
 */
export const STALE_AFTER_HOURS = 12;

function isActiveTimer(value: unknown): value is ActiveTimer {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.habitId === "string" &&
    typeof t.startTime === "string" &&
    typeof t.logId === "string" &&
    (t.phase === "work" || t.phase === "break") &&
    typeof t.phaseStartedAt === "string" &&
    typeof t.breakSeconds === "number" &&
    !Number.isNaN(Date.parse(t.startTime))
  );
}

export function readStoredTimer(): ActiveTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TIMER_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isActiveTimer(parsed)) {
      window.localStorage.removeItem(TIMER_KEY);
      return null;
    }

    const ageHours = (Date.now() - Date.parse(parsed.startTime)) / 3_600_000;
    if (ageHours > STALE_AFTER_HOURS || ageHours < 0) {
      window.localStorage.removeItem(TIMER_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Mirrors `activeTimer` into localStorage after every action. Kept as
 * middleware so the reducers stay pure and no component has to remember to
 * sync — the store is the single source of truth either way.
 */
export const timerPersistenceMiddleware: Middleware =
  (store) => (next) => (action) => {
    const result = next(action);
    if (typeof window === "undefined") return result;

    const timer = (store.getState() as RootState).habit.activeTimer;
    try {
      if (timer) {
        window.localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
      } else {
        window.localStorage.removeItem(TIMER_KEY);
      }
    } catch {
      // Private browsing or a full quota — the timer still works in memory.
    }
    return result;
  };
