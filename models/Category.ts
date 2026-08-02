import mongoose, { Schema, Model } from "mongoose";
import { registerModel } from "@/lib/db";
import { Category } from "@/types";

type CategoryDocument = Category & mongoose.Document;

const CategorySchema = new Schema<CategoryDocument>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  // Null is the root. Stored flat and walked into a tree on read — see lib/tree.ts.
  parentId: { type: String, default: null },
  createdAt: { type: String, required: true },
});

CategorySchema.index({ name: 1 });
CategorySchema.index({ parentId: 1 });

// registerModel keeps the hot-reload guard in production and rebuilds the
// schema in development, so a newly added field isn't silently dropped.
const CategoryModel: Model<CategoryDocument> = registerModel<CategoryDocument>(
  "Category",
  CategorySchema
);

export default CategoryModel;
