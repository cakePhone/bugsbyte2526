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
import { getPrices } from '@/lib/market-aggregator';
import { calculateNetProfit } from '@/lib/market-aggregator/netProfit';

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

    // 5. Check for cross-exchange spread opportunities (Simultaneous Execution)
    try {
      const aggregated = await getPrices();
      const btcAnalysis = analyses.find((a) => a.symbol === 'BTC');

      if (btcAnalysis) {
        const { exchangeA, exchangeB } = aggregated;
        const cheapExchange = exchangeA.mid <= exchangeB.mid ? exchangeA : exchangeB;
        const expensiveExchange = exchangeA.mid > exchangeB.mid ? exchangeA : exchangeB;

        const profitCheck = calculateNetProfit({
          priceA: cheapExchange.mid,
          priceB: expensiveExchange.mid,
        });

        if (profitCheck.shouldTrade) {
          const simTrade = await executeSimultaneousTrade(
            userId,
            'BTC',
            cheapExchange.mid,      // buy on cheaper
            expensiveExchange.mid,   // sell on more expensive
            cheapExchange.exchange,
            expensiveExchange.exchange,
            isOverdrive,
            btcAnalysis.confidence,
            `Spread ${profitCheck.rawSpreadPct.toFixed(3)}% → Net ${profitCheck.netProfitPct.toFixed(3)}% after fees`
          );

          if (simTrade) {
            executedTrades.push(simTrade.buyTx, simTrade.sellTx);

            // Refresh wallet after simultaneous trade
            wallet = await prisma.wallet.findUnique({ where: { userId } });
          }
        }
      }
    } catch (err) {
      console.error('Simultaneous execution check failed:', err);
      // Fall through to single-leg logic below
    }

    // 6. Execute remaining single-leg trades based on analysis
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
 * Execute a simultaneous BUY on Exchange A / SELL on Exchange B
 * inside a single Prisma interactive transaction for atomicity.
 */
async function executeSimultaneousTrade(
  userId: string,
  symbol: string,
  buyPrice: number,
  sellPrice: number,
  buyExchange: string,
  sellExchange: string,
  isOverdrive: boolean,
  confidence: number,
  reasoning: string
) {
  // Pre-flight: make sure the spread is actually profitable
  const profitCheck = calculateNetProfit({ priceA: buyPrice, priceB: sellPrice });
  if (!profitCheck.shouldTrade) return null;

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('Wallet not found');

    const assets = wallet.assets as Record<string, number>;
    const holdings = assets[symbol] || 0;

    // --- BUY leg (Exchange A) ---
    const spendAmount = wallet.balanceUsdt * 0.1; // 10 % of USDT balance
    if (spendAmount <= 0) throw new Error('Insufficient USDT balance');
    const buyAmount = spendAmount / buyPrice;

    // --- SELL leg (Exchange B) ---
    // Sell the same quantity we just bought so the position nets out
    const sellAmount = buyAmount;
    const sellValue = sellAmount * sellPrice;
    const pnl = sellValue - spendAmount; // realised P&L for the round-trip

    // Update wallet atomically: debit buy cost, credit sell proceeds
    const newAssets = { ...assets };
    // Holdings stay flat (bought and sold same qty) but reflect any
    // residual rounding if amounts differ in the future.
    newAssets[symbol] = holdings; // net zero change

    await tx.wallet.update({
      where: { userId },
      data: {
        balanceUsdt: wallet.balanceUsdt - spendAmount + sellValue,
        assets: newAssets,
        totalPnL: wallet.totalPnL + pnl,
      },
    });

    // Record BUY transaction
    const buyTx = await tx.transaction.create({
      data: {
        userId,
        symbol,
        type: 'BUY',
        amount: buyAmount,
        price: buyPrice,
        totalValue: spendAmount,
        pnl: null,
        exchange: buyExchange,
        isOverdrive,
        confidence,
        reasoning: `[SIMULTANEOUS BUY] ${reasoning}`,
      },
    });

    // Record SELL transaction, linked to the buy leg
    const sellTx = await tx.transaction.create({
      data: {
        userId,
        symbol,
        type: 'SELL',
        amount: sellAmount,
        price: sellPrice,
        totalValue: sellValue,
        pnl,
        exchange: sellExchange,
        linkedTxId: buyTx.id,
        isOverdrive,
        confidence,
        reasoning: `[SIMULTANEOUS SELL] ${reasoning}`,
      },
    });

    // Back-link the buy to the sell
    await tx.transaction.update({
      where: { id: buyTx.id },
      data: { linkedTxId: sellTx.id },
    });

    return { buyTx, sellTx, pnl };
  });
}

/**
 * Execute a single-leg trade (legacy path for non-arbitrage actions)
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
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) return null;

    const assets = wallet.assets as Record<string, number>;
    let amount = 0;
    let totalValue = 0;
    let pnl = 0;

    if (type === 'BUY') {
      const spendAmount = wallet.balanceUsdt * 0.1;
      amount = spendAmount / price;
      totalValue = spendAmount;

      const newAssets = { ...assets };
      newAssets[symbol] = (newAssets[symbol] || 0) + amount;

      await tx.wallet.update({
        where: { userId },
        data: {
          balanceUsdt: wallet.balanceUsdt - spendAmount,
          assets: newAssets,
        },
      });
    } else if (type === 'SELL') {
      const holdings = assets[symbol] || 0;
      if (holdings === 0) return null;

      amount = holdings * 0.5;
      totalValue = amount * price;
      pnl = totalValue * 0.05;

      const newAssets = { ...assets };
      newAssets[symbol] = holdings - amount;
      if (newAssets[symbol] === 0) delete newAssets[symbol];

      await tx.wallet.update({
        where: { userId },
        data: {
          balanceUsdt: wallet.balanceUsdt + totalValue,
          assets: newAssets,
          totalPnL: wallet.totalPnL + pnl,
        },
      });
    }

    const transaction = await tx.transaction.create({
      data: {
        userId,
        symbol,
        type,
        amount,
        price,
        totalValue,
        pnl: type === 'SELL' ? pnl : null,
        exchange: 'Uphold',
        isOverdrive,
        confidence,
        reasoning,
      },
    });

    return transaction;
  });
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
