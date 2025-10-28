import React from "react";
import { Trash2, BarChart3, Bell, ChevronDown } from "lucide-react";
import CandleChart from "../components/CandleChart";
import { deduplicateHistoryByDate } from "../utils/helpers";
import { formatPrice } from "../utils/priceFormatters";
import type { AlertItem, Candle, CostBasis, HistoryItem } from "../types";

interface WatchlistDisplayProps {
  combinedItems: any[];
  draggedItem: number | null;
  expandedCharts: Set<string>;
  expandedHistory: Set<string>;
  expandedPurchaseHistory: Set<string>;
  candles: Map<string, Candle[]>;
  history: Map<string, HistoryItem[]>;
  alerts: AlertItem[];
  isFullPage?: boolean;
  loadingStates: Map<string, 'chart' | 'history' | null>;
  onToggleChart: (symbol: string, coinId: string) => void;
  onToggleHistory: (symbol: string, coinId: string) => void;
  onTogglePurchaseHistory: (symbol: string) => void;
  onRemoveFromWatchlist: (id: number) => void;
  onRemoveAlert: (id: number) => void;
  onDeleteCostBasis: (id: number) => void;
  onSetAlert: (symbol: string) => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: number) => void;
}

function WatchlistDisplay(props: WatchlistDisplayProps) {
  const {
    combinedItems,
    draggedItem,
    expandedCharts,
    expandedHistory,
    expandedPurchaseHistory,
    candles,
    history,
    alerts,
    isFullPage = false,
    loadingStates,
    onToggleChart,
    onToggleHistory,
    onTogglePurchaseHistory,
    onRemoveFromWatchlist,
    onRemoveAlert,
    onDeleteCostBasis,
    onSetAlert,
    onDragStart,
    onDragOver,
    onDrop,
  } = props;

  const getCoinsAlerts = (symbol: string) => {
    if (!symbol) return [];
    return alerts.filter((a) => a.symbol.toUpperCase() === symbol.toUpperCase());
  };

  if (combinedItems.length === 0) {
    return <p className="text-slate-400 text-center py-8">No coins tracked</p>;
  }

  const containerClass = isFullPage
    ? "space-y-4 pr-2"
    : "space-y-4 overflow-y-auto pr-2";

  return (
    <div className={containerClass}>
      {combinedItems.map(({ watchlist: wl, costBasis: costs, currentPrice }: any) => {
        const coinsAlerts = getCoinsAlerts(wl.symbol);
        const hasHistory = expandedHistory.has(wl.symbol);
        const hasChart = expandedCharts.has(wl.symbol);
        const hasPurchaseHistory = expandedPurchaseHistory.has(wl.symbol);
        const isDragging = draggedItem === wl.id;
        const isLoadingChart = loadingStates.get(wl.symbol) === 'chart';
        const isLoadingHistory = loadingStates.get(wl.symbol) === 'history';

        return (
          <div
            key={`watchlist-${wl.id}`}
            className="space-y-3 cursor-move"
            draggable
            onDragStart={(e) => onDragStart(e, wl.id)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, wl.id)}
            style={{
              opacity: isDragging ? 0.5 : 1,
              transition: 'opacity 0.2s',
              backgroundColor: draggedItem !== null && draggedItem !== wl.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
            }}
          >
            <div className="bg-gradient-to-r from-slate-700/30 to-slate-700/10 border border-slate-600/30 rounded-lg p-4 hover:border-blue-400/30 transition">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-shrink-0 min-w-[120px]">
                  <p className="font-semibold text-white text-lg">{wl.symbol}</p>
                  <p className="text-green-400 font-medium">Current: ${formatPrice(currentPrice)}</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <p className="text-sm font-semibold text-blue-300 my-2">Purchase History</p>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => onTogglePurchaseHistory(wl.symbol)}
                      className="p-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-lg transition"
                      title="Purchase History"
                    >
                      <ChevronDown size={16} className={`${hasPurchaseHistory ? "rotate-180" : ""} transition`} />
                    </button>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => onToggleChart(wl.symbol, wl.coin_id)}
                      disabled={isLoadingChart}
                      className={`p-2 ${isLoadingChart ? 'bg-blue-600/20 cursor-not-allowed' : 'bg-blue-600/30 hover:bg-blue-600/50'} text-blue-300 rounded-lg transition`}
                      title={isLoadingChart ? "Loading chart..." : "Chart"}
                    >
                      {isLoadingChart ? (
                        <div className="animate-spin">⟳</div>
                      ) : (
                        <BarChart3 size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => onToggleHistory(wl.symbol, wl.coin_id)}
                      disabled={isLoadingHistory}
                      className={`p-2 ${isLoadingHistory ? 'bg-purple-600/20 cursor-not-allowed' : 'bg-purple-600/30 hover:bg-purple-600/50'} text-purple-300 rounded-lg transition`}
                      title={isLoadingHistory ? "Loading history..." : "Price history"}
                    >
                      {isLoadingHistory ? (
                        <div className="animate-spin">⟳</div>
                      ) : (
                        <ChevronDown size={16} className={`${hasHistory ? "rotate-180" : ""} transition`} />
                      )}
                    </button>
                    <button
                      onClick={() => onSetAlert(wl.symbol)}
                      className="p-2 bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 rounded-lg transition relative"
                      title="Set price alert"
                    >
                      <Bell size={16} />
                      {coinsAlerts.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                          {coinsAlerts.length}
                        </span>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => onRemoveFromWatchlist(wl.id)}
                    className="p-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {hasChart && candles.has(wl.symbol) && (
              <div className="bg-slate-700/20 border border-slate-600/20 rounded-lg p-4">
                <CandleChart candles={candles.get(wl.symbol)!} />
              </div>
            )}

            {hasHistory && (
              <div className="bg-slate-700/20 border border-slate-600/20 rounded-lg p-4">
                <p className="text-slate-300 text-sm font-semibold mb-3">Price History (Daily OHLC)</p>
                <div className="flex text-slate-400 border-b border-slate-700/30 pb-1">
                  <span className="w-24 text-slate-300">Date</span>
                  <span className="flex-1 text-center text-blue-400">Open</span>
                  <span className="flex-1 text-center text-green-400">High</span>
                  <span className="flex-1 text-center text-red-400">Low</span>
                  <span className="flex-1 text-center text-purple-400">Close</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                  {history.has(wl.symbol) && history.get(wl.symbol)!.length > 0 ? (
                    deduplicateHistoryByDate(history.get(wl.symbol)!).map((item, idx) => (
                      <div key={`history-${wl.symbol}-${idx}`} className="flex justify-between text-slate-400 border-b border-slate-700/30 pb-1">
                        <span className="w-24 text-slate-300">{item.date}</span>
                        <span className="flex-1 text-center text-blue-400">O: ${formatPrice(item.open)}</span>
                        <span className="flex-1 text-center text-green-400">H: ${formatPrice(item.high)}</span>
                        <span className="flex-1 text-center text-red-400">L: ${formatPrice(item.low)}</span>
                        <span className="flex-1 text-center text-purple-400">C: ${formatPrice(item.close)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400">Loading history...</p>
                  )}
                </div>
              </div>
            )}

            {costs.length > 0 && hasPurchaseHistory && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-blue-300 ml-1">Purchase History {wl.symbol}</p>
                {costs.map((cost: CostBasis) => {
                  const totalInvestment = cost.cost_price * cost.quantity;
                  const currentValue = currentPrice * cost.quantity;
                  const gainLoss = currentValue - totalInvestment;
                  const gainLossPercent = totalInvestment ? ((gainLoss / totalInvestment) * 100).toFixed(4) : "0";

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
                        <p className="text-white font-semibold">{cost.quantity}</p>
                      </div>

                      <div className="flex-1 text-center">
                        <p className="text-slate-400 text-xs">Invested</p>
                        <p className="text-blue-400 font-semibold">${formatPrice(totalInvestment)}</p>
                      </div>

                      <div className="flex-1 text-center">
                        <p className="text-slate-400 text-xs">Current</p>
                        <p className={`font-semibold ${currentValue >= totalInvestment ? "text-green-400" : "text-red-400"}`}>
                          ${formatPrice(currentValue)}
                        </p>
                      </div>

                      <div className="flex-1 text-center">
                        <p className="text-slate-400 text-xs">Return %</p>
                        <p className={`font-semibold ${gainLoss >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {gainLoss >= 0 ? "+" : ""}{gainLossPercent}%
                        </p>
                      </div>

                      <div className="flex-1 text-center">
                        <p className="text-slate-400 text-xs">P&L</p>
                        <p className={`font-semibold ${gainLoss >= 0 ? "text-green-400" : "text-red-400"}`}>
                          ${formatPrice(gainLoss)}
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default WatchlistDisplay;
