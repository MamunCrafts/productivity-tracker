import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CategoryModel from "@/models/Category";

/**
 * The whole folder table, flat. The tree is assembled client-side by
 * `lib/tree.ts` — there are never enough folders for that to be worth a
 * server-side walk, and a flat list is what a move needs to validate against.
 */
export async function GET() {
  await dbConnect();
  const categories = await CategoryModel.find().sort({ name: 1 });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  await dbConnect();
  const body = await request.json();

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "A folder needs a name" }, { status: 400 });
  }

  // A parent that doesn't exist would orphan the folder on arrival.
  if (body.parentId) {
    const parent = await CategoryModel.findOne({ id: body.parentId });
    if (!parent) {
      return NextResponse.json({ error: "Parent folder not found" }, { status: 400 });
    }
  }

  try {
    const category = await CategoryModel.create({
      id: body.id ?? crypto.randomUUID(),
      name,
      parentId: body.parentId ?? null,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
