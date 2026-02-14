import { NextResponse } from "next/server";
import { collectMarketSnapshots } from "@/lib/marketSnapshots";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const rows = await collectMarketSnapshots();
    return NextResponse.json({
      ok: true,
      stored: rows.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[MARKET_SNAPSHOT]", error);
    return NextResponse.json(
      { error: "Failed to collect market snapshots." },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
