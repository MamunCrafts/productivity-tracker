import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InspirationModel from "@/models/Inspiration";
import { readInspirationForm, serializeInspiration } from "@/lib/inspirations";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  await dbConnect();
  const { id } = await params;
  const existing = await InspirationModel.findOne({ id }).select("+profilePicture.data +gallery.data").lean();
  if (!existing) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  let fields;
  try {
    fields = await readInspirationForm(request, existing);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid form." }, { status: 400 });
  }
  const person = await InspirationModel.findOneAndUpdate({ id }, { $set: fields }, { new: true, runValidators: true });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  return NextResponse.json(serializeInspiration(person));
}

export async function DELETE(_: Request, { params }: Context) {
  await dbConnect();
  const { id } = await params;
  const person = await InspirationModel.findOneAndDelete({ id });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  return NextResponse.json({ id });
}
