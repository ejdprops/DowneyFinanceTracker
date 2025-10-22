import type { Transaction, Account, RecurringBill, Debt, MerchantMapping } from '../types';

const STORAGE_KEYS = {
  TRANSACTIONS: 'usaa_bills_transactions',
  ACCOUNT: 'usaa_bills_account', // Legacy - for migration
  ACCOUNTS: 'usaa_bills_accounts', // New multi-account storage
  RECURRING_BILLS: 'usaa_bills_recurring',
  DEBTS: 'usaa_bills_debts',
  ACTIVE_ACCOUNT_ID: 'usaa_bills_active_account',
  DISMISSED_PROJECTIONS: 'usaa_bills_dismissed_projections',
  MERCHANT_MAPPINGS: 'usaa_bills_merchant_mappings',
  ICLOUD_FOLDER_PATH: 'usaa_bills_icloud_folder_path',
};

// Transactions
export const saveTransactions = (transactions: Transaction[]) => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
};

export const loadTransactions = (): Transaction[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (!data) return [];

  const parsed = JSON.parse(data) as Array<Omit<Transaction, 'date'> & { date: string }>;
  return parsed.map((t) => ({
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

  const parsed = JSON.parse(data) as Array<Omit<Account, 'paymentDueDate' | 'reconciliationDate'> & {
    paymentDueDate?: string;
    reconciliationDate?: string;
  }>;

  return parsed.map((acc) => ({
    ...acc,
    paymentDueDate: acc.paymentDueDate ? new Date(acc.paymentDueDate) : undefined,
    reconciliationDate: acc.reconciliationDate ? new Date(acc.reconciliationDate) : undefined,
  }));
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

  const parsed = JSON.parse(data) as Array<Omit<RecurringBill, 'nextDueDate'> & { nextDueDate: string | Date }>;
  return parsed.map((b) => {
    let nextDueDate: Date;

    if (typeof b.nextDueDate === 'string') {
      // If it's a string in YYYY-MM-DD format, append time to force local timezone
      if (b.nextDueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        nextDueDate = new Date(b.nextDueDate + 'T00:00:00');
      } else if (b.nextDueDate.includes('T')) {
        // If it has time info, extract just the date part and force local timezone
        const dateOnly = b.nextDueDate.split('T')[0];
        nextDueDate = new Date(dateOnly + 'T00:00:00');
      } else {
        // Fallback to normal Date constructor
        nextDueDate = new Date(b.nextDueDate);
      }
    } else {
      // If it's already a date object (shouldn't happen in JSON), use it directly
      nextDueDate = new Date(b.nextDueDate);
    }

    return {
      ...b,
      nextDueDate,
    };
  });
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

// Dismissed Projections
export const saveDismissedProjections = (dismissed: Set<string>) => {
  localStorage.setItem(STORAGE_KEYS.DISMISSED_PROJECTIONS, JSON.stringify(Array.from(dismissed)));
};

export const loadDismissedProjections = (): Set<string> => {
  const data = localStorage.getItem(STORAGE_KEYS.DISMISSED_PROJECTIONS);
  if (!data) return new Set();
  try {
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
};

// Merchant Mappings
export const saveMerchantMappings = (mappings: MerchantMapping[]) => {
  localStorage.setItem(STORAGE_KEYS.MERCHANT_MAPPINGS, JSON.stringify(mappings));
};

export const loadMerchantMappings = (): MerchantMapping[] => {
  const data = localStorage.getItem(STORAGE_KEYS.MERCHANT_MAPPINGS);
  if (!data) return [];

  const parsed = JSON.parse(data) as Array<Omit<MerchantMapping, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }>;
  return parsed.map((m) => ({
    ...m,
    createdAt: new Date(m.createdAt),
    updatedAt: new Date(m.updatedAt),
  }));
};

// iCloud Folder Path
export const saveICloudFolderPath = (path: string) => {
  localStorage.setItem(STORAGE_KEYS.ICLOUD_FOLDER_PATH, path);
};

export const loadICloudFolderPath = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.ICLOUD_FOLDER_PATH);
};

// Clear all data
export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
};
