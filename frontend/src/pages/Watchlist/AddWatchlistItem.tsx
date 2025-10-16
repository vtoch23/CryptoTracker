import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface WatchlistItemCreate {
  symbol: string;
  target_price?: number;
}

export const addToWatchlist = async (item: WatchlistItemCreate) => {
  const token = window.localStorage.getItem("token");
  if (!token) throw new Error("No auth token found. Please login.");

  const response = await axios.post(
    `${API_URL}/watchlist/`, // corrected endpoint
    item,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};

export interface WatchlistItem {
  id: number;
  symbol: string;
  target_price?: number;
  created_at: string;
}

export const fetchWatchlist = async (): Promise<WatchlistItem[]> => {
  const token = window.localStorage.getItem("token");
  if (!token) throw new Error("No auth token found. Please login.");

  const response = await axios.get(`${API_URL}/watchlist/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
};

