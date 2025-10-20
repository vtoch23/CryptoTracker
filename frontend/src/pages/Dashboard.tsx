import { useState, useEffect, useMemo, useRef } from "react";
import { Trash2, Plus, Bell, ChevronDown, X, Search, BarChart3, LogOut } from "lucide-react";
import { formatPrice } from '../utils/priceFormatters';


const API_URL = "http://localhost:8000";

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

type TabType = "dashboard" | "watchlist" | "markets" | "alerts";

/**
 * Deduplicate history items to show only one entry per date
 * Keeps the last (most recent) entry for each day
 */
const deduplicateHistoryByDate = (items: HistoryItem[]): HistoryItem[] => {
  const dateMap = new Map<string, HistoryItem>();
  
  // Iterate and keep the last item for each date
  items.forEach(item => {
    dateMap.set(item.date, item);
  });
  
  // Convert back to array and sort by date descending
  return Array.from(dateMap.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Enhanced filtering with exact match prioritization
  const filtered = useMemo(() => {
    if (!search) return options.slice(0, 100);
    
    const searchLower = search.toLowerCase();
    const searchUpper = search.toUpperCase();
    const seen = new Set<string>(); // Track by ID to avoid duplicates
    const result: CoinOption[] = [];
    
    // Strategy 0: EXACT symbol match (highest priority)
    options.forEach((opt) => {
      if (opt.symbol.toUpperCase() === searchUpper && !seen.has(opt.id)) {
        result.push(opt);
        seen.add(opt.id);
      }
    });
    
    // Strategy 1: EXACT coin_id match
    options.forEach((opt) => {
      if (opt.id.toLowerCase() === searchLower && !seen.has(opt.id)) {
        result.push(opt);
        seen.add(opt.id);
      }
    });
    
    // Strategy 2: Symbol starts with search
    options.forEach((opt) => {
      if (opt.symbol.toLowerCase().startsWith(searchLower) && !seen.has(opt.id)) {
        result.push(opt);
        seen.add(opt.id);
      }
    });
    
    // Strategy 3: Coin ID starts with search
    options.forEach((opt) => {
      if (opt.id.toLowerCase().startsWith(searchLower) && !seen.has(opt.id)) {
        result.push(opt);
        seen.add(opt.id);
      }
    });
    
    // Only return up to 20 results to avoid overwhelming the dropdown
    return result.slice(0, 20);
  }, [search, options]);
  console.log("Filtered coins:", filtered);
  console.log("Duplicate check:", filtered.map(c => c.id))

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
            // Highlight exact matches
            const isExactSymbolMatch = option.symbol.toUpperCase() === search.toUpperCase();
            const isExactIdMatch = option.id.toLowerCase() === search.toLowerCase();
            const isExactMatch = isExactSymbolMatch || isExactIdMatch;
            
            return (
              <button
                key={`${option.id}-${idx}`}
                type="button"
                onClick={() => {
                  onChange(option.symbol);
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

export default function Dashboard() {
  const token = typeof window !== 'undefined' ? window.localStorage?.getItem("token") : null;
  const marketSearchRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [prices, setPrices] = useState<CoinPrice[]>([]);
  const [allCoins, setAllCoins] = useState<CoinOption[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [costBasis, setCostBasis] = useState<CostBasis[]>([]);
  const [candles, setCandles] = useState<Map<string, Candle[]>>(new Map());
  const [history, setHistory] = useState<Map<string, HistoryItem[]>>(new Map());

  const [selectedCoin, setSelectedCoin] = useState("");
  const [alertPrice, setAlertPrice] = useState<number | undefined>(undefined);
  const [newCostSymbol, setNewCostSymbol] = useState("");
  const [newCostPrice, setNewCostPrice] = useState<number | undefined>(undefined);
  const [newCostQuantity, setNewCostQuantity] = useState<number | undefined>(undefined);
  const [searchCoin, setSearchCoin] = useState("");
  const [marketSearchOpen, setMarketSearchOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set());
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [expandedPurchaseHistory, setExpandedPurchaseHistory] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (marketSearchRef.current && !marketSearchRef.current.contains(event.target as Node)) {
        setMarketSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAllCoins = async () => {
    try {
      const response = await fetch(`${API_URL}/charts/available-coins`);
      const data = await response.json();
      setAllCoins(data);
    } catch (err) {
      console.error("Coin list fetch failed");
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
          console.warn(`Prices fetch returned ${pricesRes.status}, using empty array`);
          setPrices([]);
        } else {
          const pricesData = await pricesRes.json();
          setPrices(Array.isArray(pricesData) ? pricesData : []);
          console.log(`Got ${pricesData?.length || 0} prices`);
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
          console.warn(`Watchlist fetch failed: ${watchlistRes.status}`);
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
          console.warn(`Alerts fetch failed: ${alertsRes.status}`);
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
          console.warn(`Cost basis fetch failed: ${costRes.status}`);
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
  }, [token]);

  const filteredCoins = useMemo(() => {
    if (!searchCoin) return allCoins.slice(0, 100);
    return allCoins
      .filter((coin) =>
        coin.symbol.toLowerCase().startsWith(searchCoin.toLowerCase()) ||
        coin.id.toLowerCase().startsWith(searchCoin.toLowerCase())
      )
      .slice(0, 100);
  }, [searchCoin, allCoins]);

  const handleTriggerFetch = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("Starting price refresh...");
      
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

      const data = await response.json();
      console.log("Fetch response:", data);

      await fetchAllData();

      const message = data.message || "Prices updated!";
      setSuccess(`✓ ${message}`);
      setTimeout(() => setSuccess(""), 5000);
      
    } catch (err: any) {
      const errorMessage = err.message || "Error refreshing prices";
      console.error("Price refresh error:", err);
      setError(`${errorMessage}`);
      setTimeout(() => setError(""), 5000);
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
      const response = await fetch(`${API_URL}/watchlist/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbol: selectedCoin })
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

  const toggleHistory = async (symbol: string) => {
    const newExpanded = new Set(expandedHistory);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
      if (!history.has(symbol)) {
        await fetchHistory(symbol);
      }
    }
    setExpandedHistory(newExpanded);
  };

  const fetchHistory = async (symbol: string) => {
    try {
      const url = `${API_URL}/charts/history/${symbol}`;
      console.log(`Fetching history from: ${url}`);
      
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`History fetch failed with status ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`History data received:`, data);
      
      const historyData = data.history || [];
      
      if (!historyData || historyData.length === 0) {
        console.warn(`No history data for symbol: ${symbol}`);
        setError(`No price history available for ${symbol}`);
        setTimeout(() => setError(""), 5000);
      } else {
        console.log(`Setting history with ${historyData.length} items`);
        setHistory(new Map(history).set(symbol, historyData));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to load history for ${symbol}: ${errorMsg}`);
      setError(`Failed to load history: ${errorMsg}`);
      setTimeout(() => setError(""), 5000);
    }
  }

  const fetchCandles = async (symbol: string) => {
    try {
      const url = `${API_URL}/charts/chart/${symbol}?days=30&interval=4h`;
      console.log(`Fetching candles from: ${url}`);
      
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Chart fetch failed with status ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Chart data received:`, data);
      
      const candleData = data.candles || [];
      
      if (!candleData || candleData.length === 0) {
        console.warn(`No candle data for symbol: ${symbol}`);
        setError(`No chart data available for ${symbol}`);
        setTimeout(() => setError(""), 5000);
      } else {
        console.log(`Setting candles with ${candleData.length} items`);
        setCandles(new Map(candles).set(symbol, candleData));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to load chart for ${symbol}: ${errorMsg}`);
      setError(`Failed to load chart: ${errorMsg}`);
      setTimeout(() => setError(""), 5000);
    }
  };

  const toggleChart = async (symbol: string) => {
    const newExpanded = new Set(expandedCharts);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
      if (!candles.has(symbol)) {
        await fetchCandles(symbol);
      }
    }
    setExpandedCharts(newExpanded);
  };

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const getCoinsAlerts = (symbol: string) => {
    if (!symbol) return [];
    return alerts.filter((a) => a.symbol.toUpperCase() === symbol.toUpperCase());
  };

  const getCoinCostBasis = (symbol: string) => {
    if (!symbol) return [];
    return costBasis.filter((c) => {
      if (!c.symbol) {
        console.warn("Cost basis item missing symbol:", c);
        return false;
      }
      return c.symbol.toUpperCase() === symbol.toUpperCase();
    });
  };

  const combinedItems = watchlist.map((wl) => {
    if (!wl.symbol) {
      console.warn("Watchlist item missing symbol:", wl);
      return null;
    }
    
    const costs = getCoinCostBasis(wl.symbol);
    
    const pricesArray = Array.isArray(prices) ? prices : [];
    const currentPrice = pricesArray.find((p) => p.symbol.toUpperCase() === wl.symbol.toUpperCase())?.price || 0;
    
    return { watchlist: wl, costBasis: costs, currentPrice };
  }).filter((item) => item !== null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-900 to-slate-950">
      <header className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-md border-b border-blue-500/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text">
            Crypto Tracker
          </h1>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/50 rounded-lg transition flex items-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4 pointer-events-none">
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* TAB NAVIGATION */}
        <div className="flex gap-4 mb-8 border-b border-slate-700">
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

        {/* DASHBOARD TAB - TWO COLUMN LAYOUT */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <div className="flex gap-3">
              <button
                onClick={handleTriggerFetch}
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white rounded-lg font-semibold transition shadow-lg"
              >
                {loading ? "Updating..." : "Refresh Prices"}
              </button>
            </div>

            {/* TOP SECTION: Add to Watchlist + Add Purchase (Full Width) */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl z-50">
                <h3 className="text-white font-bold mb-4">Add to Watchlist</h3>
                <form onSubmit={handleAddToWatchlist} className="flex gap-2">
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

              <div className="bg-slate-800/40 border border-green-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
                <h3 className="text-white font-bold mb-4">Add Purchase</h3>
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
                    className="flex-1 px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-sm"
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
            </div>

            {/* TWO COLUMN: WATCHLIST (LEFT) + MARKET (RIGHT) */}
            <div className="grid grid-cols-3 gap-6">
              {/* LEFT: WATCHLIST SECTION (2 cols) */}
              <div className="col-span-2 bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
                <h2 className="text-xl font-bold text-blue-200 mb-4">My Watchlist</h2>

                {combinedItems.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No coins tracked</p>
                ) : (
                  <div className="space-y-4 max-h-full overflow-y-auto pr-2">
                    {combinedItems.map(({ watchlist: wl, costBasis: costs, currentPrice }) => {
                      const coinsAlerts = getCoinsAlerts(wl.symbol);
                      const hasHistory = expandedHistory.has(wl.symbol);
                      const hasChart = expandedCharts.has(wl.symbol);
                      const hasPurchaseHistory = expandedPurchaseHistory.has(wl.symbol);

                      return (
                        <div key={`watchlist-${wl.id}`} className="space-y-3">
                          {/* COIN HEADER ROW */}
                          <div className="bg-gradient-to-r from-slate-700/30 to-slate-700/10 border border-slate-600/30 rounded-lg p-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-shrink-0 min-w-[120px]">
                                <p className="font-semibold text-white text-lg">{wl.symbol}</p>
                                <p className="text-green-400 font-medium">Current: ${formatPrice(currentPrice)}</p>
                              </div>
                              <div className="flex gap-3 flex-wrap">
                                <p className="text-sm font-semibold text-blue-300 my-2">Purchase History</p>
                                <div className="flex gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => togglePurchaseHistory(wl.symbol)}
                                    className="p-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-lg transition"
                                    title="Purchase History"
                                  >
                                    <ChevronDown size={16} className={`${hasPurchaseHistory ? "rotate-180" : ""} transition`} />
                                  </button>
                                </div>

                                <div className="flex gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => toggleChart(wl.symbol)}
                                    className="p-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-lg transition"
                                    title="Chart"
                                  >
                                    <BarChart3 size={16} />
                                  </button>
                                  <button
                                    onClick={() => toggleHistory(wl.symbol)}
                                    className="p-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-lg transition"
                                    title="Price history"
                                  >
                                    <ChevronDown size={16} className={`${hasHistory ? "rotate-180" : ""} transition`} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedCoin(wl.symbol);
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
                                </div>
                                <button
                                  onClick={() => handleRemoveFromWatchlist(wl.id)}
                                  className="p-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg transition"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* CHART ROW (if expanded) */}
                          {hasChart && candles.has(wl.symbol) && (
                            <div className="bg-slate-700/20 border border-slate-600/20 rounded-lg p-4">
                              <CandleChart candles={candles.get(wl.symbol)!} />
                            </div>
                          )}

                          {/* HISTORY ROW (if expanded) */}
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

                          {/* PURCHASE HISTORY */}
                          {costs.length > 0 && hasPurchaseHistory && (
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-blue-300 ml-1">Purchase History {wl.symbol}</p>
                              {costs.map((cost) => {
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
                                      onClick={() => handleDeleteCostBasis(cost.id)}
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
                )}
              </div>

              {/* RIGHT: MARKET SECTION (1 col) */}
              <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
                <h2 className="text-xl font-bold text-purple-200 mb-4">Market</h2>
                {prices.length === 0 ? (
                  <p className="text-slate-400 text-center py-12">No price data</p>
                ) : (
                  <div className="space-y-2">
                    <div className="mb-4 relative z-10" ref={marketSearchRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                          type="text"
                          placeholder="Search coins..."
                          value={searchCoin}
                          onChange={(e) => {
                            setSearchCoin(e.target.value);
                            setMarketSearchOpen(true);
                          }}
                          onFocus={() => setMarketSearchOpen(true)}
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400/50 transition"
                        />
                        {searchCoin && (
                          <button
                            type="button"
                            onClick={() => setSearchCoin("")}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>

                      {marketSearchOpen && filteredCoins.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto">
                          {filteredCoins.slice(0, 20).map((coin) => {
                            const price = prices.find((p) => p.symbol.toUpperCase() === coin.symbol.toUpperCase());
                            return (
                              <button
                                key={`market-dropdown-${coin.id}`}
                                type="button"
                                onClick={() => {
                                  setSearchCoin(coin.symbol);
                                  setMarketSearchOpen(false);
                                }}
                                className="w-full px-4 py-2.5 hover:bg-slate-600 text-white text-left text-sm border-b border-slate-600 last:border-b-0 transition flex justify-between"
                              >
                                <span className="font-semibold">{coin.symbol.toUpperCase()}</span>
                                <span className="text-green-400">${formatPrice(price?.price) || "N/A"}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {filteredCoins.map((coin) => {
                        const price = prices.find((p) => p.symbol.toUpperCase() === coin.symbol.toUpperCase());
                        if (!price) return null;
                        return (
                          <div key={`market-${coin.id}`} className="bg-gradient-to-r from-slate-700/30 to-slate-700/10 border border-slate-600/30 rounded-lg p-3.5 hover:border-purple-400/30 transition">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <p className="font-semibold text-white">{coin.symbol.toUpperCase()}</p>
                                <p className="text-green-400 text-sm font-medium">
                                  ${formatPrice(price.price)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WATCHLIST TAB */}
        {activeTab === "watchlist" && (
          <div className="space-y-8">
            <div className="flex gap-3">
              <button
                onClick={handleTriggerFetch}
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white rounded-lg font-semibold transition shadow-lg"
              >
                {loading ? "Updating..." : "Refresh Prices"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl z-50">
                <h3 className="text-white font-bold mb-4">Add to Watchlist</h3>
                <form onSubmit={handleAddToWatchlist} className="flex gap-2">
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

              <div className="bg-slate-800/40 border border-green-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
                <h3 className="text-white font-bold mb-4">Add Purchase</h3>
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
                    className="flex-1 px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 transition text-sm"
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
            </div>

            <div className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl mb-8">
              <h2 className="text-xl font-bold text-blue-200 mb-4">My Watchlist</h2>

              {combinedItems.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No coins tracked</p>
              ) : (
                <div className="space-y-4 max-h-full overflow-y-auto pr-2">
                  {combinedItems.map(({ watchlist: wl, costBasis: costs, currentPrice }) => {
                    const coinsAlerts = getCoinsAlerts(wl.symbol);
                    const hasHistory = expandedHistory.has(wl.symbol);
                    const hasChart = expandedCharts.has(wl.symbol);
                    const hasPurchaseHistory = expandedPurchaseHistory.has(wl.symbol);

                    return (
                      <div key={`watchlist-tab-${wl.id}`} className="space-y-3">
                        <div className="bg-gradient-to-r from-slate-700/30 to-slate-700/10 border border-slate-600/30 rounded-lg p-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-shrink-0 min-w-[120px]">
                              <p className="font-semibold text-white text-lg">{wl.symbol}</p>
                              <p className="text-green-400 font-medium">Current: ${formatPrice(currentPrice)}</p>
                            </div>
                            <div className="flex gap-3 flex-wrap">
                              <p className="text-sm font-semibold text-blue-300 my-2">Purchase History</p>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={() => togglePurchaseHistory(wl.symbol)}
                                  className="p-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-lg transition"
                                  title="Purchase History"
                                >
                                  <ChevronDown size={16} className={`${hasPurchaseHistory ? "rotate-180" : ""} transition`} />
                                </button>
                              </div>

                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={() => toggleChart(wl.symbol)}
                                  className="p-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-lg transition"
                                  title="Chart"
                                >
                                  <BarChart3 size={16} />
                                </button>
                                <button
                                  onClick={() => toggleHistory(wl.symbol)}
                                  className="p-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-lg transition"
                                  title="Price history"
                                >
                                  <ChevronDown size={16} className={`${hasHistory ? "rotate-180" : ""} transition`} />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedCoin(wl.symbol);
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
                              </div>
                              <button
                                onClick={() => handleRemoveFromWatchlist(wl.id)}
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
                                  <div key={`history-tab-${wl.symbol}-${idx}`} className="flex justify-between text-slate-400 border-b border-slate-700/30 pb-1">
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
                            {costs.map((cost) => {
                              const totalInvestment = cost.cost_price * cost.quantity;
                              const currentValue = currentPrice * cost.quantity;
                              const gainLoss = currentValue - totalInvestment;
                              const gainLossPercent = totalInvestment ? ((gainLoss / totalInvestment) * 100).toFixed(4) : "0";

                              return (
                                <div
                                  key={`purchase-tab-${cost.id}`}
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
                                    onClick={() => handleDeleteCostBasis(cost.id)}
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
              )}
            </div>
          </div>
        )}

        {/* MARKETS TAB */}
        {activeTab === "markets" && (
          <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
            <h2 className="text-2xl font-bold text-purple-200 mb-4">Market</h2>
            {prices.length === 0 ? (
              <p className="text-slate-400 text-center py-12">No price data</p>
            ) : (
              <div className="space-y-2">
                <div className="mb-4 relative z-10" ref={marketSearchRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search coins..."
                      value={searchCoin}
                      onChange={(e) => {
                        setSearchCoin(e.target.value);
                        setMarketSearchOpen(true);
                      }}
                      onFocus={() => setMarketSearchOpen(true)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400/50 transition"
                    />
                    {searchCoin && (
                      <button
                        type="button"
                        onClick={() => setSearchCoin("")}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  {marketSearchOpen && filteredCoins.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto">
                      {filteredCoins.slice(0, 20).map((coin) => {
                        const price = prices.find((p) => p.symbol.toUpperCase() === coin.symbol.toUpperCase());
                        return (
                          <button
                            key={`market-dropdown-full-${coin.id}`}
                            type="button"
                            onClick={() => {
                              setSearchCoin(coin.symbol);
                              setMarketSearchOpen(false);
                            }}
                            className="w-full px-4 py-2.5 hover:bg-slate-600 text-white text-left text-sm border-b border-slate-600 last:border-b-0 transition flex justify-between"
                          >
                            <span className="font-semibold">{coin.symbol.toUpperCase()}</span>
                            <span className="text-green-400">${formatPrice(price?.price) || "N/A"}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredCoins.map((coin) => {
                    const price = prices.find((p) => p.symbol.toUpperCase() === coin.symbol.toUpperCase());

                    if (!price) return null;

                    return (
                      <div key={`market-full-${coin.id}`} className="bg-gradient-to-r from-slate-700/30 to-slate-700/10 border border-slate-600/30 rounded-lg p-3.5 hover:border-purple-400/30 transition">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-semibold text-white">{coin.symbol.toUpperCase()}</p>
                            <p className="text-green-400 text-sm font-medium">
                              ${formatPrice(price.price)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

              {selectedCoin && getCoinsAlerts(selectedCoin).length > 0 && (
                <div className="border-t border-slate-600 pt-6">
                  <p className="text-yellow-200 text-sm font-semibold mb-3">Active Alerts</p>
                  <div className="space-y-2">
                    {getCoinsAlerts(selectedCoin).map((alert) => (
                      <div
                        key={`alert-modal-${alert.id}`}
                        className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex justify-between items-center"
                      >
                        <div>
                          <p className="text-yellow-300 font-semibold">${formatPrice(alert.target_price)}</p>
                          <p className="text-yellow-200/60 text-xs">
                            {new Date(alert.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveAlert(alert.id)}
                          className="p-1.5 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === "alerts" && (
          <div className="bg-slate-800/40 border border-yellow-500/20 rounded-xl p-6 backdrop-blur-sm shadow-xl">
            <h2 className="text-xl font-bold text-yellow-200 mb-4">Price Alerts</h2>
            {alerts.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No active price alerts</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => {
                  const currentPrice = prices.find((p) => p.symbol === alert.symbol)?.price || 0;
                  const status = currentPrice >= alert.target_price ? "TRIGGERED" : "PENDING";
                  return (
                    <div key={`alert-tab-${alert.id}`} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <p className="text-yellow-300 font-semibold">{alert.symbol}</p>
                        <p className="text-yellow-200/60 text-sm">
                          Target: ${formatPrice(alert.target_price)} | Current: ${formatPrice(currentPrice)} | {status}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveAlert(alert.id)}
                        className="p-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}