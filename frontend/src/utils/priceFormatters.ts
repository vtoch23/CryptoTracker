// utils/priceFormatters.ts

export const formatPrice = (price: number | undefined): string => {
  if (price === undefined || price === null) return "0.00";
  
  // Handle very small numbers (< 0.01) - show more decimals
  if (price < 0.01 && price > 0) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    });
  }
  
  // Handle numbers 0.01 - 1 - show 4 decimals
  if (price < 1) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  
  // Handle numbers >= 1 - show 2-3 decimals, but trim trailing zeros
  const formatted = price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
  
  // Remove trailing zeros after decimal point, but keep at least 2 decimal places
  return formatted.replace(/\.?0+$/, (match) => {
    // If we're removing all decimals, return with .00
    if (match === '.000') return '.00';
    return match;
  });
};

// Alternative simplified version if you prefer
export const formatPriceSimple = (price: number | undefined): string => {
  if (price === undefined || price === null) return "0.00";
  
  // Just limit decimal places smartly
  let decimals = 2;
  if (price < 0.01) decimals = 6;
  else if (price < 1) decimals = 4;
  else if (price < 10) decimals = 3;
  
  const rounded = Math.round(price * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
};