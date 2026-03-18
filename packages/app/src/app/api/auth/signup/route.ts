import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

import { findUserByEmail, insertUser } from "@/lib/data";

/**
 * POST /api/auth/signup
 *
 * Creates a new user account with email/password credentials. Expects a JSON body with `name`,
 * `email`, and `password` (min. 8 characters). Returns 400 for missing/invalid fields, 409 if the
 * email is already registered, and 201 on success. It stores a hash of the password using `bcrypt`.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, password } = body;

  if (!name || !email || !password)
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });

  if (typeof password !== "string" || password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const existing = await findUserByEmail(email);
  if (existing)
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );

  const passwordHash = await hash(password, 12);
  await insertUser({ name, email, passwordHash });

  return NextResponse.json({ success: true }, { status: 201 });
}
