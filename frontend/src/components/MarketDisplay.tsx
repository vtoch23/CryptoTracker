import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Search, X } from "lucide-react";
import type { TrendingCoin, TopGainerLoser, WatchlistItem } from "../types";
import { API_URL, TOP_100_COINS } from "../utils/helpers";
import { formatPrice } from "../utils/priceFormatters";

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
  const [activeMarketTab, setActiveMarketTab] = useState<"top100" | "trending" | "gainers_losers">("top100");
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
    ? "flex flex-col"
    : "flex flex-col h-full min-h-0";

  const contentClass = isFullPage
    ? "flex-1 space-y-2 overflow-y-auto"
    : "flex-1 overflow-y-auto space-y-2 min-h-0";

  return (
    <div className={containerClass}>
      <div className="flex gap-2 mb-4 border-b border-slate-600/30">
        <button
          onClick={() => setActiveMarketTab("top100")}
          className={`px-4 py-2 font-semibold transition border-b-2 ${activeMarketTab === "top100"
              ? "text-purple-400 border-purple-400"
              : "text-slate-400 border-transparent hover:text-slate-300"
            }`}
        >
          Top 100
        </button>
        <button
          onClick={() => setActiveMarketTab("trending")}
          className={`px-4 py-2 font-semibold transition border-b-2 flex items-center gap-2 ${activeMarketTab === "trending"
              ? "text-purple-400 border-purple-400"
              : "text-slate-400 border-transparent hover:text-slate-300"
            }`}
        >
          <TrendingUp size={16} />
          Trending
        </button>
        <button
          onClick={() => setActiveMarketTab("gainers_losers")}
          className={`px-4 py-2 font-semibold transition border-b-2 flex items-center gap-2 ${activeMarketTab === "gainers_losers"
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
                          className={`px-3 py-1 rounded text-sm font-medium ${isInWatchlist
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
                      className={`px-2 py-1 rounded text-xs font-medium transition flex-shrink-0 ${isInWatchlist
                          ? "bg-green-600/20 text-green-300 cursor-default"
                          : "bg-blue-600/30 hover:bg-blue-600/50 text-blue-300"
                        }`}
                    >
                      {isInWatchlist ? "✓ In Watchlist" : "Add to Watchlist"}
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
                      className={`px-2 py-1 rounded text-xs font-medium transition flex-shrink-0 ${isInWatchlist
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
                          className={`px-2 py-1 rounded text-xs font-medium transition flex-shrink-0 ${isInWatchlist
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
                          className={`px-2 py-1 rounded text-xs font-medium transition flex-shrink-0 ${isInWatchlist
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

export default MarketDisplay;
