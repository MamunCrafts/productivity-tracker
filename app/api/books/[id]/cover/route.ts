import { NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import dbConnect from "@/lib/db";
import BookModel from "@/models/Book";
import { bookCoverKey, getR2, getR2UploadError } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * The cover is page 1, rendered to a JPEG **by the reader, in the browser**,
 * and this route is only its storage.
 *
 * Rendering it on the server was the obvious alternative and is the wrong
 * trade: pdf.js needs a canvas implementation to rasterize a page, which means
 * a native dependency in the deployment for a decorative thumbnail. The reader
 * already has the PDF open, the worker warm and the page rasterized — so the
 * one client that has done the work anyway is the one that uploads it. That is
 * also what makes books uploaded before covers existed pick one up on their
 * next open, with no backfill to run.
 */
const MAX_COVER_BYTES = 1024 * 1024;

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  await dbConnect();
  const id = (await params).id;
  const book = await BookModel.findOne({ id }).select("hasCover").lean();
  if (!book?.hasCover)
    return NextResponse.json({ error: "No cover." }, { status: 404 });
  try {
    const r2 = getR2();
    const object = await r2.client.send(
      new GetObjectCommand({ Bucket: r2.bucket, Key: bookCoverKey(id) }),
    );
    if (!object.Body) throw new Error("Download failed");
    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": "image/jpeg",
        ...(object.ContentLength
          ? { "Content-Length": String(object.ContentLength) }
          : {}),
        // Private, like the PDF it came from — the shelf is behind the same
        // sign-in gate. A day, rather than immutable: the key is stable for the
        // life of the book, so a re-rendered cover has to be able to win.
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load the cover from Cloudflare R2." },
      { status: 502 },
    );
  }
}

// One addressable object, replaced whole — hence PUT rather than POST.
export async function PUT(request: Request, { params }: Context) {
  if (Number(request.headers.get("content-length")) > MAX_COVER_BYTES) {
    return NextResponse.json({ error: "Cover too large." }, { status: 413 });
  }
  const body = Buffer.from(await request.arrayBuffer());
  // Trust the bytes, not the header: a JPEG starts FF D8 FF, and this is the
  // one route in the app that writes a file the browser will later render.
  if (
    !body.byteLength ||
    body.byteLength > MAX_COVER_BYTES ||
    body[0] !== 0xff ||
    body[1] !== 0xd8 ||
    body[2] !== 0xff
  ) {
    return NextResponse.json(
      { error: "Send a JPEG cover of up to 1 MB." },
      { status: 400 },
    );
  }
  await dbConnect();
  const id = (await params).id;
  if (!(await BookModel.exists({ id })))
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
    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: bookCoverKey(id),
        Body: body,
        ContentLength: body.byteLength,
        ContentType: "image/jpeg",
      }),
    );
  } catch (error) {
    const failure = getR2UploadError(error);
    return NextResponse.json(
      { error: failure.message },
      { status: failure.status },
    );
  }
  // Flagged only after the object is there, so `hasCover` can never promise a
  // cover the shelf would then fail to load.
  await BookModel.updateOne({ id }, { $set: { hasCover: true } });
  return NextResponse.json({ id });
}
