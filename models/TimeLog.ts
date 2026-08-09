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
  // Where the next session starts. Empty string rather than null, like `note` —
  // it is a line of prose that wasn't written, not a value that is absent.
  nextAction: { type: String, default: '' },
  // 1-5 self-reported focus quality. Legacy — kept so sessions rated under the
  // old scale keep their rating; new logs carry the three 1-10 scores instead.
  focusRating: { type: Number, default: null, min: 1, max: 5 },
  // The wrap-up's three scales. Null means the slider was left untouched, which
  // is not the same as a 1 — an unrated session must not drag an average down.
  focusScore: { type: Number, default: null, min: 1, max: 10 },
  energyScore: { type: Number, default: null, min: 1, max: 10 },
  outputScore: { type: Number, default: null, min: 1, max: 10 },
});

TimeLogSchema.index({ habitId: 1, date: -1 });

// registerModel keeps the hot-reload guard in production and rebuilds the
// schema in development, so a newly added field isn't silently dropped.
const TimeLogModel: Model<TimeLogDocument> = registerModel<TimeLogDocument>(
  'TimeLog',
  TimeLogSchema
);

export default TimeLogModel;
