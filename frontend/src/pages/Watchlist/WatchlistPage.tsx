import { useState, useEffect } from "react";
import { addToWatchlist, fetchWatchlist, WatchlistItem } from "./AddWatchlistItem";

export default function AddToWatchlistForm() {
  const [symbol, setSymbol] = useState("");
  const [targetPrice, setTargetPrice] = useState<number | undefined>(undefined);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  const loadWatchlist = async () => {
    try {
      const items = await fetchWatchlist();
      setWatchlist(items);
    } catch (err: any) {
      console.error(err.response?.data || err.message);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const item = { symbol, target_price: targetPrice };
      const added = await addToWatchlist(item);
      alert(`${added.symbol} added successfully`);
      setSymbol("");
      setTargetPrice(undefined);
      await loadWatchlist(); // refresh list after adding
    } catch (err: any) {
      console.error(err.response?.data || err.message);
      alert("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          required
        />
        <input
          type="number"
          placeholder="Target Price"
          value={targetPrice || ""}
          onChange={(e) => setTargetPrice(Number(e.target.value))}
        />
        <button type="submit">Add to Watchlist</button>
      </form>

      <h2>Watchlist</h2>
      <ul>
        {watchlist.map((item) => (
          <li key={item.id}>
            {item.symbol} - Target: {item.target_price} - Added: {new Date(item.created_at).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
