import { useState } from 'react';
import type { Transaction } from '../types';

interface ProjectionsProps {
  transactions: Transaction[];
  currentBalance: number;
}

export const Projections: React.FC<ProjectionsProps> = ({ transactions, currentBalance }) => {
  const [includeProjections, setIncludeProjections] = useState(true);

  // Filter for future projected transactions only (exclude pending transactions as they're treated as cleared)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allFutureTransactions = transactions
    .filter(t => {
      const txDate = new Date(t.date);
      txDate.setHours(0, 0, 0, 0);
      // Only include transactions after today that are projected (not pending actual transactions)
      return txDate > today && t.description.includes('(Projected)');
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Filter out projected transactions if toggle is off
  const futureTransactions = includeProjections
    ? allFutureTransactions
    : [];

  // Group transactions by month
  const groupedByMonth = futureTransactions.reduce((acc, t) => {
    const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const months = Object.keys(groupedByMonth).sort();

  // Calculate summary stats
  const totalIncome = futureTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = futureTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const projectedEndBalance = futureTransactions.length > 0
    ? futureTransactions[futureTransactions.length - 1].balance
    : currentBalance;

  const netChange = projectedEndBalance - currentBalance;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Balance Projections</h2>
          <p className="text-gray-400">
            Future balance projections based on recurring bills and scheduled transactions
          </p>
        </div>

        {/* Toggle for projections */}
        <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">
          <span className="text-sm text-gray-300">Include Recurring Bills</span>
          <button
            onClick={() => setIncludeProjections(!includeProjections)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              includeProjections ? 'bg-blue-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                includeProjections ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl p-6 border border-blue-500/30">
          <h3 className="text-sm font-medium text-blue-300 mb-2">Current Balance</h3>
          <p className={`text-3xl font-bold ${currentBalance < 0 ? 'text-red-400' : 'text-green-400'}`}>
            ${currentBalance.toFixed(2)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl p-6 border border-green-500/30">
          <h3 className="text-sm font-medium text-green-300 mb-2">Expected Income</h3>
          <p className="text-3xl font-bold text-white">+${totalIncome.toFixed(2)}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-2xl p-6 border border-red-500/30">
          <h3 className="text-sm font-medium text-red-300 mb-2">Expected Expenses</h3>
          <p className="text-3xl font-bold text-white">-${totalExpenses.toFixed(2)}</p>
        </div>

        <div className={`bg-gradient-to-br rounded-2xl p-6 border ${
          netChange >= 0
            ? 'from-purple-500/20 to-purple-600/20 border-purple-500/30'
            : 'from-orange-500/20 to-orange-600/20 border-orange-500/30'
        }`}>
          <h3 className={`text-sm font-medium mb-2 ${
            netChange >= 0 ? 'text-purple-300' : 'text-orange-300'
          }`}>
            Projected End Balance
          </h3>
          <p className={`text-3xl font-bold ${projectedEndBalance < 0 ? 'text-red-400' : 'text-green-400'}`}>
            ${projectedEndBalance.toFixed(2)}
          </p>
          <p className={`text-sm mt-1 ${netChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {netChange >= 0 ? '+' : ''}{netChange.toFixed(2)} net change
          </p>
        </div>
      </div>

      {/* Monthly Breakdown */}
      {futureTransactions.length === 0 ? (
        <div className="bg-gray-800/50 rounded-2xl p-12 border border-gray-700 text-center">
          <p className="text-gray-400">
            No future transactions projected. Add recurring bills to see balance projections.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white">Monthly Breakdown</h3>
          {months.map(monthKey => {
            const monthTransactions = groupedByMonth[monthKey];
            const [year, month] = monthKey.split('-');
            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            });

            const monthIncome = monthTransactions
              .filter(t => t.amount > 0)
              .reduce((sum, t) => sum + t.amount, 0);

            const monthExpenses = monthTransactions
              .filter(t => t.amount < 0)
              .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            const startBalance = monthTransactions[0].balance - monthTransactions[0].amount;
            const endBalance = monthTransactions[monthTransactions.length - 1].balance;

            return (
              <div key={monthKey} className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-white">{monthName}</h4>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">End Balance</p>
                    <p className={`text-2xl font-bold ${endBalance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      ${endBalance.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-700/50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Start</p>
                    <p className={`text-lg font-semibold ${startBalance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      ${startBalance.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-green-500/20 rounded-xl p-3">
                    <p className="text-xs text-green-300">Income</p>
                    <p className="text-lg font-semibold text-white">+${monthIncome.toFixed(2)}</p>
                  </div>
                  <div className="bg-red-500/20 rounded-xl p-3">
                    <p className="text-xs text-red-300">Expenses</p>
                    <p className="text-lg font-semibold text-white">-${monthExpenses.toFixed(2)}</p>
                  </div>
                </div>

                {/* Transaction List */}
                <div className="space-y-2">
                  {monthTransactions.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-gray-700/30 rounded-xl p-3"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{t.description}</p>
                        <p className="text-sm text-gray-400">
                          {t.date.toLocaleDateString()} • {t.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <p className={`font-semibold ${
                          t.amount < 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {t.amount < 0 ? '-' : '+'}${Math.abs(t.amount).toFixed(2)}
                        </p>
                        <p className={`font-semibold ${
                          t.balance < 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          ${t.balance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
