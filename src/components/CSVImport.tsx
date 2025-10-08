import { useState, useRef } from 'react';
import { parseUSAACSV } from '../utils/csvParser';
import type { ParsedCSVData } from '../types';

interface CSVImportProps {
  onImportComplete: (data: ParsedCSVData) => void;
}

export const CSVImport: React.FC<CSVImportProps> = ({ onImportComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setIsProcessing(true);

    try {
      const data = await parseUSAACSV(file);
      onImportComplete(data);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Failed to parse CSV file. Please check the format.');
    } finally {
      setIsProcessing(false);
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

  return (
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
        accept=".csv"
        onChange={handleFileInput}
        className="hidden"
      />

      {isProcessing ? (
        <div className="space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400">Processing CSV file...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-6xl">📊</div>
          <div className="text-gray-300">
            <p className="text-lg font-semibold text-white">Import USAA Transactions</p>
            <p className="text-sm mt-2 text-gray-400">
              Drag and drop your CSV file here, or click to browse
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
