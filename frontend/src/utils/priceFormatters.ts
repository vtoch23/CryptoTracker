/**
 * Utility functions for consistent price formatting
 * File: src/utils/priceFormatter.ts
 */

/**
 * Format price to 5 decimal places
 * Handles edge cases like very small numbers and scientific notation
 */
export const formatPrice = (price: number | string | undefined | null, decimals: number = 5): string => {
  if (price === null || price === undefined || price === '') {
    return '0.00000';
  }

  let numPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return '0.00000';
  }

  // Ensure we don't display as scientific notation
  return numPrice.toFixed(decimals);
};

/**
 * Format for display with commas for large numbers
 */
export const formatPriceDisplay = (price: number | string | undefined | null): string => {
  const formatted = formatPrice(price, 5);
  const [whole, decimal] = formatted.split('.');
  
  // Add commas to whole number part
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return `${withCommas}.${decimal}`;
};

/**
 * Parse price for calculations
 */
export const parsePrice = (price: number | string): number => {
  if (typeof price === 'string') {
    return parseFloat(price);
  }
  return price;
};