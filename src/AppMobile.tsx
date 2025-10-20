import { useState, useEffect } from 'react';
import { CSVImport } from './components/CSVImport';
import { JSONImport } from './components/JSONImport';
import { ICloudSync } from './components/ICloudSync';
import { AccountManagement } from './components/AccountManagement';
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
  saveICloudFolderPath,
  loadICloudFolderPath,
} from './utils/storage';
import { generateProjections, calculateBalances } from './utils/projections';
import logo from './assets/downey-app-logo-header.png';

// Declare global constants
declare const __APP_OWNER__: string;

const APP_OWNER = typeof __APP_OWNER__ !== 'undefined' ? __APP_OWNER__ : 'Family';

function AppMobile() {
  const [currentTab, setCurrentTab] = useState<'balance' | 'transactions' | 'sync'>('balance');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showAccountManagement, setShowAccountManagement] = useState(false);
  const [iCloudDirHandle, setICloudDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  // @ts-expect-error - iCloudFolderPath stored but not displayed on mobile
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [iCloudFolderPath, setICloudFolderPath] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadedTransactions = loadTransactions();
    const migratedAccounts = migrateToMultiAccount();
    const savedActiveAccountId = loadActiveAccountId();
    const loadedBills = loadRecurringBills();
    const loadedDebts = loadDebts();
    const savedFolderPath = loadICloudFolderPath();

    setTransactions(loadedTransactions);
    setAccounts(migratedAccounts);
    setActiveAccountId(savedActiveAccountId || migratedAccounts[0]?.id || '');
    setRecurringBills(loadedBills);
    setDebts(loadedDebts);
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

  // Get active account
  const account = accounts.find(a => a.id === activeAccountId) || null;

  // Filter transactions for active account
  const accountTransactions = transactions.filter(t => t.accountId === activeAccountId);
  const accountRecurringBills = recurringBills.filter(b => b.accountId === activeAccountId);

  // Calculate balances
  const allTransactions = calculateBalances(
    [...accountTransactions, ...generateProjections(accountRecurringBills, 60)],
    account?.availableBalance || 0
  );

  const currentBalance = account?.availableBalance || 0;
  const futureTransactions = allTransactions.filter(t =>
    t.date > new Date() && t.description.includes('(Projected)')
  );
  const projectedBalance = futureTransactions.length > 0
    ? futureTransactions[futureTransactions.length - 1].balance
    : currentBalance;

  const handleSelectAccount = (accountId: string) => {
    setActiveAccountId(accountId);
  };

  const handleImportComplete = (data: ParsedCSVData, currentBalance?: number) => {
    if (!activeAccountId) return;

    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let postedCount = 0;

    const updatedTransactions = [...transactions];

    data.transactions.forEach(importedTx => {
      const txWithAccount = { ...importedTx, accountId: activeAccountId };

      const existingByIdIndex = updatedTransactions.findIndex(t => t.id === txWithAccount.id);
      const existingPendingIndex = updatedTransactions.findIndex(t =>
        t.accountId === activeAccountId &&
        t.isPending &&
        t.description === txWithAccount.description &&
        Math.abs(t.amount - txWithAccount.amount) < 0.01
      );
      const existingByDataIndex = updatedTransactions.findIndex(t =>
        t.accountId === activeAccountId &&
        !t.isPending &&
        t.date.toDateString() === txWithAccount.date.toDateString() &&
        t.description === txWithAccount.description &&
        Math.abs(t.amount - txWithAccount.amount) < 0.01
      );

      let existingIndex = -1;
      let isPendingToPosted = false;

      if (existingByIdIndex !== -1) {
        existingIndex = existingByIdIndex;
      } else if (existingPendingIndex !== -1 && !txWithAccount.isPending) {
        existingIndex = existingPendingIndex;
        isPendingToPosted = true;
      } else if (existingByDataIndex !== -1) {
        existingIndex = existingByDataIndex;
      }

      if (existingIndex !== -1) {
        const existing = updatedTransactions[existingIndex];

        if (isPendingToPosted) {
          updatedTransactions[existingIndex] = {
            ...txWithAccount,
            isReconciled: existing.isReconciled,
          };
          postedCount++;
        } else if (existing.isManual) {
          updatedTransactions[existingIndex] = {
            ...txWithAccount,
            isReconciled: existing.isReconciled,
          };
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        updatedTransactions.push(txWithAccount);
        newCount++;
      }
    });

    setTransactions(updatedTransactions);

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

  const handleAddAccount = (account: Omit<Account, 'id'>) => {
    const newAccount: Account = {
      ...account,
      id: `account-${Date.now()}`,
    };
    const newAccounts = [...accounts, newAccount];
    setAccounts(newAccounts);
    setActiveAccountId(newAccount.id);
  };

  const handleUpdateAccount = (account: Account) => {
    setAccounts(accounts.map(a => a.id === account.id ? account : a));
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

  const handleFolderSelected = (dirHandle: FileSystemDirectoryHandle, folderPath: string) => {
    setICloudDirHandle(dirHandle);
    setICloudFolderPath(folderPath);
    saveICloudFolderPath(folderPath);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-3 pb-2">
        <div className="px-3">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl p-3 border border-gray-700">
            {/* Logo */}
            <div className="flex justify-center mb-3">
              <img
                src={logo}
                alt={`${APP_OWNER}'s Finance Tracker`}
                className="h-20 w-auto object-contain"
                title={`${APP_OWNER}'s Finance Tracker`}
              />
            </div>

            {/* Account Tiles */}
            <div className="mb-3">
              {/* Checking/Savings Accounts */}
              <div className="flex flex-wrap justify-center gap-2 mb-2">
                {accounts
                  .filter(acc => acc.accountType !== 'credit_card')
                  .map(acc => {
                    const accTransactions = transactions.filter(t => t.accountId === acc.id);
                    const accBalance = accTransactions.length > 0
                      ? calculateBalances(accTransactions, acc.availableBalance || 0)[accTransactions.length - 1]?.balance
                      : acc.availableBalance || 0;

                    const displayBalance = accBalance;
                    const balanceColorStyle = accBalance >= 0 ? '#4ade80' : '#f87171';

                    return (
                      <button
                        key={acc.id}
                        onClick={() => handleSelectAccount(acc.id)}
                        className={`px-2.5 py-2 rounded-lg transition-all font-medium text-xs flex flex-col items-center min-w-[90px] ${
                          acc.id === activeAccountId
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg'
                            : 'bg-gray-700/50 hover:bg-gray-700'
                        }`}
                        title={`${acc.name} - ${acc.institution}`}
                      >
                        <span className={`text-[10px] font-semibold ${acc.id === activeAccountId ? 'text-white' : 'text-gray-200'}`}>
                          {acc.name}
                        </span>
                        <span className={`text-[9px] opacity-70 ${acc.id === activeAccountId ? 'text-white' : 'text-gray-400'}`}>
                          {acc.institution}
                        </span>
                        <span className="text-sm font-bold mt-1" style={{ color: balanceColorStyle }}>
                          ${displayBalance.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
              </div>

              {/* Credit Cards */}
              <div className="flex flex-wrap justify-center gap-2">
                {accounts
                  .filter(acc => acc.accountType === 'credit_card')
                  .map(acc => {
                    const accTransactions = transactions.filter(t => t.accountId === acc.id);
                    const accBalance = accTransactions.length > 0
                      ? calculateBalances(accTransactions, acc.availableBalance || 0)[accTransactions.length - 1]?.balance
                      : acc.availableBalance || 0;

                    const displayBalance = accBalance;
                    const balanceColorStyle = accBalance < 0 ? '#f87171' : '#4ade80';

                    return (
                      <button
                        key={acc.id}
                        onClick={() => handleSelectAccount(acc.id)}
                        className={`px-2.5 py-2 rounded-lg transition-all font-medium text-xs flex flex-col items-center min-w-[90px] ${
                          acc.id === activeAccountId
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg'
                            : 'bg-gray-700/50 hover:bg-gray-700'
                        }`}
                        title={`${acc.name} - ${acc.institution}`}
                      >
                        <span className={`text-[10px] font-semibold ${acc.id === activeAccountId ? 'text-white' : 'text-gray-200'}`}>
                          {acc.name}
                        </span>
                        <span className={`text-[9px] opacity-70 ${acc.id === activeAccountId ? 'text-white' : 'text-gray-400'}`}>
                          {acc.institution}
                        </span>
                        <span className="text-sm font-bold mt-1" style={{ color: balanceColorStyle }}>
                          ${displayBalance.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Summary Section */}
            <div className="bg-gray-700/50 rounded-lg px-3 py-2 border border-gray-600 mb-3">
              <div className="flex justify-around text-center">
                <div>
                  <div className="text-[10px] text-gray-400">Checking/Savings</div>
                  <div className="text-base font-bold text-green-400">
                    ${(() => {
                      const checkingSavingsTotal = accounts
                        .filter(acc => acc.accountType !== 'credit_card')
                        .reduce((sum, acc) => {
                          const accTransactions = transactions.filter(t => t.accountId === acc.id);
                          const accBalance = accTransactions.length > 0
                            ? calculateBalances(accTransactions, acc.availableBalance || 0)[accTransactions.length - 1]?.balance
                            : acc.availableBalance || 0;
                          return sum + accBalance;
                        }, 0);
                      return checkingSavingsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400">Credit Cards Owed</div>
                  <div className="text-base font-bold text-red-400">
                    ${(() => {
                      const creditCardTotal = accounts
                        .filter(acc => acc.accountType === 'credit_card')
                        .reduce((sum, acc) => {
                          const accTransactions = transactions.filter(t => t.accountId === acc.id);
                          const accBalance = accTransactions.length > 0
                            ? calculateBalances(accTransactions, acc.availableBalance || 0)[accTransactions.length - 1]?.balance
                            : acc.availableBalance || 0;
                          return sum + Math.abs(Math.min(0, accBalance));
                        }, 0);
                      return creditCardTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Manage Accounts Button */}
            <button
              onClick={() => setShowAccountManagement(true)}
              className="w-full px-3 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-all text-xs mb-3"
            >
              Manage Accounts
            </button>

            {/* Tab Navigation */}
            <nav className="flex gap-2">
              <button
                onClick={() => setCurrentTab('balance')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  currentTab === 'balance'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                Balance
              </button>
              <button
                onClick={() => setCurrentTab('transactions')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  currentTab === 'transactions'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                Transactions
              </button>
              <button
                onClick={() => setCurrentTab('sync')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  currentTab === 'sync'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                Sync
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-20">
        {currentTab === 'balance' && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-4 border border-green-500/30">
                <p className="text-xs text-green-300 mb-1">Projected (60d)</p>
                <p className="text-2xl font-bold text-white">
                  ${projectedBalance.toFixed(2)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-4 border border-purple-500/30">
                <p className="text-xs text-purple-300 mb-1">Transactions</p>
                <p className="text-2xl font-bold text-white">{accountTransactions.length}</p>
              </div>
            </div>

            {/* Import Section */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">Import Transactions</h3>
              <div className="space-y-2">
                <CSVImport onImportComplete={handleImportComplete} />
                <JSONImport onImportComplete={handleImportComplete} />
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">Recent Transactions</h3>
              {accountTransactions.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {accountTransactions
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .slice(0, 10)
                    .map(tx => (
                      <div key={tx.id} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{tx.description}</p>
                          <p className="text-gray-400 text-xs">{tx.date.toLocaleDateString()}</p>
                        </div>
                        <div className="text-right ml-2">
                          <p className={`text-sm font-semibold ${
                            tx.amount < 0 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-400">${tx.balance.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'transactions' && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">All Transactions</h2>
            {accountTransactions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No transactions yet. Import a CSV to get started.</p>
            ) : (
              <div className="space-y-2">
                {accountTransactions
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map(tx => (
                    <div key={tx.id} className="flex justify-between items-center py-3 border-b border-gray-700 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{tx.description}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-gray-400">{tx.date.toLocaleDateString()}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-400">{tx.category}</span>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <p className={`text-sm font-semibold ${
                          tx.amount < 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">${tx.balance.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

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

      {/* Account Management Modal */}
      {showAccountManagement && (
        <AccountManagement
          accounts={accounts}
          onAddAccount={handleAddAccount}
          onUpdateAccount={handleUpdateAccount}
          onDeleteAccount={(id) => {
            setAccounts(accounts.filter(a => a.id !== id));
            if (activeAccountId === id) {
              setActiveAccountId(accounts.filter(a => a.id !== id)[0]?.id || '');
            }
          }}
          onClose={() => setShowAccountManagement(false)}
        />
      )}
    </div>
  );
}

export default AppMobile;
