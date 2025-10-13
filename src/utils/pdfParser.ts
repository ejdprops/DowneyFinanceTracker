import * as pdfjsLib from 'pdfjs-dist';
import type { Transaction, ParsedCSVData } from '../types';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface BankFormat {
  name: string;
  detect: (text: string) => boolean;
  parse: (text: string) => Transaction[];
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
      .map((item: any) => item.str)
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

  // Chase format typically has:
  // MM/DD Description Amount
  const transactionRegex = /(\d{2}\/\d{2})\s+(.+?)\s+([-+]?\$?[\d,]+\.\d{2})/g;

  let index = 0;
  const currentYear = new Date().getFullYear();

  for (const line of lines) {
    const matches = [...line.matchAll(transactionRegex)];

    for (const match of matches) {
      try {
        const dateStr = `${match[1]}/${currentYear}`;
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
 * Bank format detection and parsing
 */
const bankFormats: BankFormat[] = [
  {
    name: 'USAA',
    detect: (text) => text.toLowerCase().includes('usaa'),
    parse: parseUSAAStatement,
  },
  {
    name: 'Chase',
    detect: (text) => text.toLowerCase().includes('chase'),
    parse: parseChaseStatement,
  },
  {
    name: 'Bank of America',
    detect: (text) => text.toLowerCase().includes('bank of america') || text.toLowerCase().includes('bankofamerica'),
    parse: parseBankOfAmericaStatement,
  },
];

/**
 * Parse bank statement PDF
 */
export const parseBankStatementPDF = async (file: File): Promise<ParsedCSVData> => {
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

    if (detectedFormat) {
      console.log(`Detected bank format: ${detectedFormat.name}`);
      transactions = detectedFormat.parse(text);
    } else {
      console.log('Using generic parser');
      transactions = parseGenericStatement(text);
    }

    if (transactions.length === 0) {
      errors.push('No transactions found in PDF. The format may not be supported.');
    }

    return { transactions, errors };
  } catch (error) {
    return {
      transactions: [],
      errors: [`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};
