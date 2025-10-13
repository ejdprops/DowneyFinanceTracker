import { useState, useMemo } from 'react';
import { compareTwoStrings } from 'string-similarity';
import type { Transaction } from '../types';

interface SpendingChartsProps {
  transactions: Transaction[];
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

// Normalize merchant name using pattern matching and fuzzy logic
const normalizeMerchantName = (description: string, allDescriptions?: string[]): string => {
  const cleaned = cleanDescription(description);

  // First try exact pattern matching
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

export const SpendingCharts: React.FC<SpendingChartsProps> = ({ transactions }) => {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'category' | 'description'>('category');
  const [showIncome, setShowIncome] = useState(false);
  const [groupSimilar, setGroupSimilar] = useState(true);

  // Filter transactions by date range and exclude projected
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
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
  }, [transactions, dateFrom, dateTo, showIncome]);

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
          key = normalizeMerchantName(t.description, allDescriptions);
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
  }, [filteredTransactions, groupBy, groupSimilar]);

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
                Automatically combines variations like "AMAZON.COM*123" and "AMZN MKTP US*456" into "Amazon"
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
