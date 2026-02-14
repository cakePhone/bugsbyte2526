/**
 * Geisha Gains - Trade Log Component
 * Coffee Driven Development - BugsByte 2026
 *
 * Minimalist black-and-white trade history with P&L
 */

"use client";

interface Transaction {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  amount: number;
  price: number;
  totalValue: number;
  pnl: number | null;
  isOverdrive: boolean;
  confidence: number | null;
  timestamp: Date | string;
}

interface TradeLogProps {
  transactions: Transaction[];
}

export function TradeLog({ transactions }: TradeLogProps) {
  const totalPnL = transactions.reduce((sum, t) => sum + (t.pnl || 0), 0);

  return (
    <div className="border-4 border-white bg-black text-white">
      {/* Header */}
      <div className="border-b-4 border-white p-4 bg-black text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black uppercase tracking-tight">
            TRADE LOG
          </h2>
          <div className="text-right">
            <div className="text-xs font-bold">TOTAL P&L</div>
            <div
              className={`text-2xl font-black ${totalPnL >= 0 ? "" : "text-red-600"}`}
            >
              {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b-4 border-white bg-black">
            <tr>
              <th className="p-3 font-black uppercase">Time</th>
              <th className="p-3 font-black uppercase">Symbol</th>
              <th className="p-3 font-black uppercase">Type</th>
              <th className="p-3 font-black uppercase text-right">Amount</th>
              <th className="p-3 font-black uppercase text-right">Price</th>
              <th className="p-3 font-black uppercase text-right">Total</th>
              <th className="p-3 font-black uppercase text-right">P&L</th>
              <th className="p-3 font-black uppercase text-center">AI</th>
              <th className="p-3 font-black uppercase text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  No trades yet. Waiting for market analysis...
                </td>
              </tr>
            ) : (
              transactions.map((tx, idx) => {
                const timestamp = new Date(tx.timestamp);
                const isBuy = tx.type === "BUY";

                return (
                  <tr
                    key={tx.id}
                    className={`border-b border-gray-700 hover:bg-gray-900 transition-colors ${
                      tx.isOverdrive ? "bg-red-950/40" : ""
                    }`}
                  >
                    {/* Time */}
                    <td className="p-3 font-mono text-xs">
                      {timestamp.toLocaleTimeString()}
                    </td>

                    {/* Symbol */}
                    <td className="p-3 font-black">{tx.symbol}</td>

                    {/* Type */}
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 border-2 border-white font-black text-xs ${
                          isBuy ? "bg-white text-black" : "bg-black text-white"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="p-3 text-right font-mono">
                      {tx.amount.toFixed(6)}
                    </td>

                    {/* Price */}
                    <td className="p-3 text-right font-mono">
                      ${tx.price.toFixed(2)}
                    </td>

                    {/* Total Value */}
                    <td className="p-3 text-right font-mono font-bold">
                      ${tx.totalValue.toFixed(2)}
                    </td>

                    {/* P&L */}
                    <td className="p-3 text-right font-mono font-black">
                      {tx.pnl !== null ? (
                        <span
                          className={
                            tx.pnl >= 0 ? "text-white" : "text-red-500"
                          }
                        >
                          {tx.pnl >= 0 ? "+" : ""}${tx.pnl.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* AI Confidence */}
                    <td className="p-3 text-center font-mono text-xs">
                      {tx.confidence !== null ? `${tx.confidence}%` : "—"}
                    </td>

                    {/* Overdrive Status */}
                    <td className="p-3 text-center">
                      {tx.isOverdrive && (
                        <span className="bg-red-600 text-white px-2 py-1 text-xs font-black border-2 border-white glitch-text">
                          [GLITCH]
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
      {transactions.length > 0 && (
        <div className="border-t-4 border-white p-4 bg-black">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs font-bold text-gray-400">
                TOTAL TRADES
              </div>
              <div className="text-2xl font-black">{transactions.length}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400">
                GLITCH TRADES
              </div>
              <div className="text-2xl font-black text-red-600">
                {transactions.filter((t) => t.isOverdrive).length}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400">WIN RATE</div>
              <div className="text-2xl font-black">
                {(
                  (transactions.filter((t) => (t.pnl || 0) > 0).length /
                    transactions.length) *
                  100
                ).toFixed(0)}
                %
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
