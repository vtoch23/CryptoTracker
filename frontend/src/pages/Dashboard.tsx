import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Trash2, Plus, Bell, ChevronDown, X, Search, TrendingUp } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface CoinPrice {
  symbol: string;
  price: number;
}

interface WatchlistItem {
  id: number;
  symbol: string;
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

interface PriceHistoryItem {
  timestamp: string;
  price: number;
}

interface CoinOption {
  id: string;
  symbol: string;
}

interface ChartData {
  prices: [number, number][];
}

// Searchable dropdown component
function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: CoinOption[];
  value: string;
  onChange: (symbol: string) => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    return options
      .filter((opt) =>
        opt.symbol.toLowerCase().includes(search.toLowerCase()) ||
        opt.id.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 100);
  }, [search, options]);

  return (
    <div className="relative">
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
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
          {filtered.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.symbol);
                setSearch("");
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 hover:bg-slate-600 text-white text-left text-sm border-b border-slate-600 last:border-b-0 transition"
            >
              <span className="font-semibold">{option.symbol.toUpperCase()}</span>
              <span className="text-slate-400"> - {option.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple chart component
function PriceChart({ data }: { data: [number, number][] }) {
  if (!data || data.length === 0) return <div className="text-slate-400 text-sm">No data</div>;

  const prices = data.map((d) => d[1]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  return (
    <div className="h-32 flex items-end gap-0.5">
      {data.slice(-100).map((point, idx) => {
        const normalized = (point[1] - minPrice) / range;
        return (
          <div
            key={idx}
            className="flex-1 bg-gradient-to-t from-blue-500 to-purple-500 opacity-70 hover:opacity-100 transition"
            style={{ height: `${Math.max(normalized * 100, 5)}%` }}
            title={`$${point[1].toFixed(2)}`}
          />
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const token = window.localStorage.getItem("token");

  // State
  const [prices, setPrices] = useState<CoinPrice[]>([]);
  const [allCoins, setAllCoins] = useState<CoinOption[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [costBasis, setCostBasis] = useState<CostBasis[]>([]);
  const [priceHistory, setPriceHistory] = useState<Map<string, PriceHistoryItem[]>>(new Map());
  const [charts, setCharts] = useState<Map<string, ChartData>>(new Map());

  // Form states
  const [selectedCoin, setSelectedCoin] = useState("");
  const [alertPrice, setAlertPrice] = useState<number | undefined>(undefined);
  const [newCostSymbol, setNewCostSymbol] = useState("");
  const [newCostPrice, setNewCostPrice] = useState<number | undefined>(undefined);
  const [newCostQuantity, setNewCostQuantity] = useState<number | undefined>(undefined);
  const [searchCoin, setSearchCoin] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const fetchAllCoins = async () => {
    try {
      const response = await axios.get(`${API_URL}/charts/available-coins`);
      setAllCoins(response.data);
    } catch (err) {
      console.log("Using fallback coin list");
    }
  };

  const fetchAllData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");

      const pricesRes = await axios.get<CoinPrice[]>(`${API_URL}/prices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrices(pricesRes.data);

      try {
        const watchlistRes = await axios.get<WatchlistItem[]>(`${API_URL}/watchlist/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setWatchlist(watchlistRes.data);
      } catch (err) {
        setWatchlist([]);
      }

      try {
        const alertsRes = await axios.get<AlertItem[]>(`${API_URL}/alerts/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAlerts(alertsRes.data);
      } catch (err) {
        setAlerts([]);
      }

      try {
        const costRes = await axios.get<CostBasis[]>(`${API_URL}/cost-basis/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCostBasis(costRes.data);
      } catch (err) {
        setCostBasis([]);
      }

      setSuccess("Data refreshed!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCoins();
    fetchAllData();
  }, [token]);

  const handleTriggerFetch = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/fetch/fetch`, {});
      await fetchAllData();
      setSuccess("Prices fetched and updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoin) {
      setError("Select a coin");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/watchlist/`,
        { symbol: selectedCoin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWatchlist([...watchlist, response.data]);
      setSelectedCoin("");
      setSuccess("Added to watchlist!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  const handleRemoveFromWatchlist = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/watchlist/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWatchlist(watchlist.filter((item) => item.id !== id));
      setSuccess("Removed from watchlist!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoin || !alertPrice) {
      setError("Select coin and enter target price");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/alerts/`,
        { symbol: selectedCoin, target_price: alertPrice },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAlerts([...alerts, response.data]);
      setAlertPrice(undefined);
      setShowAlertModal(false);
      setSuccess("Alert created!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  const handleRemoveAlert = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/alerts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(alerts.filter((item) => item.id !== id));
      setSuccess("Alert removed!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  const handleAddCostBasis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCostSymbol || !newCostPrice || !newCostQuantity) {
      setError("Fill all fields");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/cost-basis/`,
        { symbol: newCostSymbol, cost_price: newCostPrice, quantity: newCostQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCostBasis([...costBasis, response.data]);
      setNewCostSymbol("");
      setNewCostPrice(undefined);
      setNewCostQuantity(undefined);
      setSuccess("Purchase tracked!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  const fetchPriceHistory = async (symbol: string) => {
    try {
      const res = await axios.get<PriceHistoryItem[]>(`${API_URL}/prices/${symbol}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPriceHistory(new Map(priceHistory).set(symbol, res.data));
    } catch (err) {
      console.error("History fetch failed:", err);
    }
  };

  const toggleHistory = async (symbol: string) => {
    const newExpanded = new Set(expandedHistory);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
      if (!priceHistory.has(symbol)) {
        await fetchPriceHistory(symbol);
      }
    }
    setExpandedHistory(newExpanded);
  };

  const fetchChart = async (symbol: string) => {
    try {
      const response = await axios.get(`${API_URL}/charts/chart/${symbol}?days=365`);
      setCharts(new Map(charts).set(symbol, response.data.prices));
    } catch (err) {
      console.error("Chart fetch failed:", err);
    }
  };

  const toggleChart = async (symbol: string) => {
    const newExpanded = new Set(expandedCharts);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
      if (!charts.has(symbol)) {
        await fetchChart(symbol);
      }
    }
    setExpandedCharts(newExpanded);
  };

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    navigate("/login");
  };

  const getCoinsAlerts = (symbol: string) =>
    alerts.filter((a) => a.symbol.toUpperCase() === symbol.toUpperCase());

  const filteredPrices = useMemo(() => {
    return prices.filter((p) =>
      p.symbol.toLowerCase().includes(searchCoin.toLowerCase())
    );
  }, [prices, searchCoin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-900 to-slate-950">
      <header className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-md border-b border-blue-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text">
            Crypto Tracker
          </h1>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/50 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>
    
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="">
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-300">
              <X size={20} />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 text-green-200 rounded-lg flex justify-between items-center">
            <span>{success}</span> 
            <button onClick={() => setSuccess("")} className="text-green-300">
              <X size={20} />
            </button>
          </div>
        )}

        <div className="mb-8 flex gap-3 flex-wrap">
          <button
            onClick={handleTriggerFetch}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white rounded-lg font-semibold transition shadow-lg"
          >
            {loading ? "Updating..." : "Refresh Prices"}
          </button>
          {/* <button
            onClick={fetchAllData}
            disabled={loading}
            className="px-6 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition"
          >
            Reload Data
          </button> */}
        </div>
        </div>

        {/* TOP SECTION - Watchlist (Left) & Purchase History (Right) - SIDE BY SIDE */}
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
          {/* LEFT COLUMN - WATCHLIST */}
          <div className="space-y-4">
            {/* Add to Watchlist Form */}
            <div className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-4 backdrop-blur-sm shadow-xl min-h-200">
            <h3 className="text-white font-bold px-1 py-3"> Add to purchases </h3>
              <form onSubmit={handleAddToWatchlist} className="flex gap-2 h-200">
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

            {/* Watchlist Items */}
            <div className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
              <h2 className="text-xl font-bold text-blue-200 mb-4 -z-1">My Watchlist</h2>
              {watchlist.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No coins tracked</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 -z-1">
                  {watchlist.map((item) => {
                    const currentPrice = prices.find(
                      (p) => p.symbol.toUpperCase() === item.symbol.toUpperCase()
                    )?.price;
                    const coinsAlerts = getCoinsAlerts(item.symbol);
                    const hasHistory = expandedHistory.has(item.symbol);
                    const history = priceHistory.get(item.symbol);

                    return (
                      <div key={item.id} className="space-y-2">
                        <div className="bg-gradient-to-r from-slate-700/30 to-slate-700/10 border border-slate-600/30 rounded-lg p-3.5">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-white">{item.symbol}</p>
                              <p className="text-green-400 text-sm font-medium">
                                ${currentPrice?.toFixed(2) || "N/A"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => toggleHistory(item.symbol)}
                                className="p-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-lg transition"
                                title="Price history"
                              >
                                <ChevronDown size={16} className={`${hasHistory ? "rotate-180" : ""} transition`} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCoin(item.symbol);
                                  setShowAlertModal(true);
                                }}
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
                              <button
                                onClick={() => handleRemoveFromWatchlist(item.id)}
                                className="p-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Inline Price History */}
                        {hasHistory && (
                          <div className="bg-slate-700/20 border border-slate-600/20 rounded-lg p-4 ml-2">
                            <p className="text-slate-300 text-sm font-semibold mb-3">Price History</p>
                            {history && history.length > 0 ? (
                              <div className="space-y-2 max-h-48 overflow-y-auto text-sm">
                                {history.slice(0, 100).map((item, idx) => (
                                  <div key={idx} className="flex justify-between">
                                    <span className="text-slate-400">
                                      {new Date(item.timestamp).toDateString()}
                                    </span>
                                    <span className="text-green-400 font-medium">${item.price.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-400 text-xs">Loading...</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - PURCHASE HISTORY */}
          <div className="space-y-4">
            {/* Add Purchase Form */}
            <div className="bg-slate-800/40 border border-green-500/20 rounded-xl p-4 backdrop-blur-sm shadow-xl">
            <h3 className="text-white font-bold px-1 py-3"> Add to purchases </h3>
              <form onSubmit={handleAddCostBasis} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Symbol"
                  value={newCostSymbol}
                  onChange={(e) => setNewCostSymbol(e.target.value.toUpperCase())}
                  className="w-20 px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-sm"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={newCostPrice || ""}
                  onChange={(e) => setNewCostPrice(e.target.value ? Number(e.target.value) : undefined)}
                  step="0.01"
                  className="w-24 px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-sm"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={newCostQuantity || ""}
                  onChange={(e) => setNewCostQuantity(e.target.value ? Number(e.target.value) : undefined)}
                  step="0.01"
                  className="w-20 px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg font-semibold transition flex-shrink-0"
                >
                  <Plus size={18} />
                </button>
              </form>
            </div>

            {/* Purchase History Items */}
            <div className="bg-slate-800/40 border border-green-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
              <h2 className="text-xl font-bold text-green-200 mb-4">Purchase History</h2>
              {costBasis.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No purchases yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {costBasis.map((item) => {
                    const currentPrice =
                      prices.find((p) => p.symbol.toUpperCase() === item.symbol.toUpperCase())
                        ?.price || 0;
                    const totalInvestment = item.cost_price * item.quantity;
                    const currentValue = currentPrice * item.quantity;
                    const gainLoss = currentValue - totalInvestment;
                    const gainLossPercent = totalInvestment
                      ? ((gainLoss / totalInvestment) * 100).toFixed(2)
                      : "0";

                    return (
                      <div
                        key={item.id}
                        className="bg-gradient-to-r from-green-700/10 to-green-700/5 border border-green-600/30 rounded-lg p-3 text-sm"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-white">{item.symbol}</p>
                            <p className="text-slate-400 text-xs">
                              Cost: ${item.cost_price.toFixed(2)} × {item.quantity}
                            </p>
                          </div>
                          <span
                            className={
                              gainLoss >= 0
                                ? "text-green-400 font-semibold text-right text-sm"
                                : "text-red-400 font-semibold text-right text-sm"
                            }
                          >
                            ${currentValue.toFixed(2)}<br />
                            <span className="text-xs">
                              {gainLoss >= 0 ? "+" : ""}
                              {gainLossPercent}%
                            </span>
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400 text-xs">
                          <span>Invested: ${totalInvestment.toFixed(2)}</span>
                          <span className={gainLoss >= 0 ? "text-green-400" : "text-red-400"}>
                            {gainLoss >= 0 ? "↑" : "↓"} ${Math.abs(gainLoss).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION - Market with Charts */}
        <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
          <h2 className="text-2xl font-bold text-purple-200 mb-4">Market</h2>
          {prices.length === 0 ? (
            <p className="text-slate-400 text-center py-12">No price data</p>
          ) : (
            <div className="space-y-2">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search coins..."
                    value={searchCoin}
                    onChange={(e) => setSearchCoin(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400/50 transition"
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredPrices.map((coin) => {
                  const isExpanded = expandedCharts.has(coin.symbol);
                  const chartData = charts.get(coin.symbol);

                  return (
                    <div key={coin.symbol} className="space-y-2">
                      <button
                        onClick={() => toggleChart(coin.symbol)}
                        className="w-full bg-gradient-to-r from-slate-700/30 to-slate-700/10 border border-slate-600/30 rounded-lg p-3.5 flex justify-between items-center hover:border-purple-400/30 transition text-left"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-white">{coin.symbol}</p>
                          <p className="text-green-400 text-sm font-medium">
                            ${coin.price.toFixed(2)}
                          </p>
                        </div>
                        <ChevronDown
                          size={18}
                          className={`text-slate-400 transition ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="bg-slate-700/20 border border-slate-600/30 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-slate-300 font-semibold flex items-center gap-2">
                              <TrendingUp size={16} />
                              {coin.symbol} - 1 Year Chart
                            </p>
                          </div>
                          {chartData ? (
                            <PriceChart data={chartData as [number, number][]} />
                          ) : (
                            <div className="h-32 flex items-center justify-center text-slate-400">
                              Loading chart...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-yellow-500/30 rounded-xl p-8 max-w-md w-full shadow-2xl">
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

            <form onSubmit={handleCreateAlert} className="space-y-4">
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
                Email alert will be sent when {selectedCoin.toUpperCase()} reaches $
                {alertPrice || "your target price"}
              </p>

              {selectedCoin && getCoinsAlerts(selectedCoin).length > 0 && (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded p-3">
                  <p className="text-yellow-200 text-sm font-semibold mb-2">Existing Alerts:</p>
                  <div className="space-y-1">
                    {getCoinsAlerts(selectedCoin).map((alert) => (
                      <p key={alert.id} className="text-yellow-300 text-xs">
                        ${alert.target_price.toFixed(2)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

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
    </div>
  );
}