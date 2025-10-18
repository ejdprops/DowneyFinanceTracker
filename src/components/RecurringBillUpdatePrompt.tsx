import { useState } from 'react';
import type { RecurringBill } from '../types';

interface BillUpdate {
  billId: string;
  bill: RecurringBill;
  importedAmount: number;
  importedDate: Date;
  proposedNextDueDate: Date;
}

interface RecurringBillUpdatePromptProps {
  updates: BillUpdate[];
  onConfirm: (approvedUpdates: Array<{ billId: string; updateDate: boolean; updateAmount: boolean }>) => void;
  onCancel: () => void;
}

export default function RecurringBillUpdatePrompt({ updates, onConfirm, onCancel }: RecurringBillUpdatePromptProps) {
  const [selections, setSelections] = useState<Map<string, { updateDate: boolean; updateAmount: boolean }>>(
    new Map(updates.map(u => [u.billId, { updateDate: true, updateAmount: true }]))
  );

  const toggleDateUpdate = (billId: string) => {
    setSelections(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(billId) || { updateDate: false, updateAmount: false };
      newMap.set(billId, { ...current, updateDate: !current.updateDate });
      return newMap;
    });
  };

  const toggleAmountUpdate = (billId: string) => {
    setSelections(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(billId) || { updateDate: false, updateAmount: false };
      newMap.set(billId, { ...current, updateAmount: !current.updateAmount });
      return newMap;
    });
  };

  const handleConfirm = () => {
    const approvedUpdates = Array.from(selections.entries()).map(([billId, selection]) => ({
      billId,
      updateDate: selection.updateDate,
      updateAmount: selection.updateAmount,
    }));
    onConfirm(approvedUpdates);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Update Recurring Bills</h2>
          <p className="text-gray-600 mb-6">
            The following recurring bills were detected in your import. Select which updates you'd like to apply:
          </p>

          <div className="space-y-6">
            {updates.map(update => {
              const selection = selections.get(update.billId) || { updateDate: false, updateAmount: false };
              const currentDueDate = typeof update.bill.nextDueDate === 'string'
                ? new Date(update.bill.nextDueDate + 'T00:00:00')
                : new Date(update.bill.nextDueDate);

              const amountChanged = Math.abs(update.importedAmount - update.bill.amount) >= 0.01;
              const amountDiff = update.importedAmount - update.bill.amount;
              const percentDiff = (Math.abs(amountDiff) / Math.abs(update.bill.amount)) * 100;

              return (
                <div key={update.billId} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="font-semibold text-lg text-gray-900 mb-3">
                    {update.bill.description}
                  </div>

                  <div className="space-y-3">
                    {/* Date Update Option */}
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id={`date-${update.billId}`}
                        checked={selection.updateDate}
                        onChange={() => toggleDateUpdate(update.billId)}
                        className="mt-1 mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <label htmlFor={`date-${update.billId}`} className="flex-1 cursor-pointer">
                        <div className="font-medium text-gray-900">Update Next Due Date</div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="text-gray-500">Current:</span>{' '}
                          <span className="font-mono">{currentDueDate.toLocaleDateString()}</span>
                          {' → '}
                          <span className="font-mono text-green-700">{update.proposedNextDueDate.toLocaleDateString()}</span>
                        </div>
                      </label>
                    </div>

                    {/* Amount Update Option */}
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id={`amount-${update.billId}`}
                        checked={selection.updateAmount}
                        onChange={() => toggleAmountUpdate(update.billId)}
                        className="mt-1 mr-3 h-4 w-4 text-blue-600 rounded"
                        disabled={!amountChanged}
                      />
                      <label htmlFor={`amount-${update.billId}`} className={`flex-1 ${amountChanged ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                        <div className="font-medium text-gray-900">Update Amount</div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="text-gray-500">Current:</span>{' '}
                          <span className="font-mono">${update.bill.amount.toFixed(2)}</span>
                          {' → '}
                          <span className={`font-mono ${amountChanged ? 'text-orange-700 font-semibold' : 'text-gray-600'}`}>
                            ${update.importedAmount.toFixed(2)}
                          </span>
                          {amountChanged && (
                            <span className="ml-2 text-xs">
                              ({amountDiff > 0 ? '+' : ''}{amountDiff.toFixed(2)}, {percentDiff.toFixed(1)}% {amountDiff > 0 ? 'increase' : 'decrease'})
                            </span>
                          )}
                          {!amountChanged && (
                            <span className="ml-2 text-xs text-gray-500">(no change)</span>
                          )}
                        </div>
                      </label>
                    </div>

                    {/* Bill Details */}
                    <div className="mt-2 text-xs text-gray-500 border-t border-gray-300 pt-2">
                      <div>Category: {update.bill.category}</div>
                      <div>Frequency: {update.bill.frequency}</div>
                      <div>Imported Transaction Date: {update.importedDate.toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
            >
              Apply Selected Updates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
