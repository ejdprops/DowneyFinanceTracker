// New USAA parser to handle multi-line format
// This will replace the existing parseUSAAStatement function

import type { Transaction } from '../types';

export const parseUSAAStatement = (text: string): Transaction[] => {
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
            // Two amounts: likely DEBIT CREDIT or AMOUNT BALANCE
            const amt1 = parseFloat(dollarAmounts[0].replace(/[$,]/g, ''));
            const amt2 = parseFloat(dollarAmounts[1].replace(/[$,]/g, ''));

            // The smaller one is likely the transaction, larger is balance
            // Or check for 0 placeholder
            if (amt1 > 0 && (amt2 === 0 || nextLine.includes('0'))) {
              debit = amt1;
            } else if (amt2 > 0 && (amt1 === 0 || nextLine.includes('0'))) {
              credit = amt2;
            } else {
              // Both non-zero, assume first is transaction
              debit = amt1;
            }
          } else {
            // Single amount
            const amt = parseFloat(dollarAmounts[0].replace(/[$,]/g, ''));

            // Determine debit vs credit from description
            const isCredit = /dep|deposit|credit|transfer cr|ach dep|interest/i.test(description);
            if (isCredit) {
              credit = amt;
            } else {
              debit = amt;
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
        const amount = debit > 0 ? debit : -credit;
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
