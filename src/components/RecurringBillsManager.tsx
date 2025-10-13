import { useState } from 'react';
import type { RecurringBill } from '../types';

interface RecurringBillsManagerProps {
  bills: RecurringBill[];
  onAddBill: (bill: Omit<RecurringBill, 'id'>) => void;
  onUpdateBill: (bill: RecurringBill) => void;
  onDeleteBill: (id: string) => void;
}

type SortField = 'description' | 'amount' | 'frequency' | 'nextDueDate' | 'dayOfMonth';
type SortDirection = 'asc' | 'desc';

export const RecurringBillsManager: React.FC<RecurringBillsManagerProps> = ({
  bills,
  onAddBill,
  onUpdateBill,
  onDeleteBill,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [sortField, setSortField] = useState<SortField>('nextDueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showInactive, setShowInactive] = useState(false);

  const activeBills = bills.filter(b => b.isActive);
  const inactiveBills = bills.filter(b => !b.isActive);
  const displayBills = showInactive ? [...activeBills, ...inactiveBills] : activeBills;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedBills = [...displayBills].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'description':
        comparison = a.description.localeCompare(b.description);
        break;
      case 'amount':
        comparison = Math.abs(a.amount) - Math.abs(b.amount);
        break;
      case 'frequency':
        const freqOrder = { weekly: 1, biweekly: 2, monthly: 3, quarterly: 4, yearly: 5 };
        comparison = freqOrder[a.frequency] - freqOrder[b.frequency];
        break;
      case 'nextDueDate':
        const aTime = a.nextDueDate instanceof Date ? a.nextDueDate.getTime() : 0;
        const bTime = b.nextDueDate instanceof Date ? b.nextDueDate.getTime() : 0;
        comparison = aTime - bTime;
        break;
      case 'dayOfMonth':
        const aDay = a.dayOfMonth || 999;
        const bDay = b.dayOfMonth || 999;
        comparison = aDay - bDay;
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-500">⇅</span>;
    return <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Recurring Bills</h2>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-gray-300">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 text-blue-500 rounded bg-gray-700 border-gray-600"
            />
            Show Inactive
          </label>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-medium"
          >
            + Add Recurring Bill
          </button>
        </div>
      </div>

      {/* Bills Table */}
      {sortedBills.length === 0 ? (
        <div className="bg-gray-800/50 rounded-2xl p-12 border border-gray-700 text-center">
          <p className="text-gray-400">No recurring bills. Add one to see projections.</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('description')}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                    >
                      Description <SortIcon field="description" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('amount')}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                    >
                      Amount <SortIcon field="amount" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('frequency')}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                    >
                      Frequency <SortIcon field="frequency" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('nextDueDate')}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                    >
                      Next Due <SortIcon field="nextDueDate" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('dayOfMonth')}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                    >
                      Day/Schedule <SortIcon field="dayOfMonth" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-sm font-semibold text-gray-300">Category</span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-sm font-semibold text-gray-300">Status</span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-gray-300">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sortedBills.map(bill => (
                  <BillRow
                    key={bill.id}
                    bill={bill}
                    onEdit={() => setEditingBill(bill)}
                    onToggleActive={() => onUpdateBill({ ...bill, isActive: !bill.isActive })}
                    onDelete={() => {
                      if (confirm('Are you sure you want to delete this recurring bill?')) {
                        onDeleteBill(bill.id);
                      }
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingBill) && (
        <BillForm
          bill={editingBill}
          onSave={(bill) => {
            if (editingBill) {
              onUpdateBill({
                ...bill,
                id: editingBill.id,
                accountId: editingBill.accountId, // Preserve accountId
              });
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

// Bill Row Component
interface BillRowProps {
  bill: RecurringBill;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

const BillRow: React.FC<BillRowProps> = ({ bill, onEdit, onToggleActive, onDelete }) => {
  const formatFrequency = (freq: RecurringBill['frequency']) => {
    return freq.charAt(0).toUpperCase() + freq.slice(1);
  };

  const formatWeekOfMonth = (week?: number) => {
    if (!week) return '';
    const weekNames = ['', '1st', '2nd', '3rd', '4th', 'Last'];
    return weekNames[week] || '';
  };

  const formatDayOfWeek = (day?: number) => {
    if (day === undefined) return '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames[day] || '';
  };

  const getDaySchedule = () => {
    if (bill.weekOfMonth && bill.dayOfWeek !== undefined) {
      return `${formatWeekOfMonth(bill.weekOfMonth)} ${formatDayOfWeek(bill.dayOfWeek)}`;
    }
    if (bill.dayOfMonth) {
      return `Day ${bill.dayOfMonth}`;
    }
    return '-';
  };

  return (
    <tr className={`hover:bg-gray-700/30 transition-colors ${!bill.isActive ? 'opacity-60' : ''}`}>
      <td className="px-4 py-3">
        <span className="text-white font-medium">{bill.description}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`font-semibold ${
          bill.amount < 0 ? 'text-red-400' : 'text-green-400'
        }`}>
          {bill.amount < 0 ? '-' : '+'}${Math.abs(bill.amount).toFixed(2)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-gray-300">{formatFrequency(bill.frequency)}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-gray-300">
          {bill.nextDueDate instanceof Date && !isNaN(bill.nextDueDate.getTime())
            ? bill.nextDueDate.toLocaleDateString()
            : 'Invalid Date'}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-gray-300">{getDaySchedule()}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-gray-400 text-sm">{bill.category}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
          bill.isActive
            ? 'bg-green-500/20 text-green-400'
            : 'bg-gray-500/20 text-gray-400'
        }`}>
          {bill.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <button
            onClick={onEdit}
            className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
            title="Edit"
          >
            Edit
          </button>
          <button
            onClick={onToggleActive}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              bill.isActive
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
            title={bill.isActive ? 'Pause' : 'Activate'}
          >
            {bill.isActive ? 'Pause' : 'Activate'}
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
            title="Delete"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
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
    weekOfMonth: bill?.weekOfMonth?.toString() || '',
    monthlyType: bill?.weekOfMonth ? 'weekday' : 'dayOfMonth',
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
      dayOfMonth: formData.monthlyType === 'dayOfMonth' && formData.dayOfMonth ? parseInt(formData.dayOfMonth) : undefined,
      dayOfWeek: formData.monthlyType === 'weekday' && formData.dayOfWeek ? parseInt(formData.dayOfWeek) : (formData.frequency === 'weekly' && formData.dayOfWeek ? parseInt(formData.dayOfWeek) : undefined),
      weekOfMonth: formData.monthlyType === 'weekday' && formData.weekOfMonth ? parseInt(formData.weekOfMonth) : undefined,
      nextDueDate: new Date(formData.nextDueDate + 'T00:00:00'), // Force local timezone
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
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {(formData.frequency === 'monthly' || formData.frequency === 'quarterly') && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="dayOfMonth"
                      checked={formData.monthlyType === 'dayOfMonth'}
                      onChange={(e) => setFormData({ ...formData, monthlyType: e.target.value as 'dayOfMonth' | 'weekday' })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Specific day of month (e.g., 15th)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="weekday"
                      checked={formData.monthlyType === 'weekday'}
                      onChange={(e) => setFormData({ ...formData, monthlyType: e.target.value as 'dayOfMonth' | 'weekday' })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Specific weekday (e.g., 2nd Wednesday)</span>
                  </label>
                </div>
              </div>

              {formData.monthlyType === 'dayOfMonth' && (
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

              {formData.monthlyType === 'weekday' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
                    <select
                      value={formData.weekOfMonth}
                      onChange={(e) => setFormData({ ...formData, weekOfMonth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required={formData.monthlyType === 'weekday'}
                    >
                      <option value="">Select week</option>
                      <option value="1">1st</option>
                      <option value="2">2nd</option>
                      <option value="3">3rd</option>
                      <option value="4">4th</option>
                      <option value="5">Last</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                    <select
                      value={formData.dayOfWeek}
                      onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required={formData.monthlyType === 'weekday'}
                    >
                      <option value="">Select day</option>
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  </div>
                </div>
              )}
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
