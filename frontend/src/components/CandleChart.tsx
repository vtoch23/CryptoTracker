import type  { Candle } from "../types/index";
import { formatPrice } from "../utils/priceFormatters";

const CandleChart = ({ candles }: { candles: Candle[] }) => {
  if (!candles || candles.length === 0) {
    return <div className="text-slate-400 text-sm">No data</div>;
  }

  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const maxPrice = Math.max(...highs);
  const minPrice = Math.min(...lows);

  const range = maxPrice - minPrice || 1;

  return (
    <div className="h-64 flex items-end gap-[2px] bg-slate-900/30 rounded p-4 overflow-hidden">
      {candles.slice(-80).map((candle, idx) => {
        const openNorm = (candle.open - minPrice) / range;
        const closeNorm = (candle.close - minPrice) / range;
        const highNorm = (candle.high - minPrice) / range;
        const lowNorm = (candle.low - minPrice) / range;

        const bodyTop = Math.max(openNorm, closeNorm);
        const bodyBottom = Math.min(openNorm, closeNorm);
        const bodyHeight = Math.max((bodyTop - bodyBottom) * 100, 2);
        const wickTop = (highNorm - bodyTop) * 100;
        const wickBottom = (bodyBottom - lowNorm) * 100;

        const isGreen = candle.close >= candle.open;

        return (
          <div
            key={`candle-${idx}`}
            className="flex-1 flex flex-col items-center justify-end"
            title={`${candle.date}: O:${formatPrice(candle.open)} H:${formatPrice(candle.high)} L:${formatPrice(candle.low)} C:${formatPrice(candle.close)}`}
          >
            {wickTop > 0 && (
              <div className="w-0.5 bg-slate-500" style={{ height: `${wickTop}%` }} />
            )}
            <div
              className={`w-full ${isGreen ? "bg-green-500" : "bg-red-500"}`}
              style={{ height: `${bodyHeight}%`, minHeight: "2px" }}
            />
            {wickBottom > 0 && (
              <div className="w-0.5 bg-slate-500" style={{ height: `${wickBottom}%` }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CandleChart;
