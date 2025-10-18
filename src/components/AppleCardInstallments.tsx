import { useMemo } from 'react';
import type { Transaction } from '../types';

interface InstallmentItem {
  monthlyAmount: number;
  totalPayments: number;
  currentPayment: number;
  totalCost: number;
  remainingBalance: number;
  remainingPayments: number;
  purchasedBy: string;
}

interface AppleCardInstallmentsProps {
  transactions: Transaction[];
}

export const AppleCardInstallments: React.FC<AppleCardInstallmentsProps> = ({ transactions }) => {
  const installments = useMemo(() => {
    const installmentMap = new Map<string, InstallmentItem>();

    transactions
      .filter(t =>
        t.description.toUpperCase().includes('MONTHLY INSTALLMENT') &&
        t.category === 'Installment'
      )
      .forEach(t => {
        // Parse the installment information from description
        // Format: "MONTHLY INSTALLMENTS (X OF Y)"
        const match = t.description.match(/\((\d+)\s+OF\s+(\d+)\)/i);
        if (!match) return;

        const currentPayment = parseInt(match[1]);
        const totalPayments = parseInt(match[2]);
        const monthlyAmount = Math.abs(t.amount);

        // Create a unique key based on monthly amount and total payments
        // This distinguishes different items
        const key = `${monthlyAmount.toFixed(2)}-${totalPayments}`;

        const existing = installmentMap.get(key);
        if (!existing || currentPayment > existing.currentPayment) {
          const totalCost = monthlyAmount * totalPayments;
          const paidSoFar = monthlyAmount * currentPayment;
          const remainingBalance = totalCost - paidSoFar;
          const remainingPayments = totalPayments - currentPayment;

          installmentMap.set(key, {
            monthlyAmount,
            totalPayments,
            currentPayment,
            totalCost,
            remainingBalance,
            remainingPayments,
            purchasedBy: t.description.includes('Karen') ? 'Karen Downey' : 'Evan Downey',
          });
        }
      });

    return Array.from(installmentMap.values())
      .sort((a, b) => b.remainingBalance - a.remainingBalance); // Sort by remaining balance (highest first)
  }, [transactions]);

  if (installments.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Monthly Installments
      </h3>

      <div className="space-y-4">
        {installments.map((item, index) => {
          const progressPercent = (item.currentPayment / item.totalPayments) * 100;
          const isComplete = item.remainingPayments === 0;

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                isComplete
                  ? 'bg-green-900/20 border-green-500/30'
                  : 'bg-gray-700/30 border-gray-600'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-white font-medium mb-1">
                    ${item.monthlyAmount.toFixed(2)}/mo × {item.totalPayments} payments
                  </h4>
                  <p className="text-xs text-gray-400">
                    Total Cost: ${item.totalCost.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  {isComplete ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Paid Off
                    </span>
                  ) : (
                    <div>
                      <p className="text-lg font-bold text-orange-400">
                        ${item.remainingBalance.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">remaining</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>
                    {item.currentPayment} of {item.totalPayments} payments
                  </span>
                  <span>{progressPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isComplete ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {!isComplete && (
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-gray-400">
                    {item.remainingPayments} payment{item.remainingPayments !== 1 ? 's' : ''} left
                  </span>
                  <span className="text-blue-400">
                    Next: ${item.monthlyAmount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm font-medium">Total Remaining Balance:</span>
          <span className="text-xl font-bold text-orange-400">
            ${installments.reduce((sum, item) => sum + item.remainingBalance, 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
