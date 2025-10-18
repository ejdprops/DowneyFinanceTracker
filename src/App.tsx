import { useState, useEffect, useMemo, useCallback } from 'react';
import { TransactionRegister } from './components/TransactionRegister';
import { RecurringBillsManager } from './components/RecurringBillsManager';
import { RecurringSuggestions } from './components/RecurringSuggestions';
import { Projections } from './components/Projections';
import { DebtsTracker } from './components/DebtsTracker';
import { ICloudSync } from './components/ICloudSync';
import { AccountManagement } from './components/AccountManagement';
import { SpendingCharts } from './components/SpendingCharts';
import { MerchantManagement } from './components/MerchantManagement';
import { HelpModal } from './components/HelpModal';
import RecurringBillUpdatePrompt from './components/RecurringBillUpdatePrompt';
import { AppleCardInstallments } from './components/AppleCardInstallments';
import type { Transaction, Account, RecurringBill, Debt, ParsedCSVData } from './types';
import {
  saveTransactions,
  loadTransactions,
  saveAccounts,
  saveActiveAccountId,
  loadActiveAccountId,
  saveRecurringBills,
  loadRecurringBills,
  saveDebts,
  loadDebts,
  migrateToMultiAccount,
  saveDismissedProjections,
  loadDismissedProjections,
  saveICloudFolderPath,
  loadICloudFolderPath,
} from './utils/storage';
import { saveToICloud } from './utils/icloudStorage';
import { generateProjections, calculateBalances, getNextOccurrence } from './utils/projections';
import { parseCSV } from './utils/csvParser';
import logo from './assets/downey-app-logo-header.png';

// Declare global build timestamp injected by Vite
declare const __BUILD_DATE__: string;

// Build timestamp - injected at build time
const BUILD_DATE = __BUILD_DATE__;
const VERSION = '1.6.4'; // Updated to downey-app-logo-header

function App() {
  const [currentTab, setCurrentTab] = useState<'account' | 'register' | 'recurring' | 'projections' | 'charts' | 'merchants' | 'debts' | 'sync'>('account');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showProjections, setShowProjections] = useState(false);
  const [dismissedProjections, setDismissedProjections] = useState<Set<string>>(new Set());
  const [projectedVisibility, setProjectedVisibility] = useState<Map<string, boolean>>(new Map());
  const [projectedState, setProjectedState] = useState<Map<string, Partial<Transaction>>>(new Map());
  const [showAccountManagement, setShowAccountManagement] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pendingBillUpdates, setPendingBillUpdates] = useState<Array<{
    billId: string;
    bill: RecurringBill;
    importedAmount: number;
    importedDate: Date;
    proposedNextDueDate: Date;
  }>>([]);
  const [iCloudDirHandle, setICloudDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [iCloudFolderPath, setICloudFolderPath] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadedTransactions = loadTransactions();
    const migratedAccounts = migrateToMultiAccount();
    const savedActiveAccountId = loadActiveAccountId();
    const loadedBills = loadRecurringBills();
    const loadedDebts = loadDebts();
    const loadedDismissedProjections = loadDismissedProjections();
    const savedFolderPath = loadICloudFolderPath();

    setTransactions(loadedTransactions);
    setAccounts(migratedAccounts);
    setActiveAccountId(savedActiveAccountId || migratedAccounts[0]?.id || '');
    setRecurringBills(loadedBills);
    setDebts(loadedDebts);
    setDismissedProjections(loadedDismissedProjections);
    setICloudFolderPath(savedFolderPath);
  }, []);

  // Save data when it changes
  useEffect(() => {
    if (transactions.length > 0) {
      saveTransactions(transactions);
    }
  }, [transactions]);

  useEffect(() => {
    if (accounts.length > 0) {
      saveAccounts(accounts);
    }
  }, [accounts]);

  useEffect(() => {
    if (activeAccountId) {
      saveActiveAccountId(activeAccountId);
    }
  }, [activeAccountId]);

  useEffect(() => {
    if (recurringBills.length > 0) {
      saveRecurringBills(recurringBills);
    }
  }, [recurringBills]);

  useEffect(() => {
    if (debts.length > 0) {
      saveDebts(debts);
    }
  }, [debts]);

  useEffect(() => {
    saveDismissedProjections(dismissedProjections);
  }, [dismissedProjections]);

  // Get active account - memoized
  const account = useMemo(
    () => accounts.find(a => a.id === activeAccountId) || null,
    [accounts, activeAccountId]
  );

  // Filter transactions and bills for active account - memoized
  const accountTransactions = useMemo(
    () => transactions.filter(t => t.accountId === activeAccountId),
    [transactions, activeAccountId]
  );

  const accountRecurringBills = useMemo(
    () => recurringBills.filter(b => b.accountId === activeAccountId),
    [recurringBills, activeAccountId]
  );

  // Account management handlers - memoized with useCallback
  const handleSelectAccount = useCallback((accountId: string) => {
    setActiveAccountId(accountId);
  }, []);

  const handleAddAccount = useCallback((accountData: Omit<Account, 'id'>) => {
    const newAccount: Account = {
      ...accountData,
      id: `account-${Date.now()}`,
    };
    setAccounts(prev => [...prev, newAccount]);
  }, []);

  const handleUpdateAccount = useCallback((updatedAccount: Account) => {
    setAccounts(prev => prev.map(a => a.id === updatedAccount.id ? updatedAccount : a));
  }, []);

  const handleDeleteAccount = (accountId: string) => {
    // Remove all transactions for this account
    setTransactions(transactions.filter(t => t.accountId !== accountId));
    // Remove all recurring bills for this account
    setRecurringBills(recurringBills.filter(b => b.accountId !== accountId));
    // Remove the account
    const newAccounts = accounts.filter(a => a.id !== accountId);
    setAccounts(newAccounts);
    // Switch to first remaining account
    if (activeAccountId === accountId && newAccounts.length > 0) {
      setActiveAccountId(newAccounts[0].id);
    }
  };

  const handleImportComplete = (
    data: ParsedCSVData,
    currentBalance?: number,
    accountSummary?: { newBalance?: number; minimumPayment?: number; paymentDueDate?: string }
  ) => {
    if (!activeAccountId) return;

    // Track duplicates and updates
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let postedCount = 0; // Track pending->posted transitions

    const updatedTransactions = [...transactions];
    const billsToUpdate = new Set<string>(); // Track recurring bills that need nextDueDate updated
    const billUpdateData = new Map<string, { amount: number; date: Date }>(); // Track imported transaction data for each bill

    data.transactions.forEach(importedTx => {
      // Add accountId to imported transaction
      let txWithAccount = { ...importedTx, accountId: activeAccountId };

      // Try to match with recurring bills for this account
      const matchingBill = recurringBills.find(bill => {
        if (bill.accountId !== activeAccountId || !bill.isActive) return false;

        // Amount matching logic based on bill type
        const amountType = bill.amountType || 'fixed'; // Default to fixed for backward compatibility
        if (amountType === 'fixed') {
          // Fixed amount: must match within 1 cent
          if (Math.abs(bill.amount - txWithAccount.amount) >= 0.01) return false;
        } else {
          // Variable amount: use tolerance percentage
          const tolerance = bill.amountTolerance || 10; // Default to 10%
          const maxDiff = Math.abs(bill.amount) * (tolerance / 100);
          if (Math.abs(bill.amount - txWithAccount.amount) > maxDiff) return false;
        }

        // Check if description matches (case-insensitive, fuzzy matching)
        const billDesc = bill.description.toLowerCase().trim();
        const txDesc = txWithAccount.description.toLowerCase().trim();

        // Exact match
        if (billDesc === txDesc) return true;

        // Check if one contains the other
        if (billDesc.includes(txDesc) || txDesc.includes(billDesc)) return true;

        // Special handling for USAA-style descriptions with pipe separator
        // Format: "MERCHANT NAME PHONE/DATE/ID | MERCHANT NAME PHONE/DATE/ID"
        // We want to match on merchant name, ignoring phone/date/ID variations
        if (billDesc.includes('|') && txDesc.includes('|')) {
          // Extract the part before any numbers (merchant name)
          const extractMerchantName = (desc: string) => {
            // Split by pipe and take first part
            const firstPart = desc.split('|')[0].trim();
            // Remove trailing numbers/phone/date (keep only letters and spaces at the start)
            const merchantMatch = firstPart.match(/^([a-z\s]+)/);
            return merchantMatch ? merchantMatch[1].trim() : firstPart;
          };

          const billMerchant = extractMerchantName(billDesc);
          const txMerchant = extractMerchantName(txDesc);

          // Match if merchant names are the same (at least 3 chars to avoid false positives)
          if (billMerchant.length >= 3 && txMerchant.length >= 3 && billMerchant === txMerchant) {
            return true;
          }
        }

        // Check if they share significant words (filter out very short words and special chars)
        const cleanAndSplit = (desc: string) => {
          return desc
            .split(/\s+/)
            .map(w => w.replace(/[^a-z0-9]/g, '')) // Remove special characters
            .filter(w => w.length >= 3); // Only keep words with 3+ characters
        };

        const billWords = new Set(cleanAndSplit(billDesc));
        const txWords = new Set(cleanAndSplit(txDesc));
        const commonWords = [...billWords].filter(w => txWords.has(w)).length;
        const totalWords = Math.max(billWords.size, txWords.size);

        // Match if they share at least 60% of words OR at least 3 significant words in common
        if (totalWords > 0 && (commonWords / totalWords >= 0.6 || commonWords >= 3)) return true;

        return false;
      });

      // If matched with recurring bill, link them and use bill's category
      if (matchingBill) {
        txWithAccount = {
          ...txWithAccount,
          recurringBillId: matchingBill.id,
          category: matchingBill.category, // Use recurring bill's category
        };
        console.log(`Matched transaction "${txWithAccount.description}" with recurring bill "${matchingBill.description}"`);

        // ALWAYS mark this bill for potential update (whether projected transaction exists or not)
        billsToUpdate.add(matchingBill.id);

        // Store the imported transaction data for this bill (use most recent if multiple matches)
        const existingData = billUpdateData.get(matchingBill.id);
        if (!existingData || txWithAccount.date > existingData.date) {
          billUpdateData.set(matchingBill.id, {
            amount: txWithAccount.amount,
            date: txWithAccount.date
          });
        }

      }

      // Check for existing transaction by:
      // 1. ID (exact match within same account)
      // 2. Description + amount + account (duplicate detection - ignoring date for pending->posted)
      const existingByIdIndex = updatedTransactions.findIndex(t =>
        t.id === txWithAccount.id && t.accountId === activeAccountId
      );

      // For pending transactions that have posted OR pending duplicates, we need to match by description + amount
      // This allows us to find the same transaction even if the date changed or it's being re-imported
      // Use fuzzy matching for description since USAA and other banks may update the description when posting
      const existingPendingIndex = updatedTransactions.findIndex(t => {
        if (t.accountId !== activeAccountId || !t.isPending) return false;

        // Amount must match closely
        if (Math.abs(t.amount - txWithAccount.amount) >= 0.01) return false;

        // Description can be exact match OR similar (for USAA which updates descriptions)
        const existingDesc = t.description.toLowerCase().trim();
        const newDesc = txWithAccount.description.toLowerCase().trim();

        // Exact match
        if (existingDesc === newDesc) return true;

        // Fuzzy match: check if one description contains the other (for USAA updates)
        // Or if they share significant common text
        if (existingDesc.includes(newDesc) || newDesc.includes(existingDesc)) return true;

        // Special handling for USAA-style descriptions with pipe separator
        // Format: "MERCHANT NAME PHONE/DATE/ID | MERCHANT NAME PHONE/DATE/ID"
        if (existingDesc.includes('|') && newDesc.includes('|')) {
          const extractMerchantName = (desc: string) => {
            const firstPart = desc.split('|')[0].trim();
            const merchantMatch = firstPart.match(/^([a-z\s]+)/);
            return merchantMatch ? merchantMatch[1].trim() : firstPart;
          };

          const existingMerchant = extractMerchantName(existingDesc);
          const newMerchant = extractMerchantName(newDesc);

          if (existingMerchant.length >= 3 && newMerchant.length >= 3 && existingMerchant === newMerchant) {
            return true;
          }
        }

        // Check if descriptions share at least 70% of words (for minor variations)
        const existingWords = new Set(existingDesc.split(/\s+/));
        const newWords = new Set(newDesc.split(/\s+/));
        const commonWords = [...existingWords].filter(w => newWords.has(w)).length;
        const totalWords = Math.max(existingWords.size, newWords.size);
        if (totalWords > 0 && commonWords / totalWords >= 0.7) return true;

        return false;
      });

      // Regular duplicate detection (same date + description + amount)
      const existingByDataIndex = updatedTransactions.findIndex(t =>
        t.accountId === activeAccountId &&
        !t.isPending && // Don't match pending transactions here
        t.date.toDateString() === txWithAccount.date.toDateString() &&
        t.description === txWithAccount.description &&
        Math.abs(t.amount - txWithAccount.amount) < 0.01
      );

      // Priority: ID match > Pending match > Data match
      let existingIndex = -1;
      let isPendingToPosted = false;
      let isPendingDuplicate = false;

      if (existingByIdIndex !== -1) {
        existingIndex = existingByIdIndex;
      } else if (existingPendingIndex !== -1) {
        existingIndex = existingPendingIndex;
        if (!txWithAccount.isPending) {
          // Pending transaction is now posted
          isPendingToPosted = true;
        } else {
          // Both are pending - this is a duplicate import of the same pending transaction
          isPendingDuplicate = true;
        }
      } else if (existingByDataIndex !== -1) {
        existingIndex = existingByDataIndex;
      }

      if (existingIndex !== -1) {
        const existing = updatedTransactions[existingIndex];

        if (isPendingToPosted) {
          // Pending transaction has posted - update with new ID, date, status, and category
          // For USAA checking accounts, the category is often more accurate once the transaction clears
          updatedTransactions[existingIndex] = {
            ...txWithAccount, // Use all new data from CSV (including updated category)
            isReconciled: existing.isReconciled, // Preserve reconciled status
            isPending: false, // Explicitly mark as not pending
          };
          postedCount++;
          console.log(`Updated pending transaction to posted: ${existing.description} -> ${txWithAccount.description}, Category: ${existing.category} -> ${txWithAccount.category}`);
        } else if (isPendingDuplicate) {
          // Pending transaction re-imported - update with new data (may have better category/recurringBillId)
          updatedTransactions[existingIndex] = {
            ...existing, // Keep existing data as base
            ...txWithAccount, // Override with new CSV data
            isReconciled: existing.isReconciled, // Preserve reconciled status
            recurringBillId: txWithAccount.recurringBillId || existing.recurringBillId, // Use new bill link if found
            category: txWithAccount.recurringBillId ? txWithAccount.category : existing.category, // Use bill category if matched
          };
          updatedCount++;
          console.log(`Updated pending transaction with better data: ${existing.description}, Category: ${existing.category} -> ${txWithAccount.category}`);
        } else if (existing.isManual) {
          // If existing was manual (user created from projected or added manually), update it
          updatedTransactions[existingIndex] = {
            ...txWithAccount,
            isReconciled: existing.isReconciled, // Preserve reconciled status
          };
          updatedCount++;
        } else {
          // Already imported from CSV, skip duplicate
          skippedCount++;
        }
      } else {
        // New transaction - check if it should replace a projected transaction
        if (txWithAccount.recurringBillId) {
          // Find projected transaction for same recurring bill within +/- 7 days
          const projectedIndex = updatedTransactions.findIndex(t => {
            if (!t.description.includes('(Projected)')) return false;
            if (t.recurringBillId !== txWithAccount.recurringBillId) return false;

            // Check if dates are within 7 days of each other
            const daysDiff = Math.abs(
              (t.date.getTime() - txWithAccount.date.getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysDiff <= 7;
          });

          if (projectedIndex !== -1) {
            // Replace projected transaction with real one
            updatedTransactions[projectedIndex] = txWithAccount;
            console.log(`Replaced projected transaction with real transaction: "${txWithAccount.description}"`);
            newCount++;
          } else {
            // No projected transaction found, just add the new one
            // (Bill was already marked for update when we matched it above)
            updatedTransactions.push(txWithAccount);
            newCount++;
          }
        } else {
          // Not linked to recurring bill, just add it
          updatedTransactions.push(txWithAccount);
          newCount++;
        }
      }
    });

    setTransactions(updatedTransactions);

    // Auto-calculate balance based on imported transactions
    let calculatedBalance: number | undefined;
    if (account && newCount > 0) {
      // Get all transactions for this account (including newly imported ones)
      const accountTransactions = updatedTransactions
        .filter(t => t.accountId === activeAccountId)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      if (accountTransactions.length > 0) {
        // Calculate balances for all transactions
        const balances = calculateBalances(accountTransactions, account.availableBalance || 0);
        // Get the most recent balance
        if (balances.length > 0) {
          calculatedBalance = balances[balances.length - 1].balance;
        }
      }
    }

    // Prepare recurring bill updates for user confirmation
    if (billsToUpdate.size > 0) {
      const updates = Array.from(billsToUpdate).map(billId => {
        const bill = recurringBills.find(b => b.id === billId);
        const importedData = billUpdateData.get(billId);

        if (!bill || !importedData) return null;

        // Calculate next occurrence from current nextDueDate
        const currentDueDate = typeof bill.nextDueDate === 'string'
          ? new Date(bill.nextDueDate + 'T00:00:00')
          : new Date(bill.nextDueDate);

        const proposedNextDueDate = getNextOccurrence(
          currentDueDate,
          bill.frequency,
          bill.dayOfMonth,
          bill.dayOfWeek,
          bill.weekOfMonth
        );

        return {
          billId,
          bill,
          importedAmount: importedData.amount,
          importedDate: importedData.date,
          proposedNextDueDate
        };
      }).filter(u => u !== null) as Array<{
        billId: string;
        bill: RecurringBill;
        importedAmount: number;
        importedDate: Date;
        proposedNextDueDate: Date;
      }>;

      // Show the confirmation prompt
      setPendingBillUpdates(updates);
    }

    // Update account balance and summary
    if (account && (currentBalance !== undefined || accountSummary || calculatedBalance !== undefined)) {
      const updatedAccount = { ...account };

      // Priority: explicit currentBalance > accountSummary.newBalance > calculatedBalance
      if (currentBalance !== undefined) {
        updatedAccount.availableBalance = currentBalance;
      } else if (accountSummary?.newBalance !== undefined) {
        updatedAccount.availableBalance = accountSummary.newBalance;
      } else if (calculatedBalance !== undefined) {
        updatedAccount.availableBalance = calculatedBalance;
      }

      if (accountSummary) {
        if (accountSummary.minimumPayment !== undefined) {
          updatedAccount.minimumPayment = accountSummary.minimumPayment;
        }
        if (accountSummary.paymentDueDate) {
          updatedAccount.paymentDueDate = new Date(accountSummary.paymentDueDate);
        }
      }

      handleUpdateAccount(updatedAccount);
    }

    if (data.errors.length > 0) {
      alert(`Import completed with ${data.errors.length} errors. Check console for details.`);
      console.error('Import errors:', data.errors);
    } else {
      const balance = currentBalance ?? accountSummary?.newBalance ?? calculatedBalance;
      const balanceMsg = balance !== undefined ? `\nBalance updated to: $${balance.toFixed(2)}` : '';
      const postedMsg = postedCount > 0 ? `\nPending→Posted: ${postedCount}` : '';
      const minPaymentMsg = accountSummary?.minimumPayment ? `\nMin Payment: $${accountSummary.minimumPayment.toFixed(2)}` : '';
      const dueDateMsg = accountSummary?.paymentDueDate ? `\nDue Date: ${new Date(accountSummary.paymentDueDate).toLocaleDateString()}` : '';
      alert(`Import complete!\nNew: ${newCount}\nUpdated: ${updatedCount}\nSkipped: ${skippedCount}${postedMsg}${balanceMsg}${minPaymentMsg}${dueDateMsg}`);
    }
  };

  const handleAddTransaction = (transaction: Omit<Transaction, 'id' | 'accountId'>) => {
    if (!activeAccountId) return;
    const newTransaction: Transaction = {
      ...transaction,
      id: `manual-${Date.now()}`,
      accountId: activeAccountId,
    };
    setTransactions([...transactions, newTransaction]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const handleDeleteMultipleTransactions = (ids: string[]) => {
    const idsSet = new Set(ids);
    setTransactions(transactions.filter(t => !idsSet.has(t.id)));
  };

  const handleUpdateTransaction = (transaction: Transaction) => {
    // If it's a projected transaction (id starts with 'proj-'), store all state separately
    if (transaction.id.startsWith('proj-')) {
      const newVisibility = new Map(projectedVisibility);
      newVisibility.set(transaction.id, transaction.isProjectedVisible !== false);
      setProjectedVisibility(newVisibility);

      // Store all other state changes (reconciled, pending, etc.) for this specific projection
      const newState = new Map(projectedState);
      newState.set(transaction.id, {
        isReconciled: transaction.isReconciled,
        isPending: transaction.isPending,
        isProjectedVisible: transaction.isProjectedVisible,
      });
      setProjectedState(newState);
    } else {
      // Regular transaction - update in transactions array
      setTransactions(transactions.map(t => t.id === transaction.id ? transaction : t));
    }
  };

  const handleDismissProjection = (projectionId: string) => {
    setDismissedProjections(new Set([...dismissedProjections, projectionId]));
  };

  const handleAddBill = (bill: Omit<RecurringBill, 'id' | 'accountId'>) => {
    if (!activeAccountId) return;
    const newBill: RecurringBill = {
      ...bill,
      id: `bill-${Date.now()}`,
      accountId: activeAccountId,
    };
    setRecurringBills([...recurringBills, newBill]);
  };

  const handleUpdateBill = (bill: RecurringBill) => {
    setRecurringBills(recurringBills.map(b => b.id === bill.id ? bill : b));
  };

  const handleDeleteBill = (id: string) => {
    setRecurringBills(recurringBills.filter(b => b.id !== id));
  };

  const handleConfirmBillUpdates = (approvedUpdates: Array<{ billId: string; updateDate: boolean; updateAmount: boolean }>) => {
    const updatedBills = recurringBills.map(bill => {
      const approval = approvedUpdates.find(a => a.billId === bill.id);
      if (!approval) return bill;

      const pendingUpdate = pendingBillUpdates.find(u => u.billId === bill.id);
      if (!pendingUpdate) return bill;

      let updatedBill = { ...bill };

      if (approval.updateDate) {
        updatedBill.nextDueDate = pendingUpdate.proposedNextDueDate;
        console.log(`Updated recurring bill "${bill.description}" nextDueDate: ${bill.nextDueDate} → ${pendingUpdate.proposedNextDueDate.toLocaleDateString()}`);
      }

      if (approval.updateAmount) {
        updatedBill.amount = pendingUpdate.importedAmount;
        console.log(`Updated recurring bill "${bill.description}" amount: $${bill.amount.toFixed(2)} → $${pendingUpdate.importedAmount.toFixed(2)}`);
      }

      return updatedBill;
    });

    setRecurringBills(updatedBills);
    setPendingBillUpdates([]);
  };

  const handleCancelBillUpdates = () => {
    setPendingBillUpdates([]);
  };

  const handleAddDebt = (debt: Omit<Debt, 'id'>) => {
    const newDebt: Debt = {
      ...debt,
      id: `debt-${Date.now()}`,
    };
    setDebts([...debts, newDebt]);
  };

  const handleUpdateDebt = (debt: Debt) => {
    setDebts(debts.map(d => d.id === debt.id ? debt : d));
  };

  const handleDeleteDebt = (id: string) => {
    setDebts(debts.filter(d => d.id !== id));
  };

  const handleDataLoaded = (data: {
    transactions: Transaction[];
    accounts: Account[];
    activeAccountId: string;
    recurringBills: RecurringBill[];
    debts: Debt[];
  }) => {
    setTransactions(data.transactions);
    setAccounts(data.accounts);
    setActiveAccountId(data.activeAccountId);
    setRecurringBills(data.recurringBills);
    setDebts(data.debts);
  };

  const handleFolderSelected = useCallback((dirHandle: FileSystemDirectoryHandle, folderPath: string) => {
    setICloudDirHandle(dirHandle);
    setICloudFolderPath(folderPath);
    saveICloudFolderPath(folderPath);
  }, []);

  const handleQuickSync = async () => {
    if (!iCloudDirHandle) {
      alert('Please select an iCloud Drive folder first from the iCloud Sync tab.');
      return;
    }

    setIsSyncing(true);
    const success = await saveToICloud(iCloudDirHandle, {
      transactions,
      accounts,
      activeAccountId,
      recurringBills,
      debts,
      lastModified: new Date().toISOString(),
    });
    setIsSyncing(false);

    if (success) {
      alert('Data synced to iCloud Drive successfully!');
    }
  };

  const handleAdjustBalance = () => {
    if (!account) return;

    const currentBalanceStr = prompt(
      `Enter the current balance shown in your bank's app:\n\n` +
      `Current calculated balance: $${currentBalance.toFixed(2)}\n\n` +
      `This will update the account balance and recalculate all transaction balances.`
    );

    if (currentBalanceStr === null) return; // User cancelled

    const newBalance = parseFloat(currentBalanceStr.replace(/[$,]/g, ''));

    if (isNaN(newBalance)) {
      alert('Please enter a valid balance amount');
      return;
    }

    // Update the account's available balance
    const updatedAccount = { ...account, availableBalance: newBalance };
    handleUpdateAccount(updatedAccount);

    alert(`Balance updated to $${newBalance.toFixed(2)}\nAll transaction balances have been recalculated.`);
  };

  const handleSnapshot = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;

      // Find the account balance section
      const balanceSection = document.getElementById('account-balances-snapshot');
      if (!balanceSection) {
        alert('Could not find balance section to snapshot');
        return;
      }

      // Temporarily make it visible for screenshot
      balanceSection.classList.remove('hidden');
      balanceSection.classList.add('block');

      // Wait a moment for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create canvas from the element
      const canvas = await html2canvas(balanceSection, {
        backgroundColor: '#1f2937', // Match the app background
        scale: 2, // Higher quality
        logging: false,
        width: 280,
        windowWidth: 280,
      });

      // Hide it again
      balanceSection.classList.remove('block');
      balanceSection.classList.add('hidden');

      // Convert to blob and copy to clipboard
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('Failed to create snapshot');
          return;
        }

        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('Balance snapshot copied to clipboard! You can now paste it into a message.');
        } catch (err) {
          // Fallback: download the image
          console.error('Clipboard API failed, downloading instead:', err);
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `balances-${new Date().toISOString().split('T')[0]}.png`;
          link.click();
          URL.revokeObjectURL(url);
          alert('Balance snapshot downloaded! (Clipboard not supported in this browser)');
        }
      });
    } catch (error) {
      console.error('Snapshot error:', error);
      alert('Failed to create snapshot. Please try again.');

      // Make sure to hide the snapshot element even if error occurs
      const balanceSection = document.getElementById('account-balances-snapshot');
      if (balanceSection) {
        balanceSection.classList.remove('block');
        balanceSection.classList.add('hidden');
      }
    }
  };

  // All transactions with projections - always includes projections for balance calculations
  const allTransactionsWithProjections = useMemo(() => {
    if (!account) {
      return calculateBalances(accountTransactions, 0);
    }

    const projections = generateProjections(accountRecurringBills, 60)
      .filter(projection => {
        // Filter out dismissed projections
        if (dismissedProjections.has(projection.id)) {
          return false;
        }

        // Filter out projected transactions that match existing manual transactions
        const projectionDate = projection.date.toDateString();
        const projectionDesc = projection.description.replace(' (Projected)', '');
        return !accountTransactions.some(t =>
          t.date.toDateString() === projectionDate &&
          t.description.toLowerCase() === projectionDesc.toLowerCase()
        );
      })
      .map(projection => {
        // Apply stored state for this specific projection (visibility, reconciled, pending, etc.)
        const storedState = projectedState.get(projection.id);
        return {
          ...projection,
          // Apply stored state if it exists, otherwise use defaults
          isProjectedVisible: storedState?.isProjectedVisible !== undefined
            ? storedState.isProjectedVisible
            : (projectedVisibility.has(projection.id) ? projectedVisibility.get(projection.id)! : true),
          isReconciled: storedState?.isReconciled || false,
          isPending: storedState?.isPending !== undefined ? storedState.isPending : true,
        };
      });

    return calculateBalances([...accountTransactions, ...projections], account.availableBalance);
  }, [account, accountTransactions, accountRecurringBills, dismissedProjections, projectedState, projectedVisibility]);

  // Transactions for display in register - filtered by showProjections checkbox
  const allTransactions = useMemo(() => {
    if (!showProjections) {
      return calculateBalances(accountTransactions, account?.availableBalance || 0);
    }
    return allTransactionsWithProjections;
  }, [showProjections, allTransactionsWithProjections, accountTransactions, account]);


  // Calculate current balance (most recent non-projected transaction) - memoized
  const currentBalance = useMemo(() => {
    // Filter out projected transactions and find the most recent actual transaction
    const actualTransactions = allTransactions.filter(t =>
      !t.description.includes('(Projected)')
    );

    if (actualTransactions.length === 0) {
      return account?.availableBalance || 0;
    }

    // The last actual transaction in the list has the current balance
    return actualTransactions[actualTransactions.length - 1].balance;
  }, [allTransactions, account]);

  // Calculate next statement due date for credit cards - memoized
  const getNextDueDate = useCallback((dueDay: number): Date => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    // If the due day hasn't passed this month, use this month
    // Otherwise use next month
    let dueMonth = currentDay <= dueDay ? currentMonth : currentMonth + 1;
    let dueYear = currentYear;

    // Handle year rollover
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear++;
    }

    return new Date(dueYear, dueMonth, dueDay);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Sticky Header - Reduced by ~30% */}
      <div className="sticky top-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-3 pb-2">
        <div className="max-w-7xl mx-auto px-3">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl p-4 border border-gray-700">
            {/* 3-Column Grid Header Layout */}
            <div className="mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-4">
              {/* Left Column: Logo (fixed width) */}
              <div className="flex-shrink-0">
                <img
                  src={logo}
                  alt="Downey Finance Tracker"
                  className="h-[90px] w-auto"
                  title="Downey Finance Tracker"
                />
              </div>

              {/* Center Column: Account tiles (flexible, centered) */}
              <div className="flex flex-col items-center justify-center">
                {/* Checking/Savings Accounts Row */}
                <div className="flex items-center justify-center gap-2 mb-2">
                {accounts
                  .filter(acc => acc.accountType !== 'credit_card')
                  .map(acc => {
                  // Calculate balance for this account
                  const accTransactions = transactions.filter(t => t.accountId === acc.id);
                  const accBalance = accTransactions.length > 0
                    ? calculateBalances(accTransactions, acc.availableBalance || 0)[accTransactions.length - 1]?.balance
                    : acc.availableBalance || 0;

                  const displayBalance = accBalance;
                  const balanceColorStyle = accBalance >= 0 ? '#4ade80' : '#f87171'; // green-400 or red-400

                  return (
                    <button
                      key={acc.id}
                      onClick={() => handleSelectAccount(acc.id)}
                      className={`px-3 py-2 rounded-lg transition-all font-medium text-xs flex flex-col items-center min-w-[120px] ${
                        acc.id === activeAccountId
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg'
                          : 'bg-gray-700/50 hover:bg-gray-700'
                      }`}
                      title={`${acc.name} - ${acc.institution}`}
                    >
                      <span className={`text-[10px] font-semibold ${acc.id === activeAccountId ? 'text-white' : 'text-gray-200'}`}>
                        {acc.name}
                      </span>
                      <span className={`text-[9px] opacity-70 ${acc.id === activeAccountId ? 'text-white' : 'text-gray-400'}`}>
                        {acc.institution}
                      </span>
                      <span className="text-sm font-bold mt-1" style={{ color: balanceColorStyle }}>
                        ${displayBalance.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Credit Cards Row */}
              <div className="flex items-center justify-center gap-2 mb-2">
                {accounts
                  .filter(acc => acc.accountType === 'credit_card')
                  .map(acc => {
                  // Calculate balance for this account
                  const accTransactions = transactions.filter(t => t.accountId === acc.id);
                  const accBalance = accTransactions.length > 0
                    ? calculateBalances(accTransactions, acc.availableBalance || 0)[accTransactions.length - 1]?.balance
                    : acc.availableBalance || 0;

                  // Credit card: negative balance = debt owed (show as negative in red)
                  //              positive balance = overpayment/credit (show as positive in green)
                  const displayBalance = accBalance;
                  const balanceColorStyle = accBalance < 0 ? '#f87171' : '#4ade80'; // red-400 if debt, green-400 if credit

                  return (
                    <button
                      key={acc.id}
                      onClick={() => handleSelectAccount(acc.id)}
                      className={`px-3 py-2 rounded-lg transition-all font-medium text-xs flex flex-col items-center min-w-[120px] ${
                        acc.id === activeAccountId
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg'
                          : 'bg-gray-700/50 hover:bg-gray-700'
                      }`}
                      title={`${acc.name} - ${acc.institution}`}
                    >
                      <span className={`text-[10px] font-semibold ${acc.id === activeAccountId ? 'text-white' : 'text-gray-200'}`}>
                        {acc.name}
                      </span>
                      <span className={`text-[9px] opacity-70 ${acc.id === activeAccountId ? 'text-white' : 'text-gray-400'}`}>
                        {acc.institution}
                      </span>
                      <span className="text-sm font-bold mt-1" style={{ color: balanceColorStyle }}>
                        ${displayBalance.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Snapshot Layout - Hidden by default, shown for screenshot */}
              <div id="account-balances-snapshot" className="hidden" style={{ width: '280px', overflow: 'hidden' }}>
                <div className="bg-gradient-to-br from-gray-800 to-gray-900" style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }}>
                  <h2 className="text-base font-bold text-white mb-2 text-center pt-3">Account Balances</h2>

                  {/* 2-Column Grid for All Accounts */}
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    {accounts.map(acc => {
                      const accTransactions = transactions.filter(t => t.accountId === acc.id);
                      const accBalance = accTransactions.length > 0
                        ? calculateBalances(accTransactions, acc.availableBalance || 0)[accTransactions.length - 1]?.balance
                        : acc.availableBalance || 0;

                      const displayBalance = accBalance;
                      const balanceColorStyle = acc.accountType === 'credit_card'
                        ? (accBalance < 0 ? '#f87171' : '#4ade80')
                        : (accBalance >= 0 ? '#4ade80' : '#f87171');

                      return (
                        <div
                          key={acc.id}
                          className="bg-gray-700/50 p-2 flex flex-col items-center"
                        >
                          <span className="text-[10px] font-semibold text-gray-200 text-center leading-tight">
                            {acc.name}
                          </span>
                          <span className="text-[8px] opacity-70 text-gray-400 text-center">
                            {acc.institution}
                          </span>
                          <span className="text-sm font-bold mt-1" style={{ color: balanceColorStyle }}>
                            ${Math.abs(displayBalance).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary at Bottom */}
                  <div className="bg-gray-700/50 px-3 py-2 border-t border-gray-600">
                    <div className="space-y-2">
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">Checking/Savings</div>
                        <div className="text-lg font-bold text-green-400">
                          ${(() => {
                            const checkingSavingsTotal = accounts
                              .filter(acc => acc.accountType !== 'credit_card')
                              .reduce((sum, acc) => {
                                const accTransactions = transactions.filter(t => t.accountId === acc.id);
                                const accBalance = accTransactions.length > 0
                                  ? calculateBalances(accTransactions, acc.availableBalance || 0)[accTransactions.length - 1]?.balance
                                  : acc.availableBalance || 0;
                                return sum + accBalance;
                              }, 0);
                            return checkingSavingsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">Credit Cards Owed</div>
                        <div className="text-lg font-bold text-red-400">
                          ${(() => {
                            const creditCardTotal = accounts
                              .filter(acc => acc.accountType === 'credit_card')
                              .reduce((sum, acc) => {
                                const accTransactions = transactions.filter(t => t.accountId === acc.id);
                                const accBalance = accTransactions.length > 0
                                  ? calculateBalances(accTransactions, acc.availableBalance || 0)[accTransactions.length - 1]?.balance
                                  : acc.availableBalance || 0;
                                return sum + Math.abs(Math.min(0, accBalance));
                              }, 0);
                            return creditCardTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Summary Tile (fixed width) */}
              <div className="flex-shrink-0">
                <div className="bg-gray-700/50 rounded-lg px-4 py-2 border border-gray-600">
                  <div className="space-y-2">
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-1">Checking/Savings</div>
                      <div className="text-lg font-bold text-green-400">
                        ${(() => {
                          const checkingSavingsTotal = accounts
                            .filter(acc => acc.accountType !== 'credit_card')
                            .reduce((sum, acc) => {
                              const accTransactions = transactions.filter(t => t.accountId === acc.id);
                              const accBalance = accTransactions.length > 0
                                ? calculateBalances(accTransactions, acc.availableBalance || 0)[accTransactions.length - 1]?.balance
                                : acc.availableBalance || 0;
                              return sum + accBalance;
                            }, 0);
                          return checkingSavingsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-1">Credit Cards Owed</div>
                      <div className="text-lg font-bold text-red-400">
                        ${(() => {
                          const creditCardTotal = accounts
                            .filter(acc => acc.accountType === 'credit_card')
                            .reduce((sum, acc) => {
                              const accTransactions = transactions.filter(t => t.accountId === acc.id);
                              const accBalance = accTransactions.length > 0
                                ? calculateBalances(accTransactions, acc.availableBalance || 0)[accTransactions.length - 1]?.balance
                                : acc.availableBalance || 0;
                              // For credit cards, negative balance = debt owed (show as positive number)
                              return sum + Math.abs(Math.min(0, accBalance));
                            }, 0);
                          return creditCardTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* Account Info Row */}
            <div className="mb-3 pb-3 border-b border-gray-700">
              {/* Top Row: Card Icon, Account Name, Balance Info */}
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                  {/* Card Icon Placeholder */}
                  <div className="h-[60px] w-[95px] bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg border border-gray-600 flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white">{account?.name || 'No Account'}</h1>
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400"></span>
                      {account?.institution} •••• {account?.accountNumber.slice(-4)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {account?.accountType === 'credit_card' && account.creditLimit && (
                    <div className="flex gap-2 text-xs">
                      <div className="bg-gray-700/50 px-2.5 py-1.25 rounded-lg">
                        <p className="text-gray-400 text-[10px]">Balance Owed</p>
                        <p className="text-red-400 font-semibold">${Math.abs(currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-gray-700/50 px-2.5 py-1.25 rounded-lg">
                        <p className="text-gray-400 text-[10px]">Credit Limit</p>
                        <p className="text-white font-semibold">${account.creditLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-gray-700/50 px-2.5 py-1.25 rounded-lg">
                        <p className="text-gray-400 text-[10px]">Available</p>
                        <p className="text-green-400 font-semibold">${Math.max(0, account.creditLimit - Math.abs(currentBalance)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  )}
                  {account && account.accountType !== 'credit_card' && (
                    <div className="flex gap-2 text-xs">
                      <div className="bg-gray-700/50 px-2.5 py-1.25 rounded-lg">
                        <p className="text-gray-400 text-[10px]">Current Balance</p>
                        <p className={`font-semibold ${currentBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="bg-gray-700/50 px-2.5 py-1.25 rounded-lg">
                        <p className="text-gray-400 text-[10px]">30-Day Projected</p>
                        <p className={`font-semibold ${(() => {
                          const thirtyDayTransactions = allTransactionsWithProjections.filter(t => {
                            const daysDiff = Math.ceil((t.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return daysDiff >= 0 && daysDiff <= 30;
                          });
                          const thirtyDayBalance = thirtyDayTransactions.length > 0
                            ? thirtyDayTransactions[thirtyDayTransactions.length - 1].balance
                            : currentBalance;
                          return thirtyDayBalance >= 0 ? 'text-green-400' : 'text-red-400';
                        })()}`}>
                          ${(() => {
                            const thirtyDayTransactions = allTransactionsWithProjections.filter(t => {
                              const daysDiff = Math.ceil((t.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                              return daysDiff >= 0 && daysDiff <= 30;
                            });
                            const thirtyDayBalance = thirtyDayTransactions.length > 0
                              ? thirtyDayTransactions[thirtyDayTransactions.length - 1].balance
                              : currentBalance;
                            return thirtyDayBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </p>
                      </div>
                      <div className="bg-gray-700/50 px-2.5 py-1.25 rounded-lg">
                        <p className="text-gray-400 text-[10px]">60-Day Projected</p>
                        <p className={`font-semibold ${(() => {
                          const sixtyDayTransactions = allTransactionsWithProjections.filter(t => {
                            const daysDiff = Math.ceil((t.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return daysDiff >= 0 && daysDiff <= 60;
                          });
                          const sixtyDayBalance = sixtyDayTransactions.length > 0
                            ? sixtyDayTransactions[sixtyDayTransactions.length - 1].balance
                            : currentBalance;
                          return sixtyDayBalance >= 0 ? 'text-green-400' : 'text-red-400';
                        })()}`}>
                          ${(() => {
                            const sixtyDayTransactions = allTransactionsWithProjections.filter(t => {
                              const daysDiff = Math.ceil((t.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                              return daysDiff >= 0 && daysDiff <= 60;
                            });
                            const sixtyDayBalance = sixtyDayTransactions.length > 0
                              ? sixtyDayTransactions[sixtyDayTransactions.length - 1].balance
                              : currentBalance;
                            return sixtyDayBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </p>
                      </div>
                    </div>
                  )}
                  {account?.accountType === 'credit_card' && account.apr && account.statementDueDate && (
                    <div className="flex items-center gap-2 text-xs">
                      <p className="text-gray-400">
                        APR: {account.apr}%
                      </p>
                      <span className="text-gray-600">•</span>
                      <p className="text-orange-400">
                        Due: {getNextDueDate(account.statementDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Row: Action Buttons (aligned left under logo) */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAccountManagement(true)}
                    className="px-2 py-1 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-all text-xs flex items-center gap-1"
                    title="Manage Account"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Manage
                  </button>
                  <button
                    onClick={() => setShowHelp(true)}
                    className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all text-xs flex items-center gap-1 border border-blue-500/30"
                    title="Help & Instructions"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Help
                  </button>
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.csv,.pdf';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const isCSV = file.name.toLowerCase().endsWith('.csv');
                          const isPDF = file.name.toLowerCase().endsWith('.pdf');
                          if (!isCSV && !isPDF) {
                            alert('Please select a CSV or PDF file');
                            return;
                          }
                          try {
                            let data: ParsedCSVData;
                            if (isPDF) {
                              const { parseBankStatementPDF } = await import('./utils/pdfParser');
                              data = await parseBankStatementPDF(file);
                            } else {
                              data = await parseCSV(file, account?.accountType);
                            }
                            handleImportComplete(data);
                          } catch (error) {
                            console.error('Error parsing file:', error);
                            alert(`Failed to parse ${isPDF ? 'PDF' : 'CSV'} file. Please check the format.`);
                          }
                        }
                      };
                      input.click();
                    }}
                    className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all text-xs flex items-center gap-1 border border-green-500/30"
                    title="Import CSV or PDF bank statement"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    CSV/PDF
                  </button>
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.json';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          try {
                            const text = await file.text();
                            const parsed = JSON.parse(text);
                            const accountSummary: { newBalance?: number; minimumPayment?: number; paymentDueDate?: string } = {};
                            let currentBalance: number | undefined;

                            if (parsed.account_summary) {
                              const summary = parsed.account_summary;
                              currentBalance = summary.new_balance;
                              accountSummary.newBalance = summary.new_balance;
                              accountSummary.minimumPayment = summary.minimum_payment;
                              accountSummary.paymentDueDate = summary.payment_due_date;
                            }

                            const transactions = Array.isArray(parsed) ? parsed : parsed.transactions || [];
                            if (transactions.length === 0) {
                              alert('No transactions found in JSON');
                              return;
                            }

                            const importedTransactions = transactions.map((tx: any, index: number) => {
                              if (!tx.date) throw new Error(`Transaction ${index + 1}: Missing date`);
                              if (!tx.description && !tx.desc && !tx.merchant) throw new Error(`Transaction ${index + 1}: Missing description`);
                              if (tx.amount === undefined && tx.amt === undefined) throw new Error(`Transaction ${index + 1}: Missing amount`);

                              const date = new Date(tx.date);
                              if (isNaN(date.getTime())) throw new Error(`Transaction ${index + 1}: Invalid date`);

                              const rawAmount = tx.amount ?? tx.amt;
                              const amount = typeof rawAmount === 'string' ? parseFloat(rawAmount.replace(/[$,]/g, '')) : Number(rawAmount);
                              if (isNaN(amount)) throw new Error(`Transaction ${index + 1}: Invalid amount`);

                              return {
                                id: tx.id || `json-import-${Date.now()}-${index}`,
                                date,
                                description: (tx.description || tx.desc || tx.merchant) as string,
                                category: tx.category || tx.cat || 'Uncategorized',
                                amount,
                                balance: 0,
                                isPending: Boolean(tx.isPending || tx.pending),
                                isReconciled: Boolean(tx.isReconciled || tx.reconciled || tx.cleared),
                                isManual: false,
                              };
                            });

                            handleImportComplete(
                              { transactions: importedTransactions, errors: [] },
                              currentBalance,
                              Object.keys(accountSummary).length > 0 ? accountSummary : undefined
                            );
                          } catch (error) {
                            console.error('Error parsing JSON:', error);
                            alert(`Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                          }
                        }
                      };
                      input.click();
                    }}
                    className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all text-xs flex items-center gap-1 border border-purple-500/30"
                    title="Import JSON formatted transactions"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    JSON
                  </button>
                  <button
                    onClick={handleAdjustBalance}
                    className="px-2 py-1 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-all text-xs flex items-center gap-1"
                    title="Adjust balance to match your bank"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Adjust Balance
                  </button>
                  <button
                    onClick={handleSnapshot}
                    className="px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-all text-xs flex items-center gap-1 border border-orange-500/30"
                    title="Take snapshot of balances to share"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Snapshot
                  </button>
                  <button
                    onClick={() => {
                      if (iCloudDirHandle) {
                        handleQuickSync();
                      } else {
                        setCurrentTab('sync');
                      }
                    }}
                    disabled={isSyncing}
                    className={`px-2 py-1 ${
                      iCloudDirHandle
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                        : 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30'
                    } ${
                      iCloudDirHandle ? 'text-white' : 'text-blue-400'
                    } rounded-lg transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1`}
                    title={iCloudDirHandle ? "Sync to iCloud Drive" : "Connect iCloud Drive"}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                    </svg>
                    {isSyncing ? 'Syncing...' : (iCloudDirHandle ? 'Sync' : 'Connect')}
                  </button>
                </div>
                {iCloudFolderPath && (
                  <p className="text-blue-400 text-xs flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                    </svg>
                    iCloud: {iCloudFolderPath}
                  </p>
                )}
              </div>
            </div>

            {/* Tabs Navigation */}
            <div>
              <nav className="flex gap-1.5 items-center justify-between">
                <div className="flex gap-1.5">
            <button
              onClick={() => setCurrentTab('account')}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                currentTab === 'account'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Account Details
            </button>
            <button
              onClick={() => setCurrentTab('register')}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                currentTab === 'register'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setCurrentTab('recurring')}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                currentTab === 'recurring'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Recurring Bills
            </button>
            <button
              onClick={() => setCurrentTab('projections')}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                currentTab === 'projections'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Projections
            </button>
            <button
              onClick={() => setCurrentTab('charts')}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                currentTab === 'charts'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Spending Charts
            </button>
            <button
              onClick={() => setCurrentTab('merchants')}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                currentTab === 'merchants'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Merchants
            </button>
            <button
              onClick={() => setCurrentTab('debts')}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                currentTab === 'debts'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Debts
            </button>
            <button
              onClick={() => setCurrentTab('sync')}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                currentTab === 'sync'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              iCloud Sync
            </button>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-3 pb-5">
        <div className="bg-gray-800 rounded-2xl shadow-xl p-4 border border-gray-700">
            {/* Account Details Tab */}
            {currentTab === 'account' && (
              <div className="space-y-4">
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-400">Account Number</dt>
                      <dd className="text-lg font-medium text-white">•••• {account?.accountNumber.slice(-4)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-400">Routing Number</dt>
                      <dd className="text-lg font-medium text-white">{account?.routingNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-400">Institution</dt>
                      <dd className="text-lg font-medium text-white">{account?.institution}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-400">Account Type</dt>
                      <dd className="text-lg font-medium text-white">Bills</dd>
                    </div>
                  </dl>
                </div>

                {/* Apple Card Installments Section */}
                {account?.name.toLowerCase().includes('apple') && account?.accountType === 'credit_card' && (
                  <AppleCardInstallments transactions={accountTransactions} />
                )}

              </div>
            )}

            {/* Register Tab */}
            {currentTab === 'register' && (
              <TransactionRegister
                transactions={allTransactions}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onDeleteMultipleTransactions={handleDeleteMultipleTransactions}
                onCreateRecurringBill={handleAddBill}
                onUpdateTransaction={handleUpdateTransaction}
                onDismissProjection={handleDismissProjection}
                recurringBills={accountRecurringBills}
                showProjections={showProjections}
                onShowProjectionsChange={setShowProjections}
              />
            )}

            {/* Recurring Bills Tab */}
            {currentTab === 'recurring' && (
              <div className="space-y-6">
                <RecurringSuggestions
                  transactions={accountTransactions}
                  existingBills={accountRecurringBills}
                  onAddBill={handleAddBill}
                />
                <RecurringBillsManager
                  bills={accountRecurringBills}
                  onAddBill={handleAddBill}
                  onUpdateBill={handleUpdateBill}
                  onDeleteBill={handleDeleteBill}
                />
              </div>
            )}

            {/* Projections Tab */}
            {currentTab === 'projections' && (
              <Projections
                transactions={allTransactions}
                currentBalance={account?.availableBalance || 0}
              />
            )}

            {/* Spending Charts Tab */}
            {currentTab === 'charts' && (
              <SpendingCharts
                transactions={transactions}
                accounts={accounts}
                activeAccountId={activeAccountId}
              />
            )}

            {/* Merchants Tab */}
            {currentTab === 'merchants' && (
              <MerchantManagement
                transactions={accountTransactions}
              />
            )}

            {/* Debts Tab */}
            {currentTab === 'debts' && (
              <DebtsTracker
                debts={debts}
                onAddDebt={handleAddDebt}
                onUpdateDebt={handleUpdateDebt}
                onDeleteDebt={handleDeleteDebt}
              />
            )}

            {/* iCloud Sync Tab */}
            {currentTab === 'sync' && (
              <ICloudSync
                transactions={transactions}
                accounts={accounts}
                activeAccountId={activeAccountId}
                recurringBills={recurringBills}
                debts={debts}
                iCloudDirHandle={iCloudDirHandle}
                onDataLoaded={handleDataLoaded}
                onFolderSelected={handleFolderSelected}
              />
            )}
          </div>
        </div>

      {/* Account Management Modal */}
      {showAccountManagement && (
        <AccountManagement
          accounts={accounts}
          onAddAccount={handleAddAccount}
          onUpdateAccount={handleUpdateAccount}
          onDeleteAccount={handleDeleteAccount}
          onClose={() => setShowAccountManagement(false)}
        />
      )}

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      {/* Recurring Bill Update Prompt */}
      {pendingBillUpdates.length > 0 && (
        <RecurringBillUpdatePrompt
          updates={pendingBillUpdates}
          onConfirm={handleConfirmBillUpdates}
          onCancel={handleCancelBillUpdates}
        />
      )}

      {/* Version/Build Info - Floating Box */}
      <div className="fixed bottom-4 right-4 bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 shadow-xl z-50">
        <div className="text-xs text-gray-400 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-300">v{VERSION}</span>
          </div>
          <div className="text-[10px] text-gray-500">
            {new Date(BUILD_DATE).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
