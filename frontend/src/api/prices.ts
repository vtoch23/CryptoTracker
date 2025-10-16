import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface PriceItem {
  symbol: string;
  price: number;
  change: number;
}

export const getLatestPrices = async (): Promise<PriceItem[]> => {
  const token = window.localStorage.getItem("token");
  if (!token) throw new Error("No auth token found. Please login.");

  const response = await axios.get<PriceItem[]>(`${API_URL}/prices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
