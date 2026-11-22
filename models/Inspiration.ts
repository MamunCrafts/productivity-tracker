import { Schema } from "mongoose";
import { registerModel } from "@/lib/db";
import { LIFE_STAGES } from "@/types/inspirations";
import type { Inspiration } from "@/types/inspirations";

export interface InspirationImage {
  id: string;
  contentType: string;
  data: Buffer;
}

export type StoredInspiration = Omit<Inspiration, "profilePicture" | "gallery"> & {
  profilePicture: InspirationImage | null;
  gallery: InspirationImage[];
};

const imageSchema = new Schema<InspirationImage>({
  id: { type: String, required: true },
  contentType: { type: String, required: true },
  data: { type: Buffer, required: true, select: false },
}, { _id: false });

const inspirationSchema = new Schema<StoredInspiration>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, maxlength: 100 },
  stage: { type: String, enum: LIFE_STAGES, required: true },
  description: { type: String, required: true, maxlength: 1000 },
  text: { type: String, required: true, maxlength: 2000 },
  profilePicture: { type: imageSchema, default: null },
  gallery: { type: [imageSchema], default: [] },
  createdAt: { type: String, required: true },
});

export default registerModel("Inspiration", inspirationSchema);
