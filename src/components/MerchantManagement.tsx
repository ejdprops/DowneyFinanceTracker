import { useState, useMemo, useEffect } from 'react';
import type { Transaction, MerchantMapping } from '../types';
import { saveMerchantMappings, loadMerchantMappings } from '../utils/storage';

interface MerchantManagementProps {
  transactions: Transaction[];
}

export const MerchantManagement: React.FC<MerchantManagementProps> = ({ transactions }) => {
  const [merchantMappings, setMerchantMappings] = useState<MerchantMapping[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [selectedDescriptions, setSelectedDescriptions] = useState<string[]>([]);
  const [groupingMode, setGroupingMode] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Load merchant mappings on mount
  useEffect(() => {
    setMerchantMappings(loadMerchantMappings());
  }, []);

  // Save merchant mappings whenever they change
  useEffect(() => {
    if (merchantMappings.length > 0 || loadMerchantMappings().length > 0) {
      saveMerchantMappings(merchantMappings);
    }
  }, [merchantMappings]);

  // Extract unique merchants from transactions
  const uniqueMerchants = useMemo(() => {
    const merchantMap = new Map<string, { description: string; count: number; totalAmount: number }>();

    transactions
      .filter(t => !t.description.includes('(Projected)'))
      .forEach(t => {
        const existing = merchantMap.get(t.description);
        if (existing) {
          existing.count++;
          existing.totalAmount += Math.abs(t.amount);
        } else {
          merchantMap.set(t.description, {
            description: t.description,
            count: 1,
            totalAmount: Math.abs(t.amount),
          });
        }
      });

    return Array.from(merchantMap.values()).sort((a, b) => b.count - a.count);
  }, [transactions]);

  // Get the display name for a merchant (either from mapping or original)
  const getMerchantDisplayName = (description: string): string => {
    const mapping = merchantMappings.find(m => m.originalDescriptions.includes(description));
    return mapping?.displayName || description;
  };

  // Get mapped merchant name if exists
  const getMerchantMapping = (description: string): MerchantMapping | undefined => {
    return merchantMappings.find(m => m.originalDescriptions.includes(description));
  };

  // Filter merchants based on search
  const filteredMerchants = useMemo(() => {
    if (!searchTerm) return uniqueMerchants;
    const lower = searchTerm.toLowerCase();
    return uniqueMerchants.filter(m =>
      m.description.toLowerCase().includes(lower) ||
      getMerchantDisplayName(m.description).toLowerCase().includes(lower)
    );
  }, [uniqueMerchants, searchTerm, merchantMappings]);

  // Start editing a merchant mapping
  const startEdit = (description: string) => {
    const mapping = getMerchantMapping(description);
    if (mapping) {
      setEditingMapping(mapping.id);
      setEditDisplayName(mapping.displayName);
      setEditCategory(mapping.category || '');
    } else {
      const newId = `mapping-${Date.now()}`;
      setEditingMapping(newId);
      setEditDisplayName(description);
      setEditCategory('');
    }
  };

  // Save merchant mapping
  const saveMapping = (description: string) => {
    if (!editDisplayName.trim()) return;

    const existingMapping = getMerchantMapping(description);

    if (existingMapping) {
      // Update existing mapping
      setMerchantMappings(prev =>
        prev.map(m =>
          m.id === existingMapping.id
            ? {
                ...m,
                displayName: editDisplayName.trim(),
                category: editCategory.trim() || undefined,
                updatedAt: new Date(),
              }
            : m
        )
      );
    } else {
      // Create new mapping
      const newMapping: MerchantMapping = {
        id: editingMapping!,
        originalDescriptions: [description],
        displayName: editDisplayName.trim(),
        category: editCategory.trim() || undefined,
        isCustom: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setMerchantMappings(prev => [...prev, newMapping]);
    }

    setEditingMapping(null);
    setEditDisplayName('');
    setEditCategory('');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingMapping(null);
    setEditDisplayName('');
    setEditCategory('');
  };

  // Delete a merchant mapping
  const deleteMapping = (description: string) => {
    const mapping = getMerchantMapping(description);
    if (mapping) {
      setMerchantMappings(prev => prev.filter(m => m.id !== mapping.id));
    }
  };

  // Toggle description selection for grouping
  const toggleSelection = (description: string) => {
    setSelectedDescriptions(prev =>
      prev.includes(description)
        ? prev.filter(d => d !== description)
        : [...prev, description]
    );
  };

  // Create a group from selected descriptions
  const createGroup = () => {
    if (selectedDescriptions.length < 2 || !newGroupName.trim()) return;

    const newMapping: MerchantMapping = {
      id: `mapping-${Date.now()}`,
      originalDescriptions: [...selectedDescriptions],
      displayName: newGroupName.trim(),
      category: undefined,
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setMerchantMappings(prev => [...prev, newMapping]);
    setSelectedDescriptions([]);
    setNewGroupName('');
    setGroupingMode(false);
  };

  // Cancel grouping mode
  const cancelGrouping = () => {
    setSelectedDescriptions([]);
    setNewGroupName('');
    setGroupingMode(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Merchant Management</h2>
        <p className="text-gray-400">
          Group similar merchants together and customize their display names
        </p>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search merchants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setGroupingMode(!groupingMode)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              groupingMode
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {groupingMode ? 'Cancel Grouping' : 'Group Merchants'}
          </button>
        </div>

        {/* Group Creation */}
        {groupingMode && (
          <div className="mt-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <h3 className="text-sm font-medium text-white mb-3">
              Create Merchant Group ({selectedDescriptions.length} selected)
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Group name (e.g., 'Amazon')"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={createGroup}
                disabled={selectedDescriptions.length < 2 || !newGroupName.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                Create Group
              </button>
              <button
                onClick={cancelGrouping}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Select at least 2 merchants to group them together
            </p>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl p-6 border border-blue-500/30">
          <h3 className="text-sm font-medium text-blue-300 mb-2">Total Merchants</h3>
          <p className="text-3xl font-bold text-white">{uniqueMerchants.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl p-6 border border-purple-500/30">
          <h3 className="text-sm font-medium text-purple-300 mb-2">Custom Mappings</h3>
          <p className="text-3xl font-bold text-white">{merchantMappings.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl p-6 border border-green-500/30">
          <h3 className="text-sm font-medium text-green-300 mb-2">Grouped Merchants</h3>
          <p className="text-3xl font-bold text-white">
            {merchantMappings.reduce((sum, m) => sum + m.originalDescriptions.length, 0)}
          </p>
        </div>
      </div>

      {/* Merchant List */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                {groupingMode && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-12">
                    Select
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Original Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Display Name
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredMerchants.map((merchant) => {
                const mapping = getMerchantMapping(merchant.description);
                const isEditing = editingMapping && (mapping?.id === editingMapping || merchant.description === editingMapping);
                const isSelected = selectedDescriptions.includes(merchant.description);

                return (
                  <tr
                    key={merchant.description}
                    className={`hover:bg-gray-700/30 transition-colors ${
                      isSelected ? 'bg-blue-500/10' : ''
                    }`}
                  >
                    {groupingMode && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(merchant.description)}
                          className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {merchant.description}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <span className={`text-sm font-medium ${mapping ? 'text-blue-300' : 'text-white'}`}>
                          {getMerchantDisplayName(merchant.description)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">
                      {merchant.count}
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-semibold text-right">
                      ${merchant.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => saveMapping(merchant.description)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(merchant.description)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-medium transition-colors"
                          >
                            {mapping ? 'Edit' : 'Rename'}
                          </button>
                          {mapping && (
                            <button
                              onClick={() => deleteMapping(merchant.description)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium transition-colors"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredMerchants.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">
                {searchTerm ? 'No merchants found matching your search.' : 'No merchants found in transactions.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Existing Mappings Summary */}
      {merchantMappings.length > 0 && (
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Active Merchant Groups</h3>
          <div className="space-y-3">
            {merchantMappings.map((mapping) => (
              <div
                key={mapping.id}
                className="p-4 bg-gray-700/50 rounded-lg border border-gray-600"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-white font-medium">{mapping.displayName}</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Groups {mapping.originalDescriptions.length} description{mapping.originalDescriptions.length > 1 ? 's' : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {mapping.originalDescriptions.map((desc) => (
                        <span
                          key={desc}
                          className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded"
                        >
                          {desc}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setMerchantMappings(prev => prev.filter(m => m.id !== mapping.id))}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
