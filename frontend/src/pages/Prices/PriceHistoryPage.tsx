import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface PriceHistoryItem {
  timestamp: string;
  price: number;
}

interface Props {
  symbol: string;
}

export default function PriceHistoryPage({ symbol }: Props) {
  const [history, setHistory] = useState<PriceHistoryItem[]>([]);
  const [error, setError] = useState("");

  const token = window.localStorage.getItem("token");

  const fetchHistory = async () => {
    if (!token) return;
    try {
      const res = await axios.get<PriceHistoryItem[]>(`${API_URL}/prices/${symbol}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(res.data);
    } catch (err: any) {
      setError(`Error: ${err.response?.status} ${err.response?.data?.detail || err.message}`);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [symbol]);

  if (error) return <div>{error}</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>{symbol} Price History</h2>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item, idx) => (
            <tr key={idx}>
              <td>{item.timestamp}</td>
              <td>{item.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
