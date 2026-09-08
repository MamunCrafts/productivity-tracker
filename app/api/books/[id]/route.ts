import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import dbConnect from "@/lib/db";
import BookModel from "@/models/Book";
import CategoryModel from "@/models/Category";
import { isHighlightColor } from "@/lib/highlights";
import { isInkStroke } from "@/lib/bookInk";
import { bookCoverKey, getR2, getR2UploadError } from "@/lib/r2";
import type { Highlight } from "@/types/books";

// The AWS SDK signs with node crypto, so this route cannot run on the edge.
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/**
 * What a client may rewrite, the way every other `PATCH` in this app declares
 * it. Everything else on a book is either derived (`bytes`, `sourceFilename`),
 * a storage key it must never see (`objectKey`), or has an operation of its own
 * below (`highlights`, `currentPage`).
 */
const EDITABLE = ["title", "categoryId"] as const;

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
    // Optional: a client that predates the picker sends no colour, and the
    // schema default covers it. Anything present has to be a palette key.
    (h.color === undefined || isHighlightColor(h.color)) &&
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
  // Positional filters, so recolouring one mark leaves the rest of the array —
  // and any highlight another tab has added since — exactly as it is.
  let arrayFilters: Record<string, unknown>[] | undefined;
  if ("stroke" in body || "removeStroke" in body) {
    if (isInkStroke(body.stroke)) {
      // Retrying a save cannot duplicate a stroke with the same geometry/id.
      update = { $addToSet: { strokes: body.stroke } };
    } else if (typeof body.removeStroke === "string" && body.removeStroke.length > 0 && body.removeStroke.length <= 100) {
      update = { $pull: { strokes: { id: body.removeStroke } } };
    } else {
      return NextResponse.json({ error: "Invalid ink annotation." }, { status: 400 });
    }
  } else if (isHighlight(body.highlight)) {
    update = { $push: { highlights: body.highlight } };
  } else if (
    body.recolor &&
    typeof body.recolor === "object" &&
    typeof body.recolor.id === "string" &&
    body.recolor.id.length <= 100 &&
    isHighlightColor(body.recolor.color)
  ) {
    update = { $set: { "highlights.$[mark].color": body.recolor.color } };
    arrayFilters = [{ "mark.id": body.recolor.id }];
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
  } else if (EDITABLE.some((field) => field in body)) {
    // A partial edit: only the fields actually sent are written, so renaming a
    // book cannot silently clear its category.
    const set: Record<string, unknown> = {};
    if ("title" in body) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title || title.length > 200) {
        return NextResponse.json(
          { error: "Give the book a title of 1 to 200 characters." },
          { status: 400 },
        );
      }
      set.title = title;
    }
    if ("categoryId" in body) {
      // "" and null both mean uncategorized — the picker sends one, a cleared
      // form field sends the other.
      const categoryId = body.categoryId || null;
      if (
        categoryId !== null &&
        (typeof categoryId !== "string" || categoryId.length > 100)
      ) {
        return NextResponse.json(
          { error: "Invalid category." },
          { status: 400 },
        );
      }
      await dbConnect();
      if (categoryId && !(await CategoryModel.exists({ id: categoryId }))) {
        return NextResponse.json(
          { error: "Category no longer exists." },
          { status: 400 },
        );
      }
      set.categoryId = categoryId;
    }
    update = { $set: set };
  } else {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  await dbConnect();
  const book = await BookModel.findOneAndUpdate(
    { id: (await params).id },
    update,
    { new: true, runValidators: true, arrayFilters },
  );
  return book
    ? NextResponse.json(book)
    : NextResponse.json({ error: "Book not found." }, { status: 404 });
}

/**
 * A permanent delete, and the only one in the app that spans two stores: the
 * record in Mongo and the PDF object in R2. Highlights are embedded in the
 * record, so they go with it — nothing about a book feeds analytics, which is
 * what makes a hard delete right here where a habit gets a soft one.
 *
 * **The object goes first, and that order is the whole design.** If R2 fails,
 * nothing is deleted and the reader can try again. If the record's delete were
 * to fail after the object was already gone, the row is still visible and still
 * deletable — and `DeleteObject` is idempotent, so the retry succeeds. The
 * reverse order risks the one outcome with no way back: an object with no row
 * pointing at it, unreachable from the app and billed for forever.
 */
export async function DELETE(_: Request, { params }: Context) {
  await dbConnect();
  const id = (await params).id;
  const book = await BookModel.findOne({ id }).select("+objectKey");
  if (!book)
    return NextResponse.json({ error: "Book not found." }, { status: 404 });

  let r2;
  try {
    r2 = getR2();
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 503 },
    );
  }
  try {
    // Both objects, and the PDF first: a cover left behind is a thumbnail,
    // while a PDF left behind is the whole file. `DeleteObject` on a key that
    // was never written succeeds, so a book with no cover needs no branch.
    await r2.client.send(
      new DeleteObjectCommand({ Bucket: r2.bucket, Key: book.objectKey }),
    );
    await r2.client.send(
      new DeleteObjectCommand({ Bucket: r2.bucket, Key: bookCoverKey(id) }),
    );
  } catch (error) {
    // The 503s are about configuration and credentials, which read the same
    // whichever way the bytes were moving; the rest are phrased for a save, so
    // only the status carries over.
    const failure = getR2UploadError(error);
    return NextResponse.json(
      {
        error:
          failure.status === 503
            ? failure.message
            : "Cloudflare R2 could not delete this PDF, so the book was kept. Try again.",
      },
      { status: failure.status },
    );
  }
  await BookModel.deleteOne({ id });
  return NextResponse.json({ id });
}
