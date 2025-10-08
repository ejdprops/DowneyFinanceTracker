/**
 * Format a number as currency with exactly 2 decimal places
 */
export const formatCurrency = (amount: number): string => {
  return amount.toFixed(2);
};

/**
 * Format a number as currency with dollar sign
 */
export const formatCurrencyWithSign = (amount: number, showSign: boolean = false): string => {
  const formatted = Math.abs(amount).toFixed(2);
  const sign = amount < 0 ? '-' : (showSign && amount > 0 ? '+' : '');
  return `${sign}$${formatted}`;
};

/**
 * Format a percentage with exactly 2 decimal places
 */
export const formatPercent = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

/**
 * Round a number to 2 decimal places (for calculations)
 */
export const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

/**
 * Parse a currency string to a number
 */
export const parseCurrency = (value: string): number => {
  const parsed = parseFloat(value.replace(/[$,]/g, ''));
  return isNaN(parsed) ? 0 : roundToTwoDecimals(parsed);
};
