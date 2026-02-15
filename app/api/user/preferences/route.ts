/**
 * GET/PUT /api/user/preferences — User preferences management
 * Geisha Gains • Coffee Driven Development
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { preferences: true },
  });

  return NextResponse.json({
    preferences: user?.preferences || {},
  });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Get existing preferences
    const existing = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { preferences: true },
    });

    const currentPrefs =
      existing?.preferences && typeof existing.preferences === "object"
        ? (existing.preferences as Prisma.JsonObject)
        : {};

    // Merge new preferences with existing ones
    const updatedPrefs = {
      ...currentPrefs,
      ...body,
    };

    await prisma.user.update({
      where: { id: session.sub },
      data: {
        preferences: updatedPrefs as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      preferences: updatedPrefs,
    });
  } catch (error) {
    console.error("[PREFERENCES_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update preferences." },
      { status: 500 }
    );
  }
}
