import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getCloudinary, getCloudinaryUploadError } from "@/lib/cloudinary";
import BookModel from "@/models/Book";
import CategoryModel from "@/models/Category";
import type { UploadApiResponse } from "cloudinary";

export const runtime = "nodejs";
// Larger PDFs need more time to reach Cloudinary.
export const maxDuration = 300;
const MAX_BYTES = 100 * 1024 * 1024;

// The library index omits annotation bodies and Cloudinary identifiers.
export async function GET() {
  await dbConnect();
  return NextResponse.json(
    await BookModel.find().select("-highlights").sort({ createdAt: -1 }).lean(),
  );
}

// Validate before uploading; remove the asset if saving its record fails.
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_BYTES + 65536) {
    return NextResponse.json(
      { error: "Choose a PDF up to 100 MB." },
      { status: 413 },
    );
  }
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "Invalid upload form." },
      { status: 400 },
    );
  }
  const file = form.get("file");
  const title = String(form.get("title") || "").trim();
  const categoryId = String(form.get("categoryId") || "") || null;
  if (
    !(file instanceof File) ||
    !file.size ||
    file.size > MAX_BYTES ||
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return NextResponse.json(
      { error: "Choose a PDF up to 100 MB." },
      { status: 400 },
    );
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (
    !buffer.subarray(0, 1024).includes(Buffer.from("%PDF-")) ||
    title.length > 200
  ) {
    return NextResponse.json(
      { error: "Invalid PDF or title longer than 200 characters." },
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
  let cloud;
  try {
    cloud = getCloudinary();
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 503 },
    );
  }
  const id = crypto.randomUUID();
  let uploaded: UploadApiResponse;
  try {
    uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloud.uploader
        .upload_stream(
          {
            timeout: 300000,
            resource_type: "raw",
            type: "authenticated",
            public_id: `productivity-books/${id}.pdf`,
          },
          (error, result) => {
            if (error || !result) reject(error || new Error("Upload failed"));
            else resolve(result);
          },
        )
        .end(buffer);
    });
  } catch (error) {
    const failure = getCloudinaryUploadError(error);
    return NextResponse.json(
      { error: failure.message },
      { status: failure.status },
    );
  }
  try {
    await BookModel.create({
      id,
      title: title || file.name.replace(/\.pdf$/i, "").slice(0, 200),
      categoryId,
      publicId: uploaded.public_id,
      sourceFilename: file.name,
      bytes: file.size,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    await cloud.uploader
      .destroy(uploaded.public_id, {
        resource_type: "raw",
        type: "authenticated",
      })
      .catch(() => console.error("Unable to clean up PDF upload", id));
    throw error;
  }
}
