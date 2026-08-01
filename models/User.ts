import mongoose, { Schema, Model } from "mongoose";
import { registerModel } from "@/lib/db";
import { User } from "@/types";

/**
 * The account. There is exactly one — `POST /api/auth/register` refuses a
 * second — because this is one person's tracker and nothing else in the schema
 * is scoped to a user.
 *
 * `passwordHash` is `select: false`, so it is never in a document unless a
 * query asks for it explicitly. The one place that needs it is the credentials
 * check in `auth.ts`; everywhere else literally cannot leak it.
 */
type UserDocument = User & { passwordHash: string } & mongoose.Document;

const UserSchema = new Schema<UserDocument>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  // Lowercased on write so sign-in isn't case sensitive, which no one expects.
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  passwordHash: { type: String, required: true, select: false },
  createdAt: { type: String, required: true },
});

// registerModel keeps the hot-reload guard in production and rebuilds the
// schema in development, so a newly added field isn't silently dropped.
const UserModel: Model<UserDocument> = registerModel<UserDocument>(
  "User",
  UserSchema
);

export default UserModel;
