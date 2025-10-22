import * as pdfjsLib from 'pdfjs-dist';
import type { Transaction, ParsedCSVData } from '../types';

// Set up PDF.js worker - use the bundled worker from node_modules
// Vite will handle copying this to the dist folder
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface StatementData {
  closingDate?: Date;
  endingBalance?: number;
  statementPeriod?: string;
}

interface BankFormat {
  name: string;
  detect: (text: string) => boolean;
  parse: (text: string) => Transaction[];
  extractStatementData?: (text: string) => StatementData;
}

export interface ParsedPDFData extends ParsedCSVData {
  statementData?: StatementData;
}

/**
 * Extract text from PDF file
 */
const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
};

/**
 * USAA Bank Statement Parser
 */
const parseUSAAStatement = (text: string): Transaction[] => {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');

  // USAA format typically has lines like:
  // 01/15/2024 DESCRIPTION HERE -$123.45
  // or with tabs/spaces separating date, description, and amount

  const transactionRegex = /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d{0,2})/g;

  let index = 0;
  for (const line of lines) {
    const matches = [...line.matchAll(transactionRegex)];

    for (const match of matches) {
      try {
        const dateStr = match[1];
        const description = match[2].trim();
        const amountStr = match[3].replace(/[$,]/g, '');

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;

        const amount = parseFloat(amountStr);
        if (isNaN(amount)) continue;

        transactions.push({
          id: `pdf-${date.getTime()}-${index}`,
          date,
          description,
          category: 'Uncategorized',
          amount,
          balance: 0,
          isPending: false,
          isManual: false,
          sortOrder: index,
        });

        index++;
      } catch (error) {
        console.warn('Failed to parse line:', line, error);
      }
    }
  }

  return transactions;
};

/**
 * Chase Bank Statement Parser
 */
const parseChaseStatement = (text: string): Transaction[] => {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');

  // Find the ACCOUNT ACTIVITY section
  let inActivitySection = false;
  let index = 0;
  const currentYear = new Date().getFullYear();

  // Keywords that indicate we're no longer in the transaction section
  const endSectionKeywords = ['FEES CHARGED', 'INTEREST CHARGED', 'TOTAL FEES', 'TOTAL INTEREST', 'Year-to-date', '2025 Totals'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Start parsing when we hit ACCOUNT ACTIVITY
    if (line.includes('ACCOUNT ACTIVITY')) {
      inActivitySection = true;
      continue;
    }

    // Stop parsing if we hit end section keywords
    if (inActivitySection && endSectionKeywords.some(keyword => line.includes(keyword))) {
      inActivitySection = false;
      continue;
    }

    // Skip header rows
    if (line.includes('Date of Transaction') || line.includes('Merchant Name') ||
        line.includes('PAYMENTS AND OTHER CREDITS') || line.includes('PURCHASE')) {
      continue;
    }

    // Only process lines when in activity section
    if (!inActivitySection) continue;

    // Chase transaction format: MM/DD DESCRIPTION AMOUNT
    // Match: date at start, description in middle, amount at end (with or without minus sign)
    const match = line.match(/^(\d{2}\/\d{2})\s+(.+?)\s+(-?\d+\.\d{2})$/);

    if (match) {
      try {
        const dateStr = `${match[1]}/${currentYear}`;
        let description = match[2].trim();
        const amountStr = match[3];

        // Skip if description contains certain noise patterns
        if (description.includes('TOTAL') || description.includes('Year-to-date') ||
            description.length > 200) {
          continue;
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;

        const amount = parseFloat(amountStr);
        if (isNaN(amount)) continue;

        transactions.push({
          id: `pdf-${date.getTime()}-${index}`,
          date,
          description,
          category: 'Uncategorized',
          amount,
          balance: 0,
          isPending: false,
          isManual: false,
          sortOrder: index,
        });

        index++;
      } catch (error) {
        // Skip invalid lines silently
      }
    }
  }

  return transactions;
};

/**
 * Bank of America Statement Parser
 */
const parseBankOfAmericaStatement = (text: string): Transaction[] => {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');

  // BofA format: Date Description Deposits/Credits Withdrawals/Debits
  const transactionRegex = /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+(?:([\d,]+\.\d{2})\s+)?([-]?[\d,]+\.\d{2})?/g;

  let index = 0;

  for (const line of lines) {
    const matches = [...line.matchAll(transactionRegex)];

    for (const match of matches) {
      try {
        const dateStr = match[1];
        const description = match[2].trim();
        const credit = match[3] ? parseFloat(match[3].replace(/,/g, '')) : 0;
        const debit = match[4] ? parseFloat(match[4].replace(/[-,]/g, '')) : 0;

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;

        // BofA shows credits as positive, debits as separate column
        const amount = credit > 0 ? credit : -debit;
        if (amount === 0) continue;

        transactions.push({
          id: `pdf-${date.getTime()}-${index}`,
          date,
          description,
          category: 'Uncategorized',
          amount,
          balance: 0,
          isPending: false,
          isManual: false,
          sortOrder: index,
        });

        index++;
      } catch (error) {
        console.warn('Failed to parse line:', line, error);
      }
    }
  }

  return transactions;
};

/**
 * Extract Apple Card statement data
 */
const extractAppleCardStatementData = (text: string): StatementData => {
  const data: StatementData = {};

  // Apple Card PDFs typically have "Closing Date: MM/DD/YYYY"
  const closingDateMatch = text.match(/Closing Date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  if (closingDateMatch) {
    data.closingDate = new Date(closingDateMatch[1]);
  }

  // Look for "New Balance" or "Statement Balance"
  const balanceMatch = text.match(/(?:New Balance|Statement Balance|Closing Balance)[:\s]+\$?([\d,]+\.\d{2})/i);
  if (balanceMatch) {
    data.endingBalance = parseFloat(balanceMatch[1].replace(/,/g, ''));
  }

  // Statement period
  const periodMatch = text.match(/Statement Period[:\s]+(.+?)\s*(?:\n|$)/i);
  if (periodMatch) {
    data.statementPeriod = periodMatch[1].trim();
  }

  return data;
};

/**
 * Apple Card Statement Parser
 */
const parseAppleCardStatement = (text: string): Transaction[] => {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');

  // Apple Card PDFs typically have format:
  // MM/DD/YY Description Amount
  // or similar variations
  const transactionRegex = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([-]?\$?[\d,]+\.\d{2})/g;

  let index = 0;

  for (const line of lines) {
    const matches = [...line.matchAll(transactionRegex)];

    for (const match of matches) {
      try {
        let dateStr = match[1];
        const description = match[2].trim();
        const amountStr = match[3].replace(/[$,]/g, '');

        // Handle 2-digit year format (MM/DD/YY)
        if (dateStr.split('/')[2]?.length === 2) {
          const parts = dateStr.split('/');
          const year = parseInt(parts[2]);
          const fullYear = year < 50 ? 2000 + year : 1900 + year;
          dateStr = `${parts[0]}/${parts[1]}/${fullYear}`;
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;

        let amount = parseFloat(amountStr);
        if (isNaN(amount)) continue;

        // Apple Card shows purchases as positive in PDFs, so invert them
        if (amount > 0 && !description.toLowerCase().includes('payment')) {
          amount = -amount;
        }

        transactions.push({
          id: `pdf-${date.getTime()}-${index}`,
          date,
          description,
          category: 'Uncategorized',
          amount,
          balance: 0,
          isPending: false,
          isManual: false,
          sortOrder: index,
        });

        index++;
      } catch (error) {
        console.warn('Failed to parse line:', line, error);
      }
    }
  }

  return transactions;
};

/**
 * Generic Statement Parser (fallback)
 * Attempts to find date + description + amount patterns
 */
const parseGenericStatement = (text: string): Transaction[] => {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');

  // Try multiple date formats and amount patterns
  const patterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([-+]?\$?[\d,]+\.\d{2})/g,
    /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([-+]?\$?[\d,]+\.\d{2})/g,
    /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-+]?\$?[\d,]+\.\d{2})/g,
  ];

  let index = 0;

  for (const line of lines) {
    for (const pattern of patterns) {
      const matches = [...line.matchAll(pattern)];

      for (const match of matches) {
        try {
          const dateStr = match[1];
          const description = match[2].trim();
          const amountStr = match[3].replace(/[$,]/g, '');

          const date = new Date(dateStr);
          if (isNaN(date.getTime())) continue;

          const amount = parseFloat(amountStr);
          if (isNaN(amount)) continue;

          // Avoid duplicates
          const isDuplicate = transactions.some(t =>
            t.date.getTime() === date.getTime() &&
            t.description === description &&
            t.amount === amount
          );

          if (!isDuplicate) {
            transactions.push({
              id: `pdf-${date.getTime()}-${index}`,
              date,
              description,
              category: 'Uncategorized',
              amount,
              balance: 0,
              isPending: false,
              isManual: false,
              sortOrder: index,
            });

            index++;
          }
        } catch (error) {
          console.warn('Failed to parse line:', line, error);
        }
      }
    }
  }

  return transactions;
};

/**
 * Extract Chase statement data
 */
const extractChaseStatementData = (text: string): StatementData => {
  const data: StatementData = {};

  // Chase format: "Opening/Closing Date 09/11/25 - 10/10/25"
  const closingDateMatch = text.match(/Opening\/Closing Date\s+\d{2}\/\d{2}\/\d{2}\s*-\s*(\d{2}\/\d{2}\/\d{2})/i);
  if (closingDateMatch) {
    // Convert 2-digit year to 4-digit
    const dateParts = closingDateMatch[1].split('/');
    const year = parseInt(dateParts[2]);
    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    data.closingDate = new Date(`${dateParts[0]}/${dateParts[1]}/${fullYear}`);
  }

  // Chase format: "New Balance $13,006.39"
  const balanceMatch = text.match(/New Balance[:\s]+\$?([\d,]+\.\d{2})/i);
  if (balanceMatch) {
    data.endingBalance = parseFloat(balanceMatch[1].replace(/,/g, ''));
  }

  return data;
};

/**
 * Extract generic statement data
 */
const extractGenericStatementData = (text: string): StatementData => {
  const data: StatementData = {};

  // Try to find closing/statement date
  const datePatterns = [
    /(?:Closing Date|Statement Date|As of)[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /(?:Period Ending|Ending Date)[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /Opening\/Closing Date\s+\d{2}\/\d{2}\/\d{2}\s*-\s*(\d{2}\/\d{2}\/\d{2})/i, // Chase format
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[1];
      // Handle 2-digit year
      if (dateStr.match(/\d{2}\/\d{2}\/\d{2}$/)) {
        const parts = dateStr.split('/');
        const year = parseInt(parts[2]);
        const fullYear = year < 50 ? 2000 + year : 1900 + year;
        data.closingDate = new Date(`${parts[0]}/${parts[1]}/${fullYear}`);
      } else {
        data.closingDate = new Date(dateStr);
      }
      break;
    }
  }

  // Try to find ending balance
  const balancePatterns = [
    /(?:Ending Balance|New Balance|Statement Balance|Closing Balance)[:\s]+\$?([\d,]+\.\d{2})/i,
    /(?:Total Balance)[:\s]+\$?([\d,]+\.\d{2})/i,
  ];

  for (const pattern of balancePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.endingBalance = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  return data;
};

/**
 * Bank format detection and parsing
 */
const bankFormats: BankFormat[] = [
  {
    name: 'Apple Card',
    detect: (text) => text.toLowerCase().includes('apple card') ||
                      text.toLowerCase().includes('goldman sachs') ||
                      text.toLowerCase().includes('apple cash'),
    parse: parseAppleCardStatement,
    extractStatementData: extractAppleCardStatementData,
  },
  {
    name: 'USAA',
    detect: (text) => text.toLowerCase().includes('usaa'),
    parse: parseUSAAStatement,
    extractStatementData: extractGenericStatementData,
  },
  {
    name: 'Chase',
    detect: (text) => text.toLowerCase().includes('chase'),
    parse: parseChaseStatement,
    extractStatementData: extractChaseStatementData,
  },
  {
    name: 'Bank of America',
    detect: (text) => text.toLowerCase().includes('bank of america') || text.toLowerCase().includes('bankofamerica'),
    parse: parseBankOfAmericaStatement,
    extractStatementData: extractGenericStatementData,
  },
];

/**
 * Parse bank statement PDF
 */
export const parseBankStatementPDF = async (file: File): Promise<ParsedPDFData> => {
  const errors: string[] = [];

  try {
    // Extract text from PDF
    const text = await extractTextFromPDF(file);

    if (!text.trim()) {
      return {
        transactions: [],
        errors: ['Could not extract text from PDF. The file may be scanned or encrypted.'],
      };
    }

    // Detect bank format
    const detectedFormat = bankFormats.find(format => format.detect(text));

    let transactions: Transaction[];
    let statementData: StatementData | undefined;

    if (detectedFormat) {
      transactions = detectedFormat.parse(text);

      // Extract statement data if parser supports it
      if (detectedFormat.extractStatementData) {
        statementData = detectedFormat.extractStatementData(text);
      }
    } else {
      transactions = parseGenericStatement(text);
      statementData = extractGenericStatementData(text);
    }

    if (transactions.length === 0) {
      errors.push('No transactions found in PDF. The format may not be supported.');
    }

    return { transactions, errors, statementData };
  } catch (error) {
    return {
      transactions: [],
      errors: [`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};
