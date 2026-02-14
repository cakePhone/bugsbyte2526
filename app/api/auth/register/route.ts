/**
 * POST /api/auth/register — Create a new user
 * Geisha Gains • Coffee Driven Development
 *
 * Expects: { email, password, riskProfile }
 * Returns: { user } + sets httpOnly JWT cookie
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, tokenCookieOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, riskProfile } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered." },
        { status: 409 },
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user + wallet in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          passwordHash,
          riskProfile: riskProfile ?? null,
          onboarded: true,
        },
      });

      await tx.wallet.create({
        data: {
          userId: u.id,
          balanceUsdt: 0,
          assets: {},
        },
      });

      return u;
    });

    // Sign JWT
    const token = await signToken({ sub: user.id, email: user.email });

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        onboarded: user.onboarded,
      },
    });

    res.cookies.set(tokenCookieOptions(token));
    return res;
  } catch (err: unknown) {
    console.error("[REGISTER]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
