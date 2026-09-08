import { GetObjectCommand } from "@aws-sdk/client-s3";
import dbConnect from "@/lib/db";
import BookModel from "@/models/Book";
import { getR2 } from "@/lib/r2";

export const runtime = "nodejs";

// Proxy private bytes through the existing sign-in guard; the bucket stays unexposed.
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();
  const book = await BookModel.findOne({ id: (await params).id }).select(
    "+objectKey",
  );
  if (!book)
    return Response.json({ error: "Book not found." }, { status: 404 });
  try {
    const r2 = getR2();
    const object = await r2.client.send(
      new GetObjectCommand({ Bucket: r2.bucket, Key: book.objectKey }),
    );
    if (!object.Body) throw new Error("Download failed");
    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": "application/pdf",
        ...(object.ContentLength
          ? { "Content-Length": String(object.ContentLength) }
          : {}),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: "Unable to load the PDF from Cloudflare R2." },
      { status: 502 },
    );
  }
}
