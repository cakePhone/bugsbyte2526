/**
 * PUT /api/auth/password — Change password
 * Geisha Gains • Coffee Driven Development
 *
 * Expects: { currentPassword, newPassword }
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Both current and new passwords are required." },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 403 },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.sub },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[PASSWORD]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
