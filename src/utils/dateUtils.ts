/**
 * Timezone constant for all date/time operations
 */
export const TIMEZONE = 'America/Chicago';

/**
 * Parse a date string in America/Chicago timezone
 * Handles both ISO date strings (YYYY-MM-DD) and full date strings
 */
export const parseDate = (dateStr: string): Date => {
  // For ISO date format (YYYY-MM-DD), parse as local Chicago time
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create date in Chicago timezone
    const date = new Date();
    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // For other formats, parse normally then adjust to Chicago timezone
  const date = new Date(dateStr);

  // Convert to Chicago timezone by getting the formatted string and reparsing
  const chicagoStr = date.toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(chicagoStr);
};

/**
 * Get current date/time in America/Chicago timezone
 */
export const now = (): Date => {
  const chicagoStr = new Date().toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(chicagoStr);
};

/**
 * Format date for input[type="date"] value (YYYY-MM-DD)
 */
export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Create a new Date object set to midnight in Chicago timezone
 */
export const createDate = (year: number, month: number, day: number): Date => {
  const date = new Date();
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
};
