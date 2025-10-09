import type { Account } from '../types';

interface AccountSelectorProps {
  accounts: Account[];
  activeAccountId: string;
  onSelectAccount: (accountId: string) => void;
  onManageAccounts: () => void;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  accounts,
  activeAccountId,
  onSelectAccount,
  onManageAccounts,
}) => {
  const activeAccount = accounts.find(a => a.id === activeAccountId);

  const getAccountIcon = (type: Account['accountType']) => {
    switch (type) {
      case 'checking':
        return '💳';
      case 'savings':
        return '🏦';
      case 'credit_card':
        return '💎';
      default:
        return '💵';
    }
  };

  const getAccountTypeLabel = (type: Account['accountType']) => {
    switch (type) {
      case 'checking':
        return 'Checking';
      case 'savings':
        return 'Savings';
      case 'credit_card':
        return 'Credit Card';
      default:
        return 'Account';
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <select
          value={activeAccountId}
          onChange={(e) => onSelectAccount(e.target.value)}
          className="appearance-none bg-gray-800 text-white border border-gray-700 rounded-2xl px-6 py-3 pr-12 font-medium hover:bg-gray-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {getAccountIcon(account.accountType)} {account.name} (•••• {account.accountNumber.slice(-4)})
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          ▼
        </div>
      </div>

      {activeAccount && (
        <div className="flex items-center gap-6">
          <div className="text-sm">
            <span className="text-gray-400">{getAccountTypeLabel(activeAccount.accountType)}</span>
            {activeAccount.accountType === 'credit_card' && activeAccount.creditLimit && (
              <span className="text-gray-500 ml-2">
                Limit: ${activeAccount.creditLimit.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}

      <button
        onClick={onManageAccounts}
        className="px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors text-sm font-medium"
        title="Manage accounts"
      >
        Manage Accounts
      </button>
    </div>
  );
};
