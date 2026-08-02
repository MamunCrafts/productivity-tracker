import mongoose, { Schema, Model } from "mongoose";
import { registerModel } from "@/lib/db";
import { Task } from "@/types";

type TaskDocument = Task & mongoose.Document;

const TaskSchema = new Schema<TaskDocument>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  notes: { type: String, default: "" },
  // Null is a first-class value here: a task need not belong to a habit.
  habitId: { type: String, default: null },
  status: {
    type: String,
    enum: ["Todo", "Doing", "Done"],
    default: "Todo",
  },
  // Fractional. See the note on Task.order — drops write one card, not a column.
  order: { type: Number, required: true, default: 0 },
  dueDate: { type: String, default: null },
  createdAt: { type: String, required: true },
  completedAt: { type: String, default: null },
});

TaskSchema.index({ order: 1 });

// registerModel keeps the hot-reload guard in production and rebuilds the
// schema in development, so a newly added field isn't silently dropped.
const TaskModel: Model<TaskDocument> = registerModel<TaskDocument>(
  "Task",
  TaskSchema
);

export default TaskModel;
