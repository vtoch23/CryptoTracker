export interface CoinPrice {
  symbol: string;
  price: number;
}

export interface WatchlistItem {
  id: number;
  symbol: string;
  coin_id: string;
  order: number;
  created_at: string;
}

export interface AlertItem {
  id: number;
  symbol: string;
  target_price: number;
  created_at: string;
}

export interface CostBasis {
  id: number;
  symbol: string;
  cost_price: number;
  quantity: number;
}

export interface CoinOption {
  id: string;
  symbol: string;
}

export interface HistoryItem {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Candle {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TrendingCoin {
  id: string;
  coin_id: number;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  price_btc: number;
}

export interface TopGainerLoser {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  current_price: number;
}

export type TabType = "dashboard" | "watchlist" | "markets" | "alerts" | "portfolio";
export type MarketTabType = "top100" | "trending" | "gainers_losers";
