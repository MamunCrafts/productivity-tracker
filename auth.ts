import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import UserModel from "@/models/User";
import { authConfig } from "./auth.config";

/**
 * A real bcrypt hash of a string nobody knows, compared against when no
 * account matches the email. Without it, a missing account returns in ~1ms and
 * a wrong password in ~200ms, and that difference alone tells someone which
 * email addresses exist.
 */
const ABSENT_USER_HASH =
  "$2b$12$6omRBiSU3UzNyMWpA4B1O.VqcnrAeUUw3i3eohOvhv1dKXGU0fPIS";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },

      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) return null;

        await dbConnect();
        // passwordHash is `select: false`, so it has to be asked for.
        const user = await UserModel.findOne({ email }).select("+passwordHash");

        // Always compare, even with no user, so both failures cost the same.
        const matches = await bcrypt.compare(
          password,
          user?.passwordHash ?? ABSENT_USER_HASH
        );

        if (!user || !matches) return null;

        // Only these three reach the token. Never the hash.
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
});
