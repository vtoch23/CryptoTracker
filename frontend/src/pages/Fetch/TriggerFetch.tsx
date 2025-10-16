import axios from "axios";
import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function TriggerFetch() {
  const [status, setStatus] = useState("");

  const fetchData = async () => {
    try {
      const res = await axios.post(`${API_URL}/fetch/fetch`);
      setStatus(res.data.message || "Fetch triggered successfully!");
    } catch (err: any) {
      setStatus(`Error: ${err.response?.status} ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Trigger Fetch</h2>
      <button onClick={fetchData}>Fetch Latest Prices</button>
      {status && <p>{status}</p>}
    </div>
  );
}
