import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TaskModel from "@/models/Task";

/**
 * The whole board, ordered the way it is drawn. Tasks are hard-deleted, so
 * unlike habits there is no status to filter out here.
 */
export async function GET() {
  await dbConnect();
  const tasks = await TaskModel.find().sort({ order: 1 });
  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  await dbConnect();
  const body = await request.json();

  try {
    const task = await TaskModel.create(body);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
