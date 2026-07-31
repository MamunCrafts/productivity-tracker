import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HabitModel from "@/models/Habit";

/**
 * Returns everything that isn't soft-deleted — Active and Paused both belong on
 * the client, which decides how to group them.
 */
export async function GET() {
  await dbConnect();
  const habits = await HabitModel.find({ status: { $ne: "Deleted" } });
  return NextResponse.json(habits);
}

export async function POST(request: Request) {
  await dbConnect();
  const body = await request.json();
  const habit = await HabitModel.create(body);
  return NextResponse.json(habit, { status: 201 });
}
