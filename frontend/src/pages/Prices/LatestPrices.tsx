import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface CoinPrice {
  symbol: string;
  price: number;
}

export default function LatestPrices() {
  const [prices, setPrices] = useState<CoinPrice[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = window.localStorage.getItem("token");

  const fetchPrices = async () => {
    if (!token) return;
    try {
      const res = await axios.get<CoinPrice[]>(`${API_URL}/prices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrices(res.data);
    } catch (err: any) {
      setError(`Error: ${err.response?.status} ${err.response?.data?.detail || err.message}`);
    }
  };

  const triggerFetch = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/fetch`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchPrices(); // reload prices after fetch
    } catch (err: any) {
      setError(`Error: ${err.response?.status} ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  if (error) return <div>{error}</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Latest Prices</h2>
      <button onClick={triggerFetch} disabled={loading}>
        {loading ? "Fetching..." : "Trigger Fetch"}
      </button>

      <table>
        <thead>
          <tr>
            <th>Coin</th>
            <th>Price</th>
            <th>History</th>
          </tr>
        </thead>
        <tbody>
          {prices.map((coin) => (
            <tr key={coin.symbol}>
              <td>{coin.symbol}</td>
              <td>{coin.price}</td>
              <td>
                <button onClick={() => navigate(`/price-history/${coin.symbol}`)}>
                  View History
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
