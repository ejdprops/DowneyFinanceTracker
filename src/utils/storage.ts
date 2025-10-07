import type { Transaction, Account, Budget, Debt } from '../types';

const STORAGE_KEYS = {
  TRANSACTIONS: 'downey-finance-transactions',
  ACCOUNTS: 'downey-finance-accounts',
  BUDGETS: 'downey-finance-budgets',
  DEBTS: 'downey-finance-debts',
  LAST_SYNC: 'downey-finance-last-sync',
};

/**
 * Application data structure
 */
export interface AppData {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  debts: Debt[];
  lastSync?: Date;
}

/**
 * Save transactions to localStorage
 */
export const saveTransactions = (transactions: Transaction[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (error) {
    console.error('Failed to save transactions:', error);
    throw new Error('Failed to save data. Your browser storage may be full.');
  }
};

/**
 * Load transactions from localStorage
 */
export const loadTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!data) return [];

    const transactions = JSON.parse(data);

    // Convert date strings back to Date objects
    return transactions.map((t: any) => ({
      ...t,
      date: new Date(t.date),
    }));
  } catch (error) {
    console.error('Failed to load transactions:', error);
    return [];
  }
};

/**
 * Save accounts to localStorage
 */
export const saveAccounts = (accounts: Account[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  } catch (error) {
    console.error('Failed to save accounts:', error);
  }
};

/**
 * Load accounts from localStorage
 */
export const loadAccounts = (): Account[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load accounts:', error);
    return [];
  }
};

/**
 * Save budgets to localStorage
 */
export const saveBudgets = (budgets: Budget[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  } catch (error) {
    console.error('Failed to save budgets:', error);
  }
};

/**
 * Load budgets from localStorage
 */
export const loadBudgets = (): Budget[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BUDGETS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load budgets:', error);
    return [];
  }
};

/**
 * Save debts to localStorage
 */
export const saveDebts = (debts: Debt[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
  } catch (error) {
    console.error('Failed to save debts:', error);
  }
};

/**
 * Load debts from localStorage
 */
export const loadDebts = (): Debt[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DEBTS);
    if (!data) return [];

    const debts = JSON.parse(data);

    // Convert date strings back to Date objects
    return debts.map((d: any) => ({
      ...d,
      targetPayoffDate: d.targetPayoffDate ? new Date(d.targetPayoffDate) : undefined,
    }));
  } catch (error) {
    console.error('Failed to load debts:', error);
    return [];
  }
};

/**
 * Save all app data
 */
export const saveAllData = (data: AppData): void => {
  saveTransactions(data.transactions);
  saveAccounts(data.accounts);
  saveBudgets(data.budgets);
  saveDebts(data.debts);
};

/**
 * Load all app data
 */
export const loadAllData = (): AppData => {
  return {
    transactions: loadTransactions(),
    accounts: loadAccounts(),
    budgets: loadBudgets(),
    debts: loadDebts(),
    lastSync: getLastSync(),
  };
};

/**
 * Get last sync timestamp
 */
export const getLastSync = (): Date | undefined => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return data ? new Date(data) : undefined;
  } catch (error) {
    return undefined;
  }
};

/**
 * Clear all app data
 */
export const clearAllData = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

/**
 * Export all data as JSON string
 */
export const exportDataToJSON = (): string => {
  const data = loadAllData();
  return JSON.stringify(data, null, 2);
};

/**
 * Import data from JSON string
 */
export const importDataFromJSON = (jsonString: string): AppData => {
  try {
    const data = JSON.parse(jsonString);

    // Validate and convert dates
    const appData: AppData = {
      transactions: data.transactions?.map((t: any) => ({
        ...t,
        date: new Date(t.date),
      })) || [],
      accounts: data.accounts || [],
      budgets: data.budgets || [],
      debts: data.debts?.map((d: any) => ({
        ...d,
        targetPayoffDate: d.targetPayoffDate ? new Date(d.targetPayoffDate) : undefined,
      })) || [],
    };

    return appData;
  } catch (error) {
    console.error('Failed to import data:', error);
    throw new Error('Invalid JSON format. Please check your file.');
  }
};

/**
 * Download data as JSON file
 */
export const downloadDataAsFile = (filename: string = 'downey-finance-data.json'): void => {
  const data = exportDataToJSON();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/**
 * Upload and import data from file
 */
export const uploadDataFromFile = (file: File): Promise<AppData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const data = importDataFromJSON(jsonString);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};
