import type { Transaction, RecurringBill } from '../types';

interface RecurringSuggestion {
  description: string;
  category: string;
  averageAmount: number;
  frequency: RecurringBill['frequency'];
  occurrences: Transaction[];
  confidence: number; // 0-100
  suggestedNextDate: Date;
}

/**
 * Analyze transactions to find potential recurring bills
 */
export const detectRecurringBills = (
  transactions: Transaction[]
): RecurringSuggestion[] => {
  // Group transactions by similar descriptions
  const groups = groupSimilarTransactions(transactions);

  const suggestions: RecurringSuggestion[] = [];

  groups.forEach((group) => {
    if (group.length < 2) return; // Need at least 2 occurrences

    // Analyze frequency
    const frequency = detectFrequency(group);
    if (!frequency) return;

    // Calculate average amount (rounded to 2 decimal places)
    const averageAmount = Math.round((group.reduce((sum, t) => sum + t.amount, 0) / group.length) * 100) / 100;

    // Calculate confidence based on consistency
    const confidence = calculateConfidence(group, frequency, averageAmount);

    // Lower threshold for income to catch more recurring income patterns
    const isIncome = averageAmount > 0;
    const threshold = isIncome ? 35 : 50;

    if (confidence >= threshold) {
      suggestions.push({
        description: group[0].description,
        category: group[0].category,
        averageAmount,
        frequency,
        occurrences: group,
        confidence,
        suggestedNextDate: calculateNextDate(group, frequency),
      });
    }
  });

  // Sort by confidence (highest first)
  return suggestions.sort((a, b) => b.confidence - a.confidence);
};

/**
 * Group transactions with similar descriptions
 */
const groupSimilarTransactions = (transactions: Transaction[]): Transaction[][] => {
  const groups: Map<string, Transaction[]> = new Map();

  transactions.forEach((t) => {
    // Skip manual/pending transactions
    if (t.isManual || t.isPending) return;

    // Normalize description for grouping
    const normalized = normalizeDescription(t.description);

    // Create separate groups for income and expenses to avoid mixing
    const groupKey = t.amount >= 0 ? `INCOME:${normalized}` : `EXPENSE:${normalized}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(t);
  });

  return Array.from(groups.values());
};

/**
 * Normalize description for comparison
 */
const normalizeDescription = (description: string): string => {
  return description
    .toLowerCase()
    .replace(/\d+/g, '') // Remove numbers
    .replace(/[^\w\s]/g, '') // Remove special characters
    .trim();
};

/**
 * Detect frequency pattern from transaction dates
 */
const detectFrequency = (
  transactions: Transaction[]
): RecurringBill['frequency'] | null => {
  if (transactions.length < 2) return null;

  // Sort by date
  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate days between transactions
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.round(
      (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / (1000 * 60 * 60 * 24)
    );
    intervals.push(days);
  }

  // Calculate average interval
  const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

  // Wider tolerance for detection to catch more patterns
  if (avgInterval >= 5 && avgInterval <= 9) return 'weekly';
  if (avgInterval >= 12 && avgInterval <= 16) return 'biweekly';
  if (avgInterval >= 27 && avgInterval <= 33) return 'monthly';
  if (avgInterval >= 355 && avgInterval <= 375) return 'yearly';

  return null;
};

/**
 * Calculate confidence score (0-100)
 */
const calculateConfidence = (
  transactions: Transaction[],
  frequency: RecurringBill['frequency'],
  averageAmount: number
): number => {
  let confidence = 0;

  // More occurrences = higher confidence
  confidence += Math.min(transactions.length * 10, 40);

  // Check amount consistency
  const amounts = transactions.map(t => Math.abs(t.amount));
  const maxAmount = Math.max(...amounts);
  const minAmount = Math.min(...amounts);
  const variance = (maxAmount - minAmount) / Math.abs(averageAmount);

  if (variance < 0.1) confidence += 30; // Very consistent
  else if (variance < 0.2) confidence += 20; // Somewhat consistent
  else if (variance < 0.3) confidence += 10; // Slightly consistent

  // Check date interval consistency
  if (transactions.length >= 2) {
    const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
    const intervals: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const days = Math.round(
        (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / (1000 * 60 * 60 * 24)
      );
      intervals.push(days);
    }

    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const maxVariance = Math.max(...intervals.map(i => Math.abs(i - avgInterval)));

    if (maxVariance < 3) confidence += 30; // Very consistent timing
    else if (maxVariance < 7) confidence += 15; // Somewhat consistent timing
  }

  return Math.min(confidence, 100);
};

/**
 * Calculate next expected date
 */
const calculateNextDate = (
  transactions: Transaction[],
  frequency: RecurringBill['frequency']
): Date => {
  const sorted = [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime());
  const lastDate = sorted[0].date;
  const nextDate = new Date(lastDate);

  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate;
};
