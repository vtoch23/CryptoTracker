import type  { Candle } from "../types/index";
import { formatPrice } from "../utils/priceFormatters";

// Chart configuration constants
const DISPLAY_CANDLE_COUNT = 42;
const CHART_HEIGHT = 240;
const PRICE_GRID_LINE_COUNT = 8;
const DATE_LABEL_COUNT = 7;
const CHART_PADDING_PERCENT = 0.02;
const MIN_CANDLE_BODY_HEIGHT = 2;

const CandleChart = ({ candles }: { candles: Candle[] }) => {
  if (!candles || candles.length === 0) {
    return <div className="text-slate-400 text-sm">No data</div>;
  }

  // Only calculate range from the candles we're actually displaying
  const displayedCandles = candles.slice(-DISPLAY_CANDLE_COUNT);
  const highs = displayedCandles.map(c => c.high);
  const lows = displayedCandles.map(c => c.low);
  const maxPrice = Math.max(...highs);
  const minPrice = Math.min(...lows);

  // Add padding so candles don't touch edges
  const dataRange = maxPrice - minPrice || 1;
  const padding = dataRange * CHART_PADDING_PERCENT;

  const chartMax = maxPrice + padding;
  const chartMin = minPrice - padding;
  const chartRange = chartMax - chartMin;

  // Generate price levels for grid lines
  const priceGridLines = Array.from({ length: PRICE_GRID_LINE_COUNT }, (_, i) => {
    const price = chartMin + (chartRange * i / (PRICE_GRID_LINE_COUNT - 1));
    const yPosition = (i / (PRICE_GRID_LINE_COUNT - 1)) * CHART_HEIGHT;
    return { price, yPosition };
  });

  // Get date labels - show evenly-spaced labels
  const labelStep = Math.floor(displayedCandles.length / (DATE_LABEL_COUNT - 1));
  const dateLabels = Array.from({ length: DATE_LABEL_COUNT }, (_, i) => {
    const idx = Math.min(i * labelStep, displayedCandles.length - 1);
    return displayedCandles[idx];
  });

  return (
    <div className="h-72 relative bg-slate-900/30 rounded p-4 overflow-hidden flex flex-col">
      <div className="flex-1 flex">
        {/* Price labels on the left */}
        <div className="absolute left-0 top-4 bottom-8 w-20 flex flex-col justify-between text-xs text-slate-400 pr-2">
          {priceGridLines.reverse().map((line, idx) => (
            <div key={`price-${idx}`} className="text-right">
              ${formatPrice(line.price)}
            </div>
          ))}
        </div>

        {/* Grid lines */}
        <div className="absolute left-20 right-4 top-4 bottom-8 pointer-events-none">
          {priceGridLines.map((line, idx) => (
            <div
              key={`grid-${idx}`}
              className="absolute w-full border-t border-slate-700/50"
              style={{ bottom: `${line.yPosition}px` }}
            />
          ))}
          {/* Vertical date separator lines */}
          {dateLabels.slice(1).map((_, idx) => (
            <div
              key={`v-separator-${idx}`}
              className="absolute h-full border-l border-slate-700/50"
              style={{ left: `${((idx + 1) / dateLabels.length) * 100}%` }}
            />
          ))}
        </div>

        {/* Candles */}
        <div className="flex-1 flex gap-1 ml-20 relative" style={{ height: `${CHART_HEIGHT}px` }}>
      {displayedCandles.map((candle, idx) => {
        // Normalize prices to 0-1 range
        const openNorm = (candle.open - chartMin) / chartRange;
        const closeNorm = (candle.close - chartMin) / chartRange;
        const highNorm = (candle.high - chartMin) / chartRange;
        const lowNorm = (candle.low - chartMin) / chartRange;

        // Calculate pixel positions from bottom
        const highPx = highNorm * CHART_HEIGHT;
        const lowPx = lowNorm * CHART_HEIGHT;
        const openPx = openNorm * CHART_HEIGHT;
        const closePx = closeNorm * CHART_HEIGHT;

        const bodyTop = Math.max(openPx, closePx);
        const bodyBottom = Math.min(openPx, closePx);
        const bodyHeight = Math.max(bodyTop - bodyBottom, MIN_CANDLE_BODY_HEIGHT);

        const isGreen = candle.close >= candle.open;

        return (
          <div
            key={`candle-${idx}`}
            className="flex-1 relative"
            style={{ height: `${CHART_HEIGHT}px` }}
            title={`${candle.date}: O:${formatPrice(candle.open)} H:${formatPrice(candle.high)} L:${formatPrice(candle.low)} C:${formatPrice(candle.close)}`}
          >
            {/* Top wick */}
            {highPx > bodyTop && (
              <div
                className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-slate-500"
                style={{
                  bottom: `${bodyTop}px`,
                  height: `${highPx - bodyTop}px`
                }}
              />
            )}
            {/* Body */}
            <div
              className={`absolute left-0 right-0 ${isGreen ? "bg-green-500" : "bg-red-500"}`}
              style={{
                bottom: `${bodyBottom}px`,
                height: `${bodyHeight}px`
              }}
            />
            {/* Bottom wick */}
            {bodyBottom > lowPx && (
              <div
                className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-slate-500"
                style={{
                  bottom: `${lowPx}px`,
                  height: `${bodyBottom - lowPx}px`
                }}
              />
            )}
          </div>
        );
      })}
        </div>
      </div>

      {/* Date labels at bottom */}
      <div className="flex justify-between mt-2 ml-20 text-xs text-slate-400">
        {dateLabels.map((candle, idx) => (
          <div key={`date-${idx}`} className="flex-1 text-center">
            {new Date(candle.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CandleChart;
