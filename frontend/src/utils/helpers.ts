export const API_URL = "http://localhost:8000";

export const formatPrice = (price: number | undefined) => {
  if (price === undefined || price === null) return "0.00";
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toFixed(8);
};

import type { HistoryItem } from "../types";

export const deduplicateHistoryByDate = (items: HistoryItem[]): HistoryItem[] => {
  const dateMap = new Map<string, HistoryItem>();
  items.forEach(item => {
    dateMap.set(item.date, item);
  });
  return Array.from(dateMap.values()).sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

export const TOP_100_COINS = [
  { symbol: "BTC", coin_id: "bitcoin" },
  { symbol: "ETH", coin_id: "ethereum" },
  { symbol: "USDT", coin_id: "tether" },
  { symbol: "BNB", coin_id: "binancecoin" },
  { symbol: "XRP", coin_id: "ripple" },
  { symbol: "SOL", coin_id: "solana" },
  { symbol: "USDC", coin_id: "usd-coin" },
  { symbol: "STETH", coin_id: "lido-staked-ether" },
  { symbol: "TRX", coin_id: "tron" },
  { symbol: "DOGE", coin_id: "dogecoin" },
  { symbol: "ADA", coin_id: "cardano" },
  { symbol: "WSTETH", coin_id: "wrapped-steth" },
  { symbol: "WBETH", coin_id: "wrapped-beacon-eth" },
  { symbol: "WBTC", coin_id: "wrapped-bitcoin" },
  { symbol: "LINK", coin_id: "chainlink" },
  { symbol: "USDE", coin_id: "ethena-usde" },
  { symbol: "WEETH", coin_id: "wrapped-eeth" },
  { symbol: "XLM", coin_id: "stellar" },
  { symbol: "HYPE", coin_id: "hyperliquid" },
  { symbol: "BCH", coin_id: "bitcoin-cash" },
];
