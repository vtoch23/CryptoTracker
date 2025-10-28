import React, { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { formatPrice } from "../utils/priceFormatters";

interface CostBasis {
    id: number;
    symbol: string;
    cost_price: number;
    quantity: number;
}

interface CoinPrice {
    symbol: string;
    price: number;
}

export default function PortfolioDisplay({
    costBasis,
    prices,
    onDeleteCostBasis,
}: {
    costBasis: CostBasis[];
    prices: CoinPrice[];
    onDeleteCostBasis: (id: number) => void;
}) {
    if (!costBasis || costBasis.length === 0) {
        return <p className="text-slate-400 text-center py-8">No purchase data found</p>;
    }

    const grouped = useMemo(() => {
        const groups = new Map<string, CostBasis[]>();
        for (const entry of costBasis) {
            const symbol = entry.symbol.toUpperCase();
            if (!groups.has(symbol)) groups.set(symbol, []);
            groups.get(symbol)!.push(entry);
        }
        return groups;
    }, [costBasis]);

    const getCurrentPrice = (symbol: string): number => {
        return prices.find((p) => p.symbol.toUpperCase() === symbol.toUpperCase())?.price || 0;
    };

    return (
        <div className="space-y-6">
            {Array.from(grouped.entries()).map(([symbol, entries]) => {
                const currentPrice = getCurrentPrice(symbol);
                const totalQuantity = entries.reduce((sum, e) => sum + e.quantity, 0);
                const totalInvested = entries.reduce((sum, e) => sum + e.cost_price * e.quantity, 0);
                const totalCurrentValue = totalQuantity * currentPrice;
                const totalGainLoss = totalCurrentValue - totalInvested;
                const gainLossPercent = totalInvested
                    ? ((totalGainLoss / totalInvested) * 100).toFixed(4)
                    : "0.0000";

                return (
                    <div
                        key={symbol}
                        className="bg-slate-700/20 border border-slate-600/20 rounded-lg p-4"
                    >
                        {/* Coin Header */}
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                                <h3 className="text-yellow-300 text-lg font-semibold">
                                    {symbol}
                                </h3>
                                <p className="text-slate-200 text-base">Current price </p>
                                <p className="text-slate-300 text-base">
                                    ${formatPrice(currentPrice)}
                                </p>
                            </div>
                            <p
                                className={`font-semibold ${totalCurrentValue >= totalInvested ? "text-green-400" : "text-red-400"}`}
                            >
                                {totalCurrentValue >= totalInvested ? "+" : "-"}${Math.abs(totalCurrentValue - totalInvested).toFixed(2)}
                            </p>
                        </div>

                        {/* Purchases */}
                        <div className="space-y-2">
                            {entries.map((cost) => {
                                const totalInvestment = cost.cost_price * cost.quantity;
                                const currentValue = currentPrice * cost.quantity;
                                const gainLoss = currentValue - totalInvestment;
                                const gainLossPercent = totalInvestment
                                    ? ((gainLoss / totalInvestment) * 100).toFixed(4)
                                    : "0";

                                return (
                                    <div
                                        key={`purchase-${cost.id}`}
                                        className="bg-gradient-to-r from-slate-700/30 to-slate-700/10 border border-slate-600/30 rounded-lg p-3 flex items-center gap-4 text-sm"
                                    >
                                        <div className="w-28 flex-shrink-0">
                                            <p className="text-slate-400 text-xs">Cost Price</p>
                                            <p className="text-white font-semibold">${formatPrice(cost.cost_price)}</p>
                                        </div>

                                        <div className="w-20 flex-shrink-0">
                                            <p className="text-slate-400 text-xs">Qty</p>
                                            <p className="text-white font-semibold">{formatPrice(cost.quantity, 4)}</p>
                                        </div>

                                        <div className="flex-1 text-center">
                                            <p className="text-slate-400 text-xs">Invested</p>
                                            <p className="text-blue-400 font-semibold">
                                                ${formatPrice(totalInvestment, 4)}
                                            </p>
                                        </div>

                                        <div className="flex-1 text-center">
                                            <p className="text-slate-400 text-xs">Current</p>
                                            <p
                                                className={`font-semibold ${currentValue >= totalInvestment
                                                    ? "text-green-400"
                                                    : "text-red-400"
                                                    }`}
                                            >
                                                ${formatPrice(currentValue, 4)}
                                            </p>
                                        </div>

                                        <div className="flex-1 text-center">
                                            <p className="text-slate-400 text-xs">Return %</p>
                                            <p
                                                className={`font-semibold ${gainLoss >= 0 ? "text-green-400" : "text-red-400"
                                                    }`}
                                            >
                                                {gainLoss >= 0 ? "+" : ""}
                                                {gainLossPercent}%
                                            </p>
                                        </div>

                                        <div className="flex-1 text-center">
                                            <p className="text-slate-400 text-xs">P&L</p>
                                            <p
                                                className={`font-semibold ${gainLoss >= 0 ? "text-green-400" : "text-red-400"
                                                    }`}
                                            >
                                                ${formatPrice(gainLoss, 4)}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => onDeleteCostBasis(cost.id)}
                                            className="p-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg transition flex-shrink-0"
                                            title="Delete purchase"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                );
                            })}

                            {/* 🔹 Totals Row */}
                            <div className="mt-3 pt-3 border-t-2 border-blue-500/40 bg-white/5 rounded-md px-2 py-3 flex items-center gap-4 text-sm font-semibold">
                                <div className="w-28 flex-shrink-0" /> {/* empty for Cost Price */}

                                <div className="w-20 flex-shrink-0">
                                    <p className="text-xs text-slate-400">Total Qty</p>
                                    <p className="text-base text-yellow-400">
                                        {formatPrice(totalQuantity, 4)}
                                    </p>
                                </div>

                                <div className="flex-1 text-center">
                                    <p className="text-xs text-slate-400">Total Invested</p>
                                    <p className="text-base text-yellow-400">
                                        ${formatPrice(totalInvested, 4)}
                                    </p>
                                </div>

                                <div className="flex-1 text-center">
                                    <p className="text-xs text-slate-400">Total Current</p>
                                    <p
                                        className={`text-base font-semibold ${totalCurrentValue >= totalInvested
                                            ? "text-green-400"
                                            : "text-red-400"
                                            }`}
                                    >
                                        ${formatPrice(totalCurrentValue, 4)}
                                    </p>
                                </div>

                                <div className="flex-1 text-center">
                                    <p className="text-xs text-slate-400">Total Return %</p>
                                    <p className="text-base text-yellow-400">
                                        {totalGainLoss >= 0 ? "+" : ""}
                                        {gainLossPercent}%
                                    </p>
                                </div>

                                <div className="flex-1 text-center" /> {/* P&L empty */}
                                <div className="w-8 flex-shrink-0" /> {/* delete empty */}
                            </div>

                        </div>
                    </div>
                );
            })}
            {/* 🔹 Overall Portfolio Totals */}
{(() => {
  const allInvested = costBasis.reduce((sum, e) => sum + e.cost_price * e.quantity, 0);
  const allCurrent = costBasis.reduce((sum, e) => {
    const price =
      prices.find((p) => p.symbol.toUpperCase() === e.symbol.toUpperCase())?.price || 0;
    return sum + e.quantity * price;
  }, 0);
  const allDiff = allCurrent - allInvested;
  const allReturn = allInvested ? ((allDiff / allInvested) * 100).toFixed(2) : "0.00";

  return (
    <div className="mt-6 pt-3 border-t-2 border-blue-500/40 bg-white/5 rounded-md px-4 py-4 flex flex-wrap justify-around text-sm font-semibold">
      <div className="text-center">
        <p className="text-xs text-slate-400">Total Invested</p>
        <p className="text-base text-yellow-400">${allInvested.toFixed(2)}</p>
      </div>

      <div className="text-center">
        <p className="text-xs text-slate-400">Total Current</p>
        <p
          className={`text-base font-semibold ${
            allCurrent >= allInvested ? "text-green-400" : "text-red-400"
          }`}
        >
          ${allCurrent.toFixed(2)}
        </p>
      </div>

      <div className="text-center">
        <p className="text-xs text-slate-400">Total Return %</p>
        <p className="text-base text-yellow-400">
          {allDiff >= 0 ? "+" : ""}
          {allReturn}%
        </p>
      </div>

      <div className="text-center">
        <p className="text-xs text-slate-400">Net Change</p>
        <p
          className={`text-base font-semibold ${
            allDiff >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {allDiff >= 0 ? "+" : "-"}${Math.abs(allDiff).toFixed(2)}
        </p>
      </div>
    </div>
  );
})()}

        </div>
    );
}
