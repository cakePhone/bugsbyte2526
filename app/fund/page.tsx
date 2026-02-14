"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bitcoin, Gem, TrendingUp, Coins } from "lucide-react";
import { useCoinPrices } from "@/contexts/CoinPricesContext";

type CoinSymbol = string;

type QuoteCurrency = "USDT" | "EUR";

interface CoinWallet {
  id: string;
  symbol: CoinSymbol;
  label: string | null;
  balanceCoin: number;
  unitPrice: number;
  currentValue: number;
  createdAt: number;
}

export default function FundArmy() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [wallets, setWallets] = useState<CoinWallet[]>([]);
  const [quoteCurrency, setQuoteCurrency] = useState<QuoteCurrency>("USDT");
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [availableCoins, setAvailableCoins] = useState<CoinSymbol[]>([
    "BTC",
    "ETH",
    "XRP",
  ]);
  const [newWalletCoin, setNewWalletCoin] = useState<CoinSymbol>("BTC");
  const [newWalletLabel, setNewWalletLabel] = useState("");
  const [newWalletInitialAmount, setNewWalletInitialAmount] = useState("");
  const [walletSearch, setWalletSearch] = useState("");
  const [showCreateWalletModal, setShowCreateWalletModal] = useState(false);
  const [fundAmounts, setFundAmounts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const { priceMaps, ensureSymbols } = useCoinPrices();
  const tickerQuote = quoteCurrency === "EUR" ? "EUR" : "USD";
  const coinMarketValues = priceMaps[tickerQuote];

  const currencySign = quoteCurrency === "EUR" ? "€" : "$";

  const totalWalletValue = useMemo(
    () => wallets.reduce((sum, wallet) => sum + wallet.currentValue, 0),
    [wallets],
  );

  const filteredWalletCoins = useMemo(() => {
    const query = walletSearch.trim().toUpperCase();
    if (!query) return availableCoins;
    return availableCoins.filter((coin) => coin.includes(query));
  }, [availableCoins, walletSearch]);

  const loadWallets = useCallback(async () => {
    const res = await fetch("/api/user/coin-wallets", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load wallets");
    }
    const data = await res.json();
    setWallets(data.wallets || []);
    setQuoteCurrency((data.quoteCurrency || "USDT") as QuoteCurrency);
  }, []);

  const loadPortfolioValue = useCallback(async () => {
    try {
      const res = await fetch("/api/user/data", { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      const entries = Array.isArray(data?.walletValuations)
        ? data.walletValuations
        : [];
      const total = entries.reduce(
        (sum: number, entry: { currentValue?: number }) => {
          const value = Number(entry?.currentValue || 0);
          return Number.isFinite(value) && value > 0 ? sum + value : sum;
        },
        0,
      );

      setPortfolioValue(total);
      setQuoteCurrency((data?.valuationCurrency || "USDT") as QuoteCurrency);
    } catch {
      // keep previous values
    }
  }, []);

  const loadAvailableCoins = useCallback(async () => {
    try {
      const res = await fetch("/api/coins?limit=25", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const symbols = Array.isArray(data?.coins)
        ? data.coins
            .map((coin: { symbol?: string }) =>
              String(coin.symbol || "").toUpperCase(),
            )
            .filter(Boolean)
        : [];
      if (symbols.length === 0) return;
      const ordered = [
        "BTC",
        "ETH",
        "XRP",
        ...symbols.filter((s) => !["BTC", "ETH", "XRP"].includes(s)),
      ];
      const unique = Array.from(new Set(ordered));
      setAvailableCoins(unique);
      setNewWalletCoin((prev) => (unique.includes(prev) ? prev : unique[0]));
    } catch {
      // keep defaults on failure
    }
  }, []);

  useEffect(() => {
    ensureSymbols(availableCoins, tickerQuote);
  }, [availableCoins, ensureSymbols, tickerQuote]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/");
          return;
        }
        const { user } = await res.json();
        if (!user) {
          router.push("/");
          return;
        }

        await Promise.all([
          loadWallets(),
          loadAvailableCoins(),
          loadPortfolioValue(),
        ]);
        setAuthChecked(true);
      } catch {
        router.push("/");
      }
    })();
  }, [router, loadWallets, loadAvailableCoins, loadPortfolioValue]);

  const handleCreateWallet = useCallback(async () => {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/user/coin-wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: newWalletCoin,
          label: newWalletLabel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error || "WALLET CREATION FAILED.", error: true });
      } else {
        const initialAmount = Number(newWalletInitialAmount || 0);

        if (Number.isFinite(initialAmount) && initialAmount > 0) {
          const fundRes = await fetch(
            `/api/user/coin-wallets/${data?.wallet?.id}/fund`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amountCoin: initialAmount }),
            },
          );
          const fundData = await fundRes.json().catch(() => ({}));
          if (!fundRes.ok) {
            setMsg({
              text:
                fundData?.error ||
                `${newWalletCoin} WALLET CREATED, BUT INITIAL FUNDING FAILED.`,
              error: true,
            });
          } else {
            setMsg({
              text: `${newWalletCoin} WALLET CREATED AND FUNDED.`,
              error: false,
            });
          }
        } else {
          setMsg({
            text: `${newWalletCoin} WALLET CREATED.`,
            error: false,
          });
        }

        setNewWalletLabel("");
        setNewWalletInitialAmount("");
        setWalletSearch("");
        setShowCreateWalletModal(false);
        await loadWallets();
        await loadPortfolioValue();
      }
    } catch {
      setMsg({ text: "NETWORK ERROR.", error: true });
    }
    setLoading(false);
  }, [
    newWalletCoin,
    newWalletInitialAmount,
    newWalletLabel,
    loadPortfolioValue,
    loadWallets,
  ]);

  const handleFundWallet = useCallback(
    async (walletId: string) => {
      setMsg(null);
      const raw = fundAmounts[walletId] || "";
      const amountCoin = Number(raw);
      if (!Number.isFinite(amountCoin) || amountCoin <= 0) {
        setMsg({ text: "ENTER A VALID COIN AMOUNT.", error: true });
        return;
      }

      setWalletLoading(true);
      try {
        const res = await fetch(`/api/user/coin-wallets/${walletId}/fund`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountCoin }),
        });

        const data = await res.json();
        if (!res.ok) {
          setMsg({ text: data.error || "WALLET FUNDING FAILED.", error: true });
        } else {
          setFundAmounts((prev) => ({ ...prev, [walletId]: "" }));
          setMsg({ text: "WALLET FUNDED SUCCESSFULLY.", error: false });
          await loadWallets();
          await loadPortfolioValue();
        }
      } catch {
        setMsg({ text: "NETWORK ERROR.", error: true });
      }
      setWalletLoading(false);
    },
    [fundAmounts, loadPortfolioValue, loadWallets],
  );

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-[#C9A832] font-mono text-2xl font-bold animate-pulse">
            💰 FUND ARMY
          </div>
          <div className="text-gray-300 font-mono text-sm">
            LOADING WALLETS...
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-[#C9A832] animate-ping"></div>
            <div className="w-2 h-2 bg-[#C9A832] animate-ping" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-[#C9A832] animate-ping" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white font-mono">
      <header className="border-b-4 border-gray-300 bg-black sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold uppercase tracking-tighter">
            💰 FUND ARMY
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="border-2 border-gray-300 px-3 py-1 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
          >
            ← WAR ROOM
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
        <div className="border-4 border-[#C9A832] bg-black p-6 text-center">
          <div className="text-xs text-gray-300 uppercase tracking-widest mb-2">
            TOTAL PORTFOLIO VALUE
          </div>
          <div className="text-3xl md:text-4xl font-bold text-[#C9A832]">
            {currencySign}
            {(portfolioValue || totalWalletValue).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-xs text-gray-600 mt-1">{quoteCurrency}</div>
        </div>

        <div className="border-4 border-gray-300 bg-black">
          <div className="border-b-4 border-gray-300 px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-bold tracking-widest text-[#C9A832]">
              WALLETS
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-300">
                {wallets.length} ACTIVE
              </span>
              <button
                onClick={() => setShowCreateWalletModal(true)}
                className="border-2 border-[#C9A832] text-[#C9A832] px-2 py-0.5 text-xs font-bold hover:bg-[#C9A832] hover:text-black transition-colors"
              >
                + ADD WALLET
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="text-xs text-gray-300">
              {">"} MANAGE COIN-SPECIFIC WALLETS. ADD NEW WALLETS WITH INITIAL
              BALANCE USING THE ADD BUTTON.
            </div>

            {wallets.length === 0 ? (
              <div className="border-4 border-gray-700 bg-black p-8 text-center text-gray-300 text-sm">
                NO COIN WALLETS YET. CREATE YOUR FIRST ONE ABOVE.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className="border-4 border-gray-300 bg-black p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CoinIcon symbol={wallet.symbol} />
                        <div>
                          <div className="text-lg font-bold tracking-wide">
                            {wallet.symbol}
                          </div>
                          <div className="text-[10px] text-gray-300 uppercase tracking-widest">
                            {wallet.label || "UNNAMED WALLET"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#C9A832]">
                          {currencySign}
                          {wallet.currentValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-[10px] text-gray-300">
                          @ {currencySign}
                          {wallet.unitPrice.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="border-2 border-gray-700 p-3">
                      <div className="text-xs text-gray-300 mb-1">
                        COIN BALANCE
                      </div>
                      <div className="text-xl font-bold">
                        {wallet.balanceCoin.toLocaleString(undefined, {
                          maximumFractionDigits: 8,
                        })}{" "}
                        {wallet.symbol}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs text-gray-300 uppercase tracking-widest">
                        ADD FUNDS ({wallet.symbol})
                      </label>
                      <input
                        type="number"
                        value={fundAmounts[wallet.id] || ""}
                        onChange={(e) =>
                          setFundAmounts((prev) => ({
                            ...prev,
                            [wallet.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleFundWallet(wallet.id)
                        }
                        placeholder={`0.00 ${wallet.symbol}`}
                        min="0"
                        step="0.00000001"
                        className="w-full bg-black border-4 border-gray-300 text-white font-mono px-4 py-3 text-sm focus:border-[#C9A832] focus:outline-none transition-colors placeholder:text-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => handleFundWallet(wallet.id)}
                        disabled={walletLoading}
                        className="w-full border-4 border-gray-300 bg-black text-white px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                      >
                        {walletLoading
                          ? "FUNDING..."
                          : `> FUND ${wallet.symbol} WALLET`}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {msg && (
          <div
            className={`text-xs font-bold ${msg.error ? "text-[#DD0000]" : "text-green-400"}`}
          >
            {">"} {msg.text}
          </div>
        )}
      </main>

      {showCreateWalletModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg border-4 border-gray-300 bg-black p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-widest text-white">
                ADD WALLET
              </h2>
              <button
                onClick={() => {
                  if (loading) return;
                  setShowCreateWalletModal(false);
                }}
                className="text-xs text-gray-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-[10px] text-gray-300 mb-1 uppercase tracking-widest">
                SEARCH COIN
              </label>
              <input
                type="text"
                value={walletSearch}
                onChange={(event) => setWalletSearch(event.target.value)}
                placeholder="e.g. BTC"
                className="w-full bg-black border-2 border-gray-300 text-white font-mono px-3 py-2 text-sm focus:border-[#C9A832] focus:outline-none transition-colors placeholder:text-gray-700"
              />
            </div>

            <div className="max-h-56 overflow-y-auto border-2 border-gray-700 divide-y divide-gray-800">
              {filteredWalletCoins.map((coin) => (
                <button
                  key={coin}
                  onClick={() => setNewWalletCoin(coin)}
                  className={`w-full px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-between ${
                    newWalletCoin === coin
                      ? "bg-[#C9A832] text-black"
                      : "text-white hover:bg-gray-900"
                  }`}
                >
                  <span>{coin}</span>
                  <span
                    className={
                      newWalletCoin === coin ? "text-black" : "text-gray-300"
                    }
                  >
                    {currencySign}
                    {(
                      (coinMarketValues[coin] || 0) *
                      (quoteCurrency === "EUR" ? 0.92 : 1)
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[10px] text-gray-300 mb-1 uppercase tracking-widest">
                WALLET LABEL
              </label>
              <input
                type="text"
                value={newWalletLabel}
                onChange={(event) => setNewWalletLabel(event.target.value)}
                placeholder="e.g. ARB STACK"
                className="w-full bg-black border-2 border-gray-300 text-white font-mono px-3 py-2 text-sm focus:border-[#C9A832] focus:outline-none transition-colors placeholder:text-gray-700"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-300 mb-1 uppercase tracking-widest">
                INITIAL AMOUNT ({newWalletCoin})
              </label>
              <input
                type="number"
                min="0"
                step="0.00000001"
                value={newWalletInitialAmount}
                onChange={(event) =>
                  setNewWalletInitialAmount(event.target.value)
                }
                placeholder={`0.00 ${newWalletCoin}`}
                className="w-full bg-black border-2 border-gray-300 text-white font-mono px-3 py-2 text-sm focus:border-[#C9A832] focus:outline-none transition-colors placeholder:text-gray-700"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  if (loading) return;
                  setShowCreateWalletModal(false);
                }}
                className="border-2 border-gray-300 text-gray-300 px-3 py-1 text-xs font-bold"
              >
                CANCEL
              </button>
              <button
                onClick={handleCreateWallet}
                disabled={loading}
                className="border-2 border-[#C9A832] bg-[#C9A832] text-black px-3 py-1 text-xs font-bold disabled:opacity-50"
              >
                {loading ? "CREATING..." : `CREATE ${newWalletCoin} WALLET`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CoinIcon({ symbol }: { symbol: string }) {
  if (symbol === "BTC") {
    return <Bitcoin className="w-5 h-5 text-[#C9A832]" />;
  }
  if (symbol === "ETH") {
    return <Gem className="w-5 h-5 text-white" />;
  }
  if (symbol === "XRP") {
    return <TrendingUp className="w-5 h-5 text-white" />;
  }
  return <Coins className="w-5 h-5 text-gray-300" />;
}
