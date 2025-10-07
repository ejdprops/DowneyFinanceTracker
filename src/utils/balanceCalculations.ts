import type { Transaction, Account } from '../types';

/**
 * Calculate projected balances for transactions
 * Sorts transactions by date and calculates running balance
 */
export const calculateProjectedBalances = (
  transactions: Transaction[],
  accounts: Account[]
): Transaction[] => {
  if (transactions.length === 0) return [];

  // Group transactions by account
  const byAccount = new Map<string, Transaction[]>();
  const noAccount: Transaction[] = [];

  transactions.forEach((t) => {
    if (t.account) {
      if (!byAccount.has(t.account)) {
        byAccount.set(t.account, []);
      }
      byAccount.get(t.account)!.push(t);
    } else {
      noAccount.push(t);
    }
  });

  const result: Transaction[] = [];

  // Calculate for each account
  byAccount.forEach((accountTransactions, accountId) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      result.push(...accountTransactions);
      return;
    }

    // Sort by date ascending
    const sorted = [...accountTransactions].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    let runningBalance = account.currentBalance;

    const withBalances = sorted.map((t) => {
      // Add transaction amount to running balance
      runningBalance += t.amount;

      return {
        ...t,
        projectedBalance: runningBalance,
      };
    });

    result.push(...withBalances);
  });

  // Add transactions without account (no projected balance)
  result.push(...noAccount);

  return result;
};

/**
 * Get the current projected balance for an account
 */
export const getAccountProjectedBalance = (
  accountId: string,
  transactions: Transaction[],
  account: Account
): number => {
  const accountTransactions = transactions
    .filter((t) => t.account === accountId)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (accountTransactions.length === 0) {
    return account.currentBalance;
  }

  let balance = account.currentBalance;
  accountTransactions.forEach((t) => {
    balance += t.amount;
  });

  return balance;
};

/**
 * Get balance at a specific date
 */
export const getBalanceAtDate = (
  accountId: string,
  date: Date,
  transactions: Transaction[],
  account: Account
): number => {
  const accountTransactions = transactions
    .filter((t) => t.account === accountId && t.date <= date)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = account.currentBalance;
  accountTransactions.forEach((t) => {
    balance += t.amount;
  });

  return balance;
};

/**
 * Calculate balance summary for all accounts
 */
export const getAccountsSummary = (
  transactions: Transaction[],
  accounts: Account[]
) => {
  return accounts.map((account) => {
    const projectedBalance = getAccountProjectedBalance(
      account.id,
      transactions,
      account
    );

    const accountTransactions = transactions.filter(
      (t) => t.account === account.id
    );

    const totalIncome = accountTransactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = accountTransactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      account,
      currentBalance: account.currentBalance,
      projectedBalance,
      totalIncome,
      totalExpenses,
      transactionCount: accountTransactions.length,
    };
  });
};
