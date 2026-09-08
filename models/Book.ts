import { Schema } from "mongoose";
import { registerModel } from "@/lib/db";
import {
  DEFAULT_HIGHLIGHT_COLOR,
  HIGHLIGHT_COLOR_KEYS,
} from "@/lib/highlights";
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
    // Rows written before the picker have no colour; `lib/highlights.ts` reads
    // them as the default rather than the schema backfilling them.
    color: {
      type: String,
      enum: HIGHLIGHT_COLOR_KEYS,
      default: DEFAULT_HIGHLIGHT_COLOR,
    },
    rectangles: [rectangleSchema],
  },
  { _id: false },
);

const inkStrokeSchema = new Schema(
  {
    id: { type: String, required: true },
    page: { type: Number, required: true },
    color: { type: String, required: true },
    width: { type: Number, required: true },
    points: [new Schema({ x: Number, y: Number, pressure: Number }, { _id: false })],
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
  // Set once the reader has uploaded a cover for page 1; the object's key is
  // derived from `id`, so there is nothing else to store.
  hasCover: { type: Boolean, default: false },
  highlights: { type: [highlightSchema], default: [] },
  strokes: { type: [inkStrokeSchema], default: [] },
  createdAt: { type: String, required: true },
});

export default registerModel("Book", bookSchema);
