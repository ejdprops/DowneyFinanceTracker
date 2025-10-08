import { useState } from 'react';
import type { Transaction, RecurringBill } from '../types';

interface TransactionRegisterProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onCreateRecurringBill: (bill: Omit<RecurringBill, 'id'>) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
}

export const TransactionRegister: React.FC<TransactionRegisterProps> = ({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  onCreateRecurringBill,
  onUpdateTransaction,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showPending, setShowPending] = useState(true);

  // Sort transactions (newest first)
  // Use sortOrder if available (preserves CSV chronological order)
  // Otherwise fall back to date sorting
  const sortedTransactions = [...transactions].sort((a, b) => {
    // If both have sortOrder, preserve CSV order (CSV is already newest-first)
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return a.sortOrder - b.sortOrder; // Lower sortOrder (earlier in CSV) = newer = show first
    }
    // Otherwise sort by date (newest first)
    return b.date.getTime() - a.date.getTime();
  });

  // Filter transactions by search term and pending toggle
  const filteredTransactions = sortedTransactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPending = showPending || !t.isPending;
    return matchesSearch && matchesPending;
  });

  const handleToggleReconciled = (transaction: Transaction) => {
    onUpdateTransaction({
      ...transaction,
      isReconciled: !transaction.isReconciled,
      // When marking as reconciled, also mark as not pending
      isPending: transaction.isReconciled ? transaction.isPending : false,
    });
  };

  const handleMarkAsProcessed = (transaction: Transaction) => {
    // Remove "(Projected)" from description and mark as pending instead of projected
    const newDescription = transaction.description.replace(' (Projected)', '');
    onUpdateTransaction({
      ...transaction,
      description: newDescription,
      isPending: true, // Mark as pending instead of projected
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Transaction History</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg font-medium"
        >
          + Add Transaction
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by Description or Category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Toggle Pending */}
        <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">
          <span className="text-sm text-gray-300 whitespace-nowrap">Show Pending</span>
          <button
            onClick={() => setShowPending(!showPending)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showPending ? 'bg-blue-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showPending ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-900/50 border-b border-gray-700">
            <tr>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                <span title="Reconciled">✓</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Balance</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No transactions found. Import a CSV or add a manual transaction.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleReconciled(transaction)}
                      disabled={transaction.description.includes('(Projected)')}
                      className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                        transaction.description.includes('(Projected)')
                          ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          : transaction.isReconciled
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                      title={
                        transaction.description.includes('(Projected)')
                          ? 'Mark as processed first'
                          : transaction.isReconciled
                            ? 'Reconciled'
                            : 'Not reconciled'
                      }
                    >
                      {transaction.description.includes('(Projected)')
                        ? '—'
                        : transaction.isReconciled && '✓'}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                    {transaction.date.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-white">
                    <div className="flex items-center gap-2">
                      {transaction.description}
                      {transaction.isPending && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-300 rounded-lg border border-yellow-500/30">
                          Pending
                        </span>
                      )}
                      {transaction.isManual && (
                        <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30">
                          Manual
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    {transaction.category}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${
                    transaction.amount < 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {transaction.amount < 0 ? '-' : ''}${Math.abs(transaction.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-white">
                    ${transaction.balance.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                    <div className="flex gap-2 justify-center">
                      {transaction.description.includes('(Projected)') ? (
                        <button
                          onClick={() => handleMarkAsProcessed(transaction)}
                          className="text-green-400 hover:text-green-300 transition-colors font-medium"
                        >
                          Mark as Processed
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setSelectedTransaction(transaction)}
                            className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                          >
                            Make Recurring
                          </button>
                          {transaction.isManual && (
                            <button
                              onClick={() => onDeleteTransaction(transaction.id)}
                              className="text-red-400 hover:text-red-300 transition-colors font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Transaction Form Modal */}
      {showAddForm && (
        <AddTransactionForm
          onAdd={(transaction) => {
            onAddTransaction(transaction);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Create Recurring Bill Modal */}
      {selectedTransaction && (
        <CreateRecurringBillModal
          transaction={selectedTransaction}
          onSave={(bill) => {
            onCreateRecurringBill(bill);
            setSelectedTransaction(null);
          }}
          onCancel={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
};

// Add Transaction Form Component
interface AddTransactionFormProps {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  onCancel: () => void;
}

const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ onAdd, onCancel }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: '',
    amount: '',
    isPending: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onAdd({
      date: new Date(formData.date),
      description: formData.description,
      category: formData.category,
      amount: parseFloat(formData.amount),
      balance: 0, // Will be calculated
      isPending: formData.isPending,
      isManual: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-3xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">Add Manual Transaction</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Grocery Store"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Groceries"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Amount (negative for expenses, positive for income)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="-25.50"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPending"
              checked={formData.isPending}
              onChange={(e) => setFormData({ ...formData, isPending: e.target.checked })}
              className="h-4 w-4 text-blue-500 rounded bg-gray-700 border-gray-600"
            />
            <label htmlFor="isPending" className="text-sm text-gray-300">
              Mark as Pending
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all font-medium"
            >
              Add Transaction
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Create Recurring Bill Modal Component
interface CreateRecurringBillModalProps {
  transaction: Transaction;
  onSave: (bill: Omit<RecurringBill, 'id'>) => void;
  onCancel: () => void;
}

const CreateRecurringBillModal: React.FC<CreateRecurringBillModalProps> = ({
  transaction,
  onSave,
  onCancel,
}) => {
  const isIncome = transaction.amount > 0;

  // Calculate next due date (30 days from transaction date by default)
  const defaultNextDate = new Date(transaction.date);
  defaultNextDate.setDate(defaultNextDate.getDate() + 30);

  const [formData, setFormData] = useState({
    description: transaction.description,
    category: transaction.category,
    amount: Math.abs(transaction.amount).toString(),
    frequency: 'monthly' as RecurringBill['frequency'],
    nextDueDate: defaultNextDate.toISOString().split('T')[0],
    dayOfMonth: transaction.date.getDate().toString(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    // Keep income positive, make expenses negative
    const finalAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);

    onSave({
      description: formData.description,
      category: formData.category,
      amount: finalAmount,
      frequency: formData.frequency,
      dayOfMonth: formData.frequency === 'monthly' ? parseInt(formData.dayOfMonth) : undefined,
      nextDueDate: new Date(formData.nextDueDate),
      isActive: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-3xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">Create Recurring Bill</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {isIncome ? 'Income (positive amount)' : 'Expense (negative amount)'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as RecurringBill['frequency'] })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {formData.frequency === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Day of Month
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dayOfMonth}
                  onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Next Due Date</label>
            <input
              type="date"
              value={formData.nextDueDate}
              onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all font-medium"
            >
              Create Recurring Bill
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
