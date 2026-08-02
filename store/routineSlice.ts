import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { RoutineBlock, RoutineBlockPatch } from "@/types";

/**
 * The routine's own slice, separate from `habit` for the same reason `task` is:
 * a block references a habit at most by id, and nothing in analytics derives
 * from one. `status` drives the shimmer, exactly as in `habit`.
 */
interface RoutineState {
  blocks: RoutineBlock[];
  status: "idle" | "loading" | "failed";
}

const initialState: RoutineState = {
  blocks: [],
  status: "idle",
};

export const fetchRoutine = createAsyncThunk("routine/fetch", async () => {
  const response = await fetch("/api/routines");
  if (!response.ok) throw new Error("Could not load the routine");
  return (await response.json()) as RoutineBlock[];
});

export type NewRoutineBlock = Omit<RoutineBlock, "id" | "createdAt">;

export const createRoutineBlock = createAsyncThunk(
  "routine/create",
  async (input: NewRoutineBlock) => {
    // Client-generated id, matching every other model here — `_id` is never
    // used for lookup.
    const block: RoutineBlock = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };

    const response = await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(block),
    });
    if (!response.ok) throw new Error("Could not add the block");
    return (await response.json()) as RoutineBlock;
  }
);

export const updateRoutineBlock = createAsyncThunk(
  "routine/update",
  async ({ id, patch }: { id: string; patch: RoutineBlockPatch }) => {
    const response = await fetch(`/api/routines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) throw new Error("Could not update the block");
    return (await response.json()) as RoutineBlock;
  }
);

export const deleteRoutineBlock = createAsyncThunk(
  "routine/delete",
  async (id: string) => {
    const response = await fetch(`/api/routines/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Could not delete the block");
    return id;
  }
);

export const routineSlice = createSlice({
  name: "routine",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoutine.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchRoutine.fulfilled, (state, action) => {
        state.blocks = action.payload;
        state.status = "idle";
      })
      .addCase(fetchRoutine.rejected, (state) => {
        state.status = "failed";
      })
      .addCase(createRoutineBlock.fulfilled, (state, action) => {
        state.blocks.push(action.payload);
      })
      .addCase(updateRoutineBlock.fulfilled, (state, action) => {
        const index = state.blocks.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) state.blocks[index] = action.payload;
      })
      .addCase(deleteRoutineBlock.fulfilled, (state, action) => {
        state.blocks = state.blocks.filter((b) => b.id !== action.payload);
      });
  },
});

export default routineSlice.reducer;
