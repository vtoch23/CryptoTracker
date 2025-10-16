import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const triggerFetch = async (): Promise<{ message: string }> => {
  const token = window.localStorage.getItem("token");
  if (!token) throw new Error("No auth token found. Please login.");

  const response = await axios.post<{ message: string }>(
    `${API_URL}/fetch`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
};
