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

  const dataRange = maxPrice - minPrice || 1;
  const padding = dataRange * 0.1; // 10% padding for visual spacing

  // Simple approach: just add padding without complex rounding
  const chartMax = maxPrice + padding;
  const chartMin = minPrice - padding;
  const chartRange = chartMax - chartMin;

  const CHART_HEIGHT = 240; // h-64 = 256px, minus padding

  // Generate 8 price levels for grid lines
  const priceGridLines = Array.from({ length: 8 }, (_, i) => {
    const price = chartMin + (chartRange * i / 7);
    const yPosition = (i / 7) * CHART_HEIGHT;
    return { price, yPosition };
  });

  return (
    <div className="h-64 relative bg-slate-900/30 rounded p-4 overflow-hidden flex">
      {/* Price labels on the left */}
      <div className="absolute left-0 top-4 bottom-4 w-20 flex flex-col justify-between text-xs text-slate-400 pr-2">
        {priceGridLines.reverse().map((line, idx) => (
          <div key={`price-${idx}`} className="text-right">
            ${formatPrice(line.price)}
          </div>
        ))}
      </div>

      {/* Grid lines */}
      <div className="absolute left-20 right-4 top-4 bottom-4 pointer-events-none">
        {priceGridLines.map((line, idx) => (
          <div
            key={`grid-${idx}`}
            className="absolute w-full border-t border-slate-700/50"
            style={{ bottom: `${line.yPosition}px` }}
          />
        ))}
      </div>

      {/* Candles */}
      <div className="flex-1 flex items-end gap-1 ml-20">
      {candles.slice(-42).map((candle, idx) => {
        // Normalize prices to 0-1 range using chart min/max (with padding)
        const openNorm = (candle.open - chartMin) / chartRange;
        const closeNorm = (candle.close - chartMin) / chartRange;
        const highNorm = (candle.high - chartMin) / chartRange;
        const lowNorm = (candle.low - chartMin) / chartRange;

        // Calculate positions and heights in pixels
        const bodyTop = Math.max(openNorm, closeNorm);
        const bodyBottom = Math.min(openNorm, closeNorm);

        const highPx = highNorm * CHART_HEIGHT;
        const lowPx = lowNorm * CHART_HEIGHT;
        const bodyTopPx = bodyTop * CHART_HEIGHT;
        const bodyBottomPx = bodyBottom * CHART_HEIGHT;

        const totalHeight = highPx - lowPx;
        const wickTopHeight = highPx - bodyTopPx;
        const bodyHeight = Math.max(bodyTopPx - bodyBottomPx, 2);
        const wickBottomHeight = bodyBottomPx - lowPx;

        const isGreen = candle.close >= candle.open;

        return (
          <div
            key={`candle-${idx}`}
            className="flex-1 relative"
            style={{ height: `${totalHeight}px` }}
            title={`${candle.date}: O:${formatPrice(candle.open)} H:${formatPrice(candle.high)} L:${formatPrice(candle.low)} C:${formatPrice(candle.close)}`}
          >
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
              {wickBottomHeight > 0 && (
                <div className="w-0.5 bg-slate-500" style={{ height: `${wickBottomHeight}px` }} />
              )}
              <div
                className={`w-full ${isGreen ? "bg-green-500" : "bg-red-500"}`}
                style={{ height: `${bodyHeight}px`, minHeight: "2px" }}
              />
              {wickTopHeight > 0 && (
                <div className="w-0.5 bg-slate-500" style={{ height: `${wickTopHeight}px` }} />
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};

export default CandleChart;
