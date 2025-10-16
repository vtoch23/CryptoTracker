import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface WatchlistItem {
  id: number;
  symbol: string;
  price: number;
  change: number;
}

export const getWatchlist = async (): Promise<WatchlistItem[]> => {
  const token = window.localStorage.getItem("token");

  if (!token) throw new Error("No auth token found. Please login.");

  const response = await axios.get<WatchlistItem[]>(`${API_URL}/watchlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
};
