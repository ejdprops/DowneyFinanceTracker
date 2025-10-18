import { useState } from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<string>('getting-started');

  if (!isOpen) return null;

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
    { id: 'usaa-checking', title: 'USAA Checking & Savings', icon: '🏦' },
    { id: 'usaa-credit', title: 'USAA Credit Cards', icon: '💳' },
    { id: 'apple-card', title: 'Apple Card', icon: '🍎' },
    { id: 'capital-one', title: 'Capital One', icon: '💰' },
    { id: 'chase', title: 'Chase', icon: '🏛️' },
    { id: 'bofa', title: 'Bank of America', icon: '🇺🇸' },
    { id: 'wells-fargo', title: 'Wells Fargo', icon: '🐴' },
    { id: 'importing', title: 'Importing Transactions', icon: '📥' },
    { id: 'icloud', title: 'iCloud Sync Setup', icon: '☁️' },
    { id: 'accounts', title: 'Managing Accounts', icon: '⚙️' },
    { id: 'tips', title: 'Tips & Best Practices', icon: '💡' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Getting Started</h2>
            <p className="text-gray-300">
              DowneyFinanceTracker is a personal finance management tool that helps you track your finances across multiple accounts.
              The app runs entirely in your browser and can sync data to your iCloud Drive folder.
            </p>
            <h3 className="text-xl font-semibold text-white mt-6">Key Features:</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Import transactions from CSV files or PDF statements</li>
              <li>Track multiple checking, savings, and credit card accounts</li>
              <li>Automatic balance calculations and projections</li>
              <li>Recurring bill tracking</li>
              <li>Spending analysis by category</li>
              <li>iCloud Drive sync (optional)</li>
            </ul>
          </div>
        );

      case 'usaa-checking':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">USAA Checking & Savings</h2>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 1: Log in to USAA</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Go to <a href="https://www.usaa.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">usaa.com</a></li>
                <li>Log in with your credentials</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 2: Navigate to Your Account</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Click on "Accounts" in the top menu</li>
                <li>Select the checking or savings account you want to export</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 3: Download Transactions</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Look for "Transactions" or "Activity" tab</li>
                <li>Click "Download" or "Export" button (usually at the top right)</li>
                <li>Select date range (e.g., last 30 days, last 90 days, or custom range)</li>
                <li>Choose format: <span className="font-bold text-white">CSV</span> or <span className="font-bold text-white">Comma Delimited</span></li>
                <li>Click "Download" or "Export"</li>
              </ol>
            </div>
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-300 mb-2">Important Notes:</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>Pending transactions will show "Pending" in the Status column</li>
                <li>Positive amounts = money spent, Negative amounts = money received</li>
                <li>When you re-import later, pending transactions that have cleared will be automatically updated</li>
              </ul>
            </div>
          </div>
        );

      case 'usaa-credit':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">USAA Credit Cards</h2>
            <p className="text-gray-300">Follow the same steps as USAA Checking, but select your credit card account.</p>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Steps 1-2: Same as USAA Checking</h3>
              <p className="text-gray-300">Follow the login and navigation steps above, but select your credit card account instead.</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 3: Download Transactions</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Look for "Transactions" or "Activity" tab</li>
                <li>Click "Download" or "Export" button</li>
                <li>Select date range</li>
                <li>Choose format: <span className="font-bold text-white">CSV</span> or <span className="font-bold text-white">Comma Delimited</span></li>
                <li>Click "Download" or "Export"</li>
              </ol>
            </div>
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-300 mb-2">Important Notes:</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>The app will automatically detect this is a credit card and handle amounts correctly</li>
                <li>In the CSV: Positive = payments, Negative = charges</li>
                <li>After import: Charges increase your debt, Payments decrease it</li>
              </ul>
            </div>
          </div>
        );

      case 'apple-card':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Apple Card</h2>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 1: Open Wallet App</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Open the <span className="font-bold text-white">Wallet</span> app on your iPhone or iPad</li>
                <li>Tap on your <span className="font-bold text-white">Apple Card</span></li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 2: Export Transactions</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Tap the <span className="font-bold text-white">•••</span> (three dots) in the top right corner</li>
                <li>Scroll down and tap "<span className="font-bold text-white">Export Transactions</span>"</li>
                <li>Select the time period (e.g., "This Month", "Last Month", or custom date range)</li>
                <li>Tap "<span className="font-bold text-white">Export</span>"</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 3: Save the CSV File</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Choose how to share the file (AirDrop, Files app, etc.)</li>
                <li>If using iCloud Drive, save directly to your DowneyFinanceTracker folder</li>
                <li>If using another method, transfer the file to your computer</li>
              </ol>
            </div>
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-300 mb-2">Important Notes:</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>The "Type" column indicates "Purchase" or "Payment"</li>
                <li>Pending transactions have no "Clearing Date"</li>
                <li>The app automatically handles the amount signs correctly</li>
              </ul>
            </div>
          </div>
        );

      case 'capital-one':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Capital One</h2>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 1: Log in to Capital One</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Go to <a href="https://www.capitalone.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">capitalone.com</a></li>
                <li>Log in with your credentials</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 2: Navigate to Your Account</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Click on the credit card account you want to export</li>
                <li>Click on "<span className="font-bold text-white">View All Transactions</span>" or "<span className="font-bold text-white">Transactions</span>"</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 3: Download Transactions</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Look for "<span className="font-bold text-white">Download</span>" or "<span className="font-bold text-white">Export</span>" option (usually near the search box)</li>
                <li>Select date range</li>
                <li>Choose format: <span className="font-bold text-white">CSV</span> or <span className="font-bold text-white">Comma Separated Values</span></li>
                <li>Click "Download"</li>
              </ol>
            </div>
          </div>
        );

      case 'chase':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Chase</h2>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 1: Log in to Chase</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Go to <a href="https://www.chase.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">chase.com</a></li>
                <li>Log in with your credentials</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 2: Navigate to Your Account</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Click on the account you want to export</li>
                <li>Go to "<span className="font-bold text-white">Activity & statements</span>" or "<span className="font-bold text-white">Transactions</span>"</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 3: Download Transactions</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Click "<span className="font-bold text-white">Download</span>" (usually in the top right of the transaction list)</li>
                <li>Select date range</li>
                <li>Choose file type: <span className="font-bold text-white">CSV</span></li>
                <li>Click "Download"</li>
              </ol>
            </div>
          </div>
        );

      case 'bofa':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Bank of America</h2>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 1: Log in to Bank of America</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Go to <a href="https://www.bankofamerica.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">bankofamerica.com</a></li>
                <li>Log in with your credentials</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 2: Navigate to Your Account</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Click on the account you want to export</li>
                <li>Go to "<span className="font-bold text-white">Transactions</span>" tab</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 3: Download Transactions</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Click "<span className="font-bold text-white">Download transactions</span>" link (usually above transaction list)</li>
                <li>Select download options:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>File type: <span className="font-bold text-white">Comma Delimited</span> or <span className="font-bold text-white">CSV</span></li>
                    <li>Date range: Choose your range</li>
                  </ul>
                </li>
                <li>Click "Download"</li>
              </ol>
            </div>
          </div>
        );

      case 'wells-fargo':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Wells Fargo</h2>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 1: Log in to Wells Fargo</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Go to <a href="https://www.wellsfargo.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">wellsfargo.com</a></li>
                <li>Log in with your credentials</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 2: Navigate to Your Account</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Click on the account you want to export</li>
                <li>Click "<span className="font-bold text-white">Download</span>" or look for download options</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 3: Download Transactions</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Select "<span className="font-bold text-white">Download Account Activity</span>"</li>
                <li>Choose:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>File type: <span className="font-bold text-white">Comma Delimited (CSV)</span></li>
                    <li>Date range: Select your range</li>
                  </ul>
                </li>
                <li>Click "Download"</li>
              </ol>
            </div>
          </div>
        );

      case 'importing':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Importing Transactions</h2>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 1: Select Your Account</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>In the header, click on the account button you want to import transactions for</li>
                <li>Make sure the correct account is highlighted (blue/purple gradient)</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 2: Navigate to Account Information Tab</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Click the "<span className="font-bold text-white">Account Info</span>" tab (first tab)</li>
                <li>Scroll down to the "<span className="font-bold text-white">Import Transactions</span>" section</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 3: Import CSV File</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Click the "<span className="font-bold text-white">Import CSV</span>" button (or drag & drop the CSV file)</li>
                <li>Select your CSV file from your computer</li>
                <li>The app will automatically:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Detect which bank format it is</li>
                    <li>Parse the transactions</li>
                    <li>Match pending transactions that have cleared</li>
                    <li>Avoid importing duplicates</li>
                  </ul>
                </li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 4: Enter Current Balance</h3>
              <p className="text-gray-300 text-sm italic">(Optional but Recommended)</p>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>After parsing, you'll see a prompt asking for your current balance</li>
                <li>Open your bank's website/app and check your current balance</li>
                <li>Enter the exact balance shown in your bank</li>
                <li>Click "Submit" (or "Skip" if you don't want to update the balance)</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Step 5: Review Import Results</h3>
              <p className="text-gray-300">You'll see a summary: "X new, Y updated, Z skipped"</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li><span className="font-bold text-green-400">New</span> = brand new transactions</li>
                <li><span className="font-bold text-blue-400">Updated</span> = pending transactions that cleared</li>
                <li><span className="font-bold text-gray-400">Skipped</span> = duplicates already in the system</li>
              </ul>
            </div>
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-300 mb-2">What Happens to Pending Transactions:</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>If you import a CSV with a pending transaction, it's marked as "Pending"</li>
                <li>When you import again and that transaction has cleared:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>The app finds the matching pending transaction</li>
                    <li>Updates it with the new description, category, and date</li>
                    <li>Marks it as "Posted" (no longer pending)</li>
                    <li>No duplicate is created!</li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>
        );

      case 'icloud':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">iCloud Sync Setup</h2>
            <p className="text-gray-300">
              iCloud Sync allows you to store your financial data in your iCloud Drive folder, making it accessible across devices and providing automatic backups.
            </p>

            <h3 className="text-xl font-semibold text-white mt-6">First Time Setup</h3>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h4 className="text-lg font-semibold text-blue-400">Step 1: Enable iCloud Sync</h4>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Click on the "<span className="font-bold text-white">iCloud Sync</span>" tab</li>
                <li>Click "<span className="font-bold text-white">Select iCloud Folder</span>" button</li>
                <li>A folder picker will appear</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h4 className="text-lg font-semibold text-blue-400">Step 2: Choose Your Folder</h4>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Navigate to your iCloud Drive (should appear in the left sidebar)</li>
                <li>You can either:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Select an existing folder (e.g., "Documents/Finance")</li>
                    <li>Create a new folder (click "New Folder" button)</li>
                  </ul>
                </li>
                <li>Click "<span className="font-bold text-white">Select</span>" or "<span className="font-bold text-white">Open</span>" to confirm</li>
              </ol>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h4 className="text-lg font-semibold text-blue-400">Step 3: Grant Permissions</h4>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Your browser will ask for permission to access the folder</li>
                <li>Click "<span className="font-bold text-white">Allow</span>" or "<span className="font-bold text-white">Grant Access</span>"</li>
                <li>The app will remember this folder</li>
              </ol>
            </div>

            <h3 className="text-xl font-semibold text-white mt-6">Using iCloud Sync</h3>
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-green-300 mb-2">Quick Sync Button (in Header):</h4>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>Once connected, you'll see a green "<span className="font-bold">Sync to iCloud</span>" button in the header</li>
                <li>Click it anytime to save your current data to iCloud</li>
                <li>The button shows a checkmark when sync is successful</li>
              </ul>
            </div>

            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mt-4">
              <h4 className="text-lg font-semibold text-blue-300 mb-2">Important Notes:</h4>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li><span className="font-bold">Browser Requirement</span>: iCloud Sync requires Safari, Chrome, or Edge</li>
                <li><span className="font-bold">Manual Sync</span>: The app does NOT auto-sync. Click the sync button when you want to save changes</li>
                <li><span className="font-bold">Multiple Devices</span>: Always sync before making changes and after finishing work</li>
                <li><span className="font-bold">Backups</span>: Consider using "Export to JSON" periodically for extra backups</li>
              </ul>
            </div>
          </div>
        );

      case 'accounts':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Managing Accounts</h2>

            <h3 className="text-xl font-semibold text-white">Adding a New Account</h3>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h4 className="text-lg font-semibold text-blue-400">Step 1: Open Account Management</h4>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>Click the "<span className="font-bold text-white">+</span>" button in the header (next to account buttons)</li>
                <li>OR click "<span className="font-bold text-white">Manage Accounts</span>" button</li>
              </ul>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h4 className="text-lg font-semibold text-blue-400">Step 2: Fill in Account Details</h4>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li><span className="font-bold">Account Name</span>: Give it a descriptive name (e.g., "USAA Checking", "Apple Card")</li>
                <li><span className="font-bold">Account Type</span>: Select Checking, Savings, or Credit Card</li>
                <li><span className="font-bold">Account Number</span>: Last 4 digits are fine (for display only)</li>
                <li><span className="font-bold">Institution</span>: Bank name (e.g., "USAA", "Apple", "Chase")</li>
                <li><span className="font-bold">Available Balance</span>: Current balance from your bank</li>
              </ul>
              <p className="text-gray-300 mt-3 font-semibold">For Credit Cards, Also Fill In:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li><span className="font-bold">Credit Limit</span>: Your total credit limit</li>
                <li><span className="font-bold">APR</span>: Annual Percentage Rate</li>
                <li><span className="font-bold">Statement Due Date</span>: Day of month (1-31) when payment is due</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-white mt-6">Editing an Account</h3>
            <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
              <li>Click "<span className="font-bold text-white">Manage Accounts</span>" button or "<span className="font-bold text-white">+</span>" in header</li>
              <li>Click "<span className="font-bold text-white">Edit</span>" on the account you want to modify</li>
              <li>Update the fields</li>
              <li>Click "<span className="font-bold text-white">Update Account</span>"</li>
            </ol>

            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mt-4">
              <h4 className="text-lg font-semibold text-red-300 mb-2">⚠️ Deleting an Account</h4>
              <p className="text-gray-300 mb-2">Warning: Deleting an account will also delete ALL transactions and recurring bills for that account!</p>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Click "<span className="font-bold">Manage Accounts</span>"</li>
                <li>Click "<span className="font-bold">Delete</span>" on the account</li>
                <li>Confirm the deletion</li>
              </ol>
            </div>
          </div>
        );

      case 'tips':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Tips & Best Practices</h2>

            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-300 mb-2">Import Workflow</h3>
              <p className="text-gray-300 mb-2 font-semibold">Recommended Import Frequency:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li><span className="font-bold">Weekly</span>: For accounts you use frequently</li>
                <li><span className="font-bold">Monthly</span>: For less active accounts</li>
                <li><span className="font-bold">After large purchases</span>: To track pending → posted updates</li>
              </ul>
              <p className="text-gray-300 mt-3 mb-2 font-semibold">Best Import Practice:</p>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Always select the correct account BEFORE importing</li>
                <li>Import newest transactions first (download last 30-90 days from bank)</li>
                <li>Enter your current balance when prompted</li>
                <li>Check the import summary to verify results</li>
                <li>Sync to iCloud after importing</li>
              </ol>
            </div>

            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-300 mb-2">Balance Management</h3>
              <p className="text-gray-300 mb-2 font-semibold">Checking Your Balance:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>The header shows the current balance after all transactions</li>
                <li>Green = positive balance (or credit on credit card)</li>
                <li>Red = debt owed (credit card) or overdrawn (checking)</li>
              </ul>
              <p className="text-gray-300 mt-3 mb-2 font-semibold">When to Adjust Balance:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>After your first import for a new account</li>
                <li>If balance seems off after multiple imports</li>
                <li>After reconciling with your bank statement</li>
              </ul>
            </div>

            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-300 mb-2">Data Export & Backup</h3>
              <p className="text-gray-300 mb-2">Export your data regularly for safety:</p>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Go to "<span className="font-bold">iCloud Sync</span>" tab</li>
                <li>Click "<span className="font-bold">Export to JSON</span>"</li>
                <li>Save the file to a safe location</li>
              </ol>
              <p className="text-gray-300 mt-3 mb-2 font-semibold">When to Export:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>Before major changes</li>
                <li>Monthly as a backup</li>
                <li>Before deleting accounts or large batches of transactions</li>
                <li>Before clearing browser data</li>
              </ul>
            </div>

            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-300 mb-2">Security & Privacy</h3>
              <p className="text-gray-300 mb-2 font-semibold">Your Data is Private:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>All data stays in your browser and iCloud Drive</li>
                <li>No data is sent to external servers</li>
                <li>No account required, no tracking</li>
                <li>Your bank password is NEVER stored (you download CSVs from your bank separately)</li>
              </ul>
            </div>
          </div>
        );

      default:
        return <p className="text-gray-300">Select a topic from the sidebar to view help content.</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex border border-gray-700">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 rounded-l-2xl p-4 overflow-y-auto border-r border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4 px-2">Help Topics</h2>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm flex items-center gap-2 ${
                  activeSection === section.id
                    ? 'bg-blue-500 text-white font-medium'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg">{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-700 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">DowneyFinanceTracker Help</h1>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
