import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BookModel from "@/models/Book";
import type { Highlight } from "@/types/books";

type Context = { params: Promise<{ id: string }> };

// Validate annotation geometry before storing client selections.
function isHighlight(value: unknown): value is Highlight {
  if (!value || typeof value !== "object") return false;
  const h = value as Highlight;
  return (
    typeof h.id === "string" &&
    h.id.length <= 100 &&
    Number.isInteger(h.page) &&
    h.page > 0 &&
    h.page <= 100000 &&
    typeof h.text === "string" &&
    h.text.trim().length > 0 &&
    h.text.length <= 10000 &&
    Array.isArray(h.rectangles) &&
    h.rectangles.length > 0 &&
    h.rectangles.length <= 500 &&
    h.rectangles.every(
      (r) =>
        r &&
        [r.x, r.y, r.width, r.height].every(
          (n) =>
            typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1,
        ) &&
        r.width > 0 &&
        r.height > 0 &&
        r.x + r.width <= 1.001 &&
        r.y + r.height <= 1.001,
    )
  );
}

export async function GET(_: Request, { params }: Context) {
  await dbConnect();
  const book = await BookModel.findOne({ id: (await params).id }).lean();
  return book
    ? NextResponse.json(book)
    : NextResponse.json({ error: "Book not found." }, { status: 404 });
}

// Atomic annotation operations avoid overwriting highlights from another tab.
export async function PATCH(request: Request, { params }: Context) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }
  let update;
  if (isHighlight(body.highlight)) {
    update = { $push: { highlights: body.highlight } };
  } else if (
    typeof body.removeHighlight === "string" &&
    body.removeHighlight.length <= 100
  ) {
    update = { $pull: { highlights: { id: body.removeHighlight } } };
  } else if (
    Number.isInteger(body.currentPage) &&
    body.currentPage > 0 &&
    body.currentPage <= 100000
  ) {
    update = { $set: { currentPage: body.currentPage } };
  } else {
    return NextResponse.json(
      { error: "Invalid reading position or highlight." },
      { status: 400 },
    );
  }
  await dbConnect();
  const book = await BookModel.findOneAndUpdate(
    { id: (await params).id },
    update,
    { new: true, runValidators: true },
  );
  return book
    ? NextResponse.json(book)
    : NextResponse.json({ error: "Book not found." }, { status: 404 });
}
