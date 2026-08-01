import mongoose, { Schema, Model } from "mongoose";
import { registerModel } from "@/lib/db";
import { Habit } from "@/types";

type HabitDocument = Habit & mongoose.Document;

const HabitSchema = new Schema<HabitDocument>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  totalHours: { type: Number, required: true },
  perDayHours: { type: Number, required: true },
  timeSlot: { type: String, default: "" },
  weekFrequency: { type: Number, required: true, default: 7 },
  totalDays: { type: Number, default: 30 },
  createdAt: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: String, default: null },
  color: { type: String, required: true },
  // When the habit was pinned; the newest timestamp sorts to the top.
  pinnedAt: { type: String, default: null },
  // Paused keeps a habit out of the working list without deleting it.
  status: {
    type: String,
    enum: ["Active", "Paused", "Deleted"],
    default: "Active",
  },
});

// registerModel keeps the hot-reload guard in production and rebuilds the
// schema in development, so a newly added field isn't silently dropped.
const HabitModel: Model<HabitDocument> = registerModel<HabitDocument>(
  "Habit",
  HabitSchema
);

export default HabitModel;
