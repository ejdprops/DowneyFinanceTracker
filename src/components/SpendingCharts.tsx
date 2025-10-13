import { useState, useMemo, useEffect } from 'react';
import { compareTwoStrings } from 'string-similarity';
import type { Transaction, MerchantMapping, Account } from '../types';
import { loadMerchantMappings } from '../utils/storage';

interface SpendingChartsProps {
  transactions: Transaction[];
  accounts: Account[];
  activeAccountId: string;
}

// Common merchant patterns to group similar descriptions
const MERCHANT_PATTERNS = [
  { pattern: /amazon|amzn/i, name: 'Amazon', keywords: ['amazon', 'amzn', 'aws'] },
  { pattern: /walmart|wal-mart|wm supercenter/i, name: 'Walmart', keywords: ['walmart', 'wal-mart', 'wm'] },
  { pattern: /target/i, name: 'Target', keywords: ['target'] },
  { pattern: /starbucks|sbux/i, name: 'Starbucks', keywords: ['starbucks', 'sbux'] },
  { pattern: /mcdonald'?s|mcdonalds/i, name: "McDonald's", keywords: ['mcdonalds', 'mcd'] },
  { pattern: /shell|shell oil/i, name: 'Shell', keywords: ['shell'] },
  { pattern: /exxon|mobil/i, name: 'Exxon/Mobil', keywords: ['exxon', 'mobil'] },
  { pattern: /chevron/i, name: 'Chevron', keywords: ['chevron'] },
  { pattern: /costco/i, name: 'Costco', keywords: ['costco'] },
  { pattern: /kroger/i, name: 'Kroger', keywords: ['kroger'] },
  { pattern: /safeway/i, name: 'Safeway', keywords: ['safeway'] },
  { pattern: /whole foods|wholefoods/i, name: 'Whole Foods', keywords: ['whole foods', 'wholefoods', 'wfm'] },
  { pattern: /trader joe'?s/i, name: "Trader Joe's", keywords: ['trader joes', 'trader joe'] },
  { pattern: /cvs|cvs pharmacy/i, name: 'CVS', keywords: ['cvs'] },
  { pattern: /walgreens/i, name: 'Walgreens', keywords: ['walgreens'] },
  { pattern: /uber|uber eats/i, name: 'Uber', keywords: ['uber'] },
  { pattern: /lyft/i, name: 'Lyft', keywords: ['lyft'] },
  { pattern: /netflix/i, name: 'Netflix', keywords: ['netflix'] },
  { pattern: /spotify/i, name: 'Spotify', keywords: ['spotify'] },
  { pattern: /apple\.com|apple store|itunes/i, name: 'Apple', keywords: ['apple', 'itunes', 'app store'] },
  { pattern: /google|youtube/i, name: 'Google', keywords: ['google', 'youtube'] },
  { pattern: /paypal/i, name: 'PayPal', keywords: ['paypal'] },
  { pattern: /venmo/i, name: 'Venmo', keywords: ['venmo'] },
  { pattern: /zelle/i, name: 'Zelle', keywords: ['zelle'] },
  { pattern: /doordash|door dash/i, name: 'DoorDash', keywords: ['doordash'] },
  { pattern: /grubhub|grub hub/i, name: 'GrubHub', keywords: ['grubhub'] },
  { pattern: /instacart/i, name: 'Instacart', keywords: ['instacart'] },
  { pattern: /chipotle/i, name: 'Chipotle', keywords: ['chipotle'] },
  { pattern: /panera/i, name: 'Panera', keywords: ['panera'] },
  { pattern: /subway/i, name: 'Subway', keywords: ['subway'] },
  { pattern: /taco bell/i, name: 'Taco Bell', keywords: ['taco bell'] },
  { pattern: /dunkin|dunkin donuts/i, name: 'Dunkin', keywords: ['dunkin'] },
  { pattern: /home depot/i, name: 'Home Depot', keywords: ['home depot'] },
  { pattern: /lowes|lowe's/i, name: "Lowe's", keywords: ['lowes', 'lowe'] },
  { pattern: /best buy/i, name: 'Best Buy', keywords: ['best buy'] },
];

// Clean up transaction description for better matching
const cleanDescription = (description: string): string => {
  return description
    .replace(/\*[A-Z0-9]+/gi, '') // Remove transaction IDs like *123456
    .replace(/#\d+/g, '') // Remove order numbers like #1234
    .replace(/\d{10,}/g, '') // Remove long number sequences
    .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .toLowerCase();
};

// Normalize merchant name using pattern matching, custom mappings, and fuzzy logic
const normalizeMerchantName = (
  description: string,
  allDescriptions?: string[],
  customMappings?: MerchantMapping[]
): string => {
  const cleaned = cleanDescription(description);

  // First check custom user-defined mappings (highest priority)
  if (customMappings) {
    for (const mapping of customMappings) {
      if (mapping.originalDescriptions.includes(description)) {
        return mapping.displayName;
      }
    }
  }

  // Then try exact pattern matching
  for (const { pattern, name, keywords } of MERCHANT_PATTERNS) {
    if (pattern.test(description)) {
      return name;
    }
    // Also check keywords against cleaned description
    for (const keyword of keywords) {
      if (cleaned.includes(keyword.toLowerCase())) {
        return name;
      }
    }
  }

  // If we have other descriptions, try fuzzy matching
  if (allDescriptions && allDescriptions.length > 0) {
    // Try to find similar descriptions using string similarity
    const similarities = allDescriptions
      .filter(d => d !== description)
      .map(d => ({
        description: d,
        similarity: compareTwoStrings(cleaned, cleanDescription(d))
      }))
      .filter(s => s.similarity > 0.7) // 70% similarity threshold
      .sort((a, b) => b.similarity - a.similarity);

    if (similarities.length > 0) {
      // Return the most similar description's normalized form
      return cleanDescription(similarities[0].description)
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }

  // Return cleaned and title-cased version
  return cleaned
    .split(' ')
    .filter(word => word.length > 2) // Remove short words
    .slice(0, 3) // Take first 3 significant words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || description;
};

// Detect if two transactions are likely transfers (same amount, opposite signs, within 3 days)
const areTransfersMatching = (t1: Transaction, t2: Transaction): boolean => {
  // Must be opposite signs
  if (Math.sign(t1.amount) === Math.sign(t2.amount)) return false;

  // Must be same absolute amount
  if (Math.abs(t1.amount) !== Math.abs(t2.amount)) return false;

  // Must be from different accounts
  if (t1.accountId === t2.accountId) return false;

  // Must be within 3 days of each other
  const date1 = new Date(t1.date).getTime();
  const date2 = new Date(t2.date).getTime();
  const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);

  return daysDiff <= 3;
};

export const SpendingCharts: React.FC<SpendingChartsProps> = ({ transactions, accounts, activeAccountId }) => {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'category' | 'description'>('category');
  const [showIncome, setShowIncome] = useState(false);
  const [groupSimilar, setGroupSimilar] = useState(true);
  const [merchantMappings, setMerchantMappings] = useState<MerchantMapping[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([activeAccountId]);
  const [excludeTransfers, setExcludeTransfers] = useState(true);

  // Load merchant mappings on mount
  useEffect(() => {
    setMerchantMappings(loadMerchantMappings());
  }, []);

  // Update selected accounts when active account changes
  useEffect(() => {
    setSelectedAccountIds([activeAccountId]);
  }, [activeAccountId]);

  // Toggle account selection
  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  // Select all accounts
  const selectAllAccounts = () => {
    setSelectedAccountIds(accounts.map(a => a.id));
  };

  // Clear account selection
  const clearAccountSelection = () => {
    setSelectedAccountIds([]);
  };

  // Filter transactions by date range, accounts, and exclude projected
  const filteredTransactions = useMemo(() => {
    // First filter by selected accounts
    let filtered = transactions.filter(t =>
      selectedAccountIds.length === 0 || selectedAccountIds.includes(t.accountId || '')
    );

    // Detect and exclude transfers if enabled
    if (excludeTransfers && selectedAccountIds.length > 1) {
      const transferIds = new Set<string>();

      // Find matching transfer pairs
      for (let i = 0; i < filtered.length; i++) {
        if (transferIds.has(filtered[i].id)) continue;

        for (let j = i + 1; j < filtered.length; j++) {
          if (transferIds.has(filtered[j].id)) continue;

          if (areTransfersMatching(filtered[i], filtered[j])) {
            transferIds.add(filtered[i].id);
            transferIds.add(filtered[j].id);
            break;
          }
        }
      }

      // Exclude identified transfers
      filtered = filtered.filter(t => !transferIds.has(t.id));
    }

    // Apply other filters
    return filtered.filter(t => {
      // Exclude projected transactions
      if (t.description.includes('(Projected)')) return false;

      // Filter by income/expense
      if (!showIncome && t.amount > 0) return false;
      if (showIncome && t.amount < 0) return false;

      // Date range filter
      const txDate = new Date(t.date);
      txDate.setHours(0, 0, 0, 0);

      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (txDate < fromDate) return false;
      }

      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (txDate > toDate) return false;
      }

      return true;
    });
  }, [transactions, selectedAccountIds, excludeTransfers, dateFrom, dateTo, showIncome]);

  // Group transactions by category or description
  const groupedData = useMemo(() => {
    const groups: Record<string, { total: number; count: number; transactions: Transaction[] }> = {};

    // Get all descriptions for fuzzy matching
    const allDescriptions = groupBy === 'description'
      ? filteredTransactions.map(t => t.description)
      : [];

    filteredTransactions.forEach(t => {
      let key: string;

      if (groupBy === 'category') {
        key = t.category;
      } else {
        // Group by description with optional merchant normalization
        if (groupSimilar) {
          key = normalizeMerchantName(t.description, allDescriptions, merchantMappings);
        } else {
          key = t.description;
        }
      }

      if (!groups[key]) {
        groups[key] = { total: 0, count: 0, transactions: [] };
      }
      groups[key].total += Math.abs(t.amount);
      groups[key].count += 1;
      groups[key].transactions.push(t);
    });

    // Convert to array and sort by total
    return Object.entries(groups)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTransactions, groupBy, groupSimilar, merchantMappings]);

  const totalAmount = groupedData.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Spending Analysis</h2>
        <p className="text-gray-400">
          Analyze your spending patterns by category or description
        </p>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'category' | 'description')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="category">Category</option>
              <option value="description">Description</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Type</label>
            <select
              value={showIncome ? 'income' : 'expense'}
              onChange={(e) => setShowIncome(e.target.value === 'income')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>
          </div>
        </div>

        {/* Account Selection */}
        {accounts.length > 1 && (
          <div className="pt-4 border-t border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Accounts to Analyze</h4>
            <div className="flex flex-wrap gap-2 mb-3">
              {accounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => toggleAccount(account.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    selectedAccountIds.includes(account.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {account.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAllAccounts}
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              >
                Select All
              </button>
              <button
                onClick={clearAccountSelection}
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              >
                Clear All
              </button>
            </div>

            {/* Transfer Exclusion Toggle */}
            {selectedAccountIds.length > 1 && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-600">
                <input
                  type="checkbox"
                  id="excludeTransfers"
                  checked={excludeTransfers}
                  onChange={(e) => setExcludeTransfers(e.target.checked)}
                  className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="excludeTransfers" className="text-sm text-gray-300">
                  Exclude inter-account transfers
                  <span className="block text-xs text-gray-500 mt-0.5">
                    Automatically detects and excludes matching transfers between selected accounts
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Group Similar Merchants Toggle */}
        {groupBy === 'description' && (
          <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
            <input
              type="checkbox"
              id="groupSimilar"
              checked={groupSimilar}
              onChange={(e) => setGroupSimilar(e.target.checked)}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="groupSimilar" className="text-sm text-gray-300">
              Group similar merchants using fuzzy matching
              <span className="block text-xs text-gray-500 mt-0.5">
                Uses custom mappings from Merchants tab and auto-groups similar descriptions
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-2xl p-6 border ${
          showIncome
            ? 'bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30'
            : 'bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30'
        }`}>
          <h3 className={`text-sm font-medium mb-2 ${showIncome ? 'text-green-300' : 'text-red-300'}`}>
            Total {showIncome ? 'Income' : 'Expenses'}
          </h3>
          <p className="text-3xl font-bold text-white">${totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl p-6 border border-blue-500/30">
          <h3 className="text-sm font-medium text-blue-300 mb-2">Total Transactions</h3>
          <p className="text-3xl font-bold text-white">{filteredTransactions.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl p-6 border border-purple-500/30">
          <h3 className="text-sm font-medium text-purple-300 mb-2">
            {groupBy === 'category' ? 'Categories' : 'Unique Descriptions'}
          </h3>
          <p className="text-3xl font-bold text-white">{groupedData.length}</p>
        </div>
      </div>

      {/* Bar Chart */}
      {groupedData.length === 0 ? (
        <div className="bg-gray-800/50 rounded-2xl p-12 border border-gray-700 text-center">
          <p className="text-gray-400">
            No transactions found for the selected filters. Adjust your date range or filters.
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            {showIncome ? 'Income' : 'Spending'} by {groupBy === 'category' ? 'Category' : 'Description'}
          </h3>
          <div className="space-y-3">
            {groupedData.map((item, index) => {
              const percentage = (item.total / totalAmount) * 100;
              const colors = [
                'from-blue-500 to-blue-600',
                'from-purple-500 to-purple-600',
                'from-pink-500 to-pink-600',
                'from-red-500 to-red-600',
                'from-orange-500 to-orange-600',
                'from-yellow-500 to-yellow-600',
                'from-green-500 to-green-600',
                'from-teal-500 to-teal-600',
                'from-cyan-500 to-cyan-600',
                'from-indigo-500 to-indigo-600',
              ];
              const color = colors[index % colors.length];

              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium text-white">{item.name}</span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-xs text-gray-400">{item.count} transactions</span>
                      <span className="text-sm font-semibold text-white">
                        ${item.total.toFixed(2)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${color} transition-all duration-500 flex items-center justify-end px-2`}
                      style={{ width: `${percentage}%` }}
                    >
                      {percentage > 10 && (
                        <span className="text-xs font-medium text-white">
                          {percentage.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Breakdown */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Detailed Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  {groupBy === 'category' ? 'Category' : 'Description'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Average
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {groupedData.map((item) => {
                const percentage = (item.total / totalAmount) * 100;
                const average = item.total / item.count;

                return (
                  <tr key={item.name} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-white font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">{item.count}</td>
                    <td className="px-4 py-3 text-sm text-white font-semibold text-right">
                      ${item.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">
                      ${average.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">
                      {percentage.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-700/50">
              <tr>
                <td className="px-4 py-3 text-sm font-bold text-white">Total</td>
                <td className="px-4 py-3 text-sm font-bold text-white text-right">
                  {filteredTransactions.length}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-white text-right">
                  ${totalAmount.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-white text-right">
                  ${(totalAmount / filteredTransactions.length || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-white text-right">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
