import { useState, useRef } from 'react';
import { parseUSAACSV } from '../utils/csvParser';
import type { ParsedCSVData, Account } from '../types';

interface CSVImportProps {
  accounts: Account[];
  onImportComplete: (data: ParsedCSVData, accountId?: string) => void;
}

export const CSVImport: React.FC<CSVImportProps> = ({ accounts, onImportComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showAccountSelect, setShowAccountSelect] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    // If there are accounts, show account selection first
    if (accounts.length > 0) {
      setPendingFile(file);
      setShowAccountSelect(true);
      return;
    }

    // No accounts, proceed without linking
    await processFile(file);
  };

  const processFile = async (file: File, accountId?: string) => {
    setIsProcessing(true);
    setShowAccountSelect(false);

    try {
      const data = await parseUSAACSV(file);
      onImportComplete(data, accountId);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Failed to parse CSV file. Please check the format.');
    } finally {
      setIsProcessing(false);
      setPendingFile(null);
      setSelectedAccountId('');
    }
  };

  const handleAccountSubmit = () => {
    if (pendingFile) {
      processFile(pendingFile, selectedAccountId || undefined);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Account Selection Modal */}
      {showAccountSelect && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Link to Account
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            Select which account these transactions belong to:
          </p>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
          >
            <option value="">No account (import without linking)</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.type})
                {account.institution && ` - ${account.institution}`}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleAccountSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Import
            </button>
            <button
              onClick={() => {
                setShowAccountSelect(false);
                setPendingFile(null);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors duration-200
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="space-y-4">
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600">Processing CSV file...</p>
            </>
          ) : (
            <>
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-gray-600">
                <p className="text-lg font-semibold">Import USAA CSV File</p>
                <p className="text-sm mt-2">
                  Drag and drop your CSV file here, or click to browse
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Supports USAA Savings Bank transaction exports
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold mb-2">Expected CSV Format:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Date column (Date, Transaction Date, or Posted Date)</li>
          <li>Description column (Description or Original Description)</li>
          <li>Amount column (Amount, Debit, or Credit)</li>
          <li>Optional: Balance, Category columns</li>
        </ul>
      </div>
    </div>
  );
};
