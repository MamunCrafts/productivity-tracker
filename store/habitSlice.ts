import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { Habit, HabitPatch, TimeLog, TimeLogPatch } from "@/types";
import { RootState } from "./store";

/**
 * A running session. Held here rather than in component state so the timer
 * middleware can persist it to localStorage and restore it after a refresh —
 * previously a reload silently discarded the session and its hours.
 */
export interface ActiveTimer {
  habitId: string;
  startTime: string;
  logId: string;
  /** "work" counts toward the session; "break" does not. */
  phase: "work" | "break";
  /** When the current phase began, so break time can be measured. */
  phaseStartedAt: string;
  /** Break seconds banked from completed breaks, excluded from logged time. */
  breakSeconds: number;
}

interface HabitState {
  habits: Habit[];
  logs: TimeLog[];
  activeTimer: ActiveTimer | null;
  status: "idle" | "loading" | "failed";
}

const initialState: HabitState = {
  habits: [],
  logs: [],
  activeTimer: null,
  status: "idle",
};

// Async Thunks
export const fetchHabits = createAsyncThunk("habit/fetchHabits", async () => {
  const response = await fetch("/api/habits");
  return (await response.json()) as Habit[];
});

export const fetchLogs = createAsyncThunk("habit/fetchLogs", async () => {
  const response = await fetch("/api/logs");
  return (await response.json()) as TimeLog[];
});

export type NewHabitInput = Omit<
  Habit,
  "id" | "createdAt" | "completed" | "completedAt" | "color" | "status"
> & { color?: string };

export const createHabit = createAsyncThunk(
  "habit/createHabit",
  async (habitData: NewHabitInput) => {
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      completed: false,
      completedAt: null,
      status: "Active",
      ...habitData,
      color: habitData.color || "#3b82f6",
    };
    const response = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newHabit),
    });
    return (await response.json()) as Habit;
  }
);

export const updateHabitAsync = createAsyncThunk(
  "habit/updateHabit",
  async ({ id, patch }: { id: string; patch: HabitPatch }) => {
    const response = await fetch(`/api/habits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) throw new Error("Could not update habit");
    return (await response.json()) as Habit;
  }
);

export const deleteHabitAsync = createAsyncThunk(
  "habit/deleteHabit",
  async (id: string) => {
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
    return id;
  }
);

export const createLogAsync = createAsyncThunk(
  "habit/createLog",
  async (logData: TimeLog) => {
    const response = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logData),
    });
    return (await response.json()) as TimeLog;
  }
);

export const updateLogAsync = createAsyncThunk(
  "habit/updateLog",
  async ({ id, patch }: { id: string; patch: TimeLogPatch }) => {
    const response = await fetch(`/api/logs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) throw new Error("Could not update session");
    return (await response.json()) as TimeLog;
  }
);

export const deleteLogAsync = createAsyncThunk(
  "habit/deleteLog",
  async (id: string) => {
    const response = await fetch(`/api/logs/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Could not delete session");
    return id;
  }
);

/** What the wrap-up step collects when a session ends. */
export interface StopTimerInput {
  note?: string;
  focusRating?: number | null;
}

export const stopTimerAsync = createAsyncThunk(
  "habit/stopTimer",
  async (input: StopTimerInput | undefined, { getState, dispatch }) => {
    const state = getState() as RootState;
    const { activeTimer } = state.habit;
    if (!activeTimer) {
      throw new Error("No active timer");
    }

    const endTime = new Date().toISOString();
    const start = new Date(activeTimer.startTime);
    const end = new Date(endTime);

    // Break time is wall-clock but not practice, so it never reaches the log.
    const pendingBreak =
      activeTimer.phase === "break"
        ? Math.floor(
            (end.getTime() - new Date(activeTimer.phaseStartedAt).getTime()) / 1000
          )
        : 0;
    const elapsed = Math.floor((end.getTime() - start.getTime()) / 1000);
    const durationSeconds = Math.max(
      elapsed - activeTimer.breakSeconds - pendingBreak,
      0
    );

    const newLog: TimeLog = {
      id: activeTimer.logId,
      habitId: activeTimer.habitId,
      startTime: activeTimer.startTime,
      endTime,
      durationSeconds,
      date: start.toISOString().split("T")[0],
      note: input?.note?.trim() ?? "",
      focusRating: input?.focusRating ?? null,
    };

    await dispatch(createLogAsync(newLog)).unwrap();
    return newLog;
  }
);

export const habitSlice = createSlice({
  name: "habit",
  initialState,
  reducers: {
    startTimer: (state, action: PayloadAction<string>) => {
      if (state.activeTimer) return;
      const now = new Date().toISOString();
      state.activeTimer = {
        habitId: action.payload,
        startTime: now,
        logId: crypto.randomUUID(),
        phase: "work",
        phaseStartedAt: now,
        breakSeconds: 0,
      };
    },
    /** Rehydrates a session that survived a page reload. */
    restoreTimer: (state, action: PayloadAction<ActiveTimer>) => {
      if (state.activeTimer) return;
      state.activeTimer = action.payload;
    },
    beginBreak: (state) => {
      if (!state.activeTimer || state.activeTimer.phase === "break") return;
      state.activeTimer.phase = "break";
      state.activeTimer.phaseStartedAt = new Date().toISOString();
    },
    resumeWork: (state) => {
      const timer = state.activeTimer;
      if (!timer || timer.phase === "work") return;
      const banked = Math.floor(
        (Date.now() - new Date(timer.phaseStartedAt).getTime()) / 1000
      );
      timer.breakSeconds += Math.max(banked, 0);
      timer.phase = "work";
      timer.phaseStartedAt = new Date().toISOString();
    },
    /** Throws the session away without writing a log. */
    clearTimer: (state) => {
      state.activeTimer = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHabits.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchHabits.fulfilled, (state, action) => {
        state.habits = action.payload;
        state.status = "idle";
      })
      .addCase(fetchHabits.rejected, (state) => {
        state.status = "failed";
      })
      .addCase(fetchLogs.fulfilled, (state, action) => {
        state.logs = action.payload;
      })
      .addCase(createHabit.fulfilled, (state, action) => {
        state.habits.push(action.payload);
      })
      .addCase(updateHabitAsync.fulfilled, (state, action) => {
        const index = state.habits.findIndex((h) => h.id === action.payload.id);
        if (index !== -1) state.habits[index] = action.payload;
      })
      .addCase(deleteHabitAsync.fulfilled, (state, action) => {
        // Logs stay: the delete is soft and the hours remain in analytics.
        state.habits = state.habits.filter((h) => h.id !== action.payload);
      })
      .addCase(createLogAsync.fulfilled, (state, action) => {
        state.logs.push(action.payload);
      })
      .addCase(updateLogAsync.fulfilled, (state, action) => {
        const index = state.logs.findIndex((l) => l.id === action.payload.id);
        if (index !== -1) state.logs[index] = action.payload;
      })
      .addCase(deleteLogAsync.fulfilled, (state, action) => {
        state.logs = state.logs.filter((l) => l.id !== action.payload);
      })
      .addCase(stopTimerAsync.fulfilled, (state) => {
        state.activeTimer = null;
      });
  },
});

export const { startTimer, restoreTimer, beginBreak, resumeWork, clearTimer } =
  habitSlice.actions;
export default habitSlice.reducer;
