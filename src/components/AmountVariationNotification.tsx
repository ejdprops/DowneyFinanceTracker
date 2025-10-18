interface AmountVariationNotificationProps {
  variations: Array<{
    transactionId: string;
    billId: string;
    billDescription: string;
    expectedAmount: number;
    actualAmount: number;
    difference: number;
    percentDiff: number;
  }>;
  onUpdateBillAmount: (billId: string, newAmount: number) => void;
  onDismiss: (transactionId: string) => void;
  onDismissAll: () => void;
}

export const AmountVariationNotification: React.FC<AmountVariationNotificationProps> = ({
  variations,
  onUpdateBillAmount,
  onDismiss,
  onDismissAll,
}) => {
  if (variations.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md space-y-2">
      {variations.map((variation) => (
        <div
          key={variation.transactionId}
          className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg shadow-xl p-4 border border-yellow-400"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h4 className="font-bold text-white">Amount Variation Detected</h4>
            </div>
            <button
              onClick={() => onDismiss(variation.transactionId)}
              className="text-white hover:text-gray-200 transition-colors"
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="text-white space-y-2">
            <p className="font-semibold">{variation.billDescription}</p>
            <div className="grid grid-cols-2 gap-2 text-sm bg-white/20 rounded p-2">
              <div>
                <p className="text-xs opacity-80">Expected</p>
                <p className="font-bold">${Math.abs(variation.expectedAmount).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs opacity-80">Actual</p>
                <p className="font-bold">${Math.abs(variation.actualAmount).toFixed(2)}</p>
              </div>
            </div>
            <p className="text-sm">
              Difference: <span className="font-bold">${Math.abs(variation.difference).toFixed(2)}</span>
              {' '}({variation.percentDiff.toFixed(1)}%)
            </p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onUpdateBillAmount(variation.billId, variation.actualAmount)}
                className="flex-1 px-3 py-2 bg-white text-orange-600 rounded-lg hover:bg-gray-100 transition-all font-medium text-sm"
              >
                Update Bill Amount
              </button>
              <button
                onClick={() => onDismiss(variation.transactionId)}
                className="flex-1 px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all font-medium text-sm border border-white/30"
              >
                Keep Current
              </button>
            </div>
          </div>
        </div>
      ))}

      {variations.length > 1 && (
        <button
          onClick={onDismissAll}
          className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all font-medium text-sm"
        >
          Dismiss All ({variations.length})
        </button>
      )}
    </div>
  );
};
