import Papa from 'papaparse';
import type { Transaction, ParsedCSVData } from '../types';
import { parseDate } from './dateUtils';

type CSVRow = Record<string, string>;

interface BankCSVFormat {
  name: string;
  detect: (headers: string[], firstRow: CSVRow) => boolean;
  parse: (row: CSVRow, index: number, dateCounts?: Map<string, number>, dateTotals?: Map<string, number>) => Transaction | null;
}

/**
 * Parse CSV file with automatic bank format detection
 */
export const parseCSV = (file: File, accountType?: 'checking' | 'savings' | 'credit_card'): Promise<ParsedCSVData> => {
  return new Promise((resolve, reject) => {
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
        const firstRow = results.data[0] as CSVRow;

        detectedFormat = bankFormats.find(format => format.detect(headers, firstRow)) || null;

        if (!detectedFormat) {
          errors.push('Could not detect bank format. Attempting generic parser...');
          detectedFormat = genericFormat;
        }

        if (!detectedFormat) {
          reject(new Error('CSV parsing failed: No suitable parser found'));
          return;
        }

        // Store in const to help TypeScript understand it's non-null
        const format = detectedFormat;

        // First pass: count total transactions per date AND detect USAA credit card
        const dateTotals = new Map<string, number>();
        let usaaCreditCardPaymentCount = 0;
        let usaaTotalRows = 0;

        (results.data as CSVRow[]).forEach((row) => {
          try {
            const dateStr = row['Date'] || row['date'] || row['Transaction Date'] || row['Post Date'] || row['Posted Date'] || row['Posting Date'];
            if (dateStr) {
              const date = new Date(dateStr);
              if (!isNaN(date.getTime())) {
                const dateKey = date.toISOString().split('T')[0];
                dateTotals.set(dateKey, (dateTotals.get(dateKey) || 0) + 1);
              }
            }

            // For USAA format, detect if this is a credit card by checking for "Credit Card Payment" as INCOME
            // Credit card accounts receive payments (positive), checking accounts make payments (negative)
            if (format.name === 'USAA') {
              usaaTotalRows++;
              const category = row['Category'] || row['category'] || '';
              const description = row['Description'] || row['description'] || '';
              const amount = parseFloat(row['Amount'] || '0');

              // Credit card CSV: "Credit Card Payment" appears as POSITIVE (money received)
              // Checking CSV: "Credit Card Payment" appears as NEGATIVE (money sent out)
              if ((category.toLowerCase().includes('credit card payment') ||
                   description.toLowerCase().includes('credit card payment') ||
                   description.toLowerCase().includes('automatic payment')) &&
                  amount > 0) {
                usaaCreditCardPaymentCount++;
              }
            }
          } catch {
            // Skip invalid rows in counting pass
          }
        });

        // Second pass: parse transactions with reversed letter assignment
        // Map of date string -> current count (how many we've processed)
        const dateCounts = new Map<string, number>();

        // Determine if this is a credit card CSV
        // Priority 1: Use accountType parameter if provided
        // Priority 2: Auto-detect for USAA by checking for credit card payment transactions
        let isCreditCardCSV = accountType === 'credit_card';

        if (!isCreditCardCSV && format.name === 'USAA' && usaaCreditCardPaymentCount > 0 && usaaTotalRows > 0) {
          const creditCardRatio = usaaCreditCardPaymentCount / usaaTotalRows;
          // If more than 5% of transactions are credit card payments, it's probably a credit card account
          if (creditCardRatio > 0.05) {
            isCreditCardCSV = true;
          }
        }

        // Process as credit card CSV if detected
        if (isCreditCardCSV) {
          dateCounts.set('__USAA_IS_CREDIT_CARD__', 1);
        }

        (results.data as CSVRow[]).forEach((row, index: number) => {
          try {
            const transaction = format.parse(row, index, dateCounts, dateTotals);
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
const parseUSAARow = (row: CSVRow, index: number, dateCounts?: Map<string, number>, dateTotals?: Map<string, number>): Transaction | null => {
  const dateStr = row['Date'] || row['date'];
  const description = row['Description'] || row['description'];
  const originalDescription = row['Original Description'] || row['original description'] || '';
  const category = row['Category'] || row['category'] || 'Uncategorized';
  const amountStr = row['Amount'] || row['amount'];
  const status = row['Status'] || row['status'] || row['Transaction Status'];

  if (!dateStr || !description) {
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
  let amount = parseFloat(amountStr?.toString().replace(/[$,]/g, '') || '0');

  if (isNaN(amount)) {
    throw new Error('Invalid amount format');
  }

  // USAA Credit Cards have reversed signs compared to checking accounts:
  // - Checking: positive = spent, negative = received
  // - Credit Card: positive = received (payments), negative = spent (charges)
  // The detection is done at the file level (passed via dateCounts map with special key)
  // If this is a credit card CSV, invert all amounts
  const isCreditCardCSV = dateCounts?.get('__USAA_IS_CREDIT_CARD__') === 1;

  if (isCreditCardCSV) {
    // This is a credit card - invert all amounts
    amount = -amount;
  }

  // Check if transaction is pending or posted
  // USAA typically uses "Pending" or "Posted" in the status column
  // If no status column, default to posted (not pending)
  const statusLower = status ? status.toString().toLowerCase() : '';
  const isPending = statusLower.includes('pending');
  const isPosted = statusLower.includes('posted');

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
    isPosted,
    isManual: false,
    sortOrder: index, // Preserve CSV order
  };
};

/**
 * Chase Bank Format Parser
 */
const parseChaseRow = (row: CSVRow, index: number): Transaction | null => {
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
const parseBofARow = (row: CSVRow, index: number): Transaction | null => {
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
const parseWellsFargoRow = (row: CSVRow, index: number): Transaction | null => {
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
const parseCapitalOneRow = (row: CSVRow, index: number): Transaction | null => {
  // Capital One: Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit
  const dateStr = row['Transaction Date'] || row['Posted Date'];
  const description = row['Description'];
  const category = row['Category'] || 'Uncategorized';
  const debitStr = row['Debit'];
  const creditStr = row['Credit'];

  if (!dateStr || !description) {
    return null;
  }

  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  // Handle empty strings and parse amounts
  // Empty string, null, or undefined should become 0
  let debit = 0;
  let credit = 0;

  if (debitStr !== undefined && debitStr !== null && debitStr !== '') {
    const cleaned = debitStr.toString().trim().replace(/[$,]/g, '');
    if (cleaned !== '') {
      debit = parseFloat(cleaned);
      if (isNaN(debit)) debit = 0;
    }
  }

  if (creditStr !== undefined && creditStr !== null && creditStr !== '') {
    const cleaned = creditStr.toString().trim().replace(/[$,]/g, '');
    if (cleaned !== '') {
      credit = parseFloat(cleaned);
      if (isNaN(credit)) credit = 0;
    }
  }

  // Capital One shows debits and credits in separate columns
  // For credit cards: Debits are charges (positive = owe more), Credits are payments (negative = owe less)
  const amount = debit > 0 ? debit : -credit;

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
const parseAppleCardRow = (row: CSVRow, index: number, dateCounts?: Map<string, number>, dateTotals?: Map<string, number>): Transaction | null => {
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

  // Normalize amount for credit cards:
  // - Purchases/Charges = positive (increases debt owed)
  // - Payments/Refunds = negative (decreases debt owed)
  // Apple Card CSV shows purchases as positive and payments as negative (which is correct!)
  // We just need to ensure the sign is correct for all types
  if (type && (type.toLowerCase().includes('purchase') ||
               type.toLowerCase().includes('installment') ||
               type.toLowerCase().includes('interest') ||
               type.toLowerCase().includes('other'))) {
    amount = Math.abs(amount); // Make purchases, installments, interest, and other charges positive
  } else if (type && (type.toLowerCase().includes('payment') || type.toLowerCase().includes('refund'))) {
    amount = -Math.abs(amount); // Make payments/refunds negative
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
    isManual: false,
    sortOrder: index,
  };
};

/**
 * Generic Format Parser (fallback)
 */
const parseGenericRow = (row: CSVRow, index: number): Transaction | null => {
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
    name: 'Capital One',
    detect: (headers) => {
      const headerStr = headers.join(',').toLowerCase();
      // Capital One has separate Debit and Credit columns (must check before Chase)
      return (headerStr.includes('transaction date') || headerStr.includes('posted date')) &&
             headerStr.includes('debit') &&
             headerStr.includes('credit');
    },
    parse: parseCapitalOneRow,
  },
  {
    name: 'Chase',
    detect: (headers) => {
      const headerStr = headers.join(',').toLowerCase();
      // Chase has "Transaction Date" or "Posting Date" (more specific than just "Date")
      // Must NOT have Debit/Credit columns (that's Capital One)
      return (headerStr.includes('transaction date') ||
             headerStr.includes('posting date') ||
             (headerStr.includes('post date') && headerStr.includes('description'))) &&
             !headerStr.includes('debit') &&
             !headerStr.includes('credit');
    },
    parse: parseChaseRow,
  },
  {
    name: 'USAA',
    detect: (headers) => {
      const headerStr = headers.join(',').toLowerCase();
      // USAA has "Date" (not "Transaction Date"), "Description", "Amount", and often "Original Description"
      // Make it more specific to avoid matching other banks
      return headerStr.includes('date') &&
             !headerStr.includes('transaction date') && // Not Chase
             !headerStr.includes('posting date') && // Not Chase
             !headerStr.includes('post date') && // Not Chase/BofA
             (headerStr.includes('description') || headerStr.includes('memo')) &&
             headerStr.includes('amount') &&
             !headerStr.includes('debit') && // Not Capital One
             !headerStr.includes('credit'); // Not Capital One
    },
    parse: parseUSAARow,
  },
  {
    name: 'Bank of America',
    detect: (headers) => {
      const headerStr = headers.join(',').toLowerCase();
      // BofA has "Running Bal" which is unique
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
      // Wells Fargo has "Check Number" column which is unique
      return headerStr.includes('date') &&
             headerStr.includes('description') &&
             headerStr.includes('amount') &&
             headerStr.includes('check number');
    },
    parse: parseWellsFargoRow,
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
