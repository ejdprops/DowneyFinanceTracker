import type { Transaction, Account, RecurringBill, Debt } from '../types';

// File System Access API types
interface FileSystemFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
  name: string;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | BufferSource | Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemDirectoryHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  name: string;
}

declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }
}

const STORAGE_KEY = 'icloud_directory_handle';
const DATA_FILE = 'finance-data.json';

interface AppData {
  transactions: Transaction[];
  account: Account | null;
  recurringBills: RecurringBill[];
  debts: Debt[];
  lastModified: string;
}

// Convert dates back from JSON strings
const reviveDates = (data: AppData): AppData => {
  return {
    ...data,
    transactions: data.transactions.map(t => ({
      ...t,
      date: new Date(t.date),
    })),
    recurringBills: data.recurringBills.map(b => ({
      ...b,
      nextDueDate: new Date(b.nextDueDate),
    })),
  };
};

/**
 * Check if File System Access API is supported
 */
export const isFileSystemAccessSupported = (): boolean => {
  return 'showDirectoryPicker' in window;
};

/**
 * Request user to select iCloud Drive folder
 */
export const selectICloudFolder = async (): Promise<FileSystemDirectoryHandle | null> => {
  if (!isFileSystemAccessSupported()) {
    alert('File System Access API is not supported in this browser. Please use Safari, Chrome, or Edge.');
    return null;
  }

  try {
    const dirHandle = await window.showDirectoryPicker!({
      mode: 'readwrite',
    } as any);

    // Store permission for future use (note: permissions may need re-request on reload)
    return dirHandle;
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('Error selecting folder:', err);
      alert('Failed to select folder. Please try again.');
    }
    return null;
  }
};

/**
 * Save all app data to iCloud Drive
 */
export const saveToICloud = async (
  dirHandle: FileSystemDirectoryHandle,
  data: AppData
): Promise<boolean> => {
  try {
    // Request permission if needed
    const permission = await (dirHandle as any).queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      const newPermission = await (dirHandle as any).requestPermission({ mode: 'readwrite' });
      if (newPermission !== 'granted') {
        alert('Permission denied. Please grant access to save data.');
        return false;
      }
    }

    // Get or create the data file
    const fileHandle = await dirHandle.getFileHandle(DATA_FILE, { create: true });
    const writable = await fileHandle.createWritable();

    // Add timestamp
    const dataWithTimestamp: AppData = {
      ...data,
      lastModified: new Date().toISOString(),
    };

    // Write data
    await writable.write(JSON.stringify(dataWithTimestamp, null, 2));
    await writable.close();

    console.log('Data saved to iCloud Drive');
    return true;
  } catch (err) {
    console.error('Error saving to iCloud:', err);
    alert('Failed to save data to iCloud Drive. Please try again.');
    return false;
  }
};

/**
 * Load all app data from iCloud Drive
 */
export const loadFromICloud = async (
  dirHandle: FileSystemDirectoryHandle
): Promise<AppData | null> => {
  try {
    // Request permission if needed
    const permission = await (dirHandle as any).queryPermission({ mode: 'read' });
    if (permission !== 'granted') {
      const newPermission = await (dirHandle as any).requestPermission({ mode: 'read' });
      if (newPermission !== 'granted') {
        alert('Permission denied. Please grant access to load data.');
        return null;
      }
    }

    // Get the data file
    const fileHandle = await dirHandle.getFileHandle(DATA_FILE);
    const file = await fileHandle.getFile();
    const text = await file.text();
    const data = JSON.parse(text) as AppData;

    // Convert date strings back to Date objects
    return reviveDates(data);
  } catch (err) {
    if ((err as Error).name === 'NotFoundError') {
      console.log('No existing data file found, will create on first save');
      return null;
    }
    console.error('Error loading from iCloud:', err);
    alert('Failed to load data from iCloud Drive.');
    return null;
  }
};

/**
 * Export data as JSON file (manual fallback)
 */
export const exportData = (data: AppData): void => {
  const dataWithTimestamp: AppData = {
    ...data,
    lastModified: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(dataWithTimestamp, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance-data-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Import data from JSON file (manual fallback)
 */
export const importData = (): Promise<AppData | null> => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text) as AppData;
        resolve(reviveDates(data));
      } catch (err) {
        console.error('Error importing data:', err);
        alert('Failed to import data. Please check the file format.');
        resolve(null);
      }
    };
    input.click();
  });
};

/**
 * Store directory handle reference (for re-use between sessions)
 * Note: Actual handle can't be serialized, this just stores a flag
 */
export const setHasICloudAccess = (hasAccess: boolean): void => {
  localStorage.setItem(STORAGE_KEY, hasAccess ? 'true' : 'false');
};

export const getHasICloudAccess = (): boolean => {
  return localStorage.getItem(STORAGE_KEY) === 'true';
};
