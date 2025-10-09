import { useState } from 'react';
import type { Account } from '../types';

interface AccountManagementProps {
  accounts: Account[];
  onAddAccount: (account: Omit<Account, 'id'>) => void;
  onUpdateAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  onClose: () => void;
}

export const AccountManagement: React.FC<AccountManagementProps> = ({
  accounts,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onClose,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    accountType: 'checking' as Account['accountType'],
    accountNumber: '',
    routingNumber: '',
    institution: '',
    availableBalance: 0,
    creditLimit: undefined as number | undefined,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      accountType: 'checking',
      accountNumber: '',
      routingNumber: '',
      institution: '',
      availableBalance: 0,
      creditLimit: undefined,
    });
    setEditingAccount(null);
    setShowAddForm(false);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      accountType: account.accountType,
      accountNumber: account.accountNumber,
      routingNumber: account.routingNumber || '',
      institution: account.institution,
      availableBalance: account.availableBalance,
      creditLimit: account.creditLimit,
    });
    setShowAddForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingAccount) {
      onUpdateAccount({
        ...editingAccount,
        ...formData,
        routingNumber: formData.accountType === 'credit_card' ? undefined : formData.routingNumber,
        creditLimit: formData.accountType === 'credit_card' ? formData.creditLimit : undefined,
      });
    } else {
      onAddAccount({
        ...formData,
        routingNumber: formData.accountType === 'credit_card' ? undefined : formData.routingNumber,
        creditLimit: formData.accountType === 'credit_card' ? formData.creditLimit : undefined,
      });
    }

    resetForm();
  };

  const getAccountTypeLabel = (type: Account['accountType']) => {
    switch (type) {
      case 'checking': return 'Checking';
      case 'savings': return 'Savings';
      case 'credit_card': return 'Credit Card';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-3xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Manage Accounts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Account List */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Your Accounts</h3>
          <div className="space-y-3">
            {accounts.map(account => (
              <div
                key={account.id}
                className="bg-gray-700/50 rounded-2xl p-4 flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="text-white font-semibold">{account.name}</h4>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs">
                      {getAccountTypeLabel(account.accountType)}
                    </span>
                    {account.isDefault && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-lg text-xs">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {account.institution} •••• {account.accountNumber.slice(-4)}
                  </div>
                  <div className="text-lg font-semibold text-white mt-2">
                    ${account.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    {account.accountType === 'credit_card' && account.creditLimit && (
                      <span className="text-sm text-gray-400 ml-2">
                        / ${account.creditLimit.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(account)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  {accounts.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${account.name}? This will remove all transactions for this account.`)) {
                          onDeleteAccount(account.id);
                        }
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add/Edit Form */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all"
          >
            + Add New Account
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-700/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingAccount ? 'Edit Account' : 'Add New Account'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Account Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white"
                  placeholder="My Checking"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Account Type</label>
                <select
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value as Account['accountType'] })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Institution</label>
                <input
                  type="text"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white"
                  placeholder="USAA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Account Number</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white"
                  placeholder="0165700823"
                />
              </div>

              {formData.accountType !== 'credit_card' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Routing Number</label>
                  <input
                    type="text"
                    value={formData.routingNumber}
                    onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white"
                    placeholder="314074269"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.accountType === 'credit_card' ? 'Current Balance' : 'Available Balance'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.availableBalance}
                  onChange={(e) => setFormData({ ...formData, availableBalance: parseFloat(e.target.value) })}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white"
                  placeholder="0.00"
                />
              </div>

              {formData.accountType === 'credit_card' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Credit Limit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.creditLimit || ''}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white"
                    placeholder="5000.00"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="submit"
                className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-semibold"
              >
                {editingAccount ? 'Save Changes' : 'Add Account'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-500 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
