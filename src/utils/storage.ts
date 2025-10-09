import type { Transaction, Account, RecurringBill, Debt } from '../types';

const STORAGE_KEYS = {
  TRANSACTIONS: 'usaa_bills_transactions',
  ACCOUNT: 'usaa_bills_account', // Legacy - for migration
  ACCOUNTS: 'usaa_bills_accounts', // New multi-account storage
  RECURRING_BILLS: 'usaa_bills_recurring',
  DEBTS: 'usaa_bills_debts',
  ACTIVE_ACCOUNT_ID: 'usaa_bills_active_account',
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

// Accounts (multi-account)
export const saveAccounts = (accounts: Account[]) => {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
};

export const loadAccounts = (): Account[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
  if (!data) return [];
  return JSON.parse(data);
};

// Active Account ID
export const saveActiveAccountId = (accountId: string) => {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID, accountId);
};

export const loadActiveAccountId = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID);
};

// Legacy single account support (for migration)
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
    accountType: 'checking',
    accountNumber: '0165700823',
    routingNumber: '314074269',
    availableBalance: 2969.86,
    institution: 'USAA',
    isDefault: true,
  };
};

// Migration helper: Convert legacy single account to multi-account structure
export const migrateToMultiAccount = (): Account[] => {
  const legacyAccount = loadAccount();
  const existingAccounts = loadAccounts();

  // If already migrated, return existing accounts
  if (existingAccounts.length > 0) {
    return existingAccounts;
  }

  // If legacy account exists, migrate it
  if (legacyAccount) {
    const migratedAccount: Account = {
      ...legacyAccount,
      accountType: legacyAccount.accountType || 'checking',
      isDefault: true,
    };
    const accounts = [migratedAccount];
    saveAccounts(accounts);
    saveActiveAccountId(migratedAccount.id);

    // Migrate transactions to add accountId
    migrateTransactionsToMultiAccount(migratedAccount.id);

    // Migrate recurring bills to add accountId
    migrateRecurringBillsToMultiAccount(migratedAccount.id);

    return accounts;
  }

  // No legacy account, create default
  const defaultAccount = initializeAccount();
  const accounts = [defaultAccount];
  saveAccounts(accounts);
  saveActiveAccountId(defaultAccount.id);
  return accounts;
};

// Migrate transactions to add accountId field
const migrateTransactionsToMultiAccount = (defaultAccountId: string) => {
  const transactions = loadTransactions();
  const migratedTransactions = transactions.map(t => ({
    ...t,
    accountId: t.accountId || defaultAccountId,
  }));
  saveTransactions(migratedTransactions);
};

// Migrate recurring bills to add accountId field
const migrateRecurringBillsToMultiAccount = (defaultAccountId: string) => {
  const bills = loadRecurringBills();
  const migratedBills = bills.map(b => ({
    ...b,
    accountId: b.accountId || defaultAccountId,
  }));
  saveRecurringBills(migratedBills);
};

// Clear all data
export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
};
