import { useState, useEffect } from 'react';
import type { Account, Transaction } from '../types';

interface AutomationHelperProps {
  account: Account;
  transactions: Transaction[];
  onClose: () => void;
}

export const AutomationHelper: React.FC<AutomationHelperProps> = ({ account, transactions, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Calculate smart date defaults
  const getMostRecentTransactionDate = () => {
    const accountTransactions = transactions
      .filter(t => t.accountId === account.id && !t.description.includes('(Projected)'))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    if (accountTransactions.length > 0) {
      return accountTransactions[0].date;
    }

    // Default to 90 days ago if no transactions
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date;
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const mostRecentDate = getMostRecentTransactionDate();
  const today = new Date();

  const [fromDate, setFromDate] = useState(formatDateForInput(mostRecentDate));
  const [toDate, setToDate] = useState(formatDateForInput(today));

  // Update command when dates change
  useEffect(() => {
    setCopied(false);
  }, [fromDate, toDate]);

  // Determine bank and account type from account data
  const getBankInfo = () => {
    const institution = account.institution.toLowerCase();
    const accountType = account.accountType;

    let bank = 'unknown';
    let scriptCommand = '';
    let accountTypeLabel = '';

    if (institution.includes('usaa')) {
      bank = 'usaa';
      if (accountType === 'credit_card') {
        scriptCommand = `npm run download:usaa-creditcard -- --from="${fromDate}" --to="${toDate}"`;
        accountTypeLabel = 'Credit Card';
      } else {
        scriptCommand = `npm run download:usaa-checking -- --from="${fromDate}" --to="${toDate}"`;
        accountTypeLabel = 'Checking/Savings';
      }
    } else if (institution.includes('capital one')) {
      bank = 'capitalone';
      scriptCommand = '# Capital One automation not yet implemented';
      accountTypeLabel = accountType === 'credit_card' ? 'Credit Card' : 'Checking/Savings';
    } else if (institution.includes('chase')) {
      bank = 'chase';
      scriptCommand = '# Chase automation not yet implemented';
      accountTypeLabel = accountType === 'credit_card' ? 'Credit Card' : 'Checking/Savings';
    } else if (institution.includes('apple')) {
      bank = 'apple';
      scriptCommand = '# Apple Card automation not yet implemented';
      accountTypeLabel = 'Credit Card';
    }

    return { bank, scriptCommand, accountTypeLabel };
  };

  const { bank, scriptCommand, accountTypeLabel } = getBankInfo();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const daysSinceLastTransaction = Math.floor((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));

  const isAutomationAvailable = bank === 'usaa';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <h2 className="text-xl font-bold text-white">Get Latest Transactions</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Account Info */}
          <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Account Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-400">Account Name</p>
                <p className="text-white font-medium">{account.name}</p>
              </div>
              <div>
                <p className="text-gray-400">Institution</p>
                <p className="text-white font-medium">{account.institution}</p>
              </div>
              <div>
                <p className="text-gray-400">Account Type</p>
                <p className="text-white font-medium capitalize">{accountTypeLabel}</p>
              </div>
              <div>
                <p className="text-gray-400">Account Number</p>
                <p className="text-white font-medium">****{account.accountNumber.slice(-4)}</p>
              </div>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Date Range
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  max={toDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-gray-500 text-xs mt-1">
                  {daysSinceLastTransaction > 0 ? `${daysSinceLastTransaction} days since last transaction` : 'Up to date'}
                </p>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={formatDateForInput(today)}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-gray-500 text-xs mt-1">Today (default)</p>
              </div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 mt-3">
              <p className="text-blue-400 text-xs flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Dates are auto-filled from your most recent transaction ({mostRecentDate.toLocaleDateString()}) to today. Adjust if needed.</span>
              </p>
            </div>
          </div>

          {/* Automation Status */}
          {isAutomationAvailable ? (
            <>
              {/* Instructions */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-green-400 mb-1">Automation Available!</h4>
                    <p className="text-gray-300 text-sm">
                      Browser automation is available for this account. The command below includes your selected date range.
                    </p>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Steps to Download:</h3>

                {/* Step 1 */}
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-2">Open Terminal</h4>
                      <p className="text-gray-300 text-sm">
                        Open a terminal window and navigate to the project directory:
                      </p>
                      <div className="bg-black/30 rounded p-3 mt-2 font-mono text-sm text-gray-300">
                        cd /path/to/DowneyFinanceTracker
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-2">Run Automation Script</h4>
                      <p className="text-gray-300 text-sm mb-2">
                        Run this command to start the automated download:
                      </p>
                      <div className="bg-black/30 rounded p-3 font-mono text-sm text-green-400 flex items-center justify-between gap-2">
                        <code>{scriptCommand}</code>
                        <button
                          onClick={copyToClipboard}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition-colors"
                          title="Copy to clipboard"
                        >
                          {copied ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-2">Log In to {account.institution}</h4>
                      <p className="text-gray-300 text-sm">
                        A browser window will open. Log in to your {account.institution} account manually.
                        The script will wait for you to complete login (including 2FA).
                      </p>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-2">
                        <p className="text-yellow-400 text-xs flex items-start gap-2">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>You have 2 minutes to complete login. Make sure you're ready with your credentials and 2FA device.</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-2">Automation Runs</h4>
                      <p className="text-gray-300 text-sm">
                        After successful login, the script will:
                      </p>
                      <ul className="list-disc list-inside text-gray-300 text-sm mt-2 space-y-1 ml-2">
                        <li>Navigate to your {accountTypeLabel} account</li>
                        <li>Click the download/export button</li>
                        <li>Select CSV format</li>
                        <li>Download the transactions file</li>
                      </ul>
                      <p className="text-gray-400 text-xs mt-2">
                        If the script can't find a button, you can click it manually - the script will continue.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      5
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-2">Import CSV</h4>
                      <p className="text-gray-300 text-sm">
                        The CSV file will be saved to <code className="bg-black/30 px-2 py-0.5 rounded text-xs">downloads/</code> folder.
                        Come back here and click <strong>Import CSV</strong> in the Account Info tab to load the transactions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Not Available */
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="font-semibold text-orange-400 mb-1">Automation Not Yet Available</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    Browser automation for {account.institution} {accountTypeLabel} accounts is not yet implemented.
                  </p>
                  <div className="bg-gray-700/50 rounded p-3 text-sm">
                    <p className="text-white font-medium mb-2">Manual Download Instructions:</p>
                    <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-2">
                      <li>Go to <a href={`https://www.${bank}.com`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{account.institution} website</a></li>
                      <li>Log in to your account</li>
                      <li>Navigate to your {accountTypeLabel} account</li>
                      <li>Look for "Download" or "Export" transactions</li>
                      <li>Select CSV format</li>
                      <li>Choose a date range (last 90 days recommended)</li>
                      <li>Download the file</li>
                      <li>Import the CSV using the button in Account Info tab</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              Close
            </button>
            {isAutomationAvailable && (
              <a
                href="/automation/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium text-center"
              >
                View Full Documentation
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
