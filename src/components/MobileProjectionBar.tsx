import type { Transaction } from '../types';

interface MobileProjectionBarProps {
  allTransactionsWithProjections: Transaction[];
  currentBalance: number;
}

export function MobileProjectionBar({
  allTransactionsWithProjections,
  currentBalance,
}: MobileProjectionBarProps) {
  const today = new Date();

  // Calculate end of current month
  const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  // Calculate end of next month
  const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59, 999);

  // Calculate end of 2 months out
  const endOfTwoMonthsOut = new Date(today.getFullYear(), today.getMonth() + 3, 0, 23, 59, 59, 999);

  // Get balances at each month end
  const currentMonthTransactions = allTransactionsWithProjections.filter(t => t.date <= endOfCurrentMonth);
  const currentMonthBalance = currentMonthTransactions.length > 0
    ? currentMonthTransactions[currentMonthTransactions.length - 1].balance
    : currentBalance;

  const nextMonthTransactions = allTransactionsWithProjections.filter(t => t.date <= endOfNextMonth);
  const nextMonthBalance = nextMonthTransactions.length > 0
    ? nextMonthTransactions[nextMonthTransactions.length - 1].balance
    : currentBalance;

  const twoMonthsOutTransactions = allTransactionsWithProjections.filter(t => t.date <= endOfTwoMonthsOut);
  const twoMonthsOutBalance = twoMonthsOutTransactions.length > 0
    ? twoMonthsOutTransactions[twoMonthsOutTransactions.length - 1].balance
    : currentBalance;

  // Month names
  const currentMonthName = endOfCurrentMonth.toLocaleDateString('en-US', { month: 'short' });
  const nextMonthName = endOfNextMonth.toLocaleDateString('en-US', { month: 'short' });
  const twoMonthsOutName = endOfTwoMonthsOut.toLocaleDateString('en-US', { month: 'short' });

  return (
    <div className="bg-gray-700/30 rounded-lg p-2 border border-gray-600">
      <div className="flex items-center justify-between gap-2 text-xs">
        {/* Current Month */}
        <div className="flex-1 text-center">
          <p className="text-gray-400 mb-0.5">{currentMonthName}</p>
          <p className={`font-semibold ${currentMonthBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${currentMonthBalance.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
          </p>
        </div>

        <div className="text-gray-600">•</div>

        {/* Next Month */}
        <div className="flex-1 text-center">
          <p className="text-gray-400 mb-0.5">{nextMonthName}</p>
          <p className={`font-semibold ${nextMonthBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${nextMonthBalance.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
          </p>
        </div>

        <div className="text-gray-600">•</div>

        {/* Two Months Out */}
        <div className="flex-1 text-center">
          <p className="text-gray-400 mb-0.5">{twoMonthsOutName}</p>
          <p className={`font-semibold ${twoMonthsOutBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${twoMonthsOutBalance.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
