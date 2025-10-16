import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface PriceHistoryItem {
  timestamp: string;
  price: number;
}

export const getPriceHistory = async (symbol: string): Promise<PriceHistoryItem[]> => {
  const token = window.localStorage.getItem("token");
  if (!token) throw new Error("No auth token found. Please login.");

  const response = await axios.get<PriceHistoryItem[]>(
    `${API_URL}/prices/history/${symbol}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
};

// Default export for convenience
export default {
  getPriceHistory
};
