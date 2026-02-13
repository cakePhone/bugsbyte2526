/**
 * Geisha Gains - Arbitrage Scanner API
 * GET /api/arbitrage — polls all 3 exchanges, returns AI verdicts
 */

import { NextResponse } from 'next/server';
import { runArbitrageAnalysis } from '@/lib/aiAnalyzer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await runArbitrageAnalysis();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Arbitrage scan error:', error);
    return NextResponse.json(
      { error: 'Scan failed', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
