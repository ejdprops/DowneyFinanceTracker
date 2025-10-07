import { useState } from 'react';
import { CSVImport } from './components/CSVImport';
import type { ParsedCSVData, Transaction } from './types';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleImportComplete = (data: ParsedCSVData) => {
    setTransactions(data.transactions);
    setErrors(data.errors);

    if (data.errors.length > 0) {
      console.warn('Import completed with errors:', data.errors);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Downey Finance Tracker</h1>
          <p className="mt-2 text-sm text-gray-600">
            Personal budget management and financial tracking
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {transactions.length === 0 ? (
          <div className="space-y-8">
            <CSVImport onImportComplete={handleImportComplete} />

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-semibold mb-2">Import Errors:</h3>
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Transactions ({transactions.length})
                </h2>
                <button
                  onClick={() => {
                    setTransactions([]);
                    setErrors([]);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Import New File
                </button>
              </div>

              {errors.length > 0 && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-yellow-800 text-sm">
                    {errors.length} row(s) had errors during import
                  </p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.date.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {transaction.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.category || '-'}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                            transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          ${Math.abs(transaction.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {transaction.balance !== undefined
                            ? `$${transaction.balance.toFixed(2)}`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
