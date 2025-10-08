import { useState } from 'react';
import type { Debt } from '../types';

interface DebtsTrackerProps {
  debts: Debt[];
  onAddDebt: (debt: Omit<Debt, 'id'>) => void;
  onUpdateDebt: (debt: Debt) => void;
  onDeleteDebt: (id: string) => void;
}

export const DebtsTracker: React.FC<DebtsTrackerProps> = ({
  debts,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  const totalDebt = debts.reduce((sum, debt) => sum + debt.currentBalance, 0);
  const totalMinimumPayment = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  const weightedInterestRate = debts.length > 0
    ? debts.reduce((sum, debt) => sum + (debt.interestRate * debt.currentBalance), 0) / totalDebt
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Debts & Credit Cards</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Debt
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-lg p-6 border border-red-200">
          <h3 className="text-sm font-medium text-red-900 mb-2">Total Debt</h3>
          <p className="text-3xl font-bold text-red-600">${totalDebt.toFixed(2)}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
          <h3 className="text-sm font-medium text-orange-900 mb-2">Total Min. Payment</h3>
          <p className="text-3xl font-bold text-orange-600">${totalMinimumPayment.toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
          <h3 className="text-sm font-medium text-purple-900 mb-2">Avg. Interest Rate</h3>
          <p className="text-3xl font-bold text-purple-600">
            {isNaN(weightedInterestRate) ? '0.00' : weightedInterestRate.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Debts List */}
      {debts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No debts tracked. Add one to start managing your debt.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {debts.map(debt => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onEdit={() => setEditingDebt(debt)}
              onDelete={() => onDeleteDebt(debt.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingDebt) && (
        <DebtForm
          debt={editingDebt}
          onSave={(debt) => {
            if (editingDebt) {
              onUpdateDebt({ ...debt, id: editingDebt.id });
              setEditingDebt(null);
            } else {
              onAddDebt(debt);
              setShowAddForm(false);
            }
          }}
          onCancel={() => {
            setShowAddForm(false);
            setEditingDebt(null);
          }}
        />
      )}
    </div>
  );
};

// Debt Card Component
interface DebtCardProps {
  debt: Debt;
  onEdit: () => void;
  onDelete: () => void;
}

const DebtCard: React.FC<DebtCardProps> = ({ debt, onEdit, onDelete }) => {
  const getTypeLabel = (type: Debt['type']) => {
    const labels: Record<Debt['type'], string> = {
      credit_card: 'Credit Card',
      loan: 'Loan',
      mortgage: 'Mortgage',
      student_loan: 'Student Loan',
      other: 'Other',
    };
    return labels[type];
  };

  const getTypeColor = (type: Debt['type']) => {
    const colors: Record<Debt['type'], string> = {
      credit_card: 'bg-red-100 text-red-800',
      loan: 'bg-orange-100 text-orange-800',
      mortgage: 'bg-blue-100 text-blue-800',
      student_loan: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type];
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{debt.name}</h3>
          <span className={`inline-block px-2 py-1 text-xs rounded mt-2 ${getTypeColor(debt.type)}`}>
            {getTypeLabel(debt.type)}
          </span>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Current Balance</p>
          <p className="text-3xl font-bold text-red-600">${debt.currentBalance.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Interest Rate</p>
          <p className="text-lg font-semibold text-gray-900">{debt.interestRate.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Min. Payment</p>
          <p className="text-lg font-semibold text-gray-900">${debt.minimumPayment.toFixed(2)}</p>
        </div>
        {debt.dueDate && (
          <div>
            <p className="text-sm text-gray-600">Due Day</p>
            <p className="text-lg font-semibold text-gray-900">{debt.dueDate}</p>
          </div>
        )}
        {debt.institution && (
          <div>
            <p className="text-sm text-gray-600">Institution</p>
            <p className="text-lg font-semibold text-gray-900">{debt.institution}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => {
            if (confirm(`Are you sure you want to delete ${debt.name}?`)) {
              onDelete();
            }
          }}
          className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

// Debt Form Component
interface DebtFormProps {
  debt: Debt | null;
  onSave: (debt: Omit<Debt, 'id'>) => void;
  onCancel: () => void;
}

const DebtForm: React.FC<DebtFormProps> = ({ debt, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: debt?.name || '',
    type: debt?.type || 'credit_card' as Debt['type'],
    currentBalance: debt?.currentBalance.toString() || '',
    interestRate: debt?.interestRate.toString() || '',
    minimumPayment: debt?.minimumPayment.toString() || '',
    dueDate: debt?.dueDate?.toString() || '',
    institution: debt?.institution || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      name: formData.name,
      type: formData.type,
      currentBalance: parseFloat(formData.currentBalance),
      interestRate: parseFloat(formData.interestRate),
      minimumPayment: parseFloat(formData.minimumPayment),
      dueDate: formData.dueDate ? parseInt(formData.dueDate) : undefined,
      institution: formData.institution || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {debt ? 'Edit' : 'Add'} Debt
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Chase Freedom"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as Debt['type'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="credit_card">Credit Card</option>
              <option value="loan">Loan</option>
              <option value="mortgage">Mortgage</option>
              <option value="student_loan">Student Loan</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance</label>
            <input
              type="number"
              step="0.01"
              value={formData.currentBalance}
              onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="5000.00"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.interestRate}
                onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="18.99"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min. Payment</label>
              <input
                type="number"
                step="0.01"
                value={formData.minimumPayment}
                onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="100.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Day (1-31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Chase"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {debt ? 'Update' : 'Add'} Debt
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
