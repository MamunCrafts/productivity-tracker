import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HabitModel from "@/models/Habit";
import { HabitPatch } from "@/types";

/**
 * Only these may be changed after creation. `id` and `createdAt` are identity,
 * so a client can't reassign a habit or rewrite its history by posting them.
 */
const EDITABLE: (keyof HabitPatch)[] = [
  "title",
  "description",
  "totalHours",
  "perDayHours",
  "timeSlot",
  "weekFrequency",
  "totalDays",
  "color",
  "status",
  "completed",
  "completedAt",
];

function pickEditable(body: Record<string, unknown>): HabitPatch {
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  return patch as HabitPatch;
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

  const habit = await HabitModel.findOneAndUpdate(
    { id },
    { $set: patch },
    { new: true, runValidators: true }
  );

  if (!habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  return NextResponse.json(habit);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;

  // Soft delete: the habit's logs stay, so its hours survive in analytics.
  const habit = await HabitModel.findOneAndUpdate(
    { id },
    { $set: { status: "Deleted" } },
    { new: true }
  );

  if (!habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Deleted", habit });
}
