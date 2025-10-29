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

    // Process text items with proper line breaks
    // PDF.js provides items with x/y coordinates - we need to detect line breaks
    let pageText = '';
    let lastY = -1;

    for (const item of textContent.items) {
      if ('str' in item && 'transform' in item) {
        const y = item.transform[5]; // Y coordinate

        // If Y coordinate changed significantly, it's a new line
        if (lastY !== -1 && Math.abs(y - lastY) > 2) {
          pageText += '\n';
        }

        pageText += item.str + ' ';
        lastY = y;
      }
    }

    fullText += pageText + '\n';
  }

  console.log(`[PDF Extract] Extracted ${fullText.split('\n').length} lines from ${pdf.numPages} pages`);
  return fullText;
};

/**
 * USAA Bank Statement Parser
 */
const parseUSAAStatement = (text: string): Transaction[] => {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');
  const currentYear = new Date().getFullYear();

  console.log(`[USAA Parser] Starting parse, ${lines.length} lines total`);

  // USAA PDF format has transactions split across multiple lines:
  // Line 1: MM/DD   DESCRIPTION (or start of description)
  // Line 2-N: Description continuation
  // Line N+1: $DEBIT   $CREDIT (or 0/-)
  // Line N+2: $BALANCE

  let index = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip headers and summary
    if (!line ||
        line.includes('Date   Description') ||
        line.includes('Transactions') ||
        line.includes('Page ') ||
        line.match(/^\d{2}\/\d{2}\/\d{4} to \d{2}\/\d{2}\/\d{4}/)) {
      i++;
      continue;
    }

    // Match lines starting with MM/DD date
    const dateMatch = line.match(/^(\d{2})\/(\d{2})\s+(.+)$/);

    if (dateMatch) {
      const month = parseInt(dateMatch[1]);
      const day = parseInt(dateMatch[2]);
      let description = dateMatch[3].trim();

      // Skip Beginning/Ending Balance
      if (description.includes('Beginning Balance') || description.includes('Ending Balance')) {
        i++;
        continue;
      }

      // Look ahead for description continuation and amounts
      let debit = 0;
      let credit = 0;
      let j = i + 1;
      let foundAmounts = false;

      while (j < lines.length && j < i + 10) {
        const nextLine = lines[j].trim();

        // Check for amounts ($XX.XX format)
        const dollarAmounts = nextLine.match(/\$[\d,]+\.\d{2}/g);

        if (dollarAmounts && dollarAmounts.length >= 1) {
          // Found amount line
          if (dollarAmounts.length >= 2) {
            // Two amounts: TRANSACTION_AMOUNT   RUNNING_BALANCE
            // The first amount is the transaction, second is the running balance (we ignore balance)
            const transactionAmt = parseFloat(dollarAmounts[0].replace(/[$,]/g, ''));

            // Determine if this is a debit or credit based on description
            const isCredit = /\b(deposit|transfer cr|ach dep|interest paid)\b/i.test(description);
            if (isCredit) {
              credit = transactionAmt;
              debit = 0;
              console.log(`[USAA Parser] Two amounts - CREDIT: $${credit} (balance ignored) from line: "${nextLine}"`);
            } else {
              debit = transactionAmt;
              credit = 0;
              console.log(`[USAA Parser] Two amounts - DEBIT: $${debit} (balance ignored) from line: "${nextLine}"`);
            }
          } else {
            // Single amount
            const amt = parseFloat(dollarAmounts[0].replace(/[$,]/g, ''));

            // Determine debit vs credit from description
            // Credits are: deposits, transfers IN, interest paid
            // Must be more specific to avoid false matches (e.g., "DEPT" != "DEPOSIT")
            const isCredit = /\b(deposit|transfer cr|ach dep|interest paid)\b/i.test(description);
            if (isCredit) {
              credit = amt;
              console.log(`[USAA Parser] Single amount (credit): $${credit} - matched "${description.substring(0, 50)}"`);
            } else {
              debit = amt;
              console.log(`[USAA Parser] Single amount (debit): $${debit} - from "${description.substring(0, 50)}"`);
            }
          }

          foundAmounts = true;
          break;
        } else if (nextLine.match(/^\d{2}\/\d{2}/)) {
          // Hit next transaction
          break;
        } else if (nextLine && nextLine.length > 2 && !nextLine.match(/^[0-9\s\-]+$/)) {
          // Description continuation (not just numbers)
          description += ' ' + nextLine;
        }

        j++;
      }

      if (foundAmounts && (debit > 0 || credit > 0)) {
        // USAA statement format for checking accounts:
        // - Debits (withdrawals, charges) = money leaving = stored as NEGATIVE in our system
        // - Credits (deposits) = money entering = stored as POSITIVE in our system
        const amount = credit > 0 ? credit : -debit;
        const date = new Date(currentYear, month - 1, day);

        description = description.replace(/\s+/g, ' ').trim();

        if (index < 5) {
          console.log(`[USAA Parser] Match ${index}: ${month}/${day} "${description.substring(0, 50)}" $${amount}`);
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
      }

      i = j + 1;
    } else {
      i++;
    }
  }

  console.log(`[USAA Parser] Parsed ${transactions.length} transactions`);
  return transactions;
};

/**
 * Chase Bank Statement Parser
 */
const parseChaseStatement = (text: string): Transaction[] => {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');

  let index = 0;
  const currentYear = new Date().getFullYear();

  console.log(`[Chase Parser] Starting parse, ${lines.length} lines total`);

  // Simple approach: scan all lines and extract anything that looks like a transaction
  // Format: MM/DD DESCRIPTION AMOUNT (or AMOUNT at end)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and headers
    if (!line ||
        line.includes('Date of Transaction') ||
        line.includes('Merchant Name') ||
        line.includes('ACCOUNT ACTIVITY') ||
        line.includes('INTEREST CHARGES') ||
        line.includes('FEES CHARGED') ||
        line.includes('Opening/Closing Date') ||
        line.includes('Payment Due Date') ||
        line.includes('New Balance') ||
        line.includes('Minimum Payment')) {
      continue;
    }

    // Try multiple patterns for Chase transactions
    // Pattern 1: MM/DD DESCRIPTION AMOUNT (most common)
    let match = line.match(/^(\d{2}\/\d{2})\s+(.+?)\s+(-?[\d,]+\.\d{2})$/);

    // Pattern 2: MM/DD DESCRIPTION with amount in the middle (sometimes happens)
    if (!match) {
      match = line.match(/^(\d{2}\/\d{2})\s+(.+?)\s+([-\d,]+\.\d{2})\s+.*$/);
    }

    if (match) {
      try {
        const dateStr = `${match[1]}/${currentYear}`;
        let description = match[2].trim();
        const amountStr = match[3].replace(/,/g, ''); // Remove commas from amount

        // Skip if description contains noise patterns
        if (description.includes('TOTAL') ||
            description.includes('Year-to-date') ||
            description.includes('Page ') ||
            description.length > 200 ||
            description.length < 2) {
          continue;
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;

        const amount = parseFloat(amountStr);
        if (isNaN(amount)) continue;

        // Log first 5 matches to verify
        if (index < 5) {
          console.log(`[Chase Parser] Match ${index}: Date=${match[1]}, Desc="${description.substring(0, 40)}", Amount=${amount}`);
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
        // Skip invalid lines silently
      }
    }
  }

  console.log(`[Chase Parser] Parsed ${transactions.length} transactions`);
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
 * Extract USAA statement data
 */
const extractUSAAStatementData = (text: string): StatementData => {
  const data: StatementData = {};

  // USAA format: "Statement Period: 08/23/2025 to 09/22/2025"
  const periodMatch = text.match(/Statement Period:\s+\d{2}\/\d{2}\/\d{4}\s+to\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (periodMatch) {
    data.closingDate = new Date(periodMatch[1]);
  }

  // USAA format: "Ending Balance   $1,058.21"
  const balanceMatch = text.match(/Ending Balance\s+\$?([\d,]+\.\d{2})/i);
  if (balanceMatch) {
    data.endingBalance = parseFloat(balanceMatch[1].replace(/,/g, ''));
  }

  return data;
};

/**
 * Extract Bank of America statement data
 */
const extractBankOfAmericaStatementData = (text: string): StatementData => {
  const data: StatementData = {};

  // Bank of America format: "Statement Period: MM/DD/YYYY - MM/DD/YYYY"
  const periodMatch = text.match(/Statement Period:\s+\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (periodMatch) {
    data.closingDate = new Date(periodMatch[1]);
  }

  // Bank of America format: "Ending balance on MM/DD/YYYY   $X,XXX.XX"
  const balanceMatch = text.match(/Ending balance(?:\s+on\s+\d{1,2}\/\d{1,2}\/\d{4})?\s+\$?([\d,]+\.\d{2})/i);
  if (balanceMatch) {
    data.endingBalance = parseFloat(balanceMatch[1].replace(/,/g, ''));
  }

  return data;
};

/**
 * Capital One Statement Parser
 */
const parseCapitalOneStatement = (text: string): Transaction[] => {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');
  const currentYear = new Date().getFullYear();

  console.log(`[Capital One Parser] Starting parse, ${lines.length} lines total`);

  // Capital One PDF format has transactions in this pattern:
  // Trans Date Post Date Description Amount
  // Example: "Dec 30 Dec 30 CAPITAL ONE MOBILE PYMTAuthDate 30-Dec - $728.14"
  // Example: "Dec 14 Dec 16 HLU*HULUPLUShulu.com/billCA $20.41"

  let index = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and headers
    if (!line ||
        line.includes('Trans Date') ||
        line.includes('Post Date') ||
        line.includes('Transactions') ||
        line.includes('Page ') ||
        line.includes('Total Transactions') ||
        line.includes('Total Fees') ||
        line.includes('Total Interest')) {
      continue;
    }

    // Pattern: Month Day Month Day Description Amount
    // Example: "Dec 30 Dec 30 CAPITAL ONE MOBILE PYMTAuthDate 30-Dec - $728.14"
    // Example: "Dec 14 Dec 16 HLU*HULUPLUShulu.com/billCA $20.41"
    const match = line.match(/^([A-Z][a-z]{2})\s+(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(.+?)\s+(-?\s*\$?[\d,]+\.\d{2})$/);

    if (match) {
      try {
        // match[1] = Trans Date month (we use Post Date instead)
        // match[2] = Trans Date day (we use Post Date instead)
        const postMonth = match[3]; // Post Date month (we'll use this one)
        const postDay = parseInt(match[4]); // Post Date day
        const description = match[5].trim();
        const amountStr = match[6].replace(/[\s$,]/g, ''); // Remove spaces, $, and commas

        // Skip summary lines
        if (description.includes('TOTAL') || description.includes('Year-to-date')) {
          continue;
        }

        // Convert month name to number
        const monthMap: { [key: string]: number } = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };

        const monthNum = monthMap[postMonth];
        if (monthNum === undefined) continue;

        // Use post date for the transaction
        let year = currentYear;
        // If we're in January and the transaction is in December, it's from last year
        if (new Date().getMonth() === 0 && monthNum === 11) {
          year = currentYear - 1;
        }

        const date = new Date(year, monthNum, postDay);
        if (isNaN(date.getTime())) continue;

        let amount = parseFloat(amountStr);
        if (isNaN(amount)) continue;

        // Capital One credit card PDF format:
        // In PDF: Charges show as positive (e.g., $20.41), Payments show as negative (e.g., - $728.14)
        // Our app convention: Charges = positive (debt owed), Payments = negative (reduces debt)
        // PDF matches our convention, so NO sign inversion needed
        // However, we need to verify the actual behavior matches this

        // Log first 5 matches
        if (index < 5) {
          console.log(`[Capital One Parser] Match ${index}: ${postMonth}/${postDay} "${description.substring(0, 40)}" $${amount}`);
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
        console.warn('[Capital One Parser] Failed to parse line:', line, error);
      }
    }
  }

  console.log(`[Capital One Parser] Parsed ${transactions.length} transactions`);
  return transactions;
};

/**
 * Extract Capital One statement data
 */
const extractCapitalOneStatementData = (text: string): StatementData => {
  const data: StatementData = {};

  // Capital One format: "Dec 15, 2024 - Jan 14, 2025"
  const periodMatch = text.match(/([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})\s*-\s*([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})/);
  if (periodMatch) {
    const monthMap: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const endMonth = monthMap[periodMatch[4]];
    const endDay = parseInt(periodMatch[5]);
    const endYear = parseInt(periodMatch[6]);
    data.closingDate = new Date(endYear, endMonth, endDay);
    data.statementPeriod = `${periodMatch[1]} ${periodMatch[2]}, ${periodMatch[3]} - ${periodMatch[4]} ${periodMatch[5]}, ${periodMatch[6]}`;
  }

  // Capital One format: "New Balance = $7.67" or "New Balance $7.67"
  const balanceMatch = text.match(/New Balance\s*[=]?\s*\$?([\d,]+\.\d{2})/i);
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
    name: 'Capital One',
    detect: (text) => text.toLowerCase().includes('capital one') ||
                      text.toLowerCase().includes('capitalone'),
    parse: parseCapitalOneStatement,
    extractStatementData: extractCapitalOneStatementData,
  },
  {
    name: 'USAA',
    detect: (text) => text.toLowerCase().includes('usaa'),
    parse: parseUSAAStatement,
    extractStatementData: extractUSAAStatementData,
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
    extractStatementData: extractBankOfAmericaStatementData,
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

    if (detectedFormat) {
      console.log(`[PDF Parser] Detected bank: ${detectedFormat.name}`);
    } else {
      console.log('[PDF Parser] No specific bank format detected, using generic parser');
    }

    let transactions: Transaction[];
    let statementData: StatementData | undefined;

    if (detectedFormat) {
      transactions = detectedFormat.parse(text);

      // Chase credit card PDFs have inverted signs - fix them
      // In Chase PDFs: positive = charges, negative = payments
      // We need: positive = charges (debt), negative = payments (credit)
      if (detectedFormat.name === 'Chase') {
        transactions = transactions.map(tx => ({
          ...tx,
          amount: -tx.amount // Invert the sign
        }));
      }

      // Capital One credit card PDFs also have inverted signs - fix them
      // In Capital One PDFs: positive = charges, negative = payments
      // We need: positive = charges (debt), negative = payments (credit)
      // Actually they appear correct in PDF, but need inversion for app
      if (detectedFormat.name === 'Capital One') {
        transactions = transactions.map(tx => ({
          ...tx,
          amount: -tx.amount // Invert the sign
        }));
      }

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
