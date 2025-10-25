import React, { useEffect, useRef, useState } from "react";
import { Plus, X, LogOut, Trash2 } from "lucide-react";
import PortfolioDisplay from "./PortfolioDisplay";

import WatchlistDisplay from "../components/WatchlistDisplay";
import MarketDisplay from "../components/MarketDisplay";
import AlertsGrouped from "../components/AlertsGrouped";
import SearchableDropdown from "../components/SearchableDropdown";

import { API_URL } from "../utils/helpers";
import type {
  CoinPrice,
  WatchlistItem,
  AlertItem,
  CostBasis,
  CoinOption,
  HistoryItem,
  Candle,
  TabType,
} from "../types";

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

  const [loadingStates, setLoadingStates] = useState<Map<string, 'chart' | 'history' | null>>(new Map());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

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
      const response = await fetch(`${API_URL}/market/prices`);
      const data = await response.json();
      const priceMap = new Map<string, number>();
      // Expecting { [coinId]: { usd: number } }
      Object.entries(data).forEach(([coinId, priceData]: [string, any]) => {
        priceMap.set(coinId, priceData.usd);
      });
      setMarketPrices(priceMap);
    } catch (err) {
      console.error("Failed to fetch market prices:", err);
    }
  };

  const fetchAllData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

      const [pricesRes, watchlistRes, alertsRes, costRes] = await Promise.allSettled([
        fetch(`${API_URL}/prices`, { headers }),
        fetch(`${API_URL}/watchlist/`, { headers }),
        fetch(`${API_URL}/alerts/`, { headers }),
        fetch(`${API_URL}/cost-basis/`, { headers }),
      ]);

      if (pricesRes.status === "fulfilled" && pricesRes.value.ok) {
        setPrices(await pricesRes.value.json());
      } else {
        setPrices([]);
      }

      if (watchlistRes.status === "fulfilled" && watchlistRes.value.ok) {
        setWatchlist(await watchlistRes.value.json());
      } else {
        setWatchlist([]);
      }

      if (alertsRes.status === "fulfilled" && alertsRes.value.ok) {
        setAlerts(await alertsRes.value.json());
      } else {
        setAlerts([]);
      }

      if (costRes.status === "fulfilled" && costRes.value.ok) {
        setCostBasis(await costRes.value.json());
      } else {
        setCostBasis([]);
      }

      setSuccess("Prices refreshed successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price === undefined || price === null) return "-";
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  useEffect(() => {
    fetchAllCoins();
    fetchAllData();
    fetchMarketPrices();
  }, [token]);

  const fetchHistory = async (symbol: string, coinId: string) => {
    // Cancel previous if any
    const existing = abortControllersRef.current.get(`history-${symbol}`);
    if (existing) existing.abort();

    const controller = new AbortController();
    abortControllersRef.current.set(`history-${symbol}`, controller);
    setLoadingStates(prev => new Map(prev).set(symbol, 'history'));
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(`${API_URL}/charts/history/${coinId}?days=7`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const historyData = data.history || [];
      setHistory(prev => new Map(prev).set(symbol, historyData));
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("History fetch error:", err);
        setError("Failed to load history");
        setTimeout(() => setError(""), 4000);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoadingStates(prev => { const m = new Map(prev); m.delete(symbol); return m; });
      abortControllersRef.current.delete(`history-${symbol}`);
    }
  };

  const fetchCandles = async (symbol: string, coinId: string) => {
    // Cancel previous if any
    const existing = abortControllersRef.current.get(`chart-${symbol}`);
    if (existing) existing.abort();

    const controller = new AbortController();
    abortControllersRef.current.set(`chart-${symbol}`, controller);
    setLoadingStates(prev => new Map(prev).set(symbol, 'chart'));
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(`${API_URL}/charts/chart/${coinId}?days=7&interval=4h`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const candleData = data.candles || [];
      setCandles(prev => new Map(prev).set(symbol, candleData));
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Chart fetch error:", err);
        setError("Failed to load chart");
        setTimeout(() => setError(""), 4000);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoadingStates(prev => { const m = new Map(prev); m.delete(symbol); return m; });
      abortControllersRef.current.delete(`chart-${symbol}`);
    }
  };

  const handleAddToWatchlist = async (coinId: string) => {
    if (!coinId) {
      setError("Select a coin first");
      setTimeout(() => setError(""), 3000);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/watchlist/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ coin_id: coinId })
      });
      if (!res.ok) throw new Error("Failed to add");
      const item = await res.json();
      setWatchlist(prev => [...prev, item]);
      setSelectedCoin("");
      setSuccess("Added to watchlist");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err.message || "Error adding");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleRemoveFromWatchlist = async (id: number) => {
    try {
      await fetch(`${API_URL}/watchlist/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setWatchlist(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoin || !alertPrice) {
      setError("Choose coin and price");
      setTimeout(() => setError(""), 3000);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/alerts/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: selectedCoin, target_price: alertPrice })
      });
      if (!res.ok) throw new Error("Failed to create alert");
      const item = await res.json();
      setAlerts(prev => [...prev, item]);
      setShowAlertModal(false);
      setAlertPrice(undefined);
      setSuccess("Alert created");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err.message || "Error");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleRemoveAlert = async (id: number) => {
    try {
      await fetch(`${API_URL}/alerts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCostBasis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCostSymbol || !newCostPrice || !newCostQuantity) {
      setError("Fill all fields");
      setTimeout(() => setError(""), 3000);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/cost-basis/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: newCostSymbol, cost_price: newCostPrice, quantity: newCostQuantity })
      });
      if (!res.ok) throw new Error("Failed to add purchase");
      const item = await res.json();
      setCostBasis(prev => [...prev, item]);
      setNewCostSymbol("");
      setNewCostPrice(undefined);
      setNewCostQuantity(undefined);
      setSuccess("Purchase added");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err.message || "Error");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleDeleteCostBasis = async (id: number) => {
    try {
      await fetch(`${API_URL}/cost-basis/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setCostBasis(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const togglePurchaseHistory = (symbol: string) => {
    setExpandedPurchaseHistory(prev => {
      const next = new Set(prev);
      next.has(symbol) ? next.delete(symbol) : next.add(symbol);
      return next;
    });
  };

  const toggleHistory = async (symbol: string, coinId: string) => {
    if (expandedHistory.has(symbol)) {
      setExpandedHistory(prev => {
        const n = new Set(prev);
        n.delete(symbol);
        return n;
      });
    } else {
      setExpandedHistory(prev => new Set(prev).add(symbol));
      if (!history.has(symbol) && loadingStates.get(symbol) !== 'history') {
        await fetchHistory(symbol, coinId);
      }
    }
  };

  const toggleChart = async (symbol: string, coinId: string) => {
    if (expandedCharts.has(symbol)) {
      setExpandedCharts(prev => {
        const n = new Set(prev);
        n.delete(symbol);
        return n;
      });
    } else {
      setExpandedCharts(prev => new Set(prev).add(symbol));
      if (!candles.has(symbol) && loadingStates.get(symbol) !== 'chart') {
        await fetchCandles(symbol, coinId);
      }
    }
  };

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
    const newList = [...watchlist];
    const [draggedObj] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, draggedObj);
    setWatchlist(newList);
    setDraggedItem(null);
  };

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const getCoinCostBasis = (symbol: string) =>
    costBasis.filter(c => c.symbol && c.symbol.toUpperCase() === symbol.toUpperCase());

  const combinedItems = watchlist.map(wl => {
    const costs = getCoinCostBasis(wl.symbol);
    const currentPrice = prices.find(p => p.symbol.toUpperCase() === wl.symbol.toUpperCase())?.price || 0;
    return { watchlist: wl, costBasis: costs, currentPrice };
  });

  const currentCoinPrice = selectedCoin
    ? prices.find(p => p.symbol.toUpperCase() === selectedCoin.toUpperCase())?.price || 0
    : 0;

  const getCoinAlerts = (symbol: string) => {
    if (!symbol) return [];
    return alerts.filter((a) => a.symbol?.toUpperCase() === symbol.toUpperCase());
  };

  const currentCoinAlerts = selectedCoin ? getCoinAlerts(selectedCoin) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 bg-gradient-to-r from-blue-950 to-purple-950 border-b border-blue-500/50 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text">
            Crypto Tracker
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold transition"
            >
              {loading ? "Updating..." : "Refresh"}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600/30 hover:bg-red-600/40 text-red-300 border border-red-500/50 rounded-lg transition flex items-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 border-t border-slate-700">
          <div className="flex gap-4">
            {(["dashboard", "portfolio", "watchlist", "markets", "alerts"] as TabType[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-3 font-semibold transition border-b-2 ${
                  activeTab === t
                    ? "text-blue-400 border-blue-400"
                    : "text-slate-400 border-transparent hover:text-slate-300"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Toasts */}
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

      {/* Content */}
      <main className="max-w-7xl w-full mx-auto px-4 py-8 pb-12 space-y-8">

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Add to Watchlist + Add Purchase side-by-side */}
            <div className="grid grid-cols-2 gap-6">
              {/* Add to Watchlist */}
              <div className="flex-1 bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
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

              {/* Add Purchase */}
              <div className="flex-1 bg-slate-800/40 border border-green-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
                <h3 className="text-white font-bold mb-4">Add Purchase</h3>
                <form onSubmit={handleAddCostBasis} className="flex gap-2 items-end">
                  <input
                    type="text"
                    placeholder="Symbol"
                    value={newCostSymbol}
                    onChange={(e) => setNewCostSymbol(e.target.value.toUpperCase())}
                    className="w-24 px-2 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={newCostPrice ?? ""}
                    onChange={(e) => setNewCostPrice(e.target.value === "" ? undefined : parseFloat(e.target.value))}
                    step="0.01"
                    className="flex-1 px-2 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={newCostQuantity ?? ""}
                    onChange={(e) => setNewCostQuantity(e.target.value === "" ? undefined : parseFloat(e.target.value))}
                    min="0.00000001"
                    step="0.00000001"
                    className="w-24 px-2 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg font-semibold transition flex-shrink-0"
                  >
                    <Plus size={18} />
                  </button>
                </form>
              </div>
            </div>

            {/* Watchlist + Markets side-by-side */}
            <div className="grid grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">My Watchlist</h3>
                </div>
                <WatchlistDisplay
                  combinedItems={combinedItems as any[]}
                  draggedItem={draggedItem}
                  expandedCharts={expandedCharts}
                  expandedHistory={expandedHistory}
                  expandedPurchaseHistory={expandedPurchaseHistory}
                  candles={candles}
                  history={history}
                  alerts={alerts}
                  loadingStates={loadingStates}
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
              <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl min-h-[300px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">Markets</h3>
                </div>
                <MarketDisplay
                  searchCoin={searchCoin}
                  onSearchChange={setSearchCoin}
                  watchlist={watchlist}
                  onAddToWatchlist={handleAddToWatchlist}
                  marketPrices={marketPrices}
                />
              </div>
            </div>
          </div>
        )}

        {/* WATCHLIST */}
        {activeTab === "watchlist" && (
          <div className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
            <WatchlistDisplay
              combinedItems={combinedItems as any[]}
              draggedItem={draggedItem}
              expandedCharts={expandedCharts}
              expandedHistory={expandedHistory}
              expandedPurchaseHistory={expandedPurchaseHistory}
              candles={candles}
              history={history}
              alerts={alerts}
              isFullPage
              loadingStates={loadingStates}
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
        )}

        {/* MARKETS */}
        {activeTab === "markets" && (
          <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
            <MarketDisplay
              searchCoin={searchCoin}
              onSearchChange={setSearchCoin}
              watchlist={watchlist}
              onAddToWatchlist={handleAddToWatchlist}
              marketPrices={marketPrices}
              isFullPage
            />
          </div>
        )}

        {/* ALERTS */}
        {activeTab === "alerts" && (
          <div className="bg-slate-800/40 border border-yellow-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
            <AlertsGrouped
              alerts={alerts}
              prices={prices}
              onRemoveAlert={handleRemoveAlert}
              isFullPage
            />
          </div>
        )}

        {/* PORTFOLIO */}
        {activeTab === "portfolio" && (
          <div className="bg-slate-800/40 border border-emerald-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
            <PortfolioDisplay 
              costBasis={costBasis} 
              prices={prices} 
              onDeleteCostBasis={handleDeleteCostBasis}
            />
          </div>
        )}
      </main>

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000]">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">Set Alert for {selectedCoin}</h3>
              <button onClick={() => setShowAlertModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-1">Current price</label>
                <div className="px-3 py-2 bg-slate-700/50 rounded text-white">{currentCoinPrice}</div>
              </div>
              <div>
                <label className="block text-slate-300 text-sm mb-1">Target price</label>
                <input
                  type="number"
                  value={alertPrice ?? ""}
                  onChange={(e) => setAlertPrice(e.target.value === "" ? undefined : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-400/50 transition"
                  placeholder="e.g., 50000"
                  step="0.01"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition"
                >
                  Create Alert
                </button>
              </div>
            </form>

            {currentCoinAlerts.length > 0 && (
                <div className="mt-6 border-t border-slate-600/40 pt-4">
                  <h4 className="text-yellow-200 font-semibold mb-3">Existing Alerts</h4>
                  <p className="text-slate-400 text-sm mb-3">
                    Current Price: ${formatPrice(currentCoinPrice)}
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {currentCoinAlerts.map((alert) => {
                      const status =
                        currentCoinPrice >= alert.target_price ? "TRIGGERED" : "PENDING";
                      return (
                        <div
                          key={`alert-${alert.id}`}
                          className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-3 flex justify-between items-center"
                        >
                          <div>
                            <p className="text-slate-200 font-semibold">
                              Target: ${formatPrice(alert.target_price)}
                            </p>
                            <p className="text-slate-400 text-xs">
                              {status} • {new Date(alert.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveAlert(alert.id)}
                            className="p-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg transition"
                            title="Remove alert"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            
          </div>
        </div>
      )}
    </div>
  );
}
