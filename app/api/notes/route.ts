import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import NoteModel from "@/models/Note";
import { parseNote } from "@/lib/markdown";
import { MAX_NOTE_BYTES } from "@/lib/noteView";

/**
 * The index, without the bodies.
 *
 * This is the one collection the app does not pull whole into Redux: fifty
 * notes of markdown plus their block trees is megabytes, and it would be
 * fetched on every route. Bodies come from `/api/notes/[id]` on open.
 */
export async function GET() {
  await dbConnect();
  const notes = await NoteModel.find()
    .select("-content -blocks")
    .sort({ updatedAt: -1 })
    .lean();
  return NextResponse.json(notes);
}

export async function POST(request: Request) {
  await dbConnect();
  const body = await request.json();

  const content = typeof body.content === "string" ? body.content : "";
  if (content.length > MAX_NOTE_BYTES) {
    return NextResponse.json(
      { error: "Note is too large to import" },
      { status: 413 }
    );
  }

  // Derived server-side, always. A client can send `content` and a title it
  // prefers; it can't send blocks, excerpt or a word count, so the parsed
  // tree can never disagree with the markdown it came from.
  const derived = parseNote(content, body.sourceFilename);
  const now = new Date().toISOString();

  try {
    const note = await NoteModel.create({
      id: body.id ?? crypto.randomUUID(),
      habitId: body.habitId ?? null,
      categoryId: body.categoryId ?? null,
      sourceFilename: body.sourceFilename ?? null,
      pinnedAt: null,
      createdAt: now,
      updatedAt: now,
      ...derived,
      // A title typed on the import screen beats the one inferred from the file.
      title: typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : derived.title,
      tags: Array.isArray(body.tags) ? body.tags : derived.tags,
      content,
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
