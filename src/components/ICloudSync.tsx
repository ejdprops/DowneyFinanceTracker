import { useState } from 'react';
import {
  isFileSystemAccessSupported,
  selectICloudFolder,
  saveToICloud,
  loadFromICloud,
  exportData,
  importData,
} from '../utils/icloudStorage';
import type { Transaction, Account, RecurringBill, Debt } from '../types';

interface ICloudSyncProps {
  transactions: Transaction[];
  account: Account | null;
  recurringBills: RecurringBill[];
  debts: Debt[];
  onDataLoaded: (data: {
    transactions: Transaction[];
    account: Account | null;
    recurringBills: RecurringBill[];
    debts: Debt[];
  }) => void;
}

export const ICloudSync: React.FC<ICloudSyncProps> = ({
  transactions,
  account,
  recurringBills,
  debts,
  onDataLoaded,
}) => {
  const [iCloudDirHandle, setICloudDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const supportsFileSystem = isFileSystemAccessSupported();

  const handleSelectFolder = async () => {
    const dirHandle = await selectICloudFolder();
    if (dirHandle) {
      setICloudDirHandle(dirHandle);

      // Try to load existing data
      const data = await loadFromICloud(dirHandle);
      if (data) {
        const confirmed = confirm(
          'Found existing data in this folder. Load it? This will replace your current data.'
        );
        if (confirmed) {
          onDataLoaded({
            transactions: data.transactions,
            account: data.account,
            recurringBills: data.recurringBills,
            debts: data.debts,
          });
        }
      }
    }
  };

  const handleSyncToICloud = async () => {
    if (!iCloudDirHandle) {
      alert('Please select an iCloud Drive folder first.');
      return;
    }

    setIsSyncing(true);
    const success = await saveToICloud(iCloudDirHandle, {
      transactions,
      account,
      recurringBills,
      debts,
      lastModified: new Date().toISOString(),
    });
    setIsSyncing(false);

    if (success) {
      alert('Data synced to iCloud Drive successfully!');
    }
  };

  const handleLoadFromICloud = async () => {
    if (!iCloudDirHandle) {
      alert('Please select an iCloud Drive folder first.');
      return;
    }

    setIsSyncing(true);
    const data = await loadFromICloud(iCloudDirHandle);
    setIsSyncing(false);

    if (data) {
      const confirmed = confirm(
        'This will replace your current data with data from iCloud. Continue?'
      );
      if (confirmed) {
        onDataLoaded({
          transactions: data.transactions,
          account: data.account,
          recurringBills: data.recurringBills,
          debts: data.debts,
        });
        alert('Data loaded from iCloud Drive successfully!');
      }
    }
  };

  const handleExport = () => {
    exportData({
      transactions,
      account,
      recurringBills,
      debts,
      lastModified: new Date().toISOString(),
    });
  };

  const handleImport = async () => {
    const data = await importData();
    if (data) {
      const confirmed = confirm(
        'This will replace your current data with data from the file. Continue?'
      );
      if (confirmed) {
        onDataLoaded({
          transactions: data.transactions,
          account: data.account,
          recurringBills: data.recurringBills,
          debts: data.debts,
        });
        alert('Data imported successfully!');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">iCloud Drive Sync</h2>
        <p className="text-gray-400">
          Sync your financial data to a shared iCloud Drive folder accessible by your Apple Family
        </p>
      </div>

      {/* iCloud Drive Integration */}
      {supportsFileSystem ? (
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl p-6 border border-blue-500/30">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-white">iCloud Drive Integration</h3>
              <p className="text-sm text-gray-400">
                {iCloudDirHandle
                  ? `Connected to: ${iCloudDirHandle.name}`
                  : 'Not connected'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {!iCloudDirHandle ? (
              <button
                onClick={handleSelectFolder}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all font-medium"
              >
                Select iCloud Drive Folder
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSyncToICloud}
                  disabled={isSyncing}
                  className="px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? 'Syncing...' : 'Save to iCloud'}
                </button>
                <button
                  onClick={handleLoadFromICloud}
                  disabled={isSyncing}
                  className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? 'Loading...' : 'Load from iCloud'}
                </button>
                <button
                  onClick={handleSelectFolder}
                  className="col-span-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-all"
                >
                  Change Folder
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <p className="text-xs text-blue-300">
              <strong>Tip:</strong> Create a shared folder in iCloud Drive, share it with your family member,
              and both select the same folder. Changes will sync automatically via iCloud.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-500/20 rounded-2xl p-6 border border-yellow-500/30">
          <h3 className="text-lg font-semibold text-yellow-300 mb-2">Browser Not Supported</h3>
          <p className="text-sm text-yellow-200">
            Your browser doesn't support File System Access API. Please use Safari, Chrome, or Edge
            for iCloud Drive integration, or use the manual export/import below.
          </p>
        </div>
      )}

      {/* Manual Export/Import */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Manual Backup</h3>
        <p className="text-sm text-gray-400 mb-4">
          Export your data to a file and save it to iCloud Drive manually, or import from a file.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all font-medium"
          >
            Export Data
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
          >
            Import Data
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">Setup Instructions</h3>
        <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
          <li>Create a new folder in your iCloud Drive (e.g., "Family Finances")</li>
          <li>Right-click the folder and select "Share" → Add your family member</li>
          <li>Both of you click "Select iCloud Drive Folder" and choose the same folder</li>
          <li>The first person saves data to iCloud</li>
          <li>The second person loads the data from iCloud</li>
          <li>From then on, click "Save to iCloud" after making changes</li>
          <li>Click "Load from iCloud" to get the latest data</li>
        </ol>
      </div>
    </div>
  );
};
