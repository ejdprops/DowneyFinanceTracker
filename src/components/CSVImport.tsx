import { useState, useRef } from 'react';
import { parseCSV } from '../utils/csvParser';
import type { ParsedCSVData } from '../types';

interface CSVImportProps {
  onImportComplete: (data: ParsedCSVData, currentBalance?: number) => void;
}

export const CSVImport: React.FC<CSVImportProps> = ({ onImportComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('Processing file...');
  const [showBalancePrompt, setShowBalancePrompt] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null);
  const [balanceInput, setBalanceInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const isPDF = file.name.toLowerCase().endsWith('.pdf');

    if (!isCSV && !isPDF) {
      alert('Please select a CSV or PDF file');
      return;
    }

    setIsProcessing(true);
    setProcessingMessage(isPDF ? 'Extracting data from PDF...' : 'Processing CSV file...');

    try {
      let data: ParsedCSVData;

      if (isPDF) {
        // Lazy load PDF parser only when needed
        const { parseBankStatementPDF } = await import('../utils/pdfParser');
        data = await parseBankStatementPDF(file);
      } else {
        data = await parseCSV(file);
      }

      // Store parsed data and show balance prompt
      setParsedData(data);
      setIsProcessing(false);
      setShowBalancePrompt(true);
    } catch (error) {
      console.error('Error parsing file:', error);
      alert(`Failed to parse ${isPDF ? 'PDF' : 'CSV'} file. Please check the format.`);
      setIsProcessing(false);
    }
  };

  const handleBalanceSubmit = () => {
    if (!parsedData) return;

    const balance = balanceInput ? parseFloat(balanceInput.replace(/[$,]/g, '')) : undefined;

    if (balanceInput && (isNaN(balance!) || balance! < 0)) {
      alert('Please enter a valid balance amount');
      return;
    }

    onImportComplete(parsedData, balance);
    setShowBalancePrompt(false);
    setParsedData(null);
    setBalanceInput('');
  };

  const handleBalanceSkip = () => {
    if (!parsedData) return;

    onImportComplete(parsedData);
    setShowBalancePrompt(false);
    setParsedData(null);
    setBalanceInput('');
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

  return (
    <>
      <div
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-200 backdrop-blur-sm
          ${dragActive ? 'border-blue-500 bg-blue-500/20' : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.pdf"
          onChange={handleFileInput}
          className="hidden"
        />

        {isProcessing ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400">{processingMessage}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl">📊</div>
            <div className="text-gray-300">
              <p className="text-lg font-semibold text-white">Import Bank Transactions</p>
              <p className="text-sm mt-2 text-gray-400">
                Drag and drop your CSV or PDF statement here, or click to browse
              </p>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
                <span className="px-3 py-1 bg-gray-700 rounded-lg">CSV</span>
                <span className="px-3 py-1 bg-gray-700 rounded-lg">PDF</span>
              </div>
              <p className="text-xs mt-3 text-gray-500">
                Supports Apple Card, USAA, Chase, Bank of America, Wells Fargo, Capital One, and more
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Balance Prompt Modal */}
      {showBalancePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">Update Current Balance</h3>
            <p className="text-gray-400 text-sm mb-6">
              Enter your current account balance from your bank's app to keep your balances accurate. This is optional - you can skip if you prefer to use the balance from the imported file.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Current Balance (optional)
              </label>
              <input
                type="text"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleBalanceSubmit();
                  if (e.key === 'Escape') handleBalanceSkip();
                }}
                placeholder="$0.00"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBalanceSkip}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Skip
              </button>
              <button
                onClick={handleBalanceSubmit}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Update Balance
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
