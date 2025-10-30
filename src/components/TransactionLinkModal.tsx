import { useState, useMemo } from 'react';
import type { Transaction, Account } from '../types';

interface TransactionLinkModalProps {
  transaction: Transaction;
  allTransactions: Transaction[];
  accounts: Account[];
  onLink: (linkedTransactionId: string) => void;
  onCreateAndLink: (targetAccountId: string) => void;
  onClose: () => void;
}

export const TransactionLinkModal: React.FC<TransactionLinkModalProps> = ({
  transaction,
  allTransactions,
  accounts,
  onLink,
  onCreateAndLink,
  onClose,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Get the current transaction's account
  const currentAccount = accounts.find(a => a.id === transaction.accountId);

  // Filter transactions from other accounts
  const otherAccountTransactions = useMemo(() => {
    return allTransactions.filter(t =>
      t.accountId !== transaction.accountId &&
      !t.id.startsWith('proj-') // Exclude projected transactions
    );
  }, [allTransactions, transaction.accountId]);

  // Filter by selected account and search term
  const filteredTransactions = useMemo(() => {
    let filtered = otherAccountTransactions;

    if (selectedAccountId) {
      filtered = filtered.filter(t => t.accountId === selectedAccountId);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term) ||
        Math.abs(t.amount).toFixed(2).includes(term)
      );
    }

    // Sort by date (most recent first)
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [otherAccountTransactions, selectedAccountId, searchTerm]);

  // Find potential matches (same amount but opposite sign, within 7 days)
  const suggestedMatches = useMemo(() => {
    const targetAmount = -transaction.amount; // Opposite sign
    const transactionTime = transaction.date.getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    return filteredTransactions.filter(t => {
      const amountMatch = Math.abs(Math.abs(t.amount) - Math.abs(targetAmount)) < 0.01;
      const dateMatch = Math.abs(t.date.getTime() - transactionTime) <= sevenDays;
      return amountMatch && dateMatch;
    });
  }, [transaction, filteredTransactions]);

  const handleCreateAndLink = () => {
    if (!selectedAccountId) {
      alert('Please select an account to create the linked transaction in.');
      return;
    }
    onCreateAndLink(selectedAccountId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Link Transaction</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Transaction Info */}
        <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Current Transaction</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Account:</span>
              <span className="text-white ml-2">{currentAccount?.name} ({currentAccount?.institution})</span>
            </div>
            <div>
              <span className="text-gray-400">Date:</span>
              <span className="text-white ml-2">{transaction.date.toLocaleDateString()}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400">Description:</span>
              <span className="text-white ml-2">{transaction.description}</span>
            </div>
            <div>
              <span className="text-gray-400">Amount:</span>
              <span className={`ml-2 font-semibold ${transaction.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {transaction.amount < 0 ? '-' : ''}${Math.abs(transaction.amount).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Category:</span>
              <span className="text-white ml-2">{transaction.category}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Accounts</option>
              {accounts
                .filter(a => a.id !== transaction.accountId)
                .map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {account.institution}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search description, category, or amount..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Suggested Matches */}
        {suggestedMatches.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-blue-400 mb-3">Suggested Matches (Same amount, within 7 days)</h3>
            <div className="space-y-2">
              {suggestedMatches.map(t => {
                const account = accounts.find(a => a.id === t.accountId);
                return (
                  <div
                    key={t.id}
                    className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex justify-between items-center hover:bg-blue-500/20 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-white font-medium">{t.description}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        {account?.name} • {t.date.toLocaleDateString()} • {t.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-semibold ${t.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {t.amount < 0 ? '-' : ''}${Math.abs(t.amount).toFixed(2)}
                      </span>
                      <button
                        onClick={() => onLink(t.id)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                      >
                        Link
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Transactions */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            All Transactions ({filteredTransactions.length})
          </h3>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredTransactions.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No transactions found in other accounts
              </div>
            ) : (
              filteredTransactions.map(t => {
                const account = accounts.find(a => a.id === t.accountId);
                const isSuggested = suggestedMatches.some(m => m.id === t.id);
                return (
                  <div
                    key={t.id}
                    className={`rounded-lg p-3 flex justify-between items-center transition-colors ${
                      isSuggested
                        ? 'bg-gray-700/30'
                        : 'bg-gray-700/50 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="text-white">{t.description}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        {account?.name} • {t.date.toLocaleDateString()} • {t.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-semibold ${t.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {t.amount < 0 ? '-' : ''}${Math.abs(t.amount).toFixed(2)}
                      </span>
                      <button
                        onClick={() => onLink(t.id)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors font-medium text-sm"
                      >
                        Link
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Create New Linked Transaction */}
        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Or Create Matching Transaction
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Create a new transaction in another account with the opposite amount (good for credit card payments that haven't posted yet).
          </p>
          <div className="flex gap-4">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select account...</option>
              {accounts
                .filter(a => a.id !== transaction.accountId)
                .map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {account.institution}
                  </option>
                ))}
            </select>
            <button
              onClick={handleCreateAndLink}
              disabled={!selectedAccountId}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Create & Link
            </button>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
