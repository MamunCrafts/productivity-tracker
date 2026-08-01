import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { Category, CategoryPatch, Note, NoteMeta, NotePatch } from "@/types";

/**
 * Notes are the one collection not held whole in the store. `notes` carries
 * every note's metadata — enough to draw the index — while `bodies` is a
 * lazy cache of the ones that have actually been opened, so re-reading a
 * note you looked at a minute ago costs nothing.
 */
interface NoteState {
  notes: NoteMeta[];
  bodies: Record<string, Note>;
  /** Flat; `lib/tree.ts` walks it into the folder tree at render time. */
  categories: Category[];
  status: "idle" | "loading" | "failed";
  /** ids with a body request in flight, so the reader can show a skeleton. */
  loadingBodies: string[];
}

const initialState: NoteState = {
  notes: [],
  bodies: {},
  categories: [],
  status: "idle",
  loadingBodies: [],
};

function toMeta(note: Note): NoteMeta {
  // The rest pattern is the point: it strips the body off a full note.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { content, blocks, ...meta } = note;
  return meta;
}

/**
 * Pinned notes first, most recently pinned at the very top; everything else
 * by recency of edit. Same rule as habits, for the same reason: pinning is
 * "keep this where I can see it", which only means anything if the newest
 * pin wins.
 */
export function sortNotes<T extends NoteMeta>(notes: T[]): T[] {
  return [...notes].sort((a, b) => {
    if (a.pinnedAt && b.pinnedAt) return b.pinnedAt.localeCompare(a.pinnedAt);
    if (a.pinnedAt) return -1;
    if (b.pinnedAt) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export const fetchNotes = createAsyncThunk("note/fetchNotes", async () => {
  const response = await fetch("/api/notes");
  if (!response.ok) throw new Error("Could not load notes");
  return (await response.json()) as NoteMeta[];
});

/** The body of a single note, fetched when it's opened. */
export const fetchNote = createAsyncThunk("note/fetchNote", async (id: string) => {
  const response = await fetch(`/api/notes/${id}`);
  if (!response.ok) throw new Error("Could not load note");
  return (await response.json()) as Note;
});

export interface NewNoteInput {
  title: string;
  content: string;
  tags: string[];
  habitId: string | null;
  categoryId: string | null;
  sourceFilename: string | null;
}

export const createNote = createAsyncThunk(
  "note/createNote",
  async (input: NewNoteInput) => {
    // The id is client-generated like every other entity here; blocks and
    // counts are deliberately not sent — the server derives those.
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: crypto.randomUUID(), ...input }),
    });
    if (!response.ok) throw new Error("Could not save note");
    return (await response.json()) as Note;
  }
);

export const updateNoteAsync = createAsyncThunk(
  "note/updateNote",
  async ({ id, patch }: { id: string; patch: NotePatch }) => {
    const response = await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) throw new Error("Could not update note");
    return (await response.json()) as Note;
  }
);

export const deleteNoteAsync = createAsyncThunk(
  "note/deleteNote",
  async (id: string) => {
    const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Could not delete note");
    return id;
  }
);

/* ------------------------------------------------------------------ *
 * Folders
 * ------------------------------------------------------------------ */

export const fetchCategories = createAsyncThunk(
  "note/fetchCategories",
  async () => {
    const response = await fetch("/api/categories");
    if (!response.ok) throw new Error("Could not load folders");
    return (await response.json()) as Category[];
  }
);

export const createCategory = createAsyncThunk(
  "note/createCategory",
  async (input: { name: string; parentId: string | null }) => {
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: crypto.randomUUID(), ...input }),
    });
    if (!response.ok) throw new Error("Could not create folder");
    return (await response.json()) as Category;
  }
);

export const updateCategoryAsync = createAsyncThunk(
  "note/updateCategory",
  async ({ id, patch }: { id: string; patch: CategoryPatch }) => {
    const response = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? "Could not update folder");
    }
    return (await response.json()) as Category;
  }
);

/**
 * Deleting a folder lifts its children and notes to its parent rather than
 * removing them, so the local store has to re-home the same rows the server
 * just moved — hence `movedTo` in the response.
 */
export const deleteCategoryAsync = createAsyncThunk(
  "note/deleteCategory",
  async (id: string) => {
    const response = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Could not delete folder");
    return (await response.json()) as { id: string; movedTo: string | null };
  }
);

/** A note arriving whole updates both halves of the store at once. */
function absorb(state: NoteState, note: Note) {
  state.bodies[note.id] = note;
  const meta = toMeta(note);
  const index = state.notes.findIndex((n) => n.id === note.id);
  if (index === -1) state.notes.push(meta);
  else state.notes[index] = meta;
}

export const noteSlice = createSlice({
  name: "note",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotes.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.notes = action.payload;
        state.status = "idle";
      })
      .addCase(fetchNotes.rejected, (state) => {
        state.status = "failed";
      })
      .addCase(fetchNote.pending, (state, action) => {
        state.loadingBodies.push(action.meta.arg);
      })
      .addCase(fetchNote.fulfilled, (state, action) => {
        state.loadingBodies = state.loadingBodies.filter(
          (id) => id !== action.payload.id
        );
        absorb(state, action.payload);
      })
      .addCase(fetchNote.rejected, (state, action) => {
        state.loadingBodies = state.loadingBodies.filter(
          (id) => id !== action.meta.arg
        );
      })
      .addCase(createNote.fulfilled, (state, action) => {
        absorb(state, action.payload);
      })
      .addCase(updateNoteAsync.fulfilled, (state, action) => {
        absorb(state, action.payload);
      })
      .addCase(deleteNoteAsync.fulfilled, (state, action) => {
        state.notes = state.notes.filter((n) => n.id !== action.payload);
        delete state.bodies[action.payload];
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload);
      })
      .addCase(updateCategoryAsync.fulfilled, (state, action) => {
        const index = state.categories.findIndex(
          (c) => c.id === action.payload.id
        );
        if (index !== -1) state.categories[index] = action.payload;
      })
      .addCase(deleteCategoryAsync.fulfilled, (state, action) => {
        const { id, movedTo } = action.payload;
        state.categories = state.categories
          .filter((c) => c.id !== id)
          .map((c) => (c.parentId === id ? { ...c, parentId: movedTo } : c));
        for (const note of state.notes) {
          if (note.categoryId === id) note.categoryId = movedTo;
        }
        for (const body of Object.values(state.bodies)) {
          if (body.categoryId === id) body.categoryId = movedTo;
        }
      });
  },
});

export default noteSlice.reducer;
