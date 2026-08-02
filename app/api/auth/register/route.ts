import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import UserModel from "@/models/User";

/**
 * Creates the one account.
 *
 * Sits under `/api/auth/` so the proxy matcher's single `api/auth`
 * exemption covers it as well as Auth.js's own endpoints — registration has to
 * be reachable while signed out. A static segment beats the `[...nextauth]`
 * catch-all in Next's routing, so this file wins the path.
 */

/** Long enough to matter, short enough that nobody reaches for a workaround. */
const MIN_PASSWORD = 8;

export async function POST(request: Request) {
  await dbConnect();
  const body = await request.json().catch(() => ({}));

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email and password are all required." },
      { status: 400 }
    );
  }

  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `Use at least ${MIN_PASSWORD} characters for the password.` },
      { status: 400 }
    );
  }

  // One account, by design — see models/User.ts. Checked before hashing so a
  // pointless request doesn't cost 200ms of bcrypt.
  if ((await UserModel.countDocuments()) > 0) {
    return NextResponse.json(
      { error: "An account already exists on this tracker. Sign in instead." },
      { status: 409 }
    );
  }

  try {
    const user = await UserModel.create({
      id: crypto.randomUUID(),
      name,
      email,
      // 12 rounds: ~200ms on this hardware, which is the point.
      passwordHash: await bcrypt.hash(password, 12),
      createdAt: new Date().toISOString(),
    });

    // Deliberately partial. The hash must never appear in a response body.
    return NextResponse.json(
      { id: user.id, name: user.name, email: user.email },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
