import mongoose, { Schema, Model } from 'mongoose';
import { registerModel } from '@/lib/db';
import { TimeLog } from '@/types';

type TimeLogDocument = TimeLog & mongoose.Document;

const TimeLogSchema = new Schema<TimeLogDocument>({
  id: { type: String, required: true, unique: true },
  habitId: { type: String, required: true, index: true },
  startTime: { type: String, required: true },
  endTime: { type: String, default: null },
  durationSeconds: { type: Number, required: true },
  date: { type: String, required: true, index: true },
  note: { type: String, default: '' },
  // 1-5 self-reported focus quality; null when the session wasn't rated.
  focusRating: { type: Number, default: null, min: 1, max: 5 },
});

TimeLogSchema.index({ habitId: 1, date: -1 });

// registerModel keeps the hot-reload guard in production and rebuilds the
// schema in development, so a newly added field isn't silently dropped.
const TimeLogModel: Model<TimeLogDocument> = registerModel<TimeLogDocument>(
  'TimeLog',
  TimeLogSchema
);

export default TimeLogModel;
