import mongoose, { Schema, Model } from "mongoose";
import { registerModel } from "@/lib/db";
import { Note } from "@/types";
import { MAX_NOTE_BYTES } from "@/lib/noteView";

type NoteDocument = Note & mongoose.Document;

const NoteSchema = new Schema<NoteDocument>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  // The imported file, kept verbatim so it can be re-exported or re-parsed.
  content: { type: String, default: "", maxlength: MAX_NOTE_BYTES },
  /**
   * The parsed block tree. Mixed because the shape is a discriminated union
   * that Mongoose has no way to describe — `types/notes.ts` is the schema.
   * Only ever written wholesale by the API routes, never mutated in place
   * (Mixed doesn't track in-place mutation and would silently save nothing).
   */
  // One Mixed field holding the whole array rather than an array of Mixed:
  // Mongoose then stores the tree as-is instead of trying to cast each node.
  // The factory default matters — a literal `[]` would be shared by every doc.
  blocks: { type: Schema.Types.Mixed, default: () => [] },
  excerpt: { type: String, default: "" },
  wordCount: { type: Number, default: 0 },
  tags: { type: [String], default: [] },
  // Null is a first-class value: a note need not belong to a habit.
  habitId: { type: String, default: null },
  // The folder. Null is the root, and a dangling id is impossible — deleting
  // a folder lifts its notes to the parent rather than orphaning them.
  categoryId: { type: String, default: null },
  sourceFilename: { type: String, default: null },
  pinnedAt: { type: String, default: null },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
});

NoteSchema.index({ updatedAt: -1 });
NoteSchema.index({ categoryId: 1 });

/**
 * The shelf is always read newest-first (`GET /api/notes`). Without this the
 * sort is a blocking in-memory stage, and MongoDB caps those at 32MB — with
 * `content` up to MAX_NOTE_BYTES apiece plus a block tree, a few dozen large
 * notes could exceed it and the query would fail outright, not merely slow
 * down. The projection isn't guaranteed to be pushed ahead of the sort, so
 * excluding the bodies isn't protection on its own. This makes it a bounded
 * index scan instead.
 */
NoteSchema.index({ updatedAt: -1 });

// registerModel keeps the hot-reload guard in production and rebuilds the
// schema in development, so a newly added field isn't silently dropped.
const NoteModel: Model<NoteDocument> = registerModel<NoteDocument>(
  "Note",
  NoteSchema
);

export default NoteModel;
