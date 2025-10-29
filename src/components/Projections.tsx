import { useState } from 'react';
import type { Transaction } from '../types';

interface ProjectionsProps {
  transactions: Transaction[];
  currentBalance: number;
}

export const Projections: React.FC<ProjectionsProps> = ({ transactions, currentBalance }) => {
  const [includeProjections, setIncludeProjections] = useState(true);

  // Filter for future projected transactions only (exclude pending transactions as they're treated as cleared)
  // Show projections through the end of the 2nd month out (current month + 2 more months = 3 months total)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate end date: last day of the month that is 2 months from now
  // Example: If today is Oct 18, we want through end of Dec (Oct + 1 = Nov, Oct + 2 = Dec)
  // Using today.getMonth() + 2 gives us the 2nd month out, then +1 month with day 0 = last day of that month
  const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0, 23, 59, 59, 999);

  const allFutureTransactions = transactions
    .filter(t => {
      const txDate = new Date(t.date);
      txDate.setHours(0, 0, 0, 0);
      // Only include transactions after today and before endDate that are projected (not pending actual transactions)
      return txDate > today && txDate <= endDate && t.description.includes('(Projected)');
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

  // Determine current month key for comparison
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

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

            // Check if this is the current month
            const isCurrentMonth = monthKey === currentMonthKey;

            return (
              <div key={monthKey} className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-white">{monthName}</h4>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-400 leading-tight">
                      {isCurrentMonth ? 'Current Balance' : 'Projected Start'}
                    </p>
                    <p className={`text-sm font-semibold ${(isCurrentMonth ? currentBalance : startBalance) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      ${(isCurrentMonth ? currentBalance : startBalance).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-green-500/20 rounded-lg p-2">
                    <p className="text-[10px] text-green-300 leading-tight">
                      {isCurrentMonth ? 'Projected Income' : 'Projected Income'}
                    </p>
                    <p className="text-sm font-semibold text-white">+${monthIncome.toFixed(2)}</p>
                  </div>
                  <div className="bg-red-500/20 rounded-lg p-2">
                    <p className="text-[10px] text-red-300 leading-tight">
                      {isCurrentMonth ? 'Projected Expenses' : 'Projected Expenses'}
                    </p>
                    <p className="text-sm font-semibold text-white">-${monthExpenses.toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-500/20 rounded-lg p-2">
                    <p className="text-[10px] text-blue-300 leading-tight">
                      {isCurrentMonth ? 'Projected End' : 'Projected End'}
                    </p>
                    <p className={`text-sm font-semibold ${endBalance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      ${endBalance.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Transaction List */}
                <div className="space-y-1.5">
                  {monthTransactions.map((t, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-700/30 rounded-lg p-2"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-white font-medium text-xs leading-tight flex-1">{t.description}</p>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <p className="text-gray-400">
                          {t.date.toLocaleDateString()} • {t.category}
                        </p>
                        <div className="flex items-center gap-3">
                          <p className={`font-semibold ${
                            t.amount < 0 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {t.amount < 0 ? '-' : '+'}${Math.abs(t.amount).toFixed(2)}
                          </p>
                          <p className={`font-semibold ${
                            t.balance < 0 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            Bal: ${t.balance.toFixed(2)}
                          </p>
                        </div>
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
