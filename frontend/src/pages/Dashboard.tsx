import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface CoinPrice {
  symbol: string;
  price: number;
}

interface WatchlistItem {
  id: number;
  symbol: string;
  target_price?: number;
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
  const [costBasis, setCostBasis] = useState<CostBasis[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);

  // Form states
  const [newSymbol, setNewSymbol] = useState("");
  const [newTargetPrice, setNewTargetPrice] = useState<number | undefined>(undefined);
  const [newCostSymbol, setNewCostSymbol] = useState("");
  const [newCostPrice, setNewCostPrice] = useState<number | undefined>(undefined);
  const [newCostQuantity, setNewCostQuantity] = useState<number | undefined>(undefined);
  const [selectedHistorySymbol, setSelectedHistorySymbol] = useState<string | null>(null);

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  // Fetch all data
  const fetchAllData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");

      // Fetch prices
      const pricesRes = await axios.get<CoinPrice[]>(`${API_URL}/prices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrices(pricesRes.data);

      // Fetch watchlist
      const watchlistRes = await axios.get<WatchlistItem[]>(`${API_URL}/watchlist/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWatchlist(watchlistRes.data);

      // Fetch cost basis (assuming endpoint exists)
      try {
        const costRes = await axios.get<CostBasis[]>(`${API_URL}/cost-basis/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCostBasis(costRes.data);
      } catch (err) {
        console.log("Cost basis endpoint not available yet");
      }

      setSuccess("Data refreshed successfully!");
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

  // Trigger fetch from backend
  const handleTriggerFetch = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/fetch/fetch`, {});
      await fetchAllData();
      setSuccess("Price fetch triggered and data updated!");
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
    if (!newSymbol) {
      setError("Please enter a symbol");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/watchlist/`,
        { symbol: newSymbol, target_price: newTargetPrice || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setWatchlist([...watchlist, response.data]);
      setNewSymbol("");
      setNewTargetPrice(undefined);
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

  // Add cost basis
  const handleAddCostBasis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCostSymbol || !newCostPrice || !newCostQuantity) {
      setError("Please fill in all cost basis fields");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/cost-basis/`,
        { 
          symbol: newCostSymbol, 
          cost_price: newCostPrice,
          quantity: newCostQuantity 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCostBasis([...costBasis, response.data]);
      setNewCostSymbol("");
      setNewCostPrice(undefined);
      setNewCostQuantity(undefined);
      setSuccess("Cost basis added!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  // Update cost basis
  const handleUpdateCostBasis = async (id: number, updatedData: Partial<CostBasis>) => {
    try {
      const response = await axios.patch(
        `${API_URL}/cost-basis/${id}`,
        updatedData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCostBasis(costBasis.map((item) => (item.id === id ? response.data : item)));
      setSuccess("Cost basis updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  // Fetch price history
  const handleFetchHistory = async (symbol: string) => {
    try {
      setSelectedHistorySymbol(symbol);
      const res = await axios.get<PriceHistoryItem[]>(`${API_URL}/prices/${symbol}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPriceHistory(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text">
            CryptoTracker Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 text-red-200 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500 text-green-200 rounded-lg">
            {success}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 flex gap-4 flex-wrap">
          <button
            onClick={handleTriggerFetch}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
          >
            {loading ? "Updating..." : "Refresh All Data"}
          </button>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
          >
            Reload Data
          </button>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Add to Watchlist */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Add to Watchlist</h2>
              <form onSubmit={handleAddToWatchlist} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Symbol (e.g., BTC)"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Target Price (optional)"
                    value={newTargetPrice || ""}
                    onChange={(e) => setNewTargetPrice(e.target.value ? Number(e.target.value) : undefined)}
                    step="0.01"
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Add to Watchlist
                </button>
              </form>
            </div>

            {/* Watchlist */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">My Watchlist</h2>
              {watchlist.length === 0 ? (
                <p className="text-slate-400">No items in watchlist</p>
              ) : (
                <div className="space-y-3">
                  {watchlist.map((item) => {
                    const currentPrice = prices.find((p) => p.symbol === item.symbol)?.price;
                    const priceStatus =
                      item.target_price && currentPrice
                        ? currentPrice >= item.target_price
                          ? "✓ Target reached!"
                          : `${((currentPrice / item.target_price - 1) * 100).toFixed(2)}% to target`
                        : "";

                    return (
                      <div
                        key={item.id}
                        className="bg-slate-700/30 border border-slate-600 rounded p-3 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold text-white">{item.symbol}</p>
                          <p className="text-slate-400 text-sm">
                            Current: ${currentPrice?.toFixed(2) || "N/A"}
                          </p>
                          {item.target_price && (
                            <p className="text-slate-400 text-sm">
                              Target: ${item.target_price.toFixed(2)} - {priceStatus}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveFromWatchlist(item.id)}
                          className="px-3 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded transition"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Latest Prices */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Current Prices</h2>
              {prices.length === 0 ? (
                <p className="text-slate-400">No price data available</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {prices.map((coin) => (
                    <div key={coin.symbol} className="bg-slate-700/30 rounded p-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-white">{coin.symbol}</p>
                        <p className="text-green-400">${coin.price.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => handleFetchHistory(coin.symbol)}
                        className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded transition text-sm"
                      >
                        History
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Cost Basis */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Track Purchase Cost</h2>
              <form onSubmit={handleAddCostBasis} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Symbol"
                    value={newCostSymbol}
                    onChange={(e) => setNewCostSymbol(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Cost Price"
                    value={newCostPrice || ""}
                    onChange={(e) => setNewCostPrice(e.target.value ? Number(e.target.value) : undefined)}
                    step="0.01"
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={newCostQuantity || ""}
                    onChange={(e) => setNewCostQuantity(e.target.value ? Number(e.target.value) : undefined)}
                    step="0.01"
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
                >
                  Add Purchase
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Cost Basis List */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Purchase History</h2>
          {costBasis.length === 0 ? (
            <p className="text-slate-400">No purchase history yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="px-4 py-3 text-left">Symbol</th>
                    <th className="px-4 py-3 text-left">Cost Price</th>
                    <th className="px-4 py-3 text-left">Quantity</th>
                    <th className="px-4 py-3 text-left">Total</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {costBasis.map((item) => (
                    <tr key={item.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                      <td className="px-4 py-3">{item.symbol}</td>
                      <td className="px-4 py-3">${item.cost_price.toFixed(2)}</td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">${(item.cost_price * item.quantity).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            const newPrice = prompt("Enter new cost price:", String(item.cost_price));
                            if (newPrice) {
                              handleUpdateCostBasis(item.id, { cost_price: Number(newPrice) });
                            }
                          }}
                          className="px-2 py-1 bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 rounded transition text-sm"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Price History Modal */}
        {selectedHistorySymbol && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">{selectedHistorySymbol} Price History</h2>
              <button
                onClick={() => {
                  setSelectedHistorySymbol(null);
                  setPriceHistory([]);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {priceHistory.length === 0 ? (
              <p className="text-slate-400">No history data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="px-4 py-3 text-left">Timestamp</th>
                      <th className="px-4 py-3 text-left">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/30">
                        <td className="px-4 py-3">{new Date(item.timestamp).toLocaleString()}</td>
                        <td className="px-4 py-3">${item.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}