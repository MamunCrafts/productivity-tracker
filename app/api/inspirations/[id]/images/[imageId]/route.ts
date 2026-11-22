import dbConnect from "@/lib/db";
import InspirationModel from "@/models/Inspiration";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const { id, imageId } = await params;
  await dbConnect();
  const person = await InspirationModel.findOne({ id }).select("profilePicture gallery +profilePicture.data +gallery.data");
  const image = person?.profilePicture?.id === imageId
    ? person.profilePicture : person?.gallery.find((item) => item.id === imageId);
  if (!image) return new Response("Image not found", { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
