import { NextResponse } from "next/server";
import { getAvailableCoins } from "@/lib/coinCatalog";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 25);

    const coins = await getAvailableCoins({ limit });

    return NextResponse.json({
      coins,
      count: coins.length,
      source: "uphold",
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("[COIN_CATALOG]", error);
    return NextResponse.json(
      { error: "Unable to fetch available coins." },
      { status: 500 },
    );
  }
}
