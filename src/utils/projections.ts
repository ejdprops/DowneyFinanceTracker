import type { Transaction, RecurringBill } from '../types';
import { now } from './dateUtils';

/**
 * Generate future transactions from recurring bills
 */
export const generateProjections = (
  recurringBills: RecurringBill[],
  daysAhead: number = 60
): Transaction[] => {
  const projections: Transaction[] = [];
  const endDate = now();
  endDate.setDate(endDate.getDate() + daysAhead);

  recurringBills
    .filter(bill => bill.isActive)
    .forEach(bill => {
      // Create date in local timezone to avoid timezone shift issues
      const nextDueDate = typeof bill.nextDueDate === 'string'
        ? new Date(bill.nextDueDate + 'T00:00:00') // Force local timezone
        : new Date(bill.nextDueDate);
      let currentDate = new Date(nextDueDate);

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
        currentDate = getNextOccurrence(currentDate, bill.frequency, bill.dayOfMonth, bill.dayOfWeek, bill.weekOfMonth);
      }
    });

  return projections.sort((a, b) => a.date.getTime() - b.date.getTime());
};

const getNextOccurrence = (
  date: Date,
  frequency: RecurringBill['frequency'],
  dayOfMonth?: number,
  dayOfWeek?: number,
  weekOfMonth?: number
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
    case 'quarterly':
      const monthsToAdd = frequency === 'monthly' ? 1 : 3;
      next.setMonth(next.getMonth() + monthsToAdd);

      // If weekOfMonth and dayOfWeek are specified, find that occurrence
      if (weekOfMonth && dayOfWeek !== undefined) {
        next.setDate(1); // Start at first of month
        const targetWeekday = dayOfWeek;
        const targetWeek = weekOfMonth;

        // Find the first occurrence of the target weekday in the month
        while (next.getDay() !== targetWeekday) {
          next.setDate(next.getDate() + 1);
        }

        // Now move forward to the target week
        if (targetWeek === 5) {
          // "Last" occurrence - find all occurrences and pick the last
          const occurrences: Date[] = [];
          const tempDate = new Date(next);
          while (tempDate.getMonth() === next.getMonth()) {
            occurrences.push(new Date(tempDate));
            tempDate.setDate(tempDate.getDate() + 7);
          }
          next.setTime(occurrences[occurrences.length - 1].getTime());
        } else {
          // 1st, 2nd, 3rd, or 4th occurrence
          next.setDate(next.getDate() + (targetWeek - 1) * 7);
        }
      } else if (dayOfMonth) {
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
 * The currentAccountBalance should be the CURRENT balance shown in your bank (after all actual transactions including pending).
 * We find the most recent actual (non-projected) transaction, set its balance to currentAccountBalance,
 * then work backwards through earlier transactions and forwards through future projected transactions.
 */
export const calculateBalances = (
  transactions: Transaction[],
  currentAccountBalance: number = 0
): Transaction[] => {
  if (transactions.length === 0) return [];

  // Sort by date (oldest first), then by ID to preserve chronological order for same-day transactions
  const sorted = [...transactions].sort((a, b) => {
    const dateComparison = a.date.getTime() - b.date.getTime();
    if (dateComparison !== 0) return dateComparison;

    // If same date, sort by ID
    // IDs are like USAA-2025-10-14-001 where 001=oldest, 002=next, etc.
    // Alphabetical/numeric sorting naturally puts them in chronological order
    return a.id.localeCompare(b.id);
  });

  // Find the index of the most recent actual (non-projected) transaction
  // This includes both cleared AND pending transactions from CSV imports
  // The currentAccountBalance should reflect the balance after all actual transactions (including pending)
  let mostRecentActualIndex = -1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (!sorted[i].description.includes('(Projected)')) {
      mostRecentActualIndex = i;
      break;
    }
  }

  // If no actual transactions found, start from beginning with currentAccountBalance
  if (mostRecentActualIndex === -1) {
    const result: Transaction[] = [];
    let balance = currentAccountBalance;

    for (let i = 0; i < sorted.length; i++) {
      const isVisible = sorted[i].isProjectedVisible !== false;
      if (isVisible) {
        balance += sorted[i].amount;
        balance = Math.round(balance * 100) / 100;
      }
      result.push({ ...sorted[i], balance });
    }

    return result;
  }

  // Work backwards from most recent actual transaction through ALL actual transactions
  // to calculate the starting balance (before the first transaction)
  let balance = currentAccountBalance;
  for (let i = mostRecentActualIndex; i >= 0; i--) {
    const isVisible = sorted[i].isProjectedVisible !== false;
    if (isVisible) {
      balance -= sorted[i].amount;
    }
  }

  // Now work forwards through ALL transactions to calculate balances
  const result: Transaction[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const isVisible = sorted[i].isProjectedVisible !== false;
    if (isVisible) {
      balance += sorted[i].amount;
      balance = Math.round(balance * 100) / 100;
    }
    result.push({ ...sorted[i], balance });
  }

  return result;
};
