import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';
import WatchlistPage from '../pages/Watchlist/WatchlistPage';
import LatestPrices from '../pages/Prices/LatestPrices';
import TriggerFetch from '../pages/Fetch/TriggerFetch';
import PriceHistory from "../pages/Prices/PriceHistory";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/prices" element={<LatestPrices />} />
        <Route path="/fetch" element={<TriggerFetch />} />
        <Route path="/prices/history" element={<PriceHistory />} />
      </Routes>
    </BrowserRouter>
  );
}
