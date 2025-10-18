import type { Account } from '../types';

interface DownloadMethodChoiceProps {
  account: Account;
  onSelectTerminal: () => void;
  onSelectBrowser: () => void;
  onClose: () => void;
}

export const DownloadMethodChoice: React.FC<DownloadMethodChoiceProps> = ({
  account,
  onSelectTerminal,
  onSelectBrowser,
  onClose
}) => {
  const isUSAA = account.institution.toLowerCase().includes('usaa');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl max-w-2xl w-full border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <h2 className="text-xl font-bold text-white">Choose Download Method</h2>
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
        <div className="p-6 space-y-4">
          <p className="text-gray-300 text-center">
            Select how you'd like to download transactions for <span className="text-white font-semibold">{account.name}</span>
          </p>

          {/* Option 1: Terminal-Based */}
          <button
            onClick={onSelectTerminal}
            className="w-full bg-gray-700/50 hover:bg-gray-700 border-2 border-gray-600 hover:border-blue-500 rounded-xl p-6 transition-all group text-left"
          >
            <div className="flex items-start gap-4">
              <div className="bg-blue-500/20 p-3 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  Terminal/Script Method
                </h3>
                <p className="text-gray-300 text-sm mb-3">
                  Run a terminal command that opens a browser and automates the download. Most reliable method.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Most Reliable</span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Full Automation</span>
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">One Command</span>
                </div>
              </div>
            </div>
          </button>

          {/* Option 2: Browser-Based (Bookmarklet) */}
          <button
            onClick={onSelectBrowser}
            className="w-full bg-gray-700/50 hover:bg-gray-700 border-2 border-gray-600 hover:border-emerald-500 rounded-xl p-6 transition-all group text-left"
            disabled={!isUSAA}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg transition-colors ${
                isUSAA
                  ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30'
                  : 'bg-gray-600/20'
              }`}>
                <svg className={`w-8 h-8 ${isUSAA ? 'text-emerald-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-2 transition-colors ${
                  isUSAA
                    ? 'text-white group-hover:text-emerald-400'
                    : 'text-gray-500'
                }`}>
                  Browser Bookmarklet
                  {!isUSAA && <span className="ml-2 text-xs text-orange-400">(USAA Only)</span>}
                </h3>
                <p className={`text-sm mb-3 ${isUSAA ? 'text-gray-300' : 'text-gray-500'}`}>
                  Create a bookmark that automates the download. Click it while logged into your bank. No terminal needed!
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-1 text-xs rounded ${
                    isUSAA
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-gray-600/20 text-gray-500'
                  }`}>No Terminal</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    isUSAA
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-gray-600/20 text-gray-500'
                  }`}>One-Click</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    isUSAA
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-gray-600/20 text-gray-500'
                  }`}>Browser-Based</span>
                </div>
              </div>
            </div>
          </button>

          {/* Comparison */}
          <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
            <h4 className="text-sm font-semibold text-white mb-2">Quick Comparison</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-gray-400 mb-1">Terminal Method:</p>
                <ul className="space-y-1 text-gray-300">
                  <li>✓ Most reliable</li>
                  <li>✓ Full automation</li>
                  <li>• Requires terminal access</li>
                </ul>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Bookmarklet:</p>
                <ul className="space-y-1 text-gray-300">
                  <li>✓ No terminal needed</li>
                  <li>✓ Works in browser</li>
                  <li>• One-time setup</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
