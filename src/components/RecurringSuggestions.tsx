import { useState, useEffect } from 'react';
import type { Transaction, RecurringBill } from '../types';
import { detectRecurringBills } from '../utils/recurringDetection';

interface RecurringSuggestionsProps {
  transactions: Transaction[];
  existingBills: RecurringBill[];
  onAddBill: (bill: Omit<RecurringBill, 'id'>) => void;
}

interface RecurringSuggestion {
  description: string;
  category: string;
  averageAmount: number;
  frequency: RecurringBill['frequency'];
  occurrences: Transaction[];
  confidence: number;
  suggestedNextDate: Date;
}

export const RecurringSuggestions: React.FC<RecurringSuggestionsProps> = ({
  transactions,
  existingBills,
  onAddBill,
}) => {
  const [suggestions, setSuggestions] = useState<RecurringSuggestion[]>([]);
  const [editingSuggestion, setEditingSuggestion] = useState<RecurringSuggestion | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const detected = detectRecurringBills(transactions);

    // Filter out suggestions that match existing bills or have been dismissed
    const filtered = detected.filter(s => {
      const isDismissed = dismissed.has(s.description);
      const alreadyExists = existingBills.some(
        b => b.description.toLowerCase().includes(s.description.toLowerCase()) ||
             s.description.toLowerCase().includes(b.description.toLowerCase())
      );
      return !isDismissed && !alreadyExists;
    });

    setSuggestions(filtered);
  }, [transactions, existingBills, dismissed]);

  const handleDismiss = (description: string) => {
    setDismissed(new Set([...dismissed, description]));
  };

  if (suggestions.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
        <p className="text-gray-400 text-center">
          No recurring bill suggestions found. Import more transactions to detect patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Suggested Recurring Bills</h3>
        <span className="text-sm text-gray-400">{suggestions.length} suggestions</span>
      </div>

      <div className="grid gap-4">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard
            key={index}
            suggestion={suggestion}
            onAdd={() => setEditingSuggestion(suggestion)}
            onDismiss={() => handleDismiss(suggestion.description)}
          />
        ))}
      </div>

      {editingSuggestion && (
        <EditSuggestionModal
          suggestion={editingSuggestion}
          onSave={(bill) => {
            onAddBill(bill);
            setEditingSuggestion(null);
            handleDismiss(editingSuggestion.description);
          }}
          onCancel={() => setEditingSuggestion(null)}
        />
      )}
    </div>
  );
};

interface SuggestionCardProps {
  suggestion: RecurringSuggestion;
  onAdd: () => void;
  onDismiss: () => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onAdd, onDismiss }) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const isIncome = suggestion.averageAmount > 0;

  return (
    <div className={`bg-gray-800/80 rounded-2xl p-5 border transition-all ${
      isIncome
        ? 'border-green-500/30 hover:border-green-500/50'
        : 'border-red-500/30 hover:border-red-500/50'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-white text-lg">{suggestion.description}</h4>
            <span className={`px-2 py-0.5 text-xs rounded-lg font-medium ${
              isIncome
                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              {isIncome ? 'Income' : 'Expense'}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">{suggestion.category}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
            {isIncome ? '+' : ''}${Math.abs(suggestion.averageAmount).toFixed(2)}
          </p>
          <p className={`text-xs font-medium mt-1 ${getConfidenceColor(suggestion.confidence)}`}>
            {suggestion.confidence}% confidence
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
        <span className="capitalize">{suggestion.frequency}</span>
        <span>•</span>
        <span>{suggestion.occurrences.length} occurrences</span>
        <span>•</span>
        <span>Next: {suggestion.suggestedNextDate.toLocaleDateString()}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onAdd}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all font-medium"
        >
          Add to Recurring Bills
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-all"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

interface EditSuggestionModalProps {
  suggestion: RecurringSuggestion;
  onSave: (bill: Omit<RecurringBill, 'id'>) => void;
  onCancel: () => void;
}

const EditSuggestionModal: React.FC<EditSuggestionModalProps> = ({ suggestion, onSave, onCancel }) => {
  const isIncome = suggestion.averageAmount > 0;

  const [formData, setFormData] = useState({
    description: suggestion.description,
    category: suggestion.category,
    amount: Math.abs(suggestion.averageAmount).toString(),
    isIncome: isIncome,
    frequency: suggestion.frequency,
    nextDueDate: suggestion.suggestedNextDate.toISOString().split('T')[0],
    dayOfMonth: suggestion.frequency === 'monthly' ? suggestion.suggestedNextDate.getDate().toString() : '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    // Keep income positive, make expenses negative
    const finalAmount = formData.isIncome ? Math.abs(amount) : -Math.abs(amount);

    onSave({
      description: formData.description,
      category: formData.category,
      amount: finalAmount,
      frequency: formData.frequency,
      dayOfMonth: formData.dayOfMonth ? parseInt(formData.dayOfMonth) : undefined,
      nextDueDate: new Date(formData.nextDueDate + 'T00:00:00'), // Force local timezone
      isActive: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-3xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">Review Recurring Bill</h3>

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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
              <select
                value={formData.isIncome ? 'income' : 'expense'}
                onChange={(e) => setFormData({ ...formData, isIncome: e.target.value === 'income' })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

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

          {formData.frequency === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Day of Month (1-31)
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

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all font-medium"
            >
              Add Bill
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
