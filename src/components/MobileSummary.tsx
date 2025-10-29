import type { Account, Transaction } from '../types';
import { calculateBalances } from '../utils/projections';

interface MobileSummaryProps {
  accounts: Account[];
  transactions: Transaction[];
  onSelectAccount: (accountId: string) => void;
}

export function MobileSummary({
  accounts,
  transactions,
  onSelectAccount,
}: MobileSummaryProps) {
  // Calculate current balance for each account
  const getAccountBalance = (accountId: string): number => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    const accountTransactions = transactions.filter(t => t.accountId === accountId);

    if (accountTransactions.length === 0) {
      return account.availableBalance || 0;
    }

    // Use calculateBalances with reconciliation balance if available
    const calculatedTransactions = calculateBalances(
      accountTransactions,
      account.availableBalance || 0,
      account.reconciliationBalance
    );

    // Get the most recent non-projected transaction's balance
    const actualTransactions = calculatedTransactions.filter(t => !t.description.includes('(Projected)'));
    if (actualTransactions.length > 0) {
      return actualTransactions[actualTransactions.length - 1].balance;
    }

    return account.availableBalance || 0;
  };

  // Calculate available credit for credit cards
  const getAvailableCredit = (account: Account): number => {
    if (account.accountType !== 'credit_card' || !account.creditLimit) {
      return 0;
    }

    const currentBalance = getAccountBalance(account.id);
    // For credit cards, balance is what you owe (positive = debt)
    // Available credit = credit limit - balance owed
    return account.creditLimit - currentBalance;
  };

  // Calculate total checking/savings balance
  const checkingSavingsBalance = accounts
    .filter(a => a.accountType === 'checking' || a.accountType === 'savings')
    .reduce((total, account) => total + getAccountBalance(account.id), 0);

  // Calculate total credit card debt (owed)
  const creditCardDebt = accounts
    .filter(a => a.accountType === 'credit_card')
    .reduce((total, account) => total + getAccountBalance(account.id), 0);

  // Group accounts by type
  const checkingAccounts = accounts.filter(a => a.accountType === 'checking');
  const savingsAccounts = accounts.filter(a => a.accountType === 'savings');
  const creditCardAccounts = accounts.filter(a => a.accountType === 'credit_card');

  return (
    <div className="space-y-4 pb-20">
      {/* Summary Balances */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-4 shadow-lg border border-blue-500/30">
        <div className="flex justify-between items-start mb-2">
          <p className="text-sm text-blue-100">Checking/Savings</p>
          <p className="text-sm text-blue-100">Credit Cards Owed</p>
        </div>
        <div className="flex justify-between items-center">
          <p className={`text-2xl font-bold ${checkingSavingsBalance >= 0 ? 'text-white' : 'text-red-300'}`}>
            ${checkingSavingsBalance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
          <p className={`text-2xl font-bold ${creditCardDebt > 0 ? 'text-red-300' : 'text-white'}`}>
            ${creditCardDebt.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>
      </div>

      {/* Checking Accounts */}
      {checkingAccounts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">Checking Accounts</h2>
          <div className="space-y-2">
            {checkingAccounts.map(account => {
              const balance = getAccountBalance(account.id);
              return (
                <button
                  key={account.id}
                  onClick={() => onSelectAccount(account.id)}
                  className="w-full bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-blue-500 transition-all text-left"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-white font-medium">{account.name}</p>
                      <p className="text-xs text-gray-400">{account.institution}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${balance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </p>
                      <p className="text-xs text-gray-400">Available</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Savings Accounts */}
      {savingsAccounts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">Savings Accounts</h2>
          <div className="space-y-2">
            {savingsAccounts.map(account => {
              const balance = getAccountBalance(account.id);
              return (
                <button
                  key={account.id}
                  onClick={() => onSelectAccount(account.id)}
                  className="w-full bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-blue-500 transition-all text-left"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-white font-medium">{account.name}</p>
                      <p className="text-xs text-gray-400">{account.institution}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${balance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </p>
                      <p className="text-xs text-gray-400">Balance</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Credit Card Accounts */}
      {creditCardAccounts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">Credit Cards</h2>
          <div className="space-y-2">
            {creditCardAccounts.map(account => {
              const balance = getAccountBalance(account.id);
              const availableCredit = getAvailableCredit(account);
              // Display balance owed as negative (red) since it's debt
              const displayBalance = -balance;

              return (
                <button
                  key={account.id}
                  onClick={() => onSelectAccount(account.id)}
                  className="w-full bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-blue-500 transition-all text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-white font-medium">{account.name}</p>
                      <p className="text-xs text-gray-400">{account.institution}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${displayBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
                        ${displayBalance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </p>
                      <p className="text-xs text-gray-400">Balance</p>
                    </div>
                  </div>
                  {account.creditLimit && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                      <p className="text-xs text-gray-400">Available Credit</p>
                      <p className="text-sm font-medium text-green-400">
                        ${availableCredit.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
