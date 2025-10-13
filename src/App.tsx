import { useState, useEffect } from 'react';
import { CSVImport } from './components/CSVImport';
import { JSONImport } from './components/JSONImport';
import { TransactionRegister } from './components/TransactionRegister';
import { RecurringBillsManager } from './components/RecurringBillsManager';
import { RecurringSuggestions } from './components/RecurringSuggestions';
import { Projections } from './components/Projections';
import { DebtsTracker } from './components/DebtsTracker';
import { ICloudSync } from './components/ICloudSync';
import { AccountSelector } from './components/AccountSelector';
import { AccountManagement } from './components/AccountManagement';
import { SpendingCharts } from './components/SpendingCharts';
import { MerchantManagement } from './components/MerchantManagement';
import type { Transaction, Account, RecurringBill, Debt, ParsedCSVData } from './types';
import {
  saveTransactions,
  loadTransactions,
  saveAccounts,
  saveActiveAccountId,
  loadActiveAccountId,
  saveRecurringBills,
  loadRecurringBills,
  saveDebts,
  loadDebts,
  migrateToMultiAccount,
  saveDismissedProjections,
  loadDismissedProjections,
  saveICloudFolderPath,
  loadICloudFolderPath,
} from './utils/storage';
import { saveToICloud } from './utils/icloudStorage';
import { generateProjections, calculateBalances } from './utils/projections';

function App() {
  const [currentTab, setCurrentTab] = useState<'account' | 'register' | 'recurring' | 'projections' | 'charts' | 'merchants' | 'debts' | 'sync'>('account');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showProjections, setShowProjections] = useState(false);
  const [dismissedProjections, setDismissedProjections] = useState<Set<string>>(new Set());
  const [projectedVisibility, setProjectedVisibility] = useState<Map<string, boolean>>(new Map());
  const [projectedState, setProjectedState] = useState<Map<string, Partial<Transaction>>>(new Map());
  const [showAccountManagement, setShowAccountManagement] = useState(false);
  const [iCloudDirHandle, setICloudDirHandle] = useState<any | null>(null);
  const [iCloudFolderPath, setICloudFolderPath] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadedTransactions = loadTransactions();
    const migratedAccounts = migrateToMultiAccount();
    const savedActiveAccountId = loadActiveAccountId();
    const loadedBills = loadRecurringBills();
    const loadedDebts = loadDebts();
    const loadedDismissedProjections = loadDismissedProjections();
    const savedFolderPath = loadICloudFolderPath();

    setTransactions(loadedTransactions);
    setAccounts(migratedAccounts);
    setActiveAccountId(savedActiveAccountId || migratedAccounts[0]?.id || '');
    setRecurringBills(loadedBills);
    setDebts(loadedDebts);
    setDismissedProjections(loadedDismissedProjections);
    setICloudFolderPath(savedFolderPath);
  }, []);

  // Save data when it changes
  useEffect(() => {
    if (transactions.length > 0) {
      saveTransactions(transactions);
    }
  }, [transactions]);

  useEffect(() => {
    if (accounts.length > 0) {
      saveAccounts(accounts);
    }
  }, [accounts]);

  useEffect(() => {
    if (activeAccountId) {
      saveActiveAccountId(activeAccountId);
    }
  }, [activeAccountId]);

  useEffect(() => {
    if (recurringBills.length > 0) {
      saveRecurringBills(recurringBills);
    }
  }, [recurringBills]);

  useEffect(() => {
    if (debts.length > 0) {
      saveDebts(debts);
    }
  }, [debts]);

  useEffect(() => {
    saveDismissedProjections(dismissedProjections);
  }, [dismissedProjections]);

  // Get active account
  const account = accounts.find(a => a.id === activeAccountId) || null;

  // Filter transactions and bills for active account
  const accountTransactions = transactions.filter(t => t.accountId === activeAccountId);
  const accountRecurringBills = recurringBills.filter(b => b.accountId === activeAccountId);

  // Account management handlers
  const handleSelectAccount = (accountId: string) => {
    setActiveAccountId(accountId);
  };

  const handleAddAccount = (accountData: Omit<Account, 'id'>) => {
    const newAccount: Account = {
      ...accountData,
      id: `account-${Date.now()}`,
    };
    setAccounts([...accounts, newAccount]);
  };

  const handleUpdateAccount = (updatedAccount: Account) => {
    setAccounts(accounts.map(a => a.id === updatedAccount.id ? updatedAccount : a));
  };

  const handleDeleteAccount = (accountId: string) => {
    // Remove all transactions for this account
    setTransactions(transactions.filter(t => t.accountId !== accountId));
    // Remove all recurring bills for this account
    setRecurringBills(recurringBills.filter(b => b.accountId !== accountId));
    // Remove the account
    const newAccounts = accounts.filter(a => a.id !== accountId);
    setAccounts(newAccounts);
    // Switch to first remaining account
    if (activeAccountId === accountId && newAccounts.length > 0) {
      setActiveAccountId(newAccounts[0].id);
    }
  };

  const handleImportComplete = (data: ParsedCSVData, currentBalance?: number) => {
    if (!activeAccountId) return;

    // Track duplicates and updates
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let postedCount = 0; // Track pending->posted transitions

    const updatedTransactions = [...transactions];

    data.transactions.forEach(importedTx => {
      // Add accountId to imported transaction
      const txWithAccount = { ...importedTx, accountId: activeAccountId };

      // Check for existing transaction by:
      // 1. ID (exact match within same account)
      // 2. Description + amount + account (duplicate detection - ignoring date for pending->posted)
      const existingByIdIndex = updatedTransactions.findIndex(t =>
        t.id === txWithAccount.id && t.accountId === activeAccountId
      );

      // For pending transactions that have posted, we need to match by description + amount only
      // This allows us to find the same transaction even if the date changed
      const existingPendingIndex = updatedTransactions.findIndex(t =>
        t.accountId === activeAccountId &&
        t.isPending && // Only match pending transactions
        t.description === txWithAccount.description &&
        Math.abs(t.amount - txWithAccount.amount) < 0.01 // Allow small floating point differences
      );

      // Regular duplicate detection (same date + description + amount)
      const existingByDataIndex = updatedTransactions.findIndex(t =>
        t.accountId === activeAccountId &&
        !t.isPending && // Don't match pending transactions here
        t.date.toDateString() === txWithAccount.date.toDateString() &&
        t.description === txWithAccount.description &&
        Math.abs(t.amount - txWithAccount.amount) < 0.01
      );

      // Priority: ID match > Pending match > Data match
      let existingIndex = -1;
      let isPendingToPosted = false;

      if (existingByIdIndex !== -1) {
        existingIndex = existingByIdIndex;
      } else if (existingPendingIndex !== -1 && !txWithAccount.isPending) {
        // Pending transaction is now posted
        existingIndex = existingPendingIndex;
        isPendingToPosted = true;
      } else if (existingByDataIndex !== -1) {
        existingIndex = existingByDataIndex;
      }

      if (existingIndex !== -1) {
        const existing = updatedTransactions[existingIndex];

        if (isPendingToPosted) {
          // Pending transaction has posted - update with new ID, date, and status
          updatedTransactions[existingIndex] = {
            ...txWithAccount,
            isReconciled: existing.isReconciled, // Preserve reconciled status
          };
          postedCount++;
        } else if (existing.isManual) {
          // If existing was manual (user created from projected or added manually), update it
          updatedTransactions[existingIndex] = {
            ...txWithAccount,
            isReconciled: existing.isReconciled, // Preserve reconciled status
          };
          updatedCount++;
        } else {
          // Already imported from CSV, skip duplicate
          skippedCount++;
        }
      } else {
        // New transaction
        updatedTransactions.push(txWithAccount);
        newCount++;
      }
    });

    setTransactions(updatedTransactions);

    // Update account balance if provided
    if (currentBalance !== undefined && account) {
      const updatedAccount = { ...account, availableBalance: currentBalance };
      handleUpdateAccount(updatedAccount);
    }

    if (data.errors.length > 0) {
      alert(`Import completed with ${data.errors.length} errors. Check console for details.`);
      console.error('Import errors:', data.errors);
    } else {
      const balanceMsg = currentBalance !== undefined ? `\nBalance updated to: $${currentBalance.toFixed(2)}` : '';
      const postedMsg = postedCount > 0 ? `\nPending→Posted: ${postedCount}` : '';
      alert(`Import complete!\nNew: ${newCount}\nUpdated: ${updatedCount}\nSkipped: ${skippedCount}${postedMsg}${balanceMsg}`);
    }
  };

  const handleAddTransaction = (transaction: Omit<Transaction, 'id' | 'accountId'>) => {
    if (!activeAccountId) return;
    const newTransaction: Transaction = {
      ...transaction,
      id: `manual-${Date.now()}`,
      accountId: activeAccountId,
    };
    setTransactions([...transactions, newTransaction]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const handleUpdateTransaction = (transaction: Transaction) => {
    // If it's a projected transaction (id starts with 'proj-'), store all state separately
    if (transaction.id.startsWith('proj-')) {
      const newVisibility = new Map(projectedVisibility);
      newVisibility.set(transaction.id, transaction.isProjectedVisible !== false);
      setProjectedVisibility(newVisibility);

      // Store all other state changes (reconciled, pending, etc.) for this specific projection
      const newState = new Map(projectedState);
      newState.set(transaction.id, {
        isReconciled: transaction.isReconciled,
        isPending: transaction.isPending,
        isProjectedVisible: transaction.isProjectedVisible,
      });
      setProjectedState(newState);
    } else {
      // Regular transaction - update in transactions array
      setTransactions(transactions.map(t => t.id === transaction.id ? transaction : t));
    }
  };

  const handleDismissProjection = (projectionId: string) => {
    setDismissedProjections(new Set([...dismissedProjections, projectionId]));
  };

  const handleAddBill = (bill: Omit<RecurringBill, 'id' | 'accountId'>) => {
    if (!activeAccountId) return;
    const newBill: RecurringBill = {
      ...bill,
      id: `bill-${Date.now()}`,
      accountId: activeAccountId,
    };
    setRecurringBills([...recurringBills, newBill]);
  };

  const handleUpdateBill = (bill: RecurringBill) => {
    setRecurringBills(recurringBills.map(b => b.id === bill.id ? bill : b));
  };

  const handleDeleteBill = (id: string) => {
    setRecurringBills(recurringBills.filter(b => b.id !== id));
  };

  const handleAddDebt = (debt: Omit<Debt, 'id'>) => {
    const newDebt: Debt = {
      ...debt,
      id: `debt-${Date.now()}`,
    };
    setDebts([...debts, newDebt]);
  };

  const handleUpdateDebt = (debt: Debt) => {
    setDebts(debts.map(d => d.id === debt.id ? debt : d));
  };

  const handleDeleteDebt = (id: string) => {
    setDebts(debts.filter(d => d.id !== id));
  };

  const handleDataLoaded = (data: {
    transactions: Transaction[];
    accounts: Account[];
    activeAccountId: string;
    recurringBills: RecurringBill[];
    debts: Debt[];
  }) => {
    setTransactions(data.transactions);
    setAccounts(data.accounts);
    setActiveAccountId(data.activeAccountId);
    setRecurringBills(data.recurringBills);
    setDebts(data.debts);
  };

  const handleFolderSelected = (dirHandle: any, folderPath: string) => {
    setICloudDirHandle(dirHandle);
    setICloudFolderPath(folderPath);
    saveICloudFolderPath(folderPath);
  };

  const handleQuickSync = async () => {
    if (!iCloudDirHandle) {
      alert('Please select an iCloud Drive folder first from the iCloud Sync tab.');
      return;
    }

    setIsSyncing(true);
    const success = await saveToICloud(iCloudDirHandle, {
      transactions,
      accounts,
      activeAccountId,
      recurringBills,
      debts,
      lastModified: new Date().toISOString(),
    });
    setIsSyncing(false);

    if (success) {
      alert('Data synced to iCloud Drive successfully!');
    }
  };

  const handleAdjustBalance = () => {
    if (!account) return;

    const currentBalanceStr = prompt(
      `Enter the current balance shown in your bank's app:\n\n` +
      `Current calculated balance: $${currentBalance.toFixed(2)}\n\n` +
      `This will update the account balance and recalculate all transaction balances.`
    );

    if (currentBalanceStr === null) return; // User cancelled

    const newBalance = parseFloat(currentBalanceStr.replace(/[$,]/g, ''));

    if (isNaN(newBalance)) {
      alert('Please enter a valid balance amount');
      return;
    }

    // Update the account's available balance
    const updatedAccount = { ...account, availableBalance: newBalance };
    handleUpdateAccount(updatedAccount);

    alert(`Balance updated to $${newBalance.toFixed(2)}\nAll transaction balances have been recalculated.`);
  };

  // Get all transactions including projections for active account
  const allTransactions = showProjections && account
    ? calculateBalances(
        [...accountTransactions, ...generateProjections(accountRecurringBills, 60)
          .filter(projection => {
            // Filter out dismissed projections
            if (dismissedProjections.has(projection.id)) {
              return false;
            }

            // Filter out projected transactions that match existing manual transactions
            const projectionDate = projection.date.toDateString();
            const projectionDesc = projection.description.replace(' (Projected)', '');
            return !accountTransactions.some(t =>
              t.date.toDateString() === projectionDate &&
              t.description.toLowerCase() === projectionDesc.toLowerCase()
            );
          })
          .map(projection => {
            // Apply stored state for this specific projection (visibility, reconciled, pending, etc.)
            const storedState = projectedState.get(projection.id);
            return {
              ...projection,
              // Apply stored state if it exists, otherwise use defaults
              isProjectedVisible: storedState?.isProjectedVisible !== undefined
                ? storedState.isProjectedVisible
                : (projectedVisibility.has(projection.id) ? projectedVisibility.get(projection.id)! : true),
              isReconciled: storedState?.isReconciled || false,
              isPending: storedState?.isPending !== undefined ? storedState.isPending : true,
            };
          })
        ],
        account.availableBalance
      )
    : calculateBalances(accountTransactions, account?.availableBalance || 0);


  // Calculate current balance (most recent non-projected transaction)
  const currentBalance = (() => {
    // Filter out projected transactions and find the most recent actual transaction
    const actualTransactions = allTransactions.filter(t =>
      !t.description.includes('(Projected)')
    );

    if (actualTransactions.length === 0) {
      return account?.availableBalance || 0;
    }

    // The last actual transaction in the list has the current balance
    return actualTransactions[actualTransactions.length - 1].balance;
  })();

  // Calculate projected balance (last transaction including future)
  const projectedBalance = allTransactions.length > 0
    ? allTransactions[allTransactions.length - 1].balance
    : account?.availableBalance || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Sticky Header - Reduced by ~30% */}
      <div className="sticky top-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-3 pb-2">
        <div className="max-w-7xl mx-auto px-3">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl p-4 border border-gray-700">
            <div className="mb-3">
              <AccountSelector
                accounts={accounts}
                activeAccountId={activeAccountId}
                onSelectAccount={handleSelectAccount}
                onManageAccounts={() => setShowAccountManagement(true)}
              />
            </div>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white">{account?.name || 'No Account'}</h1>
                <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  {account?.institution} •••• {account?.accountNumber.slice(-4)}
                </p>
                {iCloudFolderPath && (
                  <p className="text-blue-400 text-xs mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                    </svg>
                    iCloud: {iCloudFolderPath}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {iCloudDirHandle && (
                  <button
                    onClick={handleQuickSync}
                    disabled={isSyncing}
                    className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title="Sync to iCloud Drive"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                    </svg>
                    {isSyncing ? 'Syncing...' : 'Sync to iCloud'}
                  </button>
                )}
                <button
                  onClick={handleAdjustBalance}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-medium text-sm"
                  title="Adjust balance to match your bank"
                >
                  Adjust Balance
                </button>
                <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-1.5 rounded-lg border border-gray-600">
                  <input
                    type="checkbox"
                    id="showProjectionsHeader"
                    checked={showProjections}
                    onChange={(e) => setShowProjections(e.target.checked)}
                    className="h-4 w-4 text-blue-500 rounded bg-gray-700 border-gray-600"
                  />
                  <label htmlFor="showProjectionsHeader" className="text-gray-300 text-sm font-medium cursor-pointer">
                    Show Projected
                  </label>
                </div>
                <div className="text-right bg-gradient-to-br from-blue-500/20 to-purple-500/20 px-4 py-2 rounded-xl border border-blue-500/30">
                  <p className="text-xs text-gray-400 mb-0.5">
                    {account?.accountType === 'credit_card' ? 'Balance' : 'Current Balance'}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    ${currentBalance.toFixed(2)}
                  </p>
                  {account?.accountType === 'credit_card' && account?.creditLimit && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Limit: ${account.creditLimit.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <nav className="flex gap-1.5">

            <button
              onClick={() => setCurrentTab('account')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                currentTab === 'account'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Account Info
            </button>
            <button
              onClick={() => setCurrentTab('register')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                currentTab === 'register'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setCurrentTab('recurring')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                currentTab === 'recurring'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Recurring Bills
            </button>
            <button
              onClick={() => setCurrentTab('projections')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                currentTab === 'projections'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Projections
            </button>
            <button
              onClick={() => setCurrentTab('charts')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                currentTab === 'charts'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Spending Charts
            </button>
            <button
              onClick={() => setCurrentTab('merchants')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                currentTab === 'merchants'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Merchants
            </button>
            <button
              onClick={() => setCurrentTab('debts')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                currentTab === 'debts'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Debts
            </button>
            <button
              onClick={() => setCurrentTab('sync')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                currentTab === 'sync'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              iCloud Sync
            </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-3 pb-5">
        <div className="bg-gray-800 rounded-2xl shadow-xl p-4 border border-gray-700">
            {/* Account Info Tab */}
            {currentTab === 'account' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Account Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl p-6 border border-blue-500/30 backdrop-blur-sm">
                    <h3 className="text-sm font-medium text-blue-300 mb-2">Current Balance</h3>
                    <p className="text-3xl font-bold text-white">
                      ${currentBalance.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl p-6 border border-green-500/30 backdrop-blur-sm">
                    <h3 className="text-sm font-medium text-green-300 mb-2">
                      Projected Balance (60 days)
                    </h3>
                    <p className="text-3xl font-bold text-white">
                      ${projectedBalance.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl p-6 border border-purple-500/30 backdrop-blur-sm">
                    <h3 className="text-sm font-medium text-purple-300 mb-2">Transactions</h3>
                    <p className="text-3xl font-bold text-white">{transactions.length}</p>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Account Details</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-400">Account Number</dt>
                      <dd className="text-lg font-medium text-white">•••• {account?.accountNumber.slice(-4)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-400">Routing Number</dt>
                      <dd className="text-lg font-medium text-white">{account?.routingNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-400">Institution</dt>
                      <dd className="text-lg font-medium text-white">{account?.institution}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-400">Account Type</dt>
                      <dd className="text-lg font-medium text-white">Bills</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Import Transactions</h3>
                  <div className="flex gap-4">
                    <CSVImport onImportComplete={handleImportComplete} />
                    <JSONImport onImportComplete={handleImportComplete} />
                  </div>
                </div>

              </div>
            )}

            {/* Register Tab */}
            {currentTab === 'register' && (
              <TransactionRegister
                transactions={allTransactions}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onCreateRecurringBill={handleAddBill}
                onUpdateTransaction={handleUpdateTransaction}
                onDismissProjection={handleDismissProjection}
                recurringBills={accountRecurringBills}
              />
            )}

            {/* Recurring Bills Tab */}
            {currentTab === 'recurring' && (
              <div className="space-y-6">
                <RecurringSuggestions
                  transactions={accountTransactions}
                  existingBills={accountRecurringBills}
                  onAddBill={handleAddBill}
                />
                <RecurringBillsManager
                  bills={accountRecurringBills}
                  onAddBill={handleAddBill}
                  onUpdateBill={handleUpdateBill}
                  onDeleteBill={handleDeleteBill}
                />
              </div>
            )}

            {/* Projections Tab */}
            {currentTab === 'projections' && (
              <Projections
                transactions={allTransactions}
                currentBalance={account?.availableBalance || 0}
              />
            )}

            {/* Spending Charts Tab */}
            {currentTab === 'charts' && (
              <SpendingCharts
                transactions={transactions}
                accounts={accounts}
                activeAccountId={activeAccountId}
              />
            )}

            {/* Merchants Tab */}
            {currentTab === 'merchants' && (
              <MerchantManagement
                transactions={accountTransactions}
              />
            )}

            {/* Debts Tab */}
            {currentTab === 'debts' && (
              <DebtsTracker
                debts={debts}
                onAddDebt={handleAddDebt}
                onUpdateDebt={handleUpdateDebt}
                onDeleteDebt={handleDeleteDebt}
              />
            )}

            {/* iCloud Sync Tab */}
            {currentTab === 'sync' && (
              <ICloudSync
                transactions={transactions}
                accounts={accounts}
                activeAccountId={activeAccountId}
                recurringBills={recurringBills}
                debts={debts}
                iCloudDirHandle={iCloudDirHandle}
                onDataLoaded={handleDataLoaded}
                onFolderSelected={handleFolderSelected}
              />
            )}
          </div>
        </div>

      {/* Account Management Modal */}
      {showAccountManagement && (
        <AccountManagement
          accounts={accounts}
          onAddAccount={handleAddAccount}
          onUpdateAccount={handleUpdateAccount}
          onDeleteAccount={handleDeleteAccount}
          onClose={() => setShowAccountManagement(false)}
        />
      )}
    </div>
  );
}

export default App;
