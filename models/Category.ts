import mongoose, { Schema, Model } from "mongoose";
import { Category } from "@/types";

type CategoryDocument = Category & mongoose.Document;

const CategorySchema = new Schema<CategoryDocument>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  // Null is the root. Stored flat and walked into a tree on read — see lib/tree.ts.
  parentId: { type: String, default: null },
  createdAt: { type: String, required: true },
});

// Check if model already exists to prevent overwrite error in hot reload
const CategoryModel: Model<CategoryDocument> =
  mongoose.models.Category ||
  mongoose.model<CategoryDocument>("Category", CategorySchema);

export default CategoryModel;
