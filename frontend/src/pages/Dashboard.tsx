import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Trash2, Plus, Bell, ChevronDown, X } from "lucide-react";

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

export default function Dashboard() {
  const navigate = useNavigate();
  const token = window.localStorage.getItem("token");

  // State management
  const [prices, setPrices] = useState<CoinPrice[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [costBasis, setCostBasis] = useState<CostBasis[]>([]);
  const [priceHistory, setPriceHistory] = useState<Map<string, PriceHistoryItem[]>>(new Map());

  // Form states
  const [newWatchSymbol, setNewWatchSymbol] = useState("");
  const [alertSymbol, setAlertSymbol] = useState("");
  const [alertPrice, setAlertPrice] = useState<number | undefined>(undefined);
  const [newCostSymbol, setNewCostSymbol] = useState("");
  const [newCostPrice, setNewCostPrice] = useState<number | undefined>(undefined);
  const [newCostQuantity, setNewCostQuantity] = useState<number | undefined>(undefined);

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // Fetch all data
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
    fetchAllData();
  }, [token]);

  // Trigger backend fetch
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

  // Add to watchlist
  const handleAddToWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchSymbol) {
      setError("Enter a symbol");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/watchlist/`,
        { symbol: newWatchSymbol.toLowerCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWatchlist([...watchlist, response.data]);
      setNewWatchSymbol("");
      setSuccess("Added to watchlist!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  // Remove from watchlist
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

  // Create alert
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertSymbol || !alertPrice) {
      setError("Enter symbol and target price");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/alerts/`,
        { symbol: alertSymbol, target_price: alertPrice },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAlerts([...alerts, response.data]);
      setAlertSymbol("");
      setAlertPrice(undefined);
      setShowAlertModal(false);
      setSuccess("Alert created! Email will be sent when target is reached.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  // Remove alert
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

  // Fetch price history
  const handleFetchHistory = async (symbol: string) => {
    try {
      if (expandedHistory === symbol) {
        setExpandedHistory(null);
        return;
      }

      setExpandedHistory(symbol);
      const res = await axios.get<PriceHistoryItem[]>(`${API_URL}/prices/${symbol}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPriceHistory(new Map(priceHistory).set(symbol, res.data));
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  // Add cost basis
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

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-900 to-slate-950">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-md border-b border-blue-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-white bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text">
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
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-300 hover:text-red-100">
              <X size={20} />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 text-green-200 rounded-lg flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess("")} className="text-green-300 hover:text-green-100">
              <X size={20} />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 flex gap-3 flex-wrap">
          <button
            onClick={handleTriggerFetch}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white rounded-lg font-semibold transition shadow-lg"
          >
            {loading ? "Updating..." : "Refresh Prices"}
          </button>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="px-6 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition"
          >
            Reload Data
          </button>
        </div>

        {/* Main Grid - 3 Column Layout */}
        <div className="grid grid-cols-7 lg:grid-cols-6 gap-8 mb-8">
          {/* LEFT COLUMN - Watchlist & Add */}
          <div className="space-y-6 col-span-3">


            {/* Watchlist */}
            <div className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
              <h2 className="text-xl font-bold text-blue-200 mb-4">My Watchlist</h2>
              {watchlist.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No coins tracked</p>
              ) : (
                <div className="space-y-2.5">
                  {watchlist.map((item) => {
                    const currentPrice = prices.find((p) => p.symbol === item.symbol)?.price;
                    return (
                      <div
                        key={item.id}
                        className="bg-gradient-to-r from-slate-700/30 to-slate-700/10 border border-slate-600/30 rounded-lg p-3.5 flex justify-between items-center hover:border-blue-400/30 transition"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-white">{item.symbol}</p>
                          <p className="text-green-400 text-sm font-medium">
                            ${currentPrice?.toFixed(2) || "N/A"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setAlertSymbol(item.symbol);
                              setShowAlertModal(true);
                            }}
                            className="p-2 bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 rounded-lg transition"
                            title="Set price alert"
                          >
                            <Bell size={16} />
                          </button>
                          <button
                            onClick={() => handleRemoveFromWatchlist(item.id)}
                            className="p-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Add to Watchlist */}
            <div className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
              <h2 className="text-xl font-bold text-blue-200 mb-4">Add to Watchlist</h2>
              <form onSubmit={handleAddToWatchlist} className="space-y-3">
                <input
                  type="text"
                  placeholder="Coin Symbol (e.g., BTC)"
                  value={newWatchSymbol}
                  onChange={(e) => setNewWatchSymbol(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400/50 transition"
                />
                <button
                  type="submit"
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add Coin
                </button>
              </form>
            </div>
          </div>

          {/* MIDDLE COLUMN - Prices with inline History */}
          <div className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl  col-span-2">
            <h2 className="text-xl font-bold text-blue-200 mb-4">Current Prices</h2>
            {prices.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No price data</p>
            ) : (
              <div className="space-y-2.5 max-h-full overflow-y-auto pr-2">
                {prices.map((coin) => (
                  <div key={coin.symbol}>
                    <button
                      onClick={() => handleFetchHistory(coin.symbol)}
                      className="w-full bg-gradient-to-r from-slate-700/30 to-slate-700/10 border border-slate-600/30 rounded-lg p-3.5 flex justify-between items-center hover:border-purple-400/30 transition text-left"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-white">{coin.symbol}</p>
                        <p className="text-green-400 text-sm font-medium">${coin.price.toFixed(2)}</p>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`text-slate-400 transition ${expandedHistory === coin.symbol ? "rotate-180" : ""
                          }`}
                      />
                    </button>

                    {/* Inline History */}
                    {expandedHistory === coin.symbol && priceHistory.has(coin.symbol) && (
                      <div className="bg-slate-700/20 border border-slate-600/20 rounded-lg mt-2 p-4 ml-2">
                        <p className="text-slate-300 text-sm font-semibold mb-3">Price History</p>
                        <div className="space-y-2 max-h-300 overflow-y-auto">
                          {priceHistory.get(coin.symbol)?.slice(0, 10).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-slate-400">
                                {new Date(item.timestamp).toDateString()}
                              </span>
                              <span className="text-green-400 font-medium">${item.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Alerts & Cost Tracking */}
          <div className="space-y-6 col-span-2">
            {/* Active Alerts */}
            <div className="bg-slate-800/40 border border-yellow-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
              <h2 className="text-xl font-bold text-yellow-200 mb-4">Active Alerts</h2>
              {alerts.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No alerts set</p>
              ) : (
                <div className="space-y-2.5">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-gradient-to-r from-yellow-700/20 to-yellow-700/5 border border-yellow-600/30 rounded-lg p-3.5 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-white">{alert.symbol}</p>
                        <p className="text-yellow-300 text-sm">Target: ${alert.target_price.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveAlert(alert.id)}
                        className="p-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>


          </div>
        </div>
        {/* BOTTOM SECTION Add Cost Basis */}
        <div className="bg-slate-800/40 border border-green-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
          <h2 className="text-xl font-bold text-green-200 mb-4">Track Purchase</h2>
          <form onSubmit={handleAddCostBasis} className="space-y-3">
            <input
              type="text"
              placeholder="Symbol"
              value={newCostSymbol}
              onChange={(e) => setNewCostSymbol(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-sm"
            />
            <input
              type="number"
              placeholder="Cost Price"
              value={newCostPrice || ""}
              onChange={(e) => setNewCostPrice(e.target.value ? Number(e.target.value) : undefined)}
              step="0.01"
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-sm"
            />
            <input
              type="number"
              placeholder="Quantity"
              value={newCostQuantity || ""}
              onChange={(e) => setNewCostQuantity(e.target.value ? Number(e.target.value) : undefined)}
              step="0.01"
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-sm"
            />
            <button
              type="submit"
              className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} /> Track Purchase
            </button>
          </form>
        </div>
        {/* BOTTOM SECTION - Purchase History Table */}
        <div className="bg-slate-800/40 border border-green-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-green-200 mb-6">Purchase History</h2>
          {costBasis.length === 0 ? (
            <p className="text-slate-400 text-center py-12">No purchases tracked yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600/50">
                    <th className="px-4 py-3 text-left text-green-300 font-semibold">Symbol</th>
                    <th className="px-4 py-3 text-left text-green-300 font-semibold">Cost Price</th>
                    <th className="px-4 py-3 text-left text-green-300 font-semibold">Quantity</th>
                    <th className="px-4 py-3 text-left text-green-300 font-semibold">Total Investment</th>
                    <th className="px-4 py-3 text-left text-green-300 font-semibold">Current Value</th>
                    <th className="px-4 py-3 text-left text-green-300 font-semibold">Cost change</th>
                  </tr>
                </thead>
                <tbody>
                  {costBasis.map((item) => {
                    const currentPrice = prices.find((p) => p.symbol === item.symbol)?.price || 0;
                    const totalInvestment = item.cost_price * item.quantity;
                    const currentValue = currentPrice * item.quantity;
                    const gainLoss = currentValue - totalInvestment;
                    const gainLossPercent = ((gainLoss / totalInvestment) * 100).toFixed(2);

                    return (
                      <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition">
                        <td className="px-4 py-3 font-semibold text-white">{item.symbol}</td>
                        <td className="px-4 py-3 text-slate-300">${item.cost_price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-300">{item.quantity}</td>
                        <td className="px-4 py-3 text-slate-300">${totalInvestment.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={gainLoss >= 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                            ${currentValue.toFixed(2)}
                            <span className="text-xs ml-2">
                              ({gainLoss >= 0 ? "+" : ""}{gainLossPercent}%)
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={gainLoss >= 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                            ${gainLoss.toFixed(2)}
                            <span className="text-xs ml-2">
                              {gainLoss >= 0 ? "⬆" : "⬇"}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                  setAlertSymbol("");
                  setAlertPrice(undefined);
                }}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Coin Symbol</label>
                <input
                  type="text"
                  placeholder="e.g., BTC"
                  value={alertSymbol}
                  onChange={(e) => setAlertSymbol(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400/50 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Target Price ($)</label>
                <input
                  type="number"
                  placeholder="50000"
                  value={alertPrice || ""}
                  onChange={(e) => setAlertPrice(e.target.value ? Number(e.target.value) : undefined)}
                  step="0.01"
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400/50 transition"
                />
              </div>

              <p className="text-slate-400 text-sm">
                Email alert will be sent when {alertSymbol || "the coin"} reaches ${alertPrice || "your target price"}
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAlertModal(false);
                    setAlertSymbol("");
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