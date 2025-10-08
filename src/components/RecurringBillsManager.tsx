import { useState } from 'react';
import type { RecurringBill } from '../types';

interface RecurringBillsManagerProps {
  bills: RecurringBill[];
  onAddBill: (bill: Omit<RecurringBill, 'id'>) => void;
  onUpdateBill: (bill: RecurringBill) => void;
  onDeleteBill: (id: string) => void;
}

export const RecurringBillsManager: React.FC<RecurringBillsManagerProps> = ({
  bills,
  onAddBill,
  onUpdateBill,
  onDeleteBill,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);

  const activeBills = bills.filter(b => b.isActive);
  const inactiveBills = bills.filter(b => !b.isActive);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Recurring Bills</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Recurring Bill
        </button>
      </div>

      {/* Active Bills */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Active Bills</h3>
        {activeBills.length === 0 ? (
          <p className="text-gray-500">No active recurring bills. Add one to see projections.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeBills.map(bill => (
              <BillCard
                key={bill.id}
                bill={bill}
                onEdit={() => setEditingBill(bill)}
                onToggleActive={() => onUpdateBill({ ...bill, isActive: false })}
                onDelete={() => onDeleteBill(bill.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive Bills */}
      {inactiveBills.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-500 mb-3">Inactive Bills</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inactiveBills.map(bill => (
              <BillCard
                key={bill.id}
                bill={bill}
                onEdit={() => setEditingBill(bill)}
                onToggleActive={() => onUpdateBill({ ...bill, isActive: true })}
                onDelete={() => onDeleteBill(bill.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingBill) && (
        <BillForm
          bill={editingBill}
          onSave={(bill) => {
            if (editingBill) {
              onUpdateBill({ ...bill, id: editingBill.id });
              setEditingBill(null);
            } else {
              onAddBill(bill);
              setShowAddForm(false);
            }
          }}
          onCancel={() => {
            setShowAddForm(false);
            setEditingBill(null);
          }}
        />
      )}
    </div>
  );
};

// Bill Card Component
interface BillCardProps {
  bill: RecurringBill;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

const BillCard: React.FC<BillCardProps> = ({ bill, onEdit, onToggleActive, onDelete }) => {
  const formatFrequency = (freq: RecurringBill['frequency']) => {
    return freq.charAt(0).toUpperCase() + freq.slice(1);
  };

  return (
    <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${
      bill.isActive ? 'border-blue-500' : 'border-gray-300'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-900">{bill.description}</h4>
        <span className={`text-2xl font-bold ${
          bill.amount < 0 ? 'text-red-600' : 'text-green-600'
        }`}>
          ${Math.abs(bill.amount).toFixed(2)}
        </span>
      </div>

      <div className="space-y-1 text-sm text-gray-600 mb-3">
        <p>Category: {bill.category}</p>
        <p>Frequency: {formatFrequency(bill.frequency)}</p>
        <p>Next Due: {bill.nextDueDate.toLocaleDateString()}</p>
        {bill.dayOfMonth && <p>Day of Month: {bill.dayOfMonth}</p>}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onToggleActive}
          className={`flex-1 px-3 py-1 text-sm rounded transition-colors ${
            bill.isActive
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {bill.isActive ? 'Pause' : 'Activate'}
        </button>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to delete this recurring bill?')) {
              onDelete();
            }
          }}
          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

// Bill Form Component
interface BillFormProps {
  bill: RecurringBill | null;
  onSave: (bill: Omit<RecurringBill, 'id'>) => void;
  onCancel: () => void;
}

const BillForm: React.FC<BillFormProps> = ({ bill, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    description: bill?.description || '',
    category: bill?.category || '',
    amount: bill ? Math.abs(bill.amount).toString() : '',
    isExpense: bill ? bill.amount < 0 : true,
    frequency: bill?.frequency || 'monthly' as RecurringBill['frequency'],
    dayOfMonth: bill?.dayOfMonth?.toString() || '',
    dayOfWeek: bill?.dayOfWeek?.toString() || '',
    nextDueDate: bill?.nextDueDate
      ? bill.nextDueDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount) * (formData.isExpense ? -1 : 1);

    onSave({
      description: formData.description,
      category: formData.category,
      amount,
      frequency: formData.frequency,
      dayOfMonth: formData.dayOfMonth ? parseInt(formData.dayOfMonth) : undefined,
      dayOfWeek: formData.dayOfWeek ? parseInt(formData.dayOfWeek) : undefined,
      nextDueDate: new Date(formData.nextDueDate),
      isActive: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {bill ? 'Edit' : 'Add'} Recurring Bill
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Electric Bill"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Utilities"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="100.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.isExpense ? 'expense' : 'income'}
                onChange={(e) => setFormData({ ...formData, isExpense: e.target.value === 'expense' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as RecurringBill['frequency'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {formData.frequency === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Day of Month (1-31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dayOfMonth}
                onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="15"
              />
            </div>
          )}

          {formData.frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Day of Week
              </label>
              <select
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a day</option>
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date</label>
            <input
              type="date"
              value={formData.nextDueDate}
              onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {bill ? 'Update' : 'Add'} Bill
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
