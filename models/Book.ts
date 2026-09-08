import { Schema } from "mongoose";
import { registerModel } from "@/lib/db";
import type { Book } from "@/types/books";

// Store annotations independently of the immutable PDF object in R2.
const rectangleSchema = new Schema(
  {
    x: Number,
    y: Number,
    width: Number,
    height: Number,
  },
  { _id: false },
);
const highlightSchema = new Schema(
  {
    id: { type: String, required: true },
    page: { type: Number, required: true },
    text: { type: String, required: true },
    rectangles: [rectangleSchema],
  },
  { _id: false },
);

const bookSchema = new Schema<Book & { objectKey: string }>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true, maxlength: 200 },
  categoryId: { type: String, default: null, index: true },
  objectKey: { type: String, required: true, select: false },
  sourceFilename: { type: String, required: true },
  bytes: { type: Number, required: true },
  currentPage: { type: Number, default: 1 },
  highlights: { type: [highlightSchema], default: [] },
  createdAt: { type: String, required: true },
});

export default registerModel("Book", bookSchema);
