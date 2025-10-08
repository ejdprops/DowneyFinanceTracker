import type { Transaction, RecurringBill } from '../types';

/**
 * Generate future transactions from recurring bills
 */
export const generateProjections = (
  recurringBills: RecurringBill[],
  daysAhead: number = 60
): Transaction[] => {
  const projections: Transaction[] = [];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  recurringBills
    .filter(bill => bill.isActive)
    .forEach(bill => {
      let currentDate = new Date(bill.nextDueDate);

      while (currentDate <= endDate) {
        projections.push({
          id: `proj-${bill.id}-${currentDate.getTime()}`,
          date: new Date(currentDate),
          description: `${bill.description} (Projected)`,
          category: bill.category,
          amount: bill.amount,
          balance: 0, // Will be calculated
          isPending: true,
          isManual: false,
        });

        // Move to next occurrence
        currentDate = getNextOccurrence(currentDate, bill.frequency, bill.dayOfMonth, bill.dayOfWeek);
      }
    });

  return projections.sort((a, b) => a.date.getTime() - b.date.getTime());
};

const getNextOccurrence = (
  date: Date,
  frequency: RecurringBill['frequency'],
  dayOfMonth?: number,
  _dayOfWeek?: number
): Date => {
  const next = new Date(date);

  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      if (dayOfMonth) {
        next.setDate(dayOfMonth);
      }
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
};

/**
 * Calculate running balances for transactions
 *
 * Since CSV doesn't contain balance info, we calculate all balances:
 * 1. Current account balance represents TODAY's balance
 * 2. For historical transactions (before today): work backwards from current balance
 * 3. For future projections (after today): work forwards from current balance
 * 4. Preserves original CSV order using sortOrder field
 */
export const calculateBalances = (
  transactions: Transaction[],
  currentAccountBalance: number = 0
): Transaction[] => {
  if (transactions.length === 0) return [];

  // Sort by sortOrder in REVERSE (CSV is newest-first, we need oldest-first for calculation)
  const sorted = [...transactions].sort((a, b) => {
    // If both have sortOrder, reverse it (CSV is newest-first, we need oldest-first)
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return b.sortOrder - a.sortOrder; // Reverse: higher sortOrder = older = process first
    }
    // Otherwise sort by date (oldest first)
    return a.date.getTime() - b.date.getTime();
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Separate historical and future transactions
  const historical: Transaction[] = [];
  const future: Transaction[] = [];

  sorted.forEach(t => {
    const txDate = new Date(t.date);
    txDate.setHours(0, 0, 0, 0);

    if (txDate <= today) {
      historical.push(t);
    } else {
      future.push(t);
    }
  });

  const result: Transaction[] = [];

  // Calculate historical balances (work backwards from current balance)
  if (historical.length > 0) {
    let balance = currentAccountBalance;

    // Work backwards through historical transactions
    for (let i = historical.length - 1; i >= 0; i--) {
      balance -= historical[i].amount; // Subtract to go back in time
    }

    // Now work forwards to assign balances
    for (let i = 0; i < historical.length; i++) {
      balance += historical[i].amount;
      // Round to 2 decimal places to avoid floating point errors
      balance = Math.round(balance * 100) / 100;
      result.push({ ...historical[i], balance });
    }
  }

  // Calculate future balances (work forwards from current balance)
  let futureBalance = currentAccountBalance;
  for (const t of future) {
    futureBalance += t.amount;
    // Round to 2 decimal places to avoid floating point errors
    futureBalance = Math.round(futureBalance * 100) / 100;
    result.push({ ...t, balance: futureBalance });
  }

  return result;
};
