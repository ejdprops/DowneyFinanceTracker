import { useState } from 'react';
import type { Account, Transaction } from '../types';

interface BookmarkletHelperProps {
  account: Account;
  transactions: Transaction[];
  onClose: () => void;
}

export const BookmarkletHelper: React.FC<BookmarkletHelperProps> = ({ account, transactions, onClose }) => {
  // Calculate smart date defaults
  const getMostRecentTransactionDate = () => {
    const accountTransactions = transactions
      .filter(t => t.accountId === account.id && !t.description.includes('(Projected)'))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    if (accountTransactions.length > 0) {
      return accountTransactions[0].date;
    }

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
  const [bookmarkletCreated, setBookmarkletCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate bookmarklet code
  const generateBookmarklet = () => {
    const institution = account.institution.toLowerCase();

    if (!institution.includes('usaa')) {
      return null;
    }

    // This is the code that will run when the bookmarklet is clicked
    const bookmarkletCode = `
(function() {
  const fromDate = '${fromDate}';
  const toDate = '${toDate}';

  console.log('DowneyFinanceTracker: Starting automated download');
  console.log('Date range:', fromDate, 'to', toDate);

  // Check if we're on USAA website
  if (!window.location.hostname.includes('usaa.com')) {
    alert('Please navigate to USAA website first!');
    return;
  }

  // Function to wait for element
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const element = document.querySelector(selector);
        if (element) {
          clearInterval(checkInterval);
          resolve(element);
        }
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('Element not found: ' + selector));
        }
      }, 500);
    });
  }

  // Main automation logic
  async function automateDownload() {
    try {
      console.log('🚀 USAA Transaction Downloader - Starting...');
      console.log('📅 Date Range:', fromDate, 'to', toDate);

      // Step 1: Extract account ID from current URL
      const urlMatch = window.location.href.match(/accountId=([^&]+)/);
      if (!urlMatch) {
        alert('❌ Error: Could not find account ID in URL.\\n\\nMake sure you are on an account details page.');
        return;
      }
      const accountId = urlMatch[1];
      console.log('✓ Found Account ID:', accountId);

      // Step 2: Get auth token from cookies or session storage
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});

      // Step 2: Try to find auth token from page context
      // USAA likely stores the API token in JavaScript somewhere
      let authToken = null;

      // Try to find token in window/global objects
      const searchPaths = [
        'window.AUTH_TOKEN',
        'window.authToken',
        'window.apiToken',
        'window.bearerToken',
        'window.sessionToken',
        'window.USAA',
        'window.__INITIAL_STATE__',
        'window.__REDUX_DEVTOOLS_EXTENSION__',
      ];

      console.log('🔍 Searching for auth token in page context...');

      // Try localStorage/sessionStorage
      try {
        authToken = sessionStorage.getItem('authToken') ||
                   sessionStorage.getItem('token') ||
                   sessionStorage.getItem('bearerToken') ||
                   sessionStorage.getItem('apiToken') ||
                   localStorage.getItem('authToken') ||
                   localStorage.getItem('token');

        if (authToken) {
          console.log('✓ Found token in storage');
        }
      } catch (e) {
        console.log('⚠ Could not access storage:', e);
      }

      // If no token found, try to extract from AST cookie if possible
      if (!authToken && cookies['AST']) {
        const astValue = cookies['AST'];
        authToken = astValue.split('.*')[0];
        console.log('✓ Extracted token from AST cookie');
      }

      if (!authToken) {
        alert('❌ Error: Could not find authentication token.\\n\\nThis bookmarklet approach may not work with USAA\\'s security setup.\\n\\nPlease use the Terminal/Script method instead, or try the Playwright automation scripts.');
        return;
      }

      console.log('✓ Using auth token (first 20 chars):', authToken.substring(0, 20) + '...');

      // Step 3: Call USAA API directly
      console.log('📡 Fetching transactions from USAA API...');
      const apiUrl = \`https://api.usaa.com/v1/enterprise/account-details/demand-deposit/accounts/\${accountId}/transactions?fromTransactionDate=\${fromDate}&toTransactionDate=\${toDate}&limit=500&offset=0\`;

      console.log('API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'api-key': 'b3b2362b-dd4f-444a-b442-a22133a655dc',
          'Authorization': \`Bearer \${authToken}\`,
        },
        credentials: 'include',
        mode: 'cors'
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(\`API returned \${response.status}: \${response.statusText}\\n\\nResponse: \${errorText.substring(0, 200)}\`);
      }

      const data = await response.json();
      console.log('✓ Received transaction data');
      console.log('Response keys:', Object.keys(data));
      console.log('Transaction count:', data.transactions?.length || 0);

      if (!data.transactions || data.transactions.length === 0) {
        alert('⚠️ No transactions found for this date range.');
        return;
      }

      // Step 4: Convert JSON to CSV
      console.log('📝 Converting to CSV format...');
      const transactions = data.transactions;

      // Build CSV header (matching USAA format)
      const headers = ['Date', 'Description', 'Original Description', 'Category', 'Amount', 'Status'];
      let csv = headers.join(',') + '\\\\n';

      // Add transaction rows
      transactions.forEach(tx => {
        const row = [
          tx.postDate || tx.transactionDate || '',
          \`"\${(tx.description || '').replace(/"/g, '""')}"\`,
          \`"\${(tx.originalDescription || tx.description || '').replace(/"/g, '""')}"\`,
          \`"\${(tx.category || '').replace(/"/g, '""')}"\`,
          tx.amount || '0',
          tx.status || 'Posted'
        ];
        csv += row.join(',') + '\\\\n';
      });

      // Step 5: Trigger download
      console.log('💾 Triggering CSV download...');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = \`USAA_Transactions_\${fromDate}_to_\${toDate}.csv\`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ Download complete!');
      alert(\`✅ Success!\\\\n\\\\nDownloaded \${transactions.length} transactions\\\\nFile: USAA_Transactions_\${fromDate}_to_\${toDate}.csv\\\\n\\\\nCheck your Downloads folder!\`);

    } catch (error) {
      console.error('❌ Download error:', error);
      alert(\`❌ Error downloading transactions:\\\\n\\\\n\${error.message}\\\\n\\\\nPlease try:\\\\n1. Refresh the page and log in again\\\\n2. Make sure you're on an account details page\\\\n3. Try a smaller date range\`);
    }
  }

  automateDownload();
})();
    `.trim();

    // Encode as bookmarklet URL
    const bookmarkletUrl = `javascript:${encodeURIComponent(bookmarkletCode)}`;
    return bookmarkletUrl;
  };

  const bookmarkletUrl = generateBookmarklet();
  const isUSAA = account.institution.toLowerCase().includes('usaa');

  const handleCreateBookmarklet = () => {
    setBookmarkletCreated(true);
  };

  const handleCopyBookmarklet = async () => {
    if (bookmarkletUrl) {
      try {
        await navigator.clipboard.writeText(bookmarkletUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <h2 className="text-xl font-bold text-white">Browser-Based Download</h2>
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
            <h3 className="font-semibold text-white mb-3">Account: {account.name}</h3>
            <p className="text-gray-300 text-sm">{account.institution} ••{account.accountNumber.slice(-4)}</p>
          </div>

          {isUSAA ? (
            <>
              {/* Date Range */}
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Select Date Range
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">From</label>
                    <input
                      type="date"
                      value={fromDate}
                      max={toDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">To</label>
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate}
                      max={formatDateForInput(today)}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-blue-400 mb-3">How It Works</h3>
                <ol className="space-y-2 text-gray-300 text-sm">
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">1.</span>
                    <span>Create a bookmarklet with your date range (one-time setup)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">2.</span>
                    <span>Open USAA website and log in</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">3.</span>
                    <span>Navigate to your account details page</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">4.</span>
                    <span>Click the bookmarklet - instant CSV download!</span>
                  </li>
                </ol>
                <p className="text-blue-300 text-xs mt-3 flex items-start gap-1">
                  <span>💡</span>
                  <span>The bookmarklet calls USAA's API directly, converts transactions to CSV format, and downloads automatically - no forms to fill!</span>
                </p>
              </div>

              {/* Create Bookmarklet Button */}
              {!bookmarkletCreated ? (
                <button
                  onClick={handleCreateBookmarklet}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Create Bookmarklet
                </button>
              ) : (
                <div className="space-y-4">
                  {/* Bookmarklet Link */}
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <h4 className="font-semibold text-green-400 mb-2">✓ Bookmarklet Ready!</h4>

                    {/* Method 1: Drag to Bookmark Bar */}
                    <div className="mb-4">
                      <p className="text-gray-300 text-sm mb-3 font-medium">
                        Method 1: Drag to Bookmarks Bar
                      </p>
                      <div className="flex justify-center">
                        <a
                          href="#"
                          className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all cursor-move"
                          onClick={(e) => e.preventDefault()}
                          onMouseDown={(e) => {
                            // Set the href to the bookmarklet URL when user starts dragging
                            // This bypasses React's security check
                            const target = e.currentTarget;
                            target.setAttribute('href', bookmarkletUrl || '#');
                          }}
                          onDragEnd={(e) => {
                            // Reset href after drag to prevent navigation
                            const target = e.currentTarget;
                            target.setAttribute('href', '#');
                          }}
                        >
                          📥 Download USAA ({fromDate} to {toDate})
                        </a>
                      </div>
                      <p className="text-gray-400 text-xs mt-2 text-center">
                        Drag this button to your browser's bookmarks bar
                      </p>
                    </div>

                    {/* Method 2: Copy URL */}
                    <div className="border-t border-green-500/30 pt-4">
                      <p className="text-gray-300 text-sm mb-3 font-medium">
                        Method 2: Copy & Create Manually
                      </p>
                      <button
                        onClick={handleCopyBookmarklet}
                        className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        {copied ? (
                          <>
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Bookmarklet URL
                          </>
                        )}
                      </button>
                      <p className="text-gray-400 text-xs mt-2 text-center">
                        Then manually create a bookmark with this URL
                      </p>
                    </div>
                  </div>

                  {/* Usage Instructions */}
                  <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                    <h4 className="font-semibold text-white mb-2">📖 Usage Instructions</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-gray-200 text-sm mb-1">For Method 1 (Drag):</p>
                        <ol className="space-y-1 text-gray-300 text-sm list-decimal list-inside ml-2">
                          <li>Show bookmarks bar (Cmd+Shift+B / Ctrl+Shift+B)</li>
                          <li>Drag the blue button above to your bookmarks bar</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-medium text-gray-200 text-sm mb-1">For Method 2 (Copy):</p>
                        <ol className="space-y-1 text-gray-300 text-sm list-decimal list-inside ml-2">
                          <li>Click "Copy Bookmarklet URL" above</li>
                          <li>Right-click your bookmarks bar → Add Bookmark</li>
                          <li>Name it "Download USAA"</li>
                          <li>Paste the copied URL as the bookmark URL</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-medium text-gray-200 text-sm mb-1">To Use the Bookmarklet:</p>
                        <ol className="space-y-1 text-gray-300 text-sm list-decimal list-inside ml-2">
                          <li>Open <a href="https://www.usaa.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">usaa.com</a> and log in</li>
                          <li>Navigate to your account details page (click on any account)</li>
                          <li><strong>Click the bookmarklet</strong> in your bookmarks bar</li>
                          <li>CSV downloads automatically - that's it!</li>
                        </ol>
                        <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                          <span>✨</span>
                          <span>Super fast! No export dialog needed - direct API access</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Change Dates */}
                  <button
                    onClick={() => setBookmarkletCreated(false)}
                    className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                  >
                    Change Dates & Recreate
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-orange-400 mb-2">Not Available Yet</h4>
              <p className="text-gray-300 text-sm">
                Browser-based automation is currently only available for USAA accounts.
                Support for {account.institution} coming soon!
              </p>
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
          </div>
        </div>
      </div>
    </div>
  );
};
