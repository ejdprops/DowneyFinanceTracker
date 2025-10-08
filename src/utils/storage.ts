import type { Transaction, Account, RecurringBill, Debt } from '../types';

const STORAGE_KEYS = {
  TRANSACTIONS: 'usaa_bills_transactions',
  ACCOUNT: 'usaa_bills_account',
  RECURRING_BILLS: 'usaa_bills_recurring',
  DEBTS: 'usaa_bills_debts',
};

// Transactions
export const saveTransactions = (transactions: Transaction[]) => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
};

export const loadTransactions = (): Transaction[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (!data) return [];

  const parsed = JSON.parse(data);
  return parsed.map((t: any) => ({
    ...t,
    date: new Date(t.date),
  }));
};

// Account
export const saveAccount = (account: Account | null) => {
  if (account) {
    localStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(account));
  } else {
    localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
  }
};

export const loadAccount = (): Account | null => {
  const data = localStorage.getItem(STORAGE_KEYS.ACCOUNT);
  return data ? JSON.parse(data) : null;
};

// Recurring Bills
export const saveRecurringBills = (bills: RecurringBill[]) => {
  localStorage.setItem(STORAGE_KEYS.RECURRING_BILLS, JSON.stringify(bills));
};

export const loadRecurringBills = (): RecurringBill[] => {
  const data = localStorage.getItem(STORAGE_KEYS.RECURRING_BILLS);
  if (!data) return [];

  const parsed = JSON.parse(data);
  return parsed.map((b: any) => ({
    ...b,
    nextDueDate: new Date(b.nextDueDate),
  }));
};

// Debts
export const saveDebts = (debts: Debt[]) => {
  localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
};

export const loadDebts = (): Debt[] => {
  const data = localStorage.getItem(STORAGE_KEYS.DEBTS);
  if (!data) return [];

  return JSON.parse(data);
};

// Initialize with default account if none exists
export const initializeAccount = (): Account => {
  return {
    id: 'bills-account',
    name: 'USAA Bills',
    accountNumber: '0165700823',
    routingNumber: '314074269',
    availableBalance: 2969.86,
    institution: 'USAA',
  };
};

// Clear all data
export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
};
