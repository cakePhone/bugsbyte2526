/**
 * POST /api/auth/login — Authenticate an existing user
 * Geisha Gains • Coffee Driven Development
 *
 * Expects: { email, password }
 * Returns: { user } + sets httpOnly JWT cookie
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, tokenCookieOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );
    }

    // Sign JWT
    const token = await signToken({ sub: user.id, email: user.email });

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        onboarded: user.onboarded,
        riskProfile: user.riskProfile,
      },
    });

    res.cookies.set(tokenCookieOptions(token));
    return res;
  } catch (err: unknown) {
    console.error("[LOGIN]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
