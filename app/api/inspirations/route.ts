import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InspirationModel from "@/models/Inspiration";
import { readInspirationForm, serializeInspiration } from "@/lib/inspirations";

export const runtime = "nodejs";

export async function GET() {
  await dbConnect();
  const people = await InspirationModel.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(people.map(serializeInspiration));
}

export async function POST(request: Request) {
  let fields;
  try {
    fields = await readInspirationForm(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid form." }, { status: 400 });
  }
  await dbConnect();
  const person = await InspirationModel.create({
    ...fields, id: crypto.randomUUID(), createdAt: new Date().toISOString(),
  });
  return NextResponse.json(serializeInspiration(person), { status: 201 });
}
