import Papa from 'papaparse';
import type { Transaction, ParsedCSVData } from '../types';

/**
 * Parse USAA Bills CSV - handles the USAA transaction export format
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

const parseUSAARow = (row: any, index: number): Transaction | null => {
  const dateStr = row['Date'] || row['date'];
  const description = row['Description'] || row['description'];
  const category = row['Category'] || row['category'] || 'Uncategorized';
  const amountStr = row['Amount'] || row['amount'];

  if (!dateStr || !description) {
    console.warn(`Skipping row ${index + 1}: Missing required fields`);
    return null;
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  // Parse amount - remove $ and commas, handle negative
  const amount = parseFloat(amountStr?.toString().replace(/[$,]/g, '') || '0');

  if (isNaN(amount)) {
    throw new Error('Invalid amount format');
  }

  return {
    id: `${date.getTime()}-${index}`,
    date,
    description: description.toString().trim(),
    category: category.toString().trim(),
    amount,
    balance: 0, // Will be calculated by calculateBalances
    isPending: false, // CSV exports are all posted
    isManual: false,
    sortOrder: index, // Preserve CSV order
  };
};
