import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TimeLogModel from "@/models/TimeLog";
import { TimeLogPatch } from "@/types";

const EDITABLE: (keyof TimeLogPatch)[] = [
  "durationSeconds",
  "date",
  "note",
  "focusRating",
];

function pickEditable(body: Record<string, unknown>): TimeLogPatch {
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  return patch as TimeLogPatch;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;
  const patch = pickEditable(await request.json());

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  if (patch.durationSeconds !== undefined && patch.durationSeconds <= 0) {
    return NextResponse.json(
      { error: "durationSeconds must be greater than 0" },
      { status: 400 }
    );
  }

  const log = await TimeLogModel.findOneAndUpdate(
    { id },
    { $set: patch },
    { new: true, runValidators: true }
  );

  if (!log) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  return NextResponse.json(log);
}

/**
 * Hard delete, unlike habits. A mistyped session is bad data rather than
 * history worth keeping, and leaving it would skew every total on the page.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;

  const log = await TimeLogModel.findOneAndDelete({ id });

  if (!log) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Deleted", id });
}
