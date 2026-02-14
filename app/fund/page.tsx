"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bitcoin, Gem, TrendingUp, Coins } from "lucide-react";

const SUPPORTED_COINS = ["BTC", "ETH", "XRP"] as const;

type CoinSymbol = (typeof SUPPORTED_COINS)[number];

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
  const [newWalletCoin, setNewWalletCoin] = useState<CoinSymbol>("BTC");
  const [newWalletLabel, setNewWalletLabel] = useState("");
  const [fundAmounts, setFundAmounts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  const currencySign = quoteCurrency === "EUR" ? "€" : "$";

  const totalWalletValue = useMemo(
    () => wallets.reduce((sum, wallet) => sum + wallet.currentValue, 0),
    [wallets],
  );

  const loadWallets = useCallback(async () => {
    const res = await fetch("/api/user/coin-wallets", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load wallets");
    }
    const data = await res.json();
    setWallets(data.wallets || []);
    setQuoteCurrency((data.quoteCurrency || "USDT") as QuoteCurrency);
  }, []);

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

        await loadWallets();
        setAuthChecked(true);
      } catch {
        router.push("/");
      }
    })();
  }, [router, loadWallets]);

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
        setNewWalletLabel("");
        setMsg({
          text: `${newWalletCoin} WALLET CREATED. NOW ADD COIN FUNDS TO IT.`,
          error: false,
        });
        await loadWallets();
      }
    } catch {
      setMsg({ text: "NETWORK ERROR.", error: true });
    }
    setLoading(false);
  }, [newWalletCoin, newWalletLabel, loadWallets]);

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
        }
      } catch {
        setMsg({ text: "NETWORK ERROR.", error: true });
      }
      setWalletLoading(false);
    },
    [fundAmounts, loadWallets],
  );

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-gray-500 font-mono text-sm animate-pulse">
          LOADING...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white font-mono">
      <header className="border-b-4 border-white bg-black sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold uppercase tracking-tighter">
            💰 FUND ARMY
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="border-2 border-white px-3 py-1 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
          >
            ← WAR ROOM
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
        <div className="border-4 border-[#D4AF37] bg-black p-6 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">
            TOTAL WALLET VALUE
          </div>
          <div className="text-3xl md:text-4xl font-bold text-[#D4AF37]">
            {currencySign}
            {totalWalletValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-xs text-gray-600 mt-1">{quoteCurrency}</div>
        </div>

        <div className="border-4 border-white bg-black">
          <div className="border-b-4 border-white px-4 py-2">
            <span className="text-xs font-bold tracking-widest text-[#D4AF37]">
              CREATE COIN WALLET
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div className="text-xs text-gray-500">
              {">"} START WITH NO WALLETS. CREATE ONE FOR A SPECIFIC COIN, THEN
              ADD FUNDS IN THAT COIN.
            </div>

            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_COINS.map((coin) => (
                <button
                  key={coin}
                  onClick={() => setNewWalletCoin(coin)}
                  className={`border-4 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                    newWalletCoin === coin
                      ? "border-[#D4AF37] bg-[#D4AF37] text-black"
                      : "border-gray-600 hover:border-white text-white"
                  }`}
                >
                  {coin}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">
                WALLET LABEL (OPTIONAL)
              </label>
              <input
                type="text"
                value={newWalletLabel}
                onChange={(e) => setNewWalletLabel(e.target.value)}
                placeholder="e.g. SWING STACK"
                className="w-full bg-black border-4 border-gray-600 text-white font-mono px-4 py-3 text-sm focus:border-[#D4AF37] focus:outline-none transition-colors placeholder:text-gray-700"
              />
            </div>

            <button
              onClick={handleCreateWallet}
              disabled={loading}
              className="w-full border-4 border-[#D4AF37] bg-[#D4AF37] text-black px-4 py-3 text-sm font-bold uppercase tracking-widest hover:bg-white hover:border-white transition-colors disabled:opacity-50"
            >
              {loading ? "CREATING..." : `> CREATE ${newWalletCoin} WALLET`}
            </button>
          </div>
        </div>

        {wallets.length === 0 ? (
          <div className="border-4 border-gray-700 bg-black p-8 text-center text-gray-500 text-sm">
            NO COIN WALLETS YET. CREATE YOUR FIRST ONE ABOVE.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="border-4 border-white bg-black p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CoinIcon symbol={wallet.symbol} />
                    <div>
                      <div className="text-lg font-bold tracking-wide">
                        {wallet.symbol}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest">
                        {wallet.label || "UNNAMED WALLET"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#D4AF37]">
                      {currencySign}
                      {wallet.currentValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      @ {currencySign}
                      {wallet.unitPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>

                <div className="border-2 border-gray-700 p-3">
                  <div className="text-xs text-gray-500 mb-1">COIN BALANCE</div>
                  <div className="text-xl font-bold">
                    {wallet.balanceCoin.toLocaleString(undefined, {
                      maximumFractionDigits: 8,
                    })}{" "}
                    {wallet.symbol}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs text-gray-500 uppercase tracking-widest">
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
                    className="w-full bg-black border-4 border-gray-600 text-white font-mono px-4 py-3 text-sm focus:border-[#D4AF37] focus:outline-none transition-colors placeholder:text-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => handleFundWallet(wallet.id)}
                    disabled={walletLoading}
                    className="w-full border-4 border-white bg-black text-white px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-50"
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

        {msg && (
          <div
            className={`text-xs font-bold ${msg.error ? "text-[#FF0000]" : "text-green-400"}`}
          >
            {">"} {msg.text}
          </div>
        )}
      </main>
    </div>
  );
}

function CoinIcon({ symbol }: { symbol: string }) {
  if (symbol === "BTC") {
    return <Bitcoin className="w-5 h-5 text-[#D4AF37]" />;
  }
  if (symbol === "ETH") {
    return <Gem className="w-5 h-5 text-white" />;
  }
  if (symbol === "XRP") {
    return <TrendingUp className="w-5 h-5 text-white" />;
  }
  return <Coins className="w-5 h-5 text-gray-400" />;
}
