import type { Account } from '../types';

interface MobileAccountHeaderProps {
  account: Account | null;
  currentBalance: number;
}

export function MobileAccountHeader({ account, currentBalance }: MobileAccountHeaderProps) {
  if (!account) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
        <p className="text-gray-400 text-sm text-center">No account selected</p>
      </div>
    );
  }

  const isCreditCard = account.accountType === 'credit_card';

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      {/* Account Name and Institution */}
      <div className="mb-2">
        <h2 className="text-base font-bold text-white">{account.name}</h2>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400"></span>
          <span>{account.institution} •••• {account.accountNumber.slice(-4)}</span>
        </div>
      </div>

      {/* Balance Info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">
            {isCreditCard ? 'Balance Owed' : 'Current Balance'}
          </p>
          <p className={`text-lg font-bold ${
            isCreditCard
              ? (currentBalance < 0 ? 'text-red-400' : 'text-green-400')
              : (currentBalance >= 0 ? 'text-green-400' : 'text-red-400')
          }`}>
            ${Math.abs(currentBalance).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>

        {/* Reconciliation Info */}
        {account.reconciliationDate && account.reconciliationBalance !== undefined && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Reconciled</p>
            <p className="text-xs text-blue-400 font-medium">
              {new Date(account.reconciliationDate).toLocaleDateString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: '2-digit'
              })}
            </p>
            <p className="text-xs text-gray-500">
              ${Math.abs(account.reconciliationBalance).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </p>
          </div>
        )}
      </div>

      {/* Credit Card Specific Info */}
      {isCreditCard && account.creditLimit && (
        <div className="mt-2 pt-2 border-t border-gray-700 flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-400">Limit: </span>
            <span className="text-white font-medium">
              ${account.creditLimit.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Available: </span>
            <span className="text-green-400 font-medium">
              ${Math.max(0, account.creditLimit - Math.abs(currentBalance)).toLocaleString()}
            </span>
          </div>
          {account.apr && (
            <div>
              <span className="text-gray-400">APR: </span>
              <span className="text-white font-medium">{account.apr}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
