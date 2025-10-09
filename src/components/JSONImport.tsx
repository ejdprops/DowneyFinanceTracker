import { useState } from 'react';
import type { ParsedCSVData } from '../types';

interface JSONImportProps {
  onImportComplete: (data: ParsedCSVData) => void;
}

export const JSONImport: React.FC<JSONImportProps> = ({ onImportComplete }) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleImport = () => {
    setError(null);

    try {
      const parsed = JSON.parse(jsonText);

      // Validate and transform the JSON data
      const transactions = Array.isArray(parsed) ? parsed : parsed.transactions || [];

      if (transactions.length === 0) {
        setError('No transactions found in JSON. Expected an array of transactions.');
        return;
      }

      // Transform and validate each transaction
      const importedTransactions = transactions.map((tx: any, index: number) => {
        // Validate required fields
        if (!tx.date) {
          throw new Error(`Transaction ${index + 1}: Missing required field 'date'`);
        }
        if (!tx.description && !tx.desc && !tx.merchant) {
          throw new Error(`Transaction ${index + 1}: Missing required field 'description'`);
        }
        if (tx.amount === undefined && tx.amt === undefined) {
          throw new Error(`Transaction ${index + 1}: Missing required field 'amount'`);
        }

        // Parse date - support various formats
        let date: Date;
        if (typeof tx.date === 'string') {
          date = new Date(tx.date);
          if (isNaN(date.getTime())) {
            throw new Error(`Transaction ${index + 1}: Invalid date format '${tx.date}'`);
          }
        } else {
          date = new Date(tx.date);
        }

        // Parse amount - handle both number and string, support credit/debit indicators
        let amount: number;
        const rawAmount = tx.amount ?? tx.amt;
        if (typeof rawAmount === 'string') {
          // Remove currency symbols and commas
          const cleanAmount = rawAmount.replace(/[$,]/g, '');
          amount = parseFloat(cleanAmount);
          if (isNaN(amount)) {
            throw new Error(`Transaction ${index + 1}: Invalid amount '${rawAmount}'`);
          }
        } else {
          amount = parseFloat(rawAmount);
        }

        // For credit card statements, debits are typically positive in the statement
        // but we store them as negative. Check for debit/credit indicators
        if (tx.type === 'debit' || tx.transaction_type === 'debit' || amount > 0) {
          amount = -Math.abs(amount);
        } else if (tx.type === 'credit' || tx.transaction_type === 'credit') {
          amount = Math.abs(amount);
        }

        return {
          id: `json-import-${Date.now()}-${index}`,
          date,
          description: tx.description || tx.desc || tx.merchant || 'Unknown',
          category: tx.category || tx.cat || 'Uncategorized',
          amount,
          balance: 0, // Will be calculated
          isPending: tx.pending || tx.isPending || false,
          isManual: true,
          sortOrder: index,
        };
      });

      onImportComplete({
        transactions: importedTransactions,
        errors: [],
      });

      setJsonText('');
      setShowModal(false);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to parse JSON. Please check the format.');
      }
    }
  };

  const exampleJSON = `[
  {
    "date": "2024-01-15",
    "description": "Amazon Purchase",
    "category": "Shopping",
    "amount": -125.50
  },
  {
    "date": "2024-01-14",
    "description": "Salary Deposit",
    "category": "Income",
    "amount": 3000.00
  }
]`;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
      >
        Import from JSON
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">Import Transactions from JSON</h2>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Instructions</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-2 text-sm">
                <li>Upload your credit card statement PDF to claude.ai</li>
                <li>Ask Claude: "Extract all transactions from this statement as JSON with fields: date, description, category, amount"</li>
                <li>Copy the JSON response from Claude</li>
                <li>Paste it in the box below and click Import</li>
              </ol>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Paste JSON Here
              </label>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={exampleJSON}
                className="w-full h-64 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white font-mono text-sm resize-y"
              />
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="mb-6 p-4 bg-gray-700/50 rounded-xl">
              <h4 className="text-sm font-semibold text-white mb-2">Expected JSON Format</h4>
              <pre className="text-xs text-gray-300 overflow-x-auto">
                {exampleJSON}
              </pre>
              <p className="text-xs text-gray-400 mt-2">
                <strong>Note:</strong> Negative amounts = debits (expenses), Positive amounts = credits (income/refunds)
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleImport}
                disabled={!jsonText.trim()}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import Transactions
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setJsonText('');
                  setError(null);
                }}
                className="px-6 py-3 bg-gray-700 text-white rounded-2xl font-semibold hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
