import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import RoutineBlockModel from "@/models/Routine";
import { RoutineBlockPatch } from "@/types";

/**
 * Only these may be changed after creation. `id` and `createdAt` are identity,
 * so a client can't reassign a block or rewrite when it was made.
 */
const EDITABLE: (keyof RoutineBlockPatch)[] = [
  "habitId",
  "label",
  "startTime",
  "durationMinutes",
  "days",
];

function pickEditable(body: Record<string, unknown>): RoutineBlockPatch {
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  return patch as RoutineBlockPatch;
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

  try {
    const block = await RoutineBlockModel.findOneAndUpdate(
      { id },
      { $set: patch },
      // `runValidators` is what keeps the `HH:MM` and non-empty-days rules
      // honest on edit; without it they'd only hold at creation.
      { new: true, runValidators: true }
    );

    if (!block) {
      return NextResponse.json({ error: "Routine block not found" }, { status: 404 });
    }

    return NextResponse.json(block);
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

  // Hard delete, like a task: a routine is the plan for a day, not a record of
  // one. Hours live in `TimeLog` and are untouched by this.
  const block = await RoutineBlockModel.findOneAndDelete({ id });

  if (!block) {
    return NextResponse.json({ error: "Routine block not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Deleted", block });
}
