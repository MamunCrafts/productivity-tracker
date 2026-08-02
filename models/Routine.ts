import mongoose, { Schema, Model } from "mongoose";
import { registerModel } from "@/lib/db";
import { RoutineBlock } from "@/types";

type RoutineBlockDocument = RoutineBlock & mongoose.Document;

const RoutineBlockSchema = new Schema<RoutineBlockDocument>({
  id: { type: String, required: true, unique: true },
  // Null is a first-class value: a routine holds the whole day, and not every
  // slot in it is something you track hours against.
  habitId: { type: String, default: null },
  label: { type: String, required: true, trim: true },
  // `HH:MM`, 24-hour. Validated here rather than only in the form, because the
  // whole day sorts on this string and a malformed one would sort anywhere.
  startTime: {
    type: String,
    required: true,
    match: [/^([01]\d|2[0-3]):[0-5]\d$/, "startTime must be HH:MM in 24-hour time"],
  },
  // A day is the ceiling; anything longer isn't a slot in a routine.
  durationMinutes: { type: Number, required: true, min: 1, max: 1440 },
  /**
   * `Date.getDay()` indices. An empty array is rejected — a block that recurs
   * on no day would be invisible on every screen in the app while still
   * counting against the collection, which reads as data loss.
   */
  days: {
    type: [Number],
    required: true,
    validate: [
      {
        validator: (days: number[]) => days.length > 0,
        message: "A block must repeat on at least one day",
      },
      {
        validator: (days: number[]) =>
          days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6),
        message: "days must be integers 0-6",
      },
    ],
  },
  createdAt: { type: String, required: true },
});

// registerModel keeps the hot-reload guard in production and rebuilds the
// schema in development, so a newly added field isn't silently dropped.
const RoutineBlockModel: Model<RoutineBlockDocument> =
  registerModel<RoutineBlockDocument>("RoutineBlock", RoutineBlockSchema);

export default RoutineBlockModel;
