import { useState } from 'react';
import type { Transaction, RecurringBill, Account } from '../types';
import { parseDate, formatDateForInput } from '../utils/dateUtils';
import { TransactionLinkModal } from './TransactionLinkModal';

interface TransactionRegisterProps {
  transactions: Transaction[];
  allTransactions?: Transaction[]; // All transactions across all accounts for linking
  accounts?: Account[]; // All accounts for linking between accounts
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onDeleteMultipleTransactions: (ids: string[]) => void;
  onCreateRecurringBill: (bill: Omit<RecurringBill, 'id'>) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDismissProjection: (id: string) => void;
  recurringBills: RecurringBill[];
  showProjections: boolean;
  onShowProjectionsChange: (show: boolean) => void;
}

export const TransactionRegister: React.FC<TransactionRegisterProps> = ({
  transactions,
  allTransactions,
  accounts,
  onAddTransaction,
  onDeleteTransaction,
  onDeleteMultipleTransactions,
  onCreateRecurringBill,
  onUpdateTransaction,
  onDismissProjection,
  recurringBills,
  showProjections,
  onShowProjectionsChange,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [linkingTransaction, setLinkingTransaction] = useState<Transaction | null>(null);
  const [editingField, setEditingField] = useState<{id: string; field: 'date' | 'description' | 'category' | 'amount'} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'description' | 'category' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Date range filters
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showProjectionsThru, setShowProjectionsThru] = useState<string>('');

  const handleSort = (field: 'date' | 'description' | 'category' | 'amount') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection(field === 'date' || field === 'amount' ? 'desc' : 'asc');
    }
  };

  // Sort transactions
  const sortedTransactions = [...transactions].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = a.date.getTime() - b.date.getTime();
        // If same date, sort by ID to preserve chronological order
        if (comparison === 0) {
          comparison = a.id.localeCompare(b.id);
        }
        break;
      case 'description':
        comparison = a.description.localeCompare(b.description);
        break;
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
      case 'amount':
        comparison = a.amount - b.amount;
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Filter transactions by search term and date range
  const filteredTransactions = sortedTransactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.category.toLowerCase().includes(searchTerm.toLowerCase());

    // Date range filter
    let matchesDateRange = true;
    const txDate = new Date(t.date);
    txDate.setHours(0, 0, 0, 0);

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      matchesDateRange = matchesDateRange && txDate >= fromDate;
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      matchesDateRange = matchesDateRange && txDate <= toDate;
    }

    // For projected transactions, also check showProjectionsThru date
    if (t.description.includes('(Projected)') && showProjectionsThru) {
      const thruDate = new Date(showProjectionsThru);
      thruDate.setHours(23, 59, 59, 999);
      matchesDateRange = matchesDateRange && txDate <= thruDate;
    }

    return matchesSearch && matchesDateRange;
  });

  const handleToggleReconciled = (transaction: Transaction) => {
    onUpdateTransaction({
      ...transaction,
      isReconciled: !transaction.isReconciled,
      // When marking as reconciled, also mark as not pending
      isPending: transaction.isReconciled ? transaction.isPending : false,
    });
  };

  const hasRecurringBill = (transaction: Transaction): boolean => {
    const cleanDescription = transaction.description.replace(' (Projected)', '');
    return recurringBills.some(bill =>
      bill.description.toLowerCase() === cleanDescription.toLowerCase() ||
      bill.description.toLowerCase().includes(cleanDescription.toLowerCase()) ||
      cleanDescription.toLowerCase().includes(bill.description.toLowerCase())
    );
  };

  const handleToggleProjectedVisibility = (transaction: Transaction) => {
    onUpdateTransaction({
      ...transaction,
      isProjectedVisible: !(transaction.isProjectedVisible !== false), // Toggle: true -> false, undefined/false -> true
    });
  };

  const handleStartEdit = (transaction: Transaction, field: 'date' | 'description' | 'category' | 'amount') => {
    if (transaction.isReconciled) return; // Can't edit reconciled transactions

    setEditingField({ id: transaction.id, field });

    switch (field) {
      case 'date':
        setEditValue(formatDateForInput(transaction.date));
        break;
      case 'description':
        setEditValue(transaction.description);
        break;
      case 'category':
        setEditValue(transaction.category);
        break;
      case 'amount':
        setEditValue(Math.abs(transaction.amount).toString());
        break;
    }
  };

  const handleSaveEdit = (transaction: Transaction) => {
    if (!editingField) return;

    const updates: Partial<Transaction> = {};

    switch (editingField.field) {
      case 'date': {
        const newDate = parseDate(editValue);
        if (!isNaN(newDate.getTime())) {
          updates.date = newDate;
        }
        break;
      }
      case 'description':
        if (editValue.trim()) {
          updates.description = editValue.trim();
        }
        break;
      case 'category':
        if (editValue.trim()) {
          updates.category = editValue.trim();
        }
        break;
      case 'amount': {
        const newAmount = parseFloat(editValue);
        if (!isNaN(newAmount)) {
          // Preserve the sign (debit/credit)
          updates.amount = transaction.amount < 0 ? -Math.abs(newAmount) : Math.abs(newAmount);
        }
        break;
      }
    }

    if (Object.keys(updates).length > 0) {
      onUpdateTransaction({
        ...transaction,
        ...updates,
      });
    }

    setEditingField(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleMarkAsProcessed = (transaction: Transaction) => {
    // Remove "(Projected)" from description and mark as pending instead of projected
    const newDescription = transaction.description.replace(' (Projected)', '');

    // If this is a projected transaction (ID starts with 'proj-'), we need to add it as a new transaction
    if (transaction.id.startsWith('proj-')) {
      onAddTransaction({
        date: transaction.date,
        description: newDescription,
        category: transaction.category,
        amount: transaction.amount,
        balance: transaction.balance,
        isPending: true,
        isManual: true, // Mark as manual since user is manually processing it
      });
      // Dismiss the projected transaction so it doesn't show up anymore
      onDismissProjection(transaction.id);
    } else {
      // Otherwise just update the existing transaction
      onUpdateTransaction({
        ...transaction,
        description: newDescription,
        isPending: true,
      });
    }
  };

  const handleLinkTransaction = (linkedTransactionId: string) => {
    if (!linkingTransaction) return;

    // Update both transactions to link to each other
    onUpdateTransaction({
      ...linkingTransaction,
      linkedTransactionId,
    });

    // Find and update the linked transaction
    const linkedTx = allTransactions?.find(t => t.id === linkedTransactionId);
    if (linkedTx) {
      onUpdateTransaction({
        ...linkedTx,
        linkedTransactionId: linkingTransaction.id,
      });
    }

    setLinkingTransaction(null);
  };

  const handleCreateAndLinkTransaction = (targetAccountId: string) => {
    if (!linkingTransaction) return;

    // Create a new transaction in the target account with opposite amount
    const newTransactionId = `link-${Date.now()}`;
    onAddTransaction({
      accountId: targetAccountId,
      date: linkingTransaction.date,
      description: linkingTransaction.description,
      category: linkingTransaction.category,
      amount: -linkingTransaction.amount, // Opposite sign (payment out becomes payment in)
      balance: 0,
      isPending: true, // Mark as pending since it hasn't posted yet
      isManual: true,
      linkedTransactionId: linkingTransaction.id,
    });

    // Update the original transaction to link to the new one
    onUpdateTransaction({
      ...linkingTransaction,
      linkedTransactionId: newTransactionId,
    });

    setLinkingTransaction(null);
  };

  const handleToggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;

    const selectedTransactions = filteredTransactions.filter(t => selectedIds.has(t.id));
    const count = selectedIds.size;
    const totalAmount = selectedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (confirm(`Are you sure you want to permanently remove ${count} selected transaction${count > 1 ? 's' : ''}?\n\nTotal: $${totalAmount.toFixed(2)}\n\nThis action cannot be undone.`)) {
      onDeleteMultipleTransactions(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Transaction History</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-1.5 rounded-lg border border-gray-600">
            <input
              type="checkbox"
              id="showProjectionsRegister"
              checked={showProjections}
              onChange={(e) => onShowProjectionsChange(e.target.checked)}
              className="h-4 w-4 text-blue-500 rounded bg-gray-700 border-gray-600"
            />
            <label htmlFor="showProjectionsRegister" className="text-gray-300 text-sm font-medium cursor-pointer whitespace-nowrap">
              Show Projected
            </label>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg font-medium"
          >
            + Add Transaction
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by Description or Category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="flex gap-2 items-center bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">
          <span className="text-xs text-gray-400 whitespace-nowrap">From:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
          />
          <span className="text-xs text-gray-400 whitespace-nowrap">To:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
          />
          <span className="text-xs text-gray-400 whitespace-nowrap ml-4">Show Projections Thru:</span>
          <input
            type="date"
            value={showProjectionsThru}
            onChange={(e) => setShowProjectionsThru(e.target.value)}
            className="px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
          />
          {(dateFrom || dateTo || showProjectionsThru) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setShowProjectionsThru('');
              }}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              title="Clear date filters"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto bg-gray-800 rounded-xl shadow-xl border border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-900/50 border-b border-gray-700">
            <tr>
              <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === filteredTransactions.length}
                  onChange={handleToggleAll}
                  className="h-4 w-4 text-blue-500 rounded bg-gray-700 border-gray-600"
                  title="Select all"
                />
              </th>
              <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                <span title="Reconciled">✓</span>
              </th>
              <th
                className="px-3 py-2 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30 select-none"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1">
                  Date
                  {sortBy === 'date' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </div>
              </th>
              <th
                className="px-3 py-2 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30 select-none"
                onClick={() => handleSort('description')}
              >
                <div className="flex items-center gap-1">
                  Description
                  {sortBy === 'description' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </div>
              </th>
              <th
                className="px-3 py-2 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30 select-none"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-1">
                  Category
                  {sortBy === 'category' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </div>
              </th>
              <th
                className="px-3 py-2 text-right text-[10px] font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30 select-none"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center gap-1 justify-end">
                  Amount
                  {sortBy === 'amount' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </div>
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-300 uppercase tracking-wider">Balance</th>
              <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                {selectedIds.size > 0 ? (
                  <button
                    onClick={handleDeleteSelected}
                    className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-xs"
                    title={`Remove ${selectedIds.size} selected transaction${selectedIds.size > 1 ? 's' : ''}`}
                  >
                    Remove Checked ({selectedIds.size})
                  </button>
                ) : (
                  'Actions'
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No transactions found. Import a CSV or add a manual transaction.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className={`hover:bg-gray-700/30 transition-colors ${transaction.isReconciled ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(transaction.id)}
                      onChange={() => handleToggleSelection(transaction.id)}
                      disabled={transaction.description.includes('(Projected)')}
                      className="h-4 w-4 text-blue-500 rounded bg-gray-700 border-gray-600 disabled:opacity-50"
                      title={transaction.description.includes('(Projected)') ? 'Cannot select projected transactions' : 'Select this transaction'}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
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
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-white">
                    {editingField?.id === transaction.id && editingField.field === 'date' && !transaction.isReconciled ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(transaction);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(transaction)}
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => !transaction.isReconciled && handleStartEdit(transaction, 'date')}
                        className={`text-left w-full ${!transaction.isReconciled ? 'hover:bg-gray-700/50 rounded px-2 py-1 cursor-pointer' : 'cursor-default px-2 py-1'}`}
                        disabled={transaction.isReconciled}
                        title={transaction.isReconciled ? 'Cannot edit reconciled transaction' : 'Click to edit date'}
                      >
                        {transaction.date.toLocaleDateString()}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-white">
                    <div className="flex items-center gap-2">
                      {editingField?.id === transaction.id && editingField.field === 'description' && !transaction.isReconciled ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(transaction);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(transaction)}
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => !transaction.isReconciled && handleStartEdit(transaction, 'description')}
                          className={`text-left flex-1 ${!transaction.isReconciled ? 'hover:bg-gray-700/50 rounded px-2 py-1 cursor-pointer' : 'cursor-default px-2 py-1'}`}
                          disabled={transaction.isReconciled}
                          title={transaction.isReconciled ? 'Cannot edit reconciled transaction' : 'Click to edit description'}
                        >
                          {transaction.description}
                        </button>
                      )}
                      {transaction.isReconciled && (
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-300 rounded-lg border border-green-500/30 opacity-100">
                          Reconciled
                        </span>
                      )}
                      {transaction.description.includes('(Projected)') ? (
                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/30">
                          Projected
                        </span>
                      ) : transaction.isPending && !transaction.isReconciled ? (
                        <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-300 rounded-lg border border-yellow-500/30">
                          Pending
                        </span>
                      ) : transaction.isPosted && !transaction.isReconciled ? (
                        <span className="px-2 py-0.5 text-xs bg-white/90 text-green-600 rounded-lg border border-green-500/30 font-medium">
                          Posted
                        </span>
                      ) : null}
                      {transaction.isManual && !transaction.description.includes('(Projected)') && (
                        <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30">
                          Manual
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                    {editingField?.id === transaction.id && editingField.field === 'category' && !transaction.isReconciled ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(transaction);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(transaction)}
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => !transaction.isReconciled && handleStartEdit(transaction, 'category')}
                        className={`text-left w-full ${!transaction.isReconciled ? 'hover:bg-gray-700/50 rounded px-2 py-1 cursor-pointer' : 'cursor-default px-2 py-1'}`}
                        disabled={transaction.isReconciled}
                        title={transaction.isReconciled ? 'Cannot edit reconciled transaction' : 'Click to edit category'}
                      >
                        {transaction.category}
                      </button>
                    )}
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap text-xs text-right font-semibold ${
                    transaction.amount < 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {editingField?.id === transaction.id && editingField.field === 'amount' && !transaction.isReconciled ? (
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-gray-300">{transaction.amount < 0 ? '-' : ''}$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(transaction);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-right"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(transaction)}
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => !transaction.isReconciled && handleStartEdit(transaction, 'amount')}
                        className={`text-right w-full ${!transaction.isReconciled ? 'hover:bg-gray-700/50 rounded px-2 py-1 cursor-pointer' : 'cursor-default'}`}
                        disabled={transaction.isReconciled}
                        title={transaction.isReconciled ? 'Cannot edit reconciled transaction' : 'Click to edit amount'}
                      >
                        {transaction.amount < 0 ? '-' : ''}${Math.abs(transaction.amount).toFixed(2)}
                      </button>
                    )}
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm text-right font-semibold ${
                    transaction.balance < 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    ${transaction.balance.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center text-sm">
                    <div className="flex gap-2 justify-center items-center">
                      {transaction.description.includes('(Projected)') ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Include:</span>
                            <button
                              onClick={() => handleToggleProjectedVisibility(transaction)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                transaction.isProjectedVisible !== false ? 'bg-blue-500' : 'bg-gray-600'
                              }`}
                              title={transaction.isProjectedVisible !== false ? 'Included in balance' : 'Excluded from balance'}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                transaction.isProjectedVisible !== false ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          </div>
                          <button
                            onClick={() => handleMarkAsProcessed(transaction)}
                            className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-xs"
                          >
                            Mark as Processed
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Dismiss this projected transaction?\n\n${transaction.description}\n${transaction.amount < 0 ? '-' : ''}$${Math.abs(transaction.amount).toFixed(2)}\n\nIt will not appear again.`)) {
                                onDismissProjection(transaction.id);
                              }
                            }}
                            className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-xs"
                            title="Dismiss this projection"
                          >
                            Dismiss
                          </button>
                        </>
                      ) : (
                        <>
                          {!hasRecurringBill(transaction) && (
                            <button
                              onClick={() => setSelectedTransaction(transaction)}
                              className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-xs"
                            >
                              Make Recurring
                            </button>
                          )}
                          {accounts && accounts.length > 1 && allTransactions && (
                            <button
                              onClick={() => setLinkingTransaction(transaction)}
                              className="px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium text-xs"
                              title="Link to transaction in another account"
                            >
                              Link
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to permanently remove this transaction?\n\n${transaction.description}\n${transaction.amount < 0 ? '-' : ''}$${Math.abs(transaction.amount).toFixed(2)}\n\nThis action cannot be undone.`)) {
                                onDeleteTransaction(transaction.id);
                              }
                            }}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-xs"
                            title="Permanently remove this transaction"
                          >
                            Remove
                          </button>
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

      {/* Transaction Link Modal */}
      {linkingTransaction && accounts && allTransactions && (
        <TransactionLinkModal
          transaction={linkingTransaction}
          allTransactions={allTransactions}
          accounts={accounts}
          onLink={handleLinkTransaction}
          onCreateAndLink={handleCreateAndLinkTransaction}
          onClose={() => setLinkingTransaction(null)}
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
      nextDueDate: new Date(formData.nextDueDate + 'T00:00:00'), // Force local timezone
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
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {(formData.frequency === 'monthly' || formData.frequency === 'quarterly') && (
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
