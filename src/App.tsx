import { useState, useEffect } from 'react';
import { CSVImport } from './components/CSVImport';
import { TransactionRegister } from './components/TransactionRegister';
import { RecurringBillsManager } from './components/RecurringBillsManager';
import { RecurringSuggestions } from './components/RecurringSuggestions';
import { Projections } from './components/Projections';
import { DebtsTracker } from './components/DebtsTracker';
import { ICloudSync } from './components/ICloudSync';
import type { Transaction, Account, RecurringBill, Debt, ParsedCSVData } from './types';
import {
  saveTransactions,
  loadTransactions,
  saveAccount,
  loadAccount,
  saveRecurringBills,
  loadRecurringBills,
  saveDebts,
  loadDebts,
  initializeAccount,
} from './utils/storage';
import { generateProjections, calculateBalances } from './utils/projections';

function App() {
  const [currentTab, setCurrentTab] = useState<'account' | 'register' | 'recurring' | 'projections' | 'debts' | 'sync'>('account');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showProjections, setShowProjections] = useState(true);

  // Load data on mount
  useEffect(() => {
    const loadedTransactions = loadTransactions();
    let loadedAccount = loadAccount();
    const loadedBills = loadRecurringBills();
    const loadedDebts = loadDebts();

    // Initialize account if it doesn't exist
    if (!loadedAccount) {
      loadedAccount = initializeAccount();
      saveAccount(loadedAccount);
    }

    setTransactions(loadedTransactions);
    setAccount(loadedAccount);
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
    if (account) {
      saveAccount(account);
    }
  }, [account]);

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

  const handleImportComplete = (data: ParsedCSVData) => {
    const existingIds = new Set(transactions.map(t => t.id));
    const newTransactions = data.transactions.filter(t => !existingIds.has(t.id));

    setTransactions([...transactions, ...newTransactions]);

    if (data.errors.length > 0) {
      alert(`Import completed with ${data.errors.length} errors. Check console for details.`);
      console.error('Import errors:', data.errors);
    } else {
      alert(`Successfully imported ${newTransactions.length} transactions`);
    }

    // Note: We do NOT update the account balance from imported transactions
    // The account.availableBalance represents the CURRENT balance
    // Imported transactions have historical balances that may be old
  };

  const handleAddTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `manual-${Date.now()}`,
    };
    setTransactions([...transactions, newTransaction]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const handleUpdateTransaction = (transaction: Transaction) => {
    setTransactions(transactions.map(t => t.id === transaction.id ? transaction : t));
  };

  const handleAddBill = (bill: Omit<RecurringBill, 'id'>) => {
    const newBill: RecurringBill = {
      ...bill,
      id: `bill-${Date.now()}`,
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
    account: Account | null;
    recurringBills: RecurringBill[];
    debts: Debt[];
  }) => {
    setTransactions(data.transactions);
    setAccount(data.account);
    setRecurringBills(data.recurringBills);
    setDebts(data.debts);
  };

  // Get all transactions including projections
  const allTransactions = showProjections && account
    ? calculateBalances(
        [...transactions, ...generateProjections(recurringBills, 60)],
        account.availableBalance
      )
    : calculateBalances(transactions, account?.availableBalance || 0);


  // Calculate projected balance
  const projectedBalance = allTransactions.length > 0
    ? allTransactions[allTransactions.length - 1].balance
    : account?.availableBalance || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl p-8 mb-6 border border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white">USAA Bills</h1>
              <p className="text-gray-400 mt-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                Account •••• {account?.accountNumber.slice(-4)}
              </p>
            </div>
            <div className="text-right bg-gradient-to-br from-blue-500/20 to-purple-500/20 px-6 py-4 rounded-2xl border border-blue-500/30">
              <p className="text-sm text-gray-400 mb-1">Balance</p>
              <p className="text-4xl font-bold text-white">
                ${account?.availableBalance.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-green-400 mt-1">Total Week Profit +11.05%</p>
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
                  <CSVImport onImportComplete={handleImportComplete} />
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
              />
            )}

            {/* Recurring Bills Tab */}
            {currentTab === 'recurring' && (
              <div className="space-y-6">
                <RecurringSuggestions
                  transactions={transactions}
                  existingBills={recurringBills}
                  onAddBill={handleAddBill}
                />
                <RecurringBillsManager
                  bills={recurringBills}
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
                account={account}
                recurringBills={recurringBills}
                debts={debts}
                onDataLoaded={handleDataLoaded}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
