import { useState, useEffect, useMemo } from 'react';
import { CSVImport } from './components/CSVImport';
import { AccountManager } from './components/AccountManager';
import type { ParsedCSVData, Transaction, Account } from './types';
import {
  loadTransactions,
  saveTransactions,
  loadAccounts,
  saveAccounts,
  downloadDataAsFile,
  uploadDataFromFile,
  getLastSync
} from './utils/storage';
import { calculateProjectedBalances } from './utils/balanceCalculations';
import { getCategoryColor } from './utils/categoryColors';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<Date | undefined>();
  const [currentView, setCurrentView] = useState<'transactions' | 'accounts'>('transactions');

  // Calculate projected balances whenever transactions or accounts change
  const transactionsWithBalances = useMemo(() => {
    return calculateProjectedBalances(transactions, accounts);
  }, [transactions, accounts]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedTransactions = loadTransactions();
    const savedAccounts = loadAccounts();

    if (savedTransactions.length > 0) {
      setTransactions(savedTransactions);
    }
    if (savedAccounts.length > 0) {
      setAccounts(savedAccounts);
    }
    setLastSync(getLastSync());
  }, []);

  // Save transactions whenever they change
  useEffect(() => {
    if (transactions.length > 0) {
      saveTransactions(transactions);
      setLastSync(new Date());
    }
  }, [transactions]);

  // Save accounts whenever they change
  useEffect(() => {
    if (accounts.length > 0) {
      saveAccounts(accounts);
      setLastSync(new Date());
    }
  }, [accounts]);

  const handleImportComplete = (data: ParsedCSVData, accountId?: string) => {
    // Merge new transactions with existing ones (avoid duplicates)
    const existingIds = new Set(transactions.map(t => t.id));
    let newTransactions = data.transactions.filter(t => !existingIds.has(t.id));

    // Link transactions to account if specified
    if (accountId) {
      newTransactions = newTransactions.map(t => ({
        ...t,
        account: accountId,
      }));
    }

    setTransactions([...transactions, ...newTransactions]);
    setErrors(data.errors);

    if (data.errors.length > 0) {
      console.warn('Import completed with errors:', data.errors);
    }
  };

  const handleExportData = () => {
    downloadDataAsFile(`downey-finance-${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await uploadDataFromFile(file);
      setTransactions(data.transactions);
      setAccounts(data.accounts);
      alert(`Successfully imported ${data.transactions.length} transactions and ${data.accounts.length} accounts!`);
    } catch (error) {
      alert(`Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddAccount = (accountData: Omit<Account, 'id'>) => {
    const newAccount: Account = {
      ...accountData,
      id: `account-${Date.now()}`,
    };
    setAccounts([...accounts, newAccount]);
  };

  const handleEditAccount = (account: Account) => {
    setAccounts(accounts.map((a) => (a.id === account.id ? account : a)));
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts(accounts.filter((a) => a.id !== id));
  };

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      setTransactions([]);
      setAccounts([]);
      setErrors([]);
      localStorage.clear();
      alert('All data has been cleared.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Downey Finance Tracker</h1>
              <p className="mt-2 text-sm text-gray-600">
                Personal budget management and financial tracking
              </p>
              {lastSync && (
                <p className="mt-1 text-xs text-gray-500">
                  Last saved: {lastSync.toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportData}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Export Data
              </button>
              <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm">
                Import Data
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleClearAllData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setCurrentView('transactions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transactions ({transactions.length})
            </button>
            <button
              onClick={() => setCurrentView('accounts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'accounts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Accounts ({accounts.length})
            </button>
          </nav>
        </div>

        {/* Accounts View */}
        {currentView === 'accounts' && (
          <AccountManager
            accounts={accounts}
            onAddAccount={handleAddAccount}
            onEditAccount={handleEditAccount}
            onDeleteAccount={handleDeleteAccount}
          />
        )}

        {/* Transactions View */}
        {currentView === 'transactions' && (
          <>
            {transactions.length === 0 ? (
              <div className="space-y-8">
                <CSVImport accounts={accounts} onImportComplete={handleImportComplete} />

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-semibold mb-2">Import Errors:</h3>
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Transactions ({transactions.length})
                </h2>
                <button
                  onClick={() => {
                    setTransactions([]);
                    setErrors([]);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Import New File
                </button>
              </div>

              {errors.length > 0 && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-yellow-800 text-sm">
                    {errors.length} row(s) had errors during import
                  </p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paid
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Projected Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactionsWithBalances
                      .sort((a, b) => b.date.getTime() - a.date.getTime())
                      .map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.dueDate
                            ? transaction.dueDate.toLocaleDateString()
                            : transaction.date.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {transaction.description}
                          {transaction.notes && (
                            <span className="block text-xs text-gray-500 mt-1">
                              {transaction.notes}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.account
                            ? accounts.find((a) => a.id === transaction.account)?.name || '-'
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {transaction.category ? (
                            <span className={`px-3 py-1 rounded font-medium ${getCategoryColor(transaction.category)}`}>
                              {transaction.category}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                            transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          ${Math.abs(transaction.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            checked={transaction.isPaid || false}
                            onChange={(e) => {
                              const updated = transactions.map((t) =>
                                t.id === transaction.id
                                  ? { ...t, isPaid: e.target.checked, actualPaymentDate: e.target.checked ? new Date() : undefined }
                                  : t
                              );
                              setTransactions(updated);
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                          {transaction.projectedBalance !== undefined ? (
                            <span
                              className={
                                transaction.projectedBalance >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }
                            >
                              ${transaction.projectedBalance.toFixed(2)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}

export default App;
