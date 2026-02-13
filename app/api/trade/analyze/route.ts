/**
 * Geisha Gains - Trade Analysis API Route
 * Coffee Driven Development - BugsByte 2026
 * 
 * POST /api/trade/analyze
 * 
 * Fetches prices from Uphold, analyzes with NVIDIA NIM,
 * and executes trades based on confidence or Overdrive state
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchAllPrices } from '@/lib/uphold-api';
import { analyzeMarketWithNIM } from '@/lib/nvidia-nim';

interface AnalyzeRequest {
  userId: string;
  isOverdrive: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { userId, isOverdrive } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 1. Fetch real-time prices from Uphold
    const marketPrices = await fetchAllPrices();

    // 2. Save market snapshots
    await Promise.all(
      marketPrices.map((price) =>
        prisma.marketSnap.create({
          data: {
            symbol: price.symbol,
            price: price.price,
            volume24h: price.volume24h,
            change24h: price.change24h,
            source: 'uphold',
          },
        })
      )
    );

    // 3. Analyze with NVIDIA NIM
    const analyses = await analyzeMarketWithNIM(marketPrices);

    // 4. Get user's wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    // Create wallet if doesn't exist
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balanceUsdt: 10000, // Starting balance
          assets: {},
        },
      });
    }

    const executedTrades = [];

    // 5. Execute trades based on analysis and Overdrive state
    for (const analysis of analyses) {
      const marketPrice = marketPrices.find((p) => p.symbol === analysis.symbol);
      if (!marketPrice) continue;

      let shouldExecute = false;

      if (isOverdrive) {
        // OVERDRIVE MODE: Execute any trade where current price suggests profit
        const assets = wallet.assets as Record<string, number>;
        const holdings = assets[analysis.symbol] || 0;
        
        // Simple logic: If we have holdings and price is up, sell
        // If we don't have holdings and price is down, buy
        if (holdings > 0 && marketPrice.change24h > 0) {
          shouldExecute = true;
          analysis.action = 'SELL';
        } else if (holdings === 0 && marketPrice.change24h < -2) {
          shouldExecute = true;
          analysis.action = 'BUY';
        }
      } else {
        // NORMAL MODE: Execute only if AI confidence > 75
        shouldExecute = analysis.confidence > 75;
      }

      if (shouldExecute) {
        // Skip HOLD actions - only execute BUY or SELL
        if (analysis.action === 'HOLD') {
          continue;
        }

        const trade = await executeTrade(
          userId,
          analysis.symbol,
          analysis.action,
          marketPrice.price,
          isOverdrive,
          analysis.confidence,
          analysis.reasoning
        );
        
        if (trade) {
          executedTrades.push(trade);
          
          // Refresh wallet after trade
          wallet = await prisma.wallet.findUnique({
            where: { userId },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      marketPrices,
      analyses,
      executedTrades,
      wallet,
      isOverdrive,
    });
  } catch (error) {
    console.error('Trade analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Execute a trade and update wallet
 */
async function executeTrade(
  userId: string,
  symbol: string,
  type: 'BUY' | 'SELL',
  price: number,
  isOverdrive: boolean,
  confidence: number,
  reasoning: string
) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) return null;

  const assets = wallet.assets as Record<string, number>;
  let amount = 0;
  let totalValue = 0;
  let pnl = 0;

  if (type === 'BUY') {
    // Buy with 10% of available USDT
    const spendAmount = wallet.balanceUsdt * 0.1;
    amount = spendAmount / price;
    totalValue = spendAmount;

    // Update wallet
    const newAssets = { ...assets };
    newAssets[symbol] = (newAssets[symbol] || 0) + amount;

    await prisma.wallet.update({
      where: { userId },
      data: {
        balanceUsdt: wallet.balanceUsdt - spendAmount,
        assets: newAssets,
      },
    });
  } else if (type === 'SELL') {
    // Sell 50% of holdings
    const holdings = assets[symbol] || 0;
    if (holdings === 0) return null; // Can't sell what we don't have

    amount = holdings * 0.5;
    totalValue = amount * price;

    // Calculate P&L (simplified - assume average cost)
    pnl = totalValue * 0.05; // Mock 5% profit

    // Update wallet
    const newAssets = { ...assets };
    newAssets[symbol] = holdings - amount;
    if (newAssets[symbol] === 0) delete newAssets[symbol];

    await prisma.wallet.update({
      where: { userId },
      data: {
        balanceUsdt: wallet.balanceUsdt + totalValue,
        assets: newAssets,
        totalPnL: wallet.totalPnL + pnl,
      },
    });
  }

  // Create transaction record
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      symbol,
      type,
      amount,
      price,
      totalValue,
      pnl: type === 'SELL' ? pnl : null,
      isOverdrive,
      confidence,
      reasoning,
    },
  });

  return transaction;
}

/**
 * GET handler to fetch recent analyses
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const recentTransactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    return NextResponse.json({
      transactions: recentTransactions,
      wallet,
    });
  } catch (error) {
    console.error('Failed to fetch trade data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
