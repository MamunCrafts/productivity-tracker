import dbConnect from "@/lib/db";
import BookModel from "@/models/Book";
import { getCloudinary } from "@/lib/cloudinary";

// Proxy private bytes through the existing sign-in guard; do not expose asset URLs.
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();
  const book = await BookModel.findOne({ id: (await params).id }).select(
    "+publicId",
  );
  if (!book)
    return Response.json({ error: "Book not found." }, { status: 404 });
  try {
    const url = getCloudinary().utils.private_download_url(book.publicId, "", {
      resource_type: "raw",
      type: "authenticated",
      expires_at: Math.floor(Date.now() / 1000) + 120,
    });
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok || !response.body) throw new Error("Download failed");
    return new Response(response.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: "Unable to load the PDF from Cloudinary." },
      { status: 502 },
    );
  }
}
