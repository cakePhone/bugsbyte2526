/**
 * PUT /api/auth/strategy — Update attack strategy (risk profile)
 * Geisha Gains • Coffee Driven Development
 *
 * Expects: { riskProfile: RiskProfile }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { riskProfile } = await req.json();

    if (!riskProfile) {
      return NextResponse.json(
        { error: "Risk profile is required." },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: session.sub },
      data: { riskProfile },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[STRATEGY]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
