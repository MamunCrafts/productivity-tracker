import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TaskModel from "@/models/Task";
import { TaskPatch } from "@/types";

/**
 * Only these may be changed after creation. `id` and `createdAt` are identity,
 * so a client can't reassign a task or rewrite its history by posting them.
 */
const EDITABLE: (keyof TaskPatch)[] = [
  "title",
  "notes",
  "habitId",
  "status",
  "order",
  "dueDate",
  "completedAt",
];

function pickEditable(body: Record<string, unknown>): TaskPatch {
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  return patch as TaskPatch;
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
    const task = await TaskModel.findOneAndUpdate(
      { id },
      { $set: patch },
      { new: true, runValidators: true }
    );

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
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

  // Hard delete, like a time log: nothing derives from a task, so a deleted
  // one is clutter rather than history worth keeping.
  const task = await TaskModel.findOneAndDelete({ id });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Deleted", task });
}
