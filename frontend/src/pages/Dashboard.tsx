import { useState, useEffect, useMemo, useRef } from "react";
import { Trash2, Plus, Bell, ChevronDown, X, Search, BarChart3, LogOut, TrendingUp, TrendingDown } from "lucide-react";
import { formatPrice } from '../utils/priceFormatters';

const API_URL = "http://localhost:8000";

interface CoinPrice {
  symbol: string;
  price: number;
}

interface WatchlistItem {
  id: number;
  symbol: string;
  coin_id: string;
  created_at: string;
}

interface AlertItem {
  id: number;
  symbol: string;
  target_price: number;
  created_at: string;
}

interface CostBasis {
  id: number;
  symbol: string;
  cost_price: number;
  quantity: number;
}

interface CoinOption {
  id: string;
  symbol: string;
}

interface HistoryItem {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Candle {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  x: string;
}

interface TrendingCoin {
  id: string;
  coin_id: number;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  price_btc: number;
}

interface TopGainerLoser {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  current_price: number;
}

type TabType = "dashboard" | "watchlist" | "markets" | "alerts";
type MarketTabType = "top100" | "trending" | "gainers_losers";

const TOP_100_COINS = [
  { symbol: "BTC", coin_id: "bitcoin" },
  { symbol: "ETH", coin_id: "ethereum" },
  { symbol: "USDT", coin_id: "tether" },
  { symbol: "BNB", coin_id: "binancecoin" },
  { symbol: "XRP", coin_id: "ripple" },
  { symbol: "SOL", coin_id: "solana" },
  { symbol: "USDC", coin_id: "usd-coin" },
  { symbol: "STETH", coin_id: "lido-staked-ether" },
  { symbol: "TRX", coin_id: "tron" },
  { symbol: "DOGE", coin_id: "dogecoin" },
  { symbol: "ADA", coin_id: "cardano" },
  { symbol: "WSTETH", coin_id: "wrapped-steth" },
  { symbol: "WBETH", coin_id: "wrapped-beacon-eth" },
  { symbol: "WBTC", coin_id: "wrapped-bitcoin" },
  { symbol: "LINK", coin_id: "chainlink" },
  { symbol: "USDE", coin_id: "ethena-usde" },
  { symbol: "WEETH", coin_id: "wrapped-eeth" },
  { symbol: "XLM", coin_id: "stellar" },
  { symbol: "HYPE", coin_id: "hyperliquid" },
  { symbol: "BCH", coin_id: "bitcoin-cash" },
  { symbol: "SUI", coin_id: "sui" },
  { symbol: "WETH", coin_id: "weth" },
  { symbol: "AVAX", coin_id: "avalanche-2" },
  { symbol: "USDS", coin_id: "usds" },
  { symbol: "LEO", coin_id: "leo-token" },
  { symbol: "CBBTC", coin_id: "coinbase-wrapped-btc" },
  { symbol: "HBAR", coin_id: "hedera-hashgraph" },
  { symbol: "LTC", coin_id: "litecoin" },
  { symbol: "SHIB", coin_id: "shiba-inu" },
  { symbol: "MNT", coin_id: "mantle" },
  { symbol: "XMR", coin_id: "monero" },
  { symbol: "TON", coin_id: "ton" },
  { symbol: "CRO", coin_id: "crypto-com-chain" },
  { symbol: "DOT", coin_id: "polkadot" },
  { symbol: "DAI", coin_id: "dai" },
  { symbol: "TAO", coin_id: "bittensor" },
  { symbol: "ZEC", coin_id: "zcash" },
  { symbol: "UNI", coin_id: "uniswap" },
  { symbol: "OKB", coin_id: "okb" },
  { symbol: "AAVE", coin_id: "aave" },
  { symbol: "ENA", coin_id: "ethena" },
  { symbol: "BGB", coin_id: "bitget-token" },
  { symbol: "PEPE", coin_id: "pepe" },
  { symbol: "NEAR", coin_id: "near" },
  { symbol: "PYUSD", coin_id: "paypal-usd" },
  { symbol: "JITOSOL", coin_id: "jito-staked-sol" },
  { symbol: "ETC", coin_id: "ethereum-classic" },
  { symbol: "APT", coin_id: "aptos" },
  { symbol: "XAUT", coin_id: "tether-gold" },
  { symbol: "POL", coin_id: "polygon" },
  { symbol: "WLD", coin_id: "worldcoin" },
  { symbol: "IP", coin_id: "story" },
  { symbol: "RETH", coin_id: "rocket-pool-eth" },
  { symbol: "KCS", coin_id: "kucoin-token" },
  { symbol: "ARB", coin_id: "arbitrum" },
  { symbol: "PI", coin_id: "pi" },
  { symbol: "ICP", coin_id: "internet-computer" },
  { symbol: "ALGO", coin_id: "algorand" },
  { symbol: "ATOM", coin_id: "cosmos" },
  { symbol: "VET", coin_id: "vechain" },
  { symbol: "WBNB", coin_id: "wrapped-bnb" },
  { symbol: "KAS", coin_id: "kaspa" },
  { symbol: "PUMP", coin_id: "pump-fun" },
  { symbol: "PENGU", coin_id: "pudgy-penguins" },
  { symbol: "PAXG", coin_id: "pax-gold" },
  { symbol: "RENDER", coin_id: "render-token" },
  { symbol: "FLR", coin_id: "flare" },
  { symbol: "LBTC", coin_id: "lombard-staked-btc" },
  { symbol: "QNT", coin_id: "quant-network" },
  { symbol: "SEI", coin_id: "sei" },
];

const deduplicateHistoryByDate = (items: HistoryItem[]): HistoryItem[] => {
  const dateMap = new Map<string, HistoryItem>();
  items.forEach(item => {
    dateMap.set(item.date, item);
  });
  return Array.from(dateMap.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

const CandleChart = ({ candles }: { candles: Candle[] }) => {
  if (!candles || candles.length === 0) return <div className="text-slate-400 text-sm">No data</div>;

  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const maxPrice = Math.max(...highs);
  const minPrice = Math.min(...lows);
  const range = maxPrice - minPrice || 1;

  return (
    <div className="h-56 flex items-end gap-1 bg-slate-900/30 rounded p-4">
      {candles.slice(-80).map((candle, idx) => {
        const openNorm = (candle.open - minPrice) / range;
        const closeNorm = (candle.close - minPrice) / range;
        const highNorm = (candle.high - minPrice) / range;
        const lowNorm = (candle.low - minPrice) / range;

        const bodyTop = Math.max(openNorm, closeNorm);
        const bodyBottom = Math.min(openNorm, closeNorm);
        const bodyHeight = Math.max((bodyTop - bodyBottom) * 100, 2);
        const wickTop = (highNorm - bodyTop) * 100;
        const wickBottom = (bodyBottom - lowNorm) * 100;

        const isGreen = candle.close >= candle.open;

        return (
          <div
            key={`candle-${idx}`}
            className="flex-1 flex flex-col items-center justify-end"
            title={`${candle.date}: O:${formatPrice(candle.open)} H:${formatPrice(candle.high)} L:${formatPrice(candle.low)} C:${formatPrice(candle.close)}`}
          >
            {wickTop > 0 && (
              <div className="w-0.5 bg-slate-500" style={{ height: `${wickTop}%` }} />
            )}
            <div
              className={`w-full ${isGreen ? "bg-green-500" : "bg-red-500"}`}
              style={{ height: `${bodyHeight}%`, minHeight: "2px" }}
            />
            {wickBottom > 0 && (
              <div className="w-0.5 bg-slate-500" style={{ height: `${wickBottom}%` }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// WATCHLIST COMPONENT
interface WatchlistDisplayProps {
  combinedItems: any[];
  draggedItem: number | null;
  expandedCharts: Set<string>;
  expandedHistory: Set<string>;
  expandedPurchaseHistory: Set<string>;
  candles: Map<string, Candle[]>;
  history: Map<string, HistoryItem[]>;
  alerts: AlertItem[];
  isFullPage?: boolean; // NEW: for conditional styling
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
    ? "space-y-4 overflow-y-auto pr-2" 
    : "space-y-4 max-h-full overflow-y-auto pr-2";

  return (
    <div className={containerClass}>
      {combinedItems.map(({ watchlist: wl, costBasis: costs, currentPrice }: any) => {
        const coinsAlerts = getCoinsAlerts(wl.symbol);
        const hasHistory = expandedHistory.has(wl.symbol);
        const hasChart = expandedCharts.has(wl.symbol);
        const hasPurchaseHistory = expandedPurchaseHistory.has(wl.symbol);
        const isDragging = draggedItem === wl.id;

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
                      className="p-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-lg transition"
                      title="Chart"
                    >
                      <BarChart3 size={16} />
                    </button>
                    <button
                      onClick={() => onToggleHistory(wl.symbol, wl.coin_id)}
                      className="p-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-lg transition"
                      title="Price history"
                    >
                      <ChevronDown size={16} className={`${hasHistory ? "rotate-180" : ""} transition`} />
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

// MARKET COMPONENT
function MarketDisplay({
  searchCoin,
  onSearchChange,
  watchlist,
  onAddToWatchlist,
  marketPrices,
  isFullPage = false,
}: {
  searchCoin: string;
  onSearchChange: (value: string) => void;
  watchlist: WatchlistItem[];
  onAddToWatchlist: (coinId: string) => void;
  marketPrices: Map<string, number>;
  isFullPage?: boolean;
}) {
  const [marketSearchOpen, setMarketSearchOpen] = useState(false);
  const [activeMarketTab, setActiveMarketTab] = useState<MarketTabType>("top100");
  const [trendingCoins, setTrendingCoins] = useState<TrendingCoin[]>([]);
  const [topGainers, setTopGainers] = useState<TopGainerLoser[]>([]);
  const [topLosers, setTopLosers] = useState<TopGainerLoser[]>([]);
  const marketSearchRef = useRef<HTMLDivElement>(null);
  const token = typeof window !== 'undefined' ? window.localStorage?.getItem("token") : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (marketSearchRef.current && !marketSearchRef.current.contains(event.target as Node)) {
        setMarketSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeMarketTab === "trending") {
      fetchTrendingCoins();
    } else if (activeMarketTab === "gainers_losers") {
      fetchGainersLosers();
    }
  }, [activeMarketTab]);

  const fetchTrendingCoins = async () => {
    try {
      const response = await fetch(`${API_URL}/market/trending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTrendingCoins(data);
    } catch (err) {
      console.error("Failed to fetch trending coins:", err);
    }
  };

  const fetchGainersLosers = async () => {
    try {
      const response = await fetch(`${API_URL}/market/top-gainers-losers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTopGainers(data.top_gainers || []);
      setTopLosers(data.top_losers || []);
    } catch (err) {
      console.error("Failed to fetch gainers/losers:", err);
    }
  };

  const containerClass = isFullPage 
    ? "flex flex-col h-full" 
    : "flex flex-col h-full min-h-0";

  const contentClass = isFullPage
    ? "flex-1 overflow-y-auto space-y-2"
    : "flex-1 overflow-y-auto space-y-2 min-h-0";

  return (
    <div className={containerClass}>
      {/* Market Tabs */}
      <div className="flex gap-2 mb-4 border-b border-slate-600/30">
        <button
          onClick={() => setActiveMarketTab("top100")}
          className={`px-4 py-2 font-semibold transition border-b-2 ${
            activeMarketTab === "top100"
              ? "text-purple-400 border-purple-400"
              : "text-slate-400 border-transparent hover:text-slate-300"
          }`}
        >
          Top 100
        </button>
        <button
          onClick={() => setActiveMarketTab("trending")}
          className={`px-4 py-2 font-semibold transition border-b-2 flex items-center gap-2 ${
            activeMarketTab === "trending"
              ? "text-purple-400 border-purple-400"
              : "text-slate-400 border-transparent hover:text-slate-300"
          }`}
        >
          <TrendingUp size={16} />
          Trending
        </button>
        <button
          onClick={() => setActiveMarketTab("gainers_losers")}
          className={`px-4 py-2 font-semibold transition border-b-2 flex items-center gap-2 ${
            activeMarketTab === "gainers_losers"
              ? "text-purple-400 border-purple-400"
              : "text-slate-400 border-transparent hover:text-slate-300"
          }`}
        >
          <TrendingDown size={16} />
          Gainers & Losers
        </button>
      </div>

      {activeMarketTab === "top100" && (
        <>
          <div className="mb-4 relative" ref={marketSearchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search coins (BTC, ETH, RENDER, etc)..."
                value={searchCoin}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setMarketSearchOpen(true);
                }}
                onFocus={() => setMarketSearchOpen(true)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400/50 transition"
              />
              {searchCoin && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {marketSearchOpen && searchCoin && (
              <div className="absolute left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-2xl z-40 max-h-64 overflow-y-auto">
                {TOP_100_COINS.filter(coin =>
                  coin.symbol.toLowerCase().includes(searchCoin.toLowerCase())
                ).length > 0 ? (
                  TOP_100_COINS.filter(coin =>
                    coin.symbol.toLowerCase().includes(searchCoin.toLowerCase())
                  ).slice(0, 20).map((coin) => {
                    const isInWatchlist = watchlist.some(w => w.coin_id === coin.coin_id);
                    const price = marketPrices.get(coin.coin_id);
                    
                    return (
                      <div
                        key={`search-${coin.coin_id}`}
                        className="px-4 py-3 border-b border-slate-600 last:border-b-0 hover:bg-slate-600 transition flex justify-between items-center"
                      >
                        <div>
                          <span className="font-semibold text-white">{coin.symbol.toUpperCase()}</span>
                          <span className="text-green-400 ml-3 text-sm">${formatPrice(price)}</span>
                        </div>
                        <button
                          onClick={() => {
                            if (!isInWatchlist) {
                              onAddToWatchlist(coin.coin_id);
                              setMarketSearchOpen(false);
                            }
                          }}
                          disabled={isInWatchlist}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            isInWatchlist
                              ? "bg-green-600/20 text-green-300"
                              : "bg-blue-600/30 hover:bg-blue-600/50 text-blue-300"
                          }`}
                        >
                          {isInWatchlist ? "✓" : "+"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-slate-400 text-sm">No coins found</div>
                )}
              </div>
            )}
          </div>

          <div className={contentClass}>
            {TOP_100_COINS.map((coin) => {
              const isInWatchlist = watchlist.some(w => w.coin_id === coin.coin_id);
              const price = marketPrices.get(coin.coin_id);

              return (
                <div key={`market-${coin.coin_id}`} className="bg-gradient-to-r from-slate-700/30 to-slate-700/10 border border-slate-600/30 rounded-lg p-3 hover:border-purple-400/30 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-white">{coin.symbol.toUpperCase()}</p>
                      <p className="text-green-400 text-xs">
                        ${formatPrice(price)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (!isInWatchlist) {
                          onAddToWatchlist(coin.coin_id);
                        }
                      }}
                      disabled={isInWatchlist}
                      className={`px-2 py-1 rounded text-xs font-medium transition flex-shrink-0 ${
                        isInWatchlist
                          ? "bg-green-600/20 text-green-300 cursor-default"
                          : "bg-blue-600/30 hover:bg-blue-600/50 text-blue-300"
                      }`}
                    >
                      {isInWatchlist ? "✓ Added" : "Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeMarketTab === "trending" && (
        <div className={contentClass}>
          {trendingCoins.length > 0 ? (
            trendingCoins.map((coin, idx) => {
              const isInWatchlist = watchlist.some(w => w.coin_id === coin.id);
              
              return (
                <div key={`trending-${coin.id}-${idx}`} className="bg-gradient-to-r from-purple-700/20 to-purple-700/10 border border-purple-600/30 rounded-lg p-3 hover:border-purple-400/50 transition">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="text-purple-400 font-bold text-lg">#{idx + 1}</span>
                      <div>
                        <p className="font-semibold text-white">{coin.symbol.toUpperCase()}</p>
                        <p className="text-slate-400 text-xs">{coin.name}</p>
                        <p className="text-purple-300 text-xs">Rank: #{coin.market_cap_rank}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!isInWatchlist) {
                          onAddToWatchlist(coin.id);
                        }
                      }}
                      disabled={isInWatchlist}
                      className={`px-2 py-1 rounded text-xs font-medium transition flex-shrink-0 ${
                        isInWatchlist
                          ? "bg-green-600/20 text-green-300 cursor-default"
                          : "bg-purple-600/30 hover:bg-purple-600/50 text-purple-300"
                      }`}
                    >
                      {isInWatchlist ? "✓ Added" : "Add"}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-slate-400 text-center py-8">Loading trending coins...</p>
          )}
        </div>
      )}

      {activeMarketTab === "gainers_losers" && (
        <div className={contentClass}>
          <div className="mb-6">
            <h3 className="text-green-400 font-bold mb-3 flex items-center gap-2">
              <TrendingUp size={18} />
              Top Gainers (24h)
            </h3>
            <div className="space-y-2">
              {topGainers.length > 0 ? (
                topGainers.map((coin, idx) => {
                  const isInWatchlist = watchlist.some(w => w.coin_id === coin.id);
                  
                  return (
                    <div key={`gainer-${coin.id}-${idx}`} className="bg-gradient-to-r from-green-700/20 to-green-700/10 border border-green-600/30 rounded-lg p-3 hover:border-green-400/50 transition">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-green-400 font-bold text-lg">#{idx + 1}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-white">{coin.symbol.toUpperCase()}</p>
                            <p className="text-slate-400 text-xs">{coin.name}</p>
                            <div className="flex gap-3 mt-1">
                              <p className="text-green-300 text-sm">${formatPrice(coin.current_price)}</p>
                              <p className="text-green-400 font-bold text-sm">
                                +{coin.price_change_percentage_24h.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (!isInWatchlist) {
                              onAddToWatchlist(coin.id);
                            }
                          }}
                          disabled={isInWatchlist}
                          className={`px-2 py-1 rounded text-xs font-medium transition flex-shrink-0 ${
                            isInWatchlist
                              ? "bg-green-600/20 text-green-300 cursor-default"
                              : "bg-green-600/30 hover:bg-green-600/50 text-green-300"
                          }`}
                        >
                          {isInWatchlist ? "✓" : "+"}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-400 text-center py-4">Loading top gainers...</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
              <TrendingDown size={18} />
              Top Losers (24h)
            </h3>
            <div className="space-y-2">
              {topLosers.length > 0 ? (
                topLosers.map((coin, idx) => {
                  const isInWatchlist = watchlist.some(w => w.coin_id === coin.id);
                  
                  return (
                    <div key={`loser-${coin.id}-${idx}`} className="bg-gradient-to-r from-red-700/20 to-red-700/10 border border-red-600/30 rounded-lg p-3 hover:border-red-400/50 transition">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-red-400 font-bold text-lg">#{idx + 1}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-white">{coin.symbol.toUpperCase()}</p>
                            <p className="text-slate-400 text-xs">{coin.name}</p>
                            <div className="flex gap-3 mt-1">
                              <p className="text-red-300 text-sm">${formatPrice(coin.current_price)}</p>
                              <p className="text-red-400 font-bold text-sm">
                                {coin.price_change_percentage_24h.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (!isInWatchlist) {
                              onAddToWatchlist(coin.id);
                            }
                          }}
                          disabled={isInWatchlist}
                          className={`px-2 py-1 rounded text-xs font-medium transition flex-shrink-0 ${
                            isInWatchlist
                              ? "bg-green-600/20 text-green-300 cursor-default"
                              : "bg-red-600/30 hover:bg-red-600/50 text-red-300"
                          }`}
                        >
                          {isInWatchlist ? "✓" : "+"}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-400 text-center py-4">Loading top losers...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ALERTS GROUPED COMPONENT
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
    ? "space-y-6 overflow-y-auto"
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

function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: CoinOption[];
  value: string;
  onChange: (coinId: string) => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return options.slice(0, 100);
    
    const searchLower = search.toLowerCase();
    const searchUpper = search.toUpperCase();
    const seen = new Set<string>();
    const result: CoinOption[] = [];
    
    options.forEach((opt) => {
      if (opt.symbol.toUpperCase() === searchUpper && !seen.has(opt.id)) {
        result.push(opt);
        seen.add(opt.id);
      }
    });
    
    options.forEach((opt) => {
      if (opt.id.toLowerCase() === searchLower && !seen.has(opt.id)) {
        result.push(opt);
        seen.add(opt.id);
      }
    });
    
    options.forEach((opt) => {
      if (opt.symbol.toLowerCase().startsWith(searchLower) && !seen.has(opt.id)) {
        result.push(opt);
        seen.add(opt.id);
      }
    });
    
    options.forEach((opt) => {
      if (opt.id.toLowerCase().startsWith(searchLower) && !seen.has(opt.id)) {
        result.push(opt);
        seen.add(opt.id);
      }
    });
    
    return result.slice(0, 20);
  }, [search, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative z-50" ref={containerRef}>
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={placeholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400/50 transition"
          />
        </div>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setSearch("");
            }}
            className="px-3 py-2.5 bg-slate-700/50 hover:bg-slate-600 text-white rounded-lg transition"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto">
          {filtered.map((option, idx) => {
            const isExactSymbolMatch = option.symbol.toUpperCase() === search.toUpperCase();
            const isExactIdMatch = option.id.toLowerCase() === search.toLowerCase();
            const isExactMatch = isExactSymbolMatch || isExactIdMatch;
            
            return (
              <button
                key={`${option.id}-${idx}`}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setSearch(option.symbol);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-white text-left text-sm border-b border-slate-600 last:border-b-0 transition flex justify-between items-center ${
                  isExactMatch 
                    ? "bg-green-600/30 hover:bg-green-600/50" 
                    : "hover:bg-slate-600"
                }`}
              >
                <div>
                  <span className={`font-semibold ${isExactMatch ? "text-green-300" : ""}`}>
                    {option.symbol.toUpperCase()}
                  </span>
                  <span className="text-slate-400 text-xs ml-2">{option.id}</span>
                  {isExactMatch && <span className="text-green-300 text-xs ml-2">✓ Exact match</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
      
      {isOpen && search && filtered.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-2xl z-50 p-4">
          <p className="text-slate-400 text-sm">
            No coins found matching "{search}". Try searching by:
            <br />• Symbol (e.g., BTC, ETH)
            <br />• Coin name (e.g., bitcoin, ethereum)
          </p>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const token = typeof window !== 'undefined' ? window.localStorage?.getItem("token") : null;

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [prices, setPrices] = useState<CoinPrice[]>([]);
  const [allCoins, setAllCoins] = useState<CoinOption[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [costBasis, setCostBasis] = useState<CostBasis[]>([]);
  const [candles, setCandles] = useState<Map<string, Candle[]>>(new Map());
  const [history, setHistory] = useState<Map<string, HistoryItem[]>>(new Map());
  const [marketPrices, setMarketPrices] = useState<Map<string, number>>(new Map());

  const [selectedCoin, setSelectedCoin] = useState("");
  const [alertPrice, setAlertPrice] = useState<number | undefined>(undefined);
  const [newCostSymbol, setNewCostSymbol] = useState("");
  const [newCostPrice, setNewCostPrice] = useState<number | undefined>(undefined);
  const [newCostQuantity, setNewCostQuantity] = useState<number | undefined>(undefined);
  const [searchCoin, setSearchCoin] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set());
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [expandedPurchaseHistory, setExpandedPurchaseHistory] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const fetchAllCoins = async () => {
    try {
      const response = await fetch(`${API_URL}/charts/available-coins`);
      const data = await response.json();
      setAllCoins(data);
    } catch (err) {
      console.error("Coin list fetch failed");
    }
  };

  const fetchMarketPrices = async () => {
    try {
      const coinIds = TOP_100_COINS.map(c => c.coin_id).join(',');
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`);
      const data = await response.json();
      
      const priceMap = new Map<string, number>();
      Object.entries(data).forEach(([coinId, priceData]: [string, any]) => {
        priceMap.set(coinId, priceData.usd);
      });
      setMarketPrices(priceMap);
    } catch (err) {
      console.error("Failed to fetch market prices:", err);
    }
  };

  const fetchAllData = async () => {
    if (!token) {
      console.error("No token available");
      return;
    }
    
    try {
      setLoading(true);
      setError("");

      try {
        const pricesRes = await fetch(`${API_URL}/prices`, {
          method: 'GET',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (!pricesRes.ok) {
          setPrices([]);
        } else {
          const pricesData = await pricesRes.json();
          setPrices(Array.isArray(pricesData) ? pricesData : []);
        }
      } catch (err) {
        console.error("Error fetching prices:", err);
        setPrices([]);
      }

      try {
        const watchlistRes = await fetch(`${API_URL}/watchlist/`, {
          method: 'GET',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (watchlistRes.status === 404) {
          setWatchlist([]);
        } else if (!watchlistRes.ok) {
          setWatchlist([]);
        } else {
          const watchlistData = await watchlistRes.json();
          setWatchlist(Array.isArray(watchlistData) ? watchlistData : []);
        }
      } catch (err) {
        console.error("Error fetching watchlist:", err);
        setWatchlist([]);
      }

      try {
        const alertsRes = await fetch(`${API_URL}/alerts/`, {
          method: 'GET',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (alertsRes.status === 404) {
          setAlerts([]);
        } else if (!alertsRes.ok) {
          setAlerts([]);
        } else {
          const alertsData = await alertsRes.json();
          setAlerts(Array.isArray(alertsData) ? alertsData : []);
        }
      } catch (err) {
        console.error("Error fetching alerts:", err);
        setAlerts([]);
      }

      try {
        const costRes = await fetch(`${API_URL}/cost-basis/`, {
          method: 'GET',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (costRes.status === 404) {
          setCostBasis([]);
        } else if (!costRes.ok) {
          setCostBasis([]);
        } else {
          const costData = await costRes.json();
          setCostBasis(Array.isArray(costData) ? costData : []);
        }
      } catch (err) {
        console.error("Error fetching cost basis:", err);
        setCostBasis([]);
      }

      setSuccess("Data refreshed!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error in fetchAllData:", err);
      setError(err.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCoins();
    fetchAllData();
    fetchMarketPrices();
  }, [token]);

  const handleTriggerFetch = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch(`${API_URL}/fetch/fetch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      await fetchAllData();
      setSuccess("✓ Prices updated!");
      setTimeout(() => setSuccess(""), 5000);
      
    } catch (err: any) {
      const errorMessage = err.message || "Error refreshing prices";
      setError(`${errorMessage}`);
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async (coinId: string) => {
    if (!coinId) {
      setError("Select a coin");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/watchlist/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coin_id: coinId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.detail || `Error: ${response.status}`;
        setError(errorMessage);
        setTimeout(() => setError(""), 5000);
        return;
      }

      const data = await response.json();
      setWatchlist([...watchlist, data]);
      setSelectedCoin("");
      setSuccess("Added to watchlist!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      const errorMessage = err.message || "Error adding to watchlist";
      setError(errorMessage);
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleRemoveFromWatchlist = async (id: number) => {
    try {
      await fetch(`${API_URL}/watchlist/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setWatchlist(watchlist.filter((item) => item.id !== id));
      setSuccess("Removed from watchlist!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Error removing from watchlist");
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoin || !alertPrice) {
      setError("Select coin and enter target price");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/alerts/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbol: selectedCoin, target_price: alertPrice })
      });
      const data = await response.json();
      setAlerts([...alerts, data]);
      setAlertPrice(undefined);
      setShowAlertModal(false);
      setSuccess("Alert created!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Error creating alert");
    }
  };

  const handleRemoveAlert = async (id: number) => {
    try {
      await fetch(`${API_URL}/alerts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(alerts.filter((item) => item.id !== id));
      setSuccess("Alert removed!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Error removing alert");
    }
  };

  const handleAddCostBasis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCostSymbol || !newCostPrice || !newCostQuantity) {
      setError("Fill all fields");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/cost-basis/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbol: newCostSymbol, cost_price: newCostPrice, quantity: newCostQuantity })
      });
      const data = await response.json();
      setCostBasis([...costBasis, data]);
      setNewCostSymbol("");
      setNewCostPrice(undefined);
      setNewCostQuantity(undefined);
      setSuccess("Purchase tracked!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Error adding purchase");
    }
  };

  const handleDeleteCostBasis = async (id: number) => {
    try {
      await fetch(`${API_URL}/cost-basis/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setCostBasis(costBasis.filter((item) => item.id !== id));
      setSuccess("Purchase removed!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Error removing purchase");
    }
  };

  const togglePurchaseHistory = (symbol: string) => {
    const newExpanded = new Set(expandedPurchaseHistory);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
    }
    setExpandedPurchaseHistory(newExpanded);
  };

  const toggleHistory = async (symbol: string, coinId: string) => {
    const newExpanded = new Set(expandedHistory);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
      if (!history.has(symbol)) {
        await fetchHistory(symbol, coinId);
      }
    }
    setExpandedHistory(newExpanded);
  };

  const fetchHistory = async (symbol: string, coinId: string) => {
    try {
      const url = `${API_URL}/charts/history/${coinId}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const historyData = data.history || [];
      
      if (!historyData || historyData.length === 0) {
        setError(`No price history available for ${symbol}`);
        setTimeout(() => setError(""), 5000);
      } else {
        setHistory(new Map(history).set(symbol, historyData));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load history: ${errorMsg}`);
      setTimeout(() => setError(""), 5000);
    }
  };

  const fetchCandles = async (symbol: string, coinId: string) => {
    try {
      const url = `${API_URL}/charts/chart/${coinId}?days=30&interval=4h`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const candleData = data.candles || [];
      
      if (!candleData || candleData.length === 0) {
        setError(`No chart data available for ${symbol}`);
        setTimeout(() => setError(""), 5000);
      } else {
        setCandles(new Map(candles).set(symbol, candleData));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load chart: ${errorMsg}`);
      setTimeout(() => setError(""), 5000);
    }
  };

  const toggleChart = async (symbol: string, coinId: string) => {
    const newExpanded = new Set(expandedCharts);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
      if (!candles.has(symbol)) {
        await fetchCandles(symbol, coinId);
      }
    }
    setExpandedCharts(newExpanded);
  };

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const getCoinCostBasis = (symbol: string) => {
    if (!symbol) return [];
    return costBasis.filter((c) => {
      if (!c.symbol) return false;
      return c.symbol.toUpperCase() === symbol.toUpperCase();
    });
  };

  const combinedItems = watchlist.map((wl) => {
    if (!wl.symbol) return null;
    
    const costs = getCoinCostBasis(wl.symbol);
    const pricesArray = Array.isArray(prices) ? prices : [];
    const currentPrice = pricesArray.find((p) => p.symbol.toUpperCase() === wl.symbol.toUpperCase())?.price || 0;
    
    return { watchlist: wl, costBasis: costs, currentPrice };
  }).filter((item) => item !== null);

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", "");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === targetId) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = watchlist.findIndex(item => item.id === draggedItem);
    const targetIndex = watchlist.findIndex(item => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    const newWatchlist = [...watchlist];
    const draggedItemData = newWatchlist[draggedIndex];
    newWatchlist.splice(draggedIndex, 1);
    newWatchlist.splice(targetIndex, 0, draggedItemData);
    
    setWatchlist(newWatchlist);
    setDraggedItem(null);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-900 to-slate-950 flex flex-col">
      <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-950 to-purple-950 border-b border-blue-500/50 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text">
            Crypto Tracker
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleTriggerFetch}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white rounded-lg font-semibold transition shadow-lg"
            >
              {loading ? "Updating..." : "Refresh Prices"}
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/50 rounded-lg transition flex items-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 border-t border-slate-700">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-6 py-3 font-semibold transition border-b-2 ${activeTab === "dashboard"
                  ? "text-blue-400 border-blue-400"
                  : "text-slate-400 border-transparent hover:text-slate-300"
                }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("watchlist")}
              className={`px-6 py-3 font-semibold transition border-b-2 ${activeTab === "watchlist"
                  ? "text-blue-400 border-blue-400"
                  : "text-slate-400 border-transparent hover:text-slate-300"
                }`}
            >
              Watchlist
            </button>
            <button
              onClick={() => setActiveTab("markets")}
              className={`px-6 py-3 font-semibold transition border-b-2 ${activeTab === "markets"
                  ? "text-blue-400 border-blue-400"
                  : "text-slate-400 border-transparent hover:text-slate-300"
                }`}
            >
              Markets
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`px-6 py-3 font-semibold transition border-b-2 relative ${activeTab === "alerts"
                  ? "text-blue-400 border-blue-400"
                  : "text-slate-400 border-transparent hover:text-slate-300"
                }`}
            >
              Alerts
              {alerts.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {alerts.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="fixed top-20 right-4 z-50 w-80 pointer-events-none">
        {error && (
          <div className="mb-3 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg flex justify-between items-center pointer-events-auto">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-300">
              <X size={20} />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-3 p-4 bg-green-500/20 border border-green-500/50 text-green-200 rounded-lg flex justify-between items-center pointer-events-auto">
            <span>{success}</span>
            <button onClick={() => setSuccess("")} className="text-green-300">
              <X size={20} />
            </button>
          </div>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 mt-32 flex-1 overflow-y-auto">
        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-6">
              {/* LEFT COLUMN - Add to Watchlist */}
              <div className="col-span-2 bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl z-30">
                <h3 className="text-white font-bold mb-4">Add to Watchlist</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddToWatchlist(selectedCoin);
                  }}
                  className="flex gap-2"
                >
                  <div className="flex-1">
                    <SearchableDropdown
                      options={allCoins}
                      value={selectedCoin}
                      onChange={setSelectedCoin}
                      placeholder="Search coins..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition flex-shrink-0"
                  >
                    <Plus size={18} />
                  </button>
                </form>
              </div>

              {/* RIGHT COLUMN - Add Purchase */}
              <div className="bg-slate-800/40 border border-green-500/20 rounded-xl p-4 backdrop-blur-sm shadow-xl">
                <h3 className="text-white font-bold mb-3 text-sm">Add Purchase</h3>
                <form onSubmit={handleAddCostBasis} className="flex gap-1 items-end">
                  <input
                    type="text"
                    placeholder="Symbol"
                    value={newCostSymbol}
                    onChange={(e) => setNewCostSymbol(e.target.value.toUpperCase())}
                    className="w-16 px-2 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={newCostPrice || ""}
                    onChange={(e) => setNewCostPrice(e.target.value ? Number(e.target.value) : undefined)}
                    step="0.01"
                    className="flex-1 px-2 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={newCostQuantity || ""}
                    onChange={(e) => setNewCostQuantity(e.target.value ? Number(e.target.value) : undefined)}
                    step="0.01"
                    className="w-16 px-2 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded font-semibold transition flex-shrink-0"
                  >
                    <Plus size={16} />
                  </button>
                </form>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* LEFT COLUMN - My Watchlist (2 cols) */}
              <div className="col-span-2 bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
                <h2 className="text-xl font-bold text-blue-200 mb-4">My Watchlist</h2>
                <div className="pr-2">
                  <WatchlistDisplay
                    combinedItems={combinedItems}
                    draggedItem={draggedItem}
                    expandedCharts={expandedCharts}
                    expandedHistory={expandedHistory}
                    expandedPurchaseHistory={expandedPurchaseHistory}
                    candles={candles}
                    history={history}
                    alerts={alerts}
                    isFullPage={false}
                    onToggleChart={toggleChart}
                    onToggleHistory={toggleHistory}
                    onTogglePurchaseHistory={togglePurchaseHistory}
                    onRemoveFromWatchlist={handleRemoveFromWatchlist}
                    onRemoveAlert={handleRemoveAlert}
                    onDeleteCostBasis={handleDeleteCostBasis}
                    onSetAlert={(symbol) => {
                      setSelectedCoin(symbol);
                      setShowAlertModal(true);
                    }}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                </div>
              </div>

              {/* RIGHT COLUMN - Market (1 col) */}
              <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
                <h2 className="text-xl font-bold text-purple-200 mb-4">Market</h2>
                <div className="pr-2">
                  <MarketDisplay
                    searchCoin={searchCoin}
                    onSearchChange={setSearchCoin}
                    watchlist={watchlist}
                    onAddToWatchlist={handleAddToWatchlist}
                    marketPrices={marketPrices}
                    isFullPage={false}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WATCHLIST TAB */}
        {activeTab === "watchlist" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl z-30">
                <h3 className="text-white font-bold mb-4">Add to Watchlist</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddToWatchlist(selectedCoin);
                  }}
                  className="flex gap-2"
                >
                  <div className="flex-1">
                    <SearchableDropdown
                      options={allCoins}
                      value={selectedCoin}
                      onChange={setSelectedCoin}
                      placeholder="Search coins..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition flex-shrink-0"
                  >
                    <Plus size={18} />
                  </button>
                </form>
              </div>

              <div className="bg-slate-800/40 border border-green-500/20 rounded-xl p-4 backdrop-blur-sm shadow-xl">
                <h3 className="text-white font-bold mb-3 text-sm">Add Purchase</h3>
                <form onSubmit={handleAddCostBasis} className="flex gap-1 items-end">
                  <input
                    type="text"
                    placeholder="Symbol"
                    value={newCostSymbol}
                    onChange={(e) => setNewCostSymbol(e.target.value.toUpperCase())}
                    className="w-16 px-2 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={newCostPrice || ""}
                    onChange={(e) => setNewCostPrice(e.target.value ? Number(e.target.value) : undefined)}
                    step="0.01"
                    className="flex-1 px-2 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={newCostQuantity || ""}
                    onChange={(e) => setNewCostQuantity(e.target.value ? Number(e.target.value) : undefined)}
                    step="0.01"
                    className="w-16 px-2 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded font-semibold transition flex-shrink-0"
                  >
                    <Plus size={16} />
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl h-[calc(100vh-350px)]">
              <h2 className="text-xl font-bold text-blue-200 mb-4">My Watchlist</h2>
              <WatchlistDisplay
                combinedItems={combinedItems}
                draggedItem={draggedItem}
                expandedCharts={expandedCharts}
                expandedHistory={expandedHistory}
                expandedPurchaseHistory={expandedPurchaseHistory}
                candles={candles}
                history={history}
                alerts={alerts}
                isFullPage={true}
                onToggleChart={toggleChart}
                onToggleHistory={toggleHistory}
                onTogglePurchaseHistory={togglePurchaseHistory}
                onRemoveFromWatchlist={handleRemoveFromWatchlist}
                onRemoveAlert={handleRemoveAlert}
                onDeleteCostBasis={handleDeleteCostBasis}
                onSetAlert={(symbol) => {
                  setSelectedCoin(symbol);
                  setShowAlertModal(true);
                }}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            </div>
          </div>
        )}

        {/* MARKETS TAB */}
        {activeTab === "markets" && (
          <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl h-[calc(100vh-250px)]">
            <h2 className="text-2xl font-bold text-purple-200 mb-4">Cryptocurrency Markets</h2>
            <MarketDisplay
              searchCoin={searchCoin}
              onSearchChange={setSearchCoin}
              watchlist={watchlist}
              onAddToWatchlist={handleAddToWatchlist}
              marketPrices={marketPrices}
              isFullPage={true}
            />
          </div>
        )}

        {/* ALERT MODAL */}
        {showAlertModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-yellow-500/30 rounded-xl p-8 max-w-md w-full shadow-2xl max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-yellow-200">Set Price Alert</h3>
                <button
                  onClick={() => {
                    setShowAlertModal(false);
                    setAlertPrice(undefined);
                  }}
                  className="text-slate-400 hover:text-white transition"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateAlert} className="space-y-4 mb-6">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Coin</label>
                  <p className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm">
                    {selectedCoin.toUpperCase()}
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Target Price ($)
                  </label>
                  <input
                    type="number"
                    placeholder="50000"
                    value={alertPrice || ""}
                    onChange={(e) =>
                      setAlertPrice(e.target.value ? Number(e.target.value) : undefined)
                    }
                    step="0.01"
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400/50 transition"
                  />
                </div>

                <p className="text-slate-400 text-sm">
                  Alert when {selectedCoin.toUpperCase()} reaches ${formatPrice(alertPrice) || "your target price"}
                </p>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAlertModal(false);
                      setAlertPrice(undefined);
                    }}
                    className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-lg font-medium transition"
                  >
                    Create Alert
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === "alerts" && (
          <div className="bg-slate-800/40 border border-yellow-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl h-[calc(100vh-250px)]">
            <h2 className="text-xl font-bold text-yellow-200 mb-4">Price Alerts</h2>
            <AlertsGrouped 
              alerts={alerts} 
              prices={prices} 
              onRemoveAlert={handleRemoveAlert}
              isFullPage={true}
            />
          </div>
        )}
      </main>
    </div>
  );
}