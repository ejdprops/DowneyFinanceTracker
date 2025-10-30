import type { PromotionalPurchase } from '../types';

interface PromotionalPurchasesProps {
  purchases: PromotionalPurchase[];
}

export default function PromotionalPurchases({ purchases }: PromotionalPurchasesProps) {
  if (!purchases || purchases.length === 0) {
    return null;
  }

  // Debug logging
  console.log('PromotionalPurchases rendering with:', purchases);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    }).format(dateObj);
  };

  const getDaysUntilExpiration = (expirationDate: Date | string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    if (isNaN(expDate.getTime())) {
      return 0; // Return 0 if date is invalid
    }
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const totalPromotionalBalance = purchases.reduce((sum, p) => sum + p.promotionalBalance, 0);
  const totalDeferredInterest = purchases.reduce((sum, p) => sum + p.deferredInterestCharge, 0);

  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
        Promotional Purchases
      </h3>

      <div className="space-y-4">
        {purchases.map((purchase) => {
          const daysUntil = getDaysUntilExpiration(purchase.expirationDate);
          const isExpiringSoon = daysUntil <= 90 && daysUntil > 0;
          const isExpired = daysUntil < 0;
          const progressPercent = ((purchase.initialAmount - purchase.promotionalBalance) / purchase.initialAmount) * 100;

          return (
            <div
              key={purchase.id}
              className={`p-4 rounded-lg border ${
                isExpired
                  ? 'bg-red-900/20 border-red-500/30'
                  : isExpiringSoon
                  ? 'bg-yellow-900/20 border-yellow-500/30'
                  : 'bg-gray-700/30 border-gray-600'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-white font-medium mb-1">
                    {purchase.description}
                  </h4>
                  <p className="text-xs text-gray-400">
                    Purchased: {formatDate(purchase.transactionDate)} • Original: {formatCurrency(purchase.initialAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    isExpired ? 'text-red-400' : isExpiringSoon ? 'text-yellow-400' : 'text-orange-400'
                  }`}>
                    {formatCurrency(purchase.promotionalBalance)}
                  </p>
                  <p className="text-xs text-gray-400">remaining</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>
                    {formatCurrency(purchase.initialAmount - purchase.promotionalBalance)} paid
                  </span>
                  <span>{progressPercent.toFixed(0)}% complete</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isExpired ? 'bg-red-500' : isExpiringSoon ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Expiration Info */}
              <div className="flex justify-between items-center text-xs mt-2">
                <span className="text-gray-400">
                  Expires: {formatDate(purchase.expirationDate)}
                </span>
                <span className={`font-medium ${
                  isExpired ? 'text-red-400' : isExpiringSoon ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {isExpired ? `Expired ${Math.abs(daysUntil)} days ago!` : `${daysUntil} days left`}
                </span>
              </div>

              {/* Deferred Interest Warning */}
              {purchase.deferredInterestCharge > 0 && (
                <div className={`mt-2 pt-2 border-t ${
                  isExpired ? 'border-red-500/30' : isExpiringSoon ? 'border-yellow-500/30' : 'border-gray-600'
                }`}>
                  <p className="text-xs text-gray-400">
                    Deferred Interest if not paid in full: <span className="text-red-400 font-medium">{formatCurrency(purchase.deferredInterestCharge)}</span>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm font-medium">Total Promotional Balance:</span>
            <span className="text-xl font-bold text-orange-400">
              {formatCurrency(totalPromotionalBalance)}
            </span>
          </div>
          {totalDeferredInterest > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm font-medium">Potential Deferred Interest:</span>
              <span className="text-xl font-bold text-red-400">
                {formatCurrency(totalDeferredInterest)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong className="text-blue-200">Important:</strong> To avoid paying Deferred Interest Charges,
          you must pay the entire Promotional Balance by the Expiration Date for each promotion.
        </p>
      </div>
    </div>
  );
}
