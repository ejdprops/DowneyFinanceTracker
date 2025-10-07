import Papa from 'papaparse';
import type { Transaction, ParsedCSVData } from '../types';

/**
 * Parse USAA CSV file and convert to Transaction objects
 * USAA format typically has: Date, Description, Original Description, Category, Amount, Status
 */
export const parseUSAACSV = (file: File): Promise<ParsedCSVData> => {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const transactions: Transaction[] = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          errors.push(...results.errors.map(e => e.message));
        }

        results.data.forEach((row: any, index: number) => {
          try {
            const transaction = parseUSAARow(row, index);
            if (transaction) {
              transactions.push(transaction);
            }
          } catch (error) {
            errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        resolve({ transactions, errors });
      },
      error: (error) => {
        resolve({
          transactions: [],
          errors: [`Failed to parse CSV: ${error.message}`],
        });
      },
    });
  });
};

/**
 * Parse a single USAA CSV row
 * Handles multiple possible column name variations
 */
const parseUSAARow = (row: any, index: number): Transaction | null => {
  // Try different possible column names for date
  const dateStr = row['Date'] || row['date'] || row['Transaction Date'] || row['Posted Date'];

  // Try different possible column names for description
  const description = row['Description'] || row['description'] || row['Original Description'] || row['Memo'];

  // Try different possible column names for amount
  const amountStr = row['Amount'] || row['amount'] || row['Debit'] || row['Credit'];

  // Try different possible column names for balance
  const balanceStr = row['Balance'] || row['balance'] || row['Running Balance'];

  // Category (if available)
  const category = row['Category'] || row['category'];

  // Validate required fields
  if (!dateStr || !description || !amountStr) {
    console.warn(`Skipping row ${index + 1}: Missing required fields`);
    return null;
  }

  // Parse date
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  // Parse amount - handle negative values and currency formatting
  const amount = parseFloat(amountStr.toString().replace(/[$,]/g, ''));
  if (isNaN(amount)) {
    throw new Error(`Invalid amount: ${amountStr}`);
  }

  // Parse balance (optional)
  let balance: number | undefined;
  if (balanceStr) {
    balance = parseFloat(balanceStr.toString().replace(/[$,]/g, ''));
    if (isNaN(balance)) {
      balance = undefined;
    }
  }

  return {
    id: `${date.getTime()}-${index}`,
    date,
    description: description.toString().trim(),
    amount,
    balance,
    category: category?.toString().trim(),
  };
};

/**
 * Export transactions to CSV format
 */
export const exportToCSV = (transactions: Transaction[]): string => {
  const headers = ['Date', 'Description', 'Amount', 'Balance', 'Category', 'Account'];

  const rows = transactions.map(t => [
    t.date.toLocaleDateString(),
    t.description,
    t.amount.toFixed(2),
    t.balance?.toFixed(2) || '',
    t.category || '',
    t.account || '',
  ]);

  const csv = Papa.unparse({
    fields: headers,
    data: rows,
  });

  return csv;
};

/**
 * Download data as CSV file
 */
export const downloadCSV = (data: string, filename: string): void => {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
