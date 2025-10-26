import React, { useMemo } from "react";
import { Trash2 } from "lucide-react";
import type { AlertItem, CoinPrice } from "../types";
import { formatPrice } from "../utils/helpers";

function AlertsGrouped({
  alerts,
  prices,
  onRemoveAlert,
  isFullPage = false
}: {
  alerts: AlertItem[],
  prices: CoinPrice[],
  onRemoveAlert: (id: number) => void,
  isFullPage?: boolean
}) {
  const groupedAlerts = useMemo(() => {
    const groups: { [key: string]: AlertItem[] } = {};
    alerts.forEach(alert => {
      if (!groups[alert.symbol]) {
        groups[alert.symbol] = [];
      }
      groups[alert.symbol].push(alert);
    });
    return groups;
  }, [alerts]);

  if (alerts.length === 0) {
    return <p className="text-slate-400 text-center py-8">No active price alerts</p>;
  }

  const containerClass = isFullPage
    ? "space-y-6"
    : "space-y-6";

  return (
    <div className={containerClass}>
      {Object.entries(groupedAlerts).map(([symbol, coinAlerts]) => {
        const currentPrice = prices.find(p => p.symbol === symbol)?.price || 0;

        return (
          <div key={`group-${symbol}`} className="border border-yellow-500/30 rounded-lg overflow-hidden">
            <div className="bg-yellow-500/10 px-4 py-3 border-b border-yellow-500/20">
              <h3 className="text-yellow-200 font-bold text-lg">{symbol}</h3>
              <p className="text-yellow-200/60 text-sm">Current Price: ${formatPrice(currentPrice)}</p>
            </div>
            <div className="space-y-2 p-4">
              {coinAlerts.map((alert) => {
                const status = currentPrice >= alert.target_price ? "TRIGGERED" : "PENDING";
                return (
                  <div key={`alert-${alert.id}`} className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="text-yellow-300 font-semibold">Target: ${formatPrice(alert.target_price)}</p>
                      <p className="text-yellow-200/60 text-xs">{status} • {new Date(alert.created_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => onRemoveAlert(alert.id)}
                      className="p-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AlertsGrouped;
