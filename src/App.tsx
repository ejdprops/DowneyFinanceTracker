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
import type { Transaction, Account, RecurringBill, Debt, ParsedCSVData } from './types';
import {
  saveTransactions,
  loadTransactions,
  saveAccounts,
  loadAccounts,
  saveActiveAccountId,
  loadActiveAccountId,
  saveRecurringBills,
  loadRecurringBills,
  saveDebts,
  loadDebts,
  migrateToMultiAccount,
} from './utils/storage';
import { generateProjections, calculateBalances } from './utils/projections';

function App() {
  const [currentTab, setCurrentTab] = useState<'account' | 'register' | 'recurring' | 'projections' | 'debts' | 'sync'>('account');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showProjections, setShowProjections] = useState(true);
  const [dismissedProjections, setDismissedProjections] = useState<Set<string>>(new Set());
  const [showAccountManagement, setShowAccountManagement] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadedTransactions = loadTransactions();
    const migratedAccounts = migrateToMultiAccount();
    const savedActiveAccountId = loadActiveAccountId();
    const loadedBills = loadRecurringBills();
    const loadedDebts = loadDebts();

    setTransactions(loadedTransactions);
    setAccounts(migratedAccounts);
    setActiveAccountId(savedActiveAccountId || migratedAccounts[0]?.id || '');
    setRecurringBills(loadedBills);
    setDebts(loadedDebts);
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

  const handleImportComplete = (data: ParsedCSVData) => {
    if (!activeAccountId) return;

    // Track duplicates and updates
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const updatedTransactions = [...transactions];

    data.transactions.forEach(importedTx => {
      // Add accountId to imported transaction
      const txWithAccount = { ...importedTx, accountId: activeAccountId };

      // Check for existing transaction by date + description + amount + account
      const existingIndex = updatedTransactions.findIndex(t =>
        t.accountId === activeAccountId &&
        t.date.toDateString() === txWithAccount.date.toDateString() &&
        t.description === txWithAccount.description &&
        Math.abs(t.amount - txWithAccount.amount) < 0.01 // Allow small floating point differences
      );

      if (existingIndex !== -1) {
        const existing = updatedTransactions[existingIndex];
        // If existing was manual (user created from projected or added manually), update it
        if (existing.isManual) {
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

    if (data.errors.length > 0) {
      alert(`Import completed with ${data.errors.length} errors. Check console for details.`);
      console.error('Import errors:', data.errors);
    } else {
      alert(`Import complete!\nNew: ${newCount}\nUpdated: ${updatedCount}\nSkipped: ${skippedCount}`);
    }

    // Note: We do NOT update the account balance from imported transactions
    // The account.availableBalance represents the CURRENT balance
    // Imported transactions have historical balances that may be old
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
    setTransactions(transactions.map(t => t.id === transaction.id ? transaction : t));
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

  // Get all transactions including projections for active account
  const allTransactions = showProjections && account
    ? calculateBalances(
        [...accountTransactions, ...generateProjections(accountRecurringBills, 60).filter(projection => {
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
        })],
        account.availableBalance
      )
    : calculateBalances(accountTransactions, account?.availableBalance || 0);


  // Calculate projected balance
  const projectedBalance = allTransactions.length > 0
    ? allTransactions[allTransactions.length - 1].balance
    : account?.availableBalance || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl p-8 mb-6 border border-gray-700">
          <div className="mb-6">
            <AccountSelector
              accounts={accounts}
              activeAccountId={activeAccountId}
              onSelectAccount={handleSelectAccount}
              onManageAccounts={() => setShowAccountManagement(true)}
            />
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white">{account?.name || 'No Account'}</h1>
              <p className="text-gray-400 mt-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                {account?.institution} •••• {account?.accountNumber.slice(-4)}
              </p>
            </div>
            <div className="text-right bg-gradient-to-br from-blue-500/20 to-purple-500/20 px-6 py-4 rounded-2xl border border-blue-500/30">
              <p className="text-sm text-gray-400 mb-1">
                {account?.accountType === 'credit_card' ? 'Balance' : 'Available'}
              </p>
              <p className="text-4xl font-bold text-white">
                ${account?.availableBalance.toFixed(2) || '0.00'}
              </p>
              {account?.accountType === 'credit_card' && account?.creditLimit && (
                <p className="text-xs text-gray-400 mt-1">
                  Limit: ${account.creditLimit.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-3xl shadow-2xl mb-6 border border-gray-700">
          <nav className="flex gap-2 p-3">
            <button
              onClick={() => setCurrentTab('account')}
              className={`px-6 py-3 font-medium rounded-2xl transition-all ${
                currentTab === 'account'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Account Info
            </button>
            <button
              onClick={() => setCurrentTab('register')}
              className={`px-6 py-3 font-medium rounded-2xl transition-all ${
                currentTab === 'register'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setCurrentTab('recurring')}
              className={`px-6 py-3 font-medium rounded-2xl transition-all ${
                currentTab === 'recurring'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Recurring Bills
            </button>
            <button
              onClick={() => setCurrentTab('projections')}
              className={`px-6 py-3 font-medium rounded-2xl transition-all ${
                currentTab === 'projections'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Projections
            </button>
            <button
              onClick={() => setCurrentTab('debts')}
              className={`px-6 py-3 font-medium rounded-2xl transition-all ${
                currentTab === 'debts'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Debts
            </button>
            <button
              onClick={() => setCurrentTab('sync')}
              className={`px-6 py-3 font-medium rounded-2xl transition-all ${
                currentTab === 'sync'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              iCloud Sync
            </button>
          </nav>

          {/* Tab Content */}
          <div className="p-6">
            {/* Account Info Tab */}
            {currentTab === 'account' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Account Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl p-6 border border-blue-500/30 backdrop-blur-sm">
                    <h3 className="text-sm font-medium text-blue-300 mb-2">Current Balance</h3>
                    <p className="text-3xl font-bold text-white">
                      ${account?.availableBalance.toFixed(2)}
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

                <div className="flex items-center gap-3 bg-gray-800/50 rounded-2xl p-4 border border-gray-700">
                  <input
                    type="checkbox"
                    id="showProjections"
                    checked={showProjections}
                    onChange={(e) => setShowProjections(e.target.checked)}
                    className="h-5 w-5 text-blue-500 rounded bg-gray-700 border-gray-600"
                  />
                  <label htmlFor="showProjections" className="text-gray-300 font-medium">
                    Show projected transactions from recurring bills
                  </label>
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
                onDataLoaded={handleDataLoaded}
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
    </div>
  );
}

export default App;
