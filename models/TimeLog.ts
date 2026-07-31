import mongoose, { Schema, Model } from 'mongoose';
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

const TimeLogModel: Model<TimeLogDocument> = mongoose.models.TimeLog || mongoose.model<TimeLogDocument>('TimeLog', TimeLogSchema);

export default TimeLogModel;
