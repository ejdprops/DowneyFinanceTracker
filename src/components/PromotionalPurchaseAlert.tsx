import type { Account, PromotionalPurchase } from '../types';

interface ExpiringPromotion {
  account: Account;
  promotion: PromotionalPurchase;
  daysUntilExpiration: number;
}

interface PromotionalPurchaseAlertProps {
  expiringPromotions: ExpiringPromotion[];
  onClose: () => void;
}

export const PromotionalPurchaseAlert: React.FC<PromotionalPurchaseAlertProps> = ({
  expiringPromotions,
  onClose,
}) => {
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

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil <= 7) return 'text-red-400';
    if (daysUntil <= 14) return 'text-orange-400';
    return 'text-yellow-400';
  };

  const getUrgencyBg = (daysUntil: number) => {
    if (daysUntil <= 7) return 'bg-red-500/10 border-red-500/30';
    if (daysUntil <= 14) return 'bg-orange-500/10 border-orange-500/30';
    return 'bg-yellow-500/10 border-yellow-500/30';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-red-500/50 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h2 className="text-2xl font-bold text-white">Promotional Purchase Alert</h2>
              <p className="text-sm text-gray-400 mt-1">
                {expiringPromotions.length} promotion{expiringPromotions.length > 1 ? 's' : ''} expiring within 30 days
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm font-medium">
            ⚠️ Action Required: The following promotional purchases will expire soon. If not paid in full by the expiration date, deferred interest charges will be applied to your account.
          </p>
        </div>

        <div className="space-y-4">
          {expiringPromotions.map((item, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 border ${getUrgencyBg(item.daysUntilExpiration)}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    {item.account.name} - {item.account.institution}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">{item.promotion.description}</p>
                </div>
                <div className={`text-right ${getUrgencyColor(item.daysUntilExpiration)}`}>
                  <div className="text-2xl font-bold">
                    {item.daysUntilExpiration}
                  </div>
                  <div className="text-xs font-medium">
                    day{item.daysUntilExpiration !== 1 ? 's' : ''} left
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Expiration Date:</span>
                  <div className="text-white font-medium mt-1">
                    {formatDate(item.promotion.expirationDate)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Purchase Date:</span>
                  <div className="text-white font-medium mt-1">
                    {formatDate(item.promotion.transactionDate)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Promotional Balance:</span>
                  <div className="text-red-400 font-bold text-lg mt-1">
                    ${item.promotion.promotionalBalance.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Deferred Interest if Unpaid:</span>
                  <div className="text-orange-400 font-bold text-lg mt-1">
                    ${item.promotion.deferredInterestCharge.toFixed(2)}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Original Amount:</span>
                  <div className="text-white font-medium mt-1">
                    ${item.promotion.initialAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {item.daysUntilExpiration <= 7 && (
                <div className="mt-4 bg-red-500/20 border border-red-500/40 rounded-lg p-3">
                  <p className="text-red-300 text-sm font-medium">
                    🚨 URGENT: Less than 7 days remaining! Pay ${item.promotion.promotionalBalance.toFixed(2)} before {formatDate(item.promotion.expirationDate)} to avoid ${item.promotion.deferredInterestCharge.toFixed(2)} in deferred interest charges.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-medium shadow-lg"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
