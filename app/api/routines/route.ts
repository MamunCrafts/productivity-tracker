import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import RoutineBlockModel from "@/models/Routine";

/**
 * The whole routine, sorted the way a day runs.
 *
 * Everything is returned rather than only the blocks for today: the page shows
 * two days at once and the editor shows all seven, so a per-day filter here
 * would just mean three requests for one screen. `startTime` is `HH:MM`, so
 * sorting it as a string is sorting it as a time.
 */
export async function GET() {
  await dbConnect();
  const blocks = await RoutineBlockModel.find().sort({ startTime: 1 }).lean();
  return NextResponse.json(blocks);
}

export async function POST(request: Request) {
  await dbConnect();
  const body = await request.json();

  try {
    const block = await RoutineBlockModel.create(body);
    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
