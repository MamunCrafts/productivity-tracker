import mongoose, { Schema, Model } from "mongoose";
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

// Check if model already exists to prevent overwrite error in hot reload
const TaskModel: Model<TaskDocument> =
  mongoose.models.Task || mongoose.model<TaskDocument>("Task", TaskSchema);

export default TaskModel;
