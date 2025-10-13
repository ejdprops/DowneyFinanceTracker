import Papa from 'papaparse';
import type { Transaction, ParsedCSVData } from '../types';
import { parseDate } from './dateUtils';

interface BankCSVFormat {
  name: string;
  detect: (headers: string[], firstRow: any) => boolean;
  parse: (row: any, index: number, dateCounts?: Map<string, number>, dateTotals?: Map<string, number>) => Transaction | null;
}

/**
 * Parse CSV file with automatic bank format detection
 */
export const parseCSV = (file: File): Promise<ParsedCSVData> => {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const transactions: Transaction[] = [];
    let detectedFormat: BankCSVFormat | null = null;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          errors.push(...results.errors.map(e => e.message));
        }

        if (results.data.length === 0) {
          resolve({
            transactions: [],
            errors: ['No data found in CSV file'],
          });
          return;
        }

        // Detect bank format from headers and first row
        const headers = results.meta.fields || [];
        const firstRow = results.data[0];

        detectedFormat = bankFormats.find(format => format.detect(headers, firstRow)) || null;

        if (!detectedFormat) {
          errors.push('Could not detect bank format. Attempting generic parser...');
          detectedFormat = genericFormat;
        }

        console.log(`Detected CSV format: ${detectedFormat.name}`);

        // First pass: count total transactions per date
        const dateTotals = new Map<string, number>();
        results.data.forEach((row: any) => {
          try {
            const dateStr = row['Date'] || row['date'] || row['Transaction Date'] || row['Post Date'] || row['Posted Date'] || row['Posting Date'];
            if (dateStr) {
              const date = new Date(dateStr);
              if (!isNaN(date.getTime())) {
                const dateKey = date.toISOString().split('T')[0];
                dateTotals.set(dateKey, (dateTotals.get(dateKey) || 0) + 1);
              }
            }
          } catch {
            // Skip invalid rows in counting pass
          }
        });

        // Second pass: parse transactions with reversed letter assignment
        // Map of date string -> current count (how many we've processed)
        const dateCounts = new Map<string, number>();

        results.data.forEach((row: any, index: number) => {
          try {
            const transaction = detectedFormat!.parse(row, index, dateCounts, dateTotals);
            if (transaction) {
              transactions.push(transaction);
            }
          } catch (error) {
            errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        if (transactions.length === 0 && errors.length === 0) {
          errors.push('No valid transactions found in CSV file');
        }

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
 * Legacy function - redirects to new parseCSV
 */
export const parseUSAACSV = parseCSV;

/**
 * USAA Format Parser
 */
const parseUSAARow = (row: any, index: number, dateCounts?: Map<string, number>, dateTotals?: Map<string, number>): Transaction | null => {
  const dateStr = row['Date'] || row['date'];
  const description = row['Description'] || row['description'];
  const originalDescription = row['Original Description'] || row['original description'] || '';
  const category = row['Category'] || row['category'] || 'Uncategorized';
  const amountStr = row['Amount'] || row['amount'];
  const status = row['Status'] || row['status'] || row['Transaction Status'];

  if (!dateStr || !description) {
    console.warn(`Skipping row ${index + 1}: Missing required fields`);
    return null;
  }

  // Combine description and original description if both exist
  let combinedDescription = description.toString().trim();
  if (originalDescription && originalDescription.toString().trim()) {
    combinedDescription += ` | ${originalDescription.toString().trim()}`;
  }

  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  // Parse amount - remove $ and commas, handle negative
  const amount = parseFloat(amountStr?.toString().replace(/[$,]/g, '') || '0');

  if (isNaN(amount)) {
    throw new Error('Invalid amount format');
  }

  // Check if transaction is pending or posted
  // USAA typically uses "Pending" or "Posted" in the status column
  // If no status column, default to posted (not pending)
  const isPending = status
    ? status.toString().toLowerCase().includes('pending')
    : false;

  // Pending transactions should NOT be reconciled (not cleared)
  // Posted transactions are cleared
  const isReconciled = !isPending;

  // Generate stable ID with numeric suffix based on chronological order
  // CSV has newest first (row 0), so we reverse the numbering:
  // Row 0 (newest) gets highest number, last row (oldest) gets 001
  const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentCount = dateCounts?.get(dateKey) || 0;
  const totalCount = dateTotals?.get(dateKey) || 1;

  // Reverse numbering: row 0 gets totalCount, last row gets 1
  const sequenceNumber = totalCount - currentCount;
  const paddedNumber = sequenceNumber.toString().padStart(3, '0');
  const id = `USAA-${dateKey}-${paddedNumber}`;

  dateCounts?.set(dateKey, currentCount + 1);

  return {
    id,
    date,
    description: combinedDescription,
    category: category.toString().trim(),
    amount,
    balance: 0, // Will be calculated by calculateBalances
    isPending,
    isReconciled, // Posted = cleared, Pending = not cleared
    isManual: false,
    sortOrder: index, // Preserve CSV order
  };
};

/**
 * Chase Bank Format Parser
 */
const parseChaseRow = (row: any, index: number): Transaction | null => {
  // Chase format: Transaction Date, Post Date, Description, Category, Type, Amount, Memo
  const dateStr = row['Transaction Date'] || row['Post Date'] || row['Posting Date'];
  const description = row['Description'] || row['Memo'];
  const category = row['Category'] || row['Type'] || 'Uncategorized';
  const amountStr = row['Amount'];

  if (!dateStr || !description) {
    return null;
  }

  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  const amount = parseFloat(amountStr?.toString().replace(/[$,]/g, '') || '0');

  if (isNaN(amount)) {
    throw new Error('Invalid amount format');
  }

  return {
    id: `csv-${date.getTime()}-${index}-${Math.random().toString(36).substring(2, 11)}`,
    date,
    description: description.toString().trim(),
    category: category.toString().trim(),
    amount,
    balance: 0,
    isPending: false,
    isManual: false,
    sortOrder: index,
  };
};

/**
 * Bank of America Format Parser
 */
const parseBofARow = (row: any, index: number): Transaction | null => {
  // BofA format: Date, Description, Amount, Running Bal.
  const dateStr = row['Date'] || row['Posted Date'];
  const description = row['Description'] || row['Payee'];
  const amountStr = row['Amount'];

  if (!dateStr || !description) {
    return null;
  }

  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  const amount = parseFloat(amountStr?.toString().replace(/[$,]/g, '') || '0');

  if (isNaN(amount)) {
    throw new Error('Invalid amount format');
  }

  return {
    id: `${date.getTime()}-${index}`,
    date,
    description: description.toString().trim(),
    category: 'Uncategorized',
    amount,
    balance: 0,
    isPending: false,
    isManual: false,
    sortOrder: index,
  };
};

/**
 * Wells Fargo Format Parser
 */
const parseWellsFargoRow = (row: any, index: number): Transaction | null => {
  // Wells Fargo: Date, Amount, *, Check Number, Description
  const dateStr = row['Date'];
  const description = row['Description'];
  const amountStr = row['Amount'];

  if (!dateStr || !description) {
    return null;
  }

  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  const amount = parseFloat(amountStr?.toString().replace(/[$,]/g, '') || '0');

  if (isNaN(amount)) {
    throw new Error('Invalid amount format');
  }

  return {
    id: `${date.getTime()}-${index}`,
    date,
    description: description.toString().trim(),
    category: 'Uncategorized',
    amount,
    balance: 0,
    isPending: false,
    isManual: false,
    sortOrder: index,
  };
};

/**
 * Capital One Format Parser
 */
const parseCapitalOneRow = (row: any, index: number): Transaction | null => {
  // Capital One: Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit
  const dateStr = row['Transaction Date'] || row['Posted Date'];
  const description = row['Description'];
  const category = row['Category'] || 'Uncategorized';
  const debitStr = row['Debit'] || '0';
  const creditStr = row['Credit'] || '0';

  if (!dateStr || !description) {
    return null;
  }

  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  const debit = parseFloat(debitStr.toString().replace(/[$,]/g, '')) || 0;
  const credit = parseFloat(creditStr.toString().replace(/[$,]/g, '')) || 0;

  // Capital One shows debits and credits in separate columns
  const amount = credit > 0 ? credit : -debit;

  if (amount === 0) {
    return null;
  }

  return {
    id: `csv-${date.getTime()}-${index}-${Math.random().toString(36).substring(2, 11)}`,
    date,
    description: description.toString().trim(),
    category: category.toString().trim(),
    amount,
    balance: 0,
    isPending: false,
    isManual: false,
    sortOrder: index,
  };
};

/**
 * Apple Card Format Parser
 */
const parseAppleCardRow = (row: any, index: number, dateCounts?: Map<string, number>, dateTotals?: Map<string, number>): Transaction | null => {
  // Apple Card format: Transaction Date, Clearing Date, Description, Merchant, Category, Type (Purchase/Payment), Amount (USD), Purchased By
  const transactionDateStr = row['Transaction Date'];
  const clearingDateStr = row['Clearing Date'];
  const description = row['Description'] || row['Merchant'];
  const merchant = row['Merchant'];
  const category = row['Category'] || 'Uncategorized';
  const type = row['Type']; // "Purchase", "Payment", "Adjustment", etc.
  const amountStr = row['Amount (USD)'];

  if (!transactionDateStr || !description) {
    return null;
  }

  // Use Transaction Date (when transaction occurred) as the primary date
  const date = parseDate(transactionDateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${transactionDateStr}`);
  }

  // Parse amount - Apple Card shows positive numbers for purchases and negative for payments
  let amount = parseFloat(amountStr?.toString().replace(/[$,]/g, '') || '0');

  if (isNaN(amount)) {
    throw new Error('Invalid amount format');
  }

  // Normalize amount: Purchases/Installments/Interest/Other should be negative (money spent/owed), Payments should be positive (money added)
  // Apple Card CSV shows purchases as positive, so we need to invert them
  if (type && (type.toLowerCase().includes('purchase') ||
               type.toLowerCase().includes('installment') ||
               type.toLowerCase().includes('interest') ||
               type.toLowerCase().includes('other'))) {
    amount = -Math.abs(amount); // Make purchases, installments, interest, and other charges negative
  } else if (type && (type.toLowerCase().includes('payment') || type.toLowerCase().includes('refund'))) {
    amount = Math.abs(amount); // Make payments/refunds positive
  }

  // Check if transaction is pending (has Transaction Date but no Clearing Date)
  const isPending = !clearingDateStr || clearingDateStr.trim() === '';

  // Combine description with merchant if different
  let combinedDescription = description.toString().trim();
  if (merchant && merchant.toString().trim() && merchant !== description) {
    combinedDescription = `${description} - ${merchant}`.trim();
  }

  // Generate stable ID with date-based sequence
  const dateKey = date.toISOString().split('T')[0];
  const currentCount = dateCounts?.get(dateKey) || 0;
  const totalCount = dateTotals?.get(dateKey) || 1;
  const sequenceNumber = totalCount - currentCount;
  const paddedNumber = sequenceNumber.toString().padStart(3, '0');
  const id = `APPLE-${dateKey}-${paddedNumber}`;

  dateCounts?.set(dateKey, currentCount + 1);

  return {
    id,
    date,
    description: combinedDescription,
    category: category.toString().trim(),
    amount,
    balance: 0,
    isPending,
    isReconciled: !isPending,
    isManual: false,
    sortOrder: index,
  };
};

/**
 * Generic Format Parser (fallback)
 */
const parseGenericRow = (row: any, index: number): Transaction | null => {
  // Try to find date, description, and amount fields with common variations
  const possibleDateFields = ['Date', 'date', 'Transaction Date', 'Post Date', 'Posted Date', 'Posting Date'];
  const possibleDescFields = ['Description', 'description', 'Memo', 'memo', 'Payee', 'payee', 'Details'];
  const possibleAmountFields = ['Amount', 'amount', 'Transaction Amount'];
  const possibleCategoryFields = ['Category', 'category', 'Type', 'type'];

  const dateStr = possibleDateFields.map(f => row[f]).find(v => v);
  const description = possibleDescFields.map(f => row[f]).find(v => v);
  const amountStr = possibleAmountFields.map(f => row[f]).find(v => v);
  const category = possibleCategoryFields.map(f => row[f]).find(v => v) || 'Uncategorized';

  if (!dateStr || !description || !amountStr) {
    return null;
  }

  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  const amount = parseFloat(amountStr.toString().replace(/[$,]/g, ''));

  if (isNaN(amount)) {
    throw new Error('Invalid amount format');
  }

  return {
    id: `csv-${date.getTime()}-${index}-${Math.random().toString(36).substring(2, 11)}`,
    date,
    description: description.toString().trim(),
    category: category.toString().trim(),
    amount,
    balance: 0,
    isPending: false,
    isManual: false,
    sortOrder: index,
  };
};

/**
 * Bank format definitions
 */
const bankFormats: BankCSVFormat[] = [
  {
    name: 'Apple Card',
    detect: (headers) => {
      const headerStr = headers.join(',').toLowerCase();
      // Apple Card has very specific headers including "clearing date" and "amount (usd)"
      return (headerStr.includes('transaction date') || headerStr.includes('transactiondate')) &&
             (headerStr.includes('clearing date') || headerStr.includes('clearingdate')) &&
             (headerStr.includes('amount (usd)') || headerStr.includes('amount(usd)'));
    },
    parse: parseAppleCardRow,
  },
  {
    name: 'USAA',
    detect: (headers) => {
      const headerStr = headers.join(',').toLowerCase();
      return headerStr.includes('date') &&
             (headerStr.includes('description') || headerStr.includes('memo')) &&
             headerStr.includes('amount');
    },
    parse: parseUSAARow,
  },
  {
    name: 'Chase',
    detect: (headers) => {
      const headerStr = headers.join(',').toLowerCase();
      return headerStr.includes('transaction date') ||
             headerStr.includes('posting date') ||
             (headerStr.includes('post date') && headerStr.includes('description'));
    },
    parse: parseChaseRow,
  },
  {
    name: 'Bank of America',
    detect: (headers) => {
      const headerStr = headers.join(',').toLowerCase();
      return (headerStr.includes('posted date') || headerStr.includes('date')) &&
             (headerStr.includes('payee') || headerStr.includes('description')) &&
             headerStr.includes('amount') &&
             headerStr.includes('running bal');
    },
    parse: parseBofARow,
  },
  {
    name: 'Wells Fargo',
    detect: (headers) => {
      const headerStr = headers.join(',').toLowerCase();
      return headerStr.includes('date') &&
             headerStr.includes('description') &&
             headerStr.includes('amount') &&
             headerStr.includes('check number');
    },
    parse: parseWellsFargoRow,
  },
  {
    name: 'Capital One',
    detect: (headers) => {
      const headerStr = headers.join(',').toLowerCase();
      return (headerStr.includes('transaction date') || headerStr.includes('posted date')) &&
             headerStr.includes('debit') &&
             headerStr.includes('credit');
    },
    parse: parseCapitalOneRow,
  },
];

/**
 * Generic format (fallback)
 */
const genericFormat: BankCSVFormat = {
  name: 'Generic',
  detect: () => true,
  parse: parseGenericRow,
};
