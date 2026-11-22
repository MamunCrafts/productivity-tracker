import { LIFE_STAGES, MAX_GALLERY_IMAGES, MAX_IMAGE_BYTES } from "@/types/inspirations";
import type { Inspiration, LifeStage } from "@/types/inspirations";
import type { InspirationImage, StoredInspiration } from "@/models/Inspiration";

export function serializeInspiration(
  person: Omit<StoredInspiration, "stage"> & { stage: LifeStage | LifeStage[] },
): Inspiration {
  const imageUrl = (id: string) => `/api/inspirations/${person.id}/images/${id}`;
  return {
    id: person.id,
    name: person.name,
    // Existing documents may still contain the original single stage.
    stage: Array.isArray(person.stage) ? person.stage : [person.stage],
    description: person.description,
    text: person.text,
    profilePicture: person.profilePicture ? imageUrl(person.profilePicture.id) : null,
    gallery: person.gallery.map((image) => imageUrl(image.id)),
    createdAt: person.createdAt,
  };
}

async function readImage(file: File): Promise<InspirationImage> {
  if (!file.size || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Each image must be up to 1 MB.");
  }
  const data = Buffer.from(await file.arrayBuffer());
  let contentType: string;
  if (data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    contentType = "image/jpeg";
  } else if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    contentType = "image/png";
  } else if (data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") {
    contentType = "image/webp";
  } else {
    throw new Error("Choose JPEG, PNG, or WebP images.");
  }
  return { id: crypto.randomUUID(), contentType, data };
}

// A complete form keeps text and image changes in one atomic document write.
export async function readInspirationForm(request: Request, existing?: StoredInspiration) {
  if (Number(request.headers.get("content-length")) > 10 * MAX_IMAGE_BYTES) {
    throw new Error("The upload is too large. Use images up to 1 MB each.");
  }
  const form = await request.formData();
  const name = String(form.get("name") || "").trim();
  const description = String(form.get("description") || "").trim();
  const text = String(form.get("text") || "").trim();
  const selectedStages = form.getAll("stage");
  if (!name || name.length > 100 || !description || description.length > 1000 || !text || text.length > 2000) {
    throw new Error("Provide a name (up to 100 characters), description (1,000), and motivation (2,000).");
  }
  if (!selectedStages.length || selectedStages.some((stage) => !LIFE_STAGES.includes(stage as LifeStage))) {
    throw new Error("Choose at least one valid life stage.");
  }
  const stages = LIFE_STAGES.filter((stage) => selectedStages.includes(stage));
  const retainedIds = form.getAll("retainedGallery").map(String);
  const gallery = existing?.gallery.filter((image) => retainedIds.includes(image.id)) ?? [];
  const files = form.getAll("gallery").filter((value): value is File => value instanceof File && value.size > 0);
  if (gallery.length + files.length > MAX_GALLERY_IMAGES) {
    throw new Error(`Choose up to ${MAX_GALLERY_IMAGES} gallery images.`);
  }
  const profile = form.get("profilePicture");
  const profilePicture = profile instanceof File && profile.size > 0
    ? await readImage(profile)
    : form.get("removeProfile") === "true" ? null : existing?.profilePicture ?? null;
  return {
    name, description, text, stage: stages, profilePicture,
    gallery: [...gallery, ...await Promise.all(files.map(readImage))],
  };
}
