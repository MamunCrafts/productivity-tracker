import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { Task, TaskPatch, TaskStatus } from "@/types";
import { RootState } from "./store";

/**
 * The Kanban board's own slice. It is deliberately separate from `habit`:
 * tasks reference a habit at most by id, and nothing in analytics derives
 * from them.
 */
interface TaskState {
  tasks: Task[];
  status: "idle" | "loading" | "failed";
}

const initialState: TaskState = {
  tasks: [],
  status: "idle",
};

export const fetchTasks = createAsyncThunk("task/fetchTasks", async () => {
  const response = await fetch("/api/tasks");
  return (await response.json()) as Task[];
});

export type NewTaskInput = Omit<
  Task,
  "id" | "createdAt" | "completedAt" | "order"
> & { order?: number };

export const createTask = createAsyncThunk(
  "task/createTask",
  async (input: NewTaskInput, { getState }) => {
    const state = getState() as RootState;
    // New cards land at the top of their column, where they'll be seen.
    const lowest = Math.min(
      0,
      ...state.task.tasks
        .filter((t) => t.status === input.status)
        .map((t) => t.order)
    );

    const newTask: Task = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      completedAt: input.status === "Done" ? new Date().toISOString() : null,
      order: lowest - 1,
      ...input,
    };

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    });
    if (!response.ok) throw new Error("Could not create task");
    return (await response.json()) as Task;
  }
);

export const updateTaskAsync = createAsyncThunk(
  "task/updateTask",
  async ({ id, patch }: { id: string; patch: TaskPatch }) => {
    const response = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) throw new Error("Could not update task");
    return (await response.json()) as Task;
  }
);

export const deleteTaskAsync = createAsyncThunk(
  "task/deleteTask",
  async (id: string) => {
    const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Could not delete task");
    return id;
  }
);

export interface TaskMove {
  id: string;
  status: TaskStatus;
  order: number;
}

/**
 * A drop has to land instantly — a card that snaps back to its old column
 * while a request is in flight reads as a failed drag. So the move is applied
 * locally first and rolled back if the write fails.
 */
export const moveTaskAsync = createAsyncThunk(
  "task/moveTask",
  async ({ id, status, order }: TaskMove, { getState, dispatch }) => {
    const before = (getState() as RootState).task.tasks.find((t) => t.id === id);
    if (!before) throw new Error("Task not found");

    // Entering Done stamps the finish time; leaving it clears the stamp.
    const completedAt =
      status === "Done"
        ? before.completedAt ?? new Date().toISOString()
        : null;

    dispatch(applyMove({ id, status, order, completedAt }));

    const response = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, order, completedAt }),
    });

    if (!response.ok) {
      dispatch(
        applyMove({
          id,
          status: before.status,
          order: before.order,
          completedAt: before.completedAt,
        })
      );
      throw new Error("Could not move task");
    }

    return (await response.json()) as Task;
  }
);

export const taskSlice = createSlice({
  name: "task",
  initialState,
  reducers: {
    /** Local half of a drag. Always paired with a write in `moveTaskAsync`. */
    applyMove: (
      state,
      action: PayloadAction<TaskMove & { completedAt: string | null }>
    ) => {
      const task = state.tasks.find((t) => t.id === action.payload.id);
      if (!task) return;
      task.status = action.payload.status;
      task.order = action.payload.order;
      task.completedAt = action.payload.completedAt;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.tasks = action.payload;
        state.status = "idle";
      })
      .addCase(fetchTasks.rejected, (state) => {
        state.status = "failed";
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.push(action.payload);
      })
      .addCase(updateTaskAsync.fulfilled, (state, action) => {
        const index = state.tasks.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) state.tasks[index] = action.payload;
      })
      .addCase(moveTaskAsync.fulfilled, (state, action) => {
        const index = state.tasks.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) state.tasks[index] = action.payload;
      })
      .addCase(deleteTaskAsync.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter((t) => t.id !== action.payload);
      });
  },
});

export const { applyMove } = taskSlice.actions;
export default taskSlice.reducer;
