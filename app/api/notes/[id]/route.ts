import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import NoteModel from "@/models/Note";
import { NotePatch } from "@/types";
import { parseNote } from "@/lib/markdown";
import { MAX_NOTE_BYTES } from "@/lib/noteView";

/**
 * Only these may be changed after creation. `blocks`, `excerpt` and
 * `wordCount` are absent on purpose — they are recomputed from `content`
 * below, so there is no way for a client to put the two out of step.
 */
const EDITABLE: (keyof NotePatch)[] = [
  "title",
  "content",
  "tags",
  "habitId",
  "categoryId",
  "pinnedAt",
];

function pickEditable(body: Record<string, unknown>): NotePatch {
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  return patch as NotePatch;
}

/** The full note, body included — this is what opening one costs. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;

  const note = await NoteModel.findOne({ id });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json(note);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;
  const patch = pickEditable(await request.json());

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No editable fields provided" },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  // Editing the markdown re-derives everything downstream of it. Assigning a
  // fresh array matters: Mixed doesn't track in-place mutation.
  if (typeof patch.content === "string") {
    if (patch.content.length > MAX_NOTE_BYTES) {
      return NextResponse.json({ error: "Note is too large" }, { status: 413 });
    }
    const derived = parseNote(patch.content);
    update.blocks = derived.blocks;
    update.excerpt = derived.excerpt;
    update.wordCount = derived.wordCount;
    // A title the client sent explicitly still wins over the inferred one.
    if (patch.title === undefined) update.title = derived.title;
  }

  try {
    const note = await NoteModel.findOneAndUpdate(
      { id },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(note);
  } catch (error) {
    // A schema violation is the client's mistake, not a server fault.
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;

  // Hard delete, like a task: no total anywhere derives from a note, so a
  // deleted one is clutter rather than history worth preserving.
  const note = await NoteModel.findOneAndDelete({ id });

  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Deleted", id });
}
