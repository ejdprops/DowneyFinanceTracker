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
import RecurringBillUpdatePrompt from './components/RecurringBillUpdatePrompt';
import { AppleCardInstallments } from './components/AppleCardInstallments';
import { MobileHamburgerMenu } from './components/MobileHamburgerMenu';
import { MobileAccountHeader } from './components/MobileAccountHeader';
import { MobileProjectionBar } from './components/MobileProjectionBar';
import { MobileTabNav } from './components/MobileTabNav';
import { MobileSummary } from './components/MobileSummary';
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
import { generateProjections, calculateBalances, getNextOccurrence } from './utils/projections';
import { parseCSV } from './utils/csvParser';
import logo from './assets/downey-app-logo-header.png';

// Declare global build timestamp and app owner injected by Vite
declare const __BUILD_DATE__: string;
declare const __APP_OWNER__: string;

// Build timestamp and app owner - injected at build time
const BUILD_DATE = __BUILD_DATE__;
const APP_OWNER = __APP_OWNER__;
const VERSION = '1.10.0';

type TabType = 'account' | 'register' | 'recurring' | 'projections' | 'charts' | 'merchants' | 'debts' | 'sync';

function AppMobile() {
  const [currentTab, setCurrentTab] = useState<TabType>('account');
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
  const [showSummary, setShowSummary] = useState(true); // Default to showing summary on mobile
  const [pendingBillUpdates, setPendingBillUpdates] = useState<Array<{
    billId: string;
    bill: RecurringBill;
    importedAmount: number;
    importedDate: Date;
    proposedNextDueDate: Date;
  }>>([]);
  const [iCloudDirHandle, setICloudDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [iCloudFolderPath, setICloudFolderPath] = useState<string | null>(null); // Used for storage, may not be displayed

  // Suppress unused variable warning - iCloudFolderPath is intentionally stored for persistence
  void iCloudFolderPath;

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
    setTransactions(transactions.filter(t => t.accountId !== accountId));
    setRecurringBills(recurringBills.filter(b => b.accountId !== accountId));
    const newAccounts = accounts.filter(a => a.id !== accountId);
    setAccounts(newAccounts);
    if (activeAccountId === accountId && newAccounts.length > 0) {
      setActiveAccountId(newAccounts[0].id);
    }
  };

  // Import handler (simplified from desktop version)
  const handleImportComplete = (
    data: ParsedCSVData,
    currentBalance?: number,
    accountSummary?: { newBalance?: number; minimumPayment?: number; paymentDueDate?: string },
    statementData?: { closingDate?: Date; endingBalance?: number; statementPeriod?: string }
  ) => {
    if (!activeAccountId) return;

    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let postedCount = 0;

    const originalTransactions = [...transactions];
    const updatedTransactions = [...transactions];
    const billsToUpdate = new Set<string>();
    const billUpdateData = new Map<string, { amount: number; date: Date }>();

    const shouldReconcile = statementData?.closingDate !== undefined;
    const reconciliationDate = statementData?.closingDate;

    data.transactions.forEach(importedTx => {
      let txWithAccount = { ...importedTx, accountId: activeAccountId };

      if (shouldReconcile && reconciliationDate && importedTx.date <= reconciliationDate) {
        txWithAccount.isReconciled = true;
      }

      // Match with recurring bills
      const matchingBill = recurringBills.find(bill => {
        if (bill.accountId !== activeAccountId || !bill.isActive) return false;
        const amountType = bill.amountType || 'fixed';
        if (amountType === 'fixed') {
          if (Math.abs(bill.amount - txWithAccount.amount) >= 0.01) return false;
        } else {
          const tolerance = bill.amountTolerance || 10;
          const maxDiff = Math.abs(bill.amount) * (tolerance / 100);
          if (Math.abs(bill.amount - txWithAccount.amount) > maxDiff) return false;
        }
        const billDesc = bill.description.toLowerCase().trim();
        const txDesc = txWithAccount.description.toLowerCase().trim();
        if (billDesc === txDesc || billDesc.includes(txDesc) || txDesc.includes(billDesc)) return true;
        return false;
      });

      if (matchingBill) {
        txWithAccount = {
          ...txWithAccount,
          recurringBillId: matchingBill.id,
          category: matchingBill.category,
        };

        const currentDueDate = typeof matchingBill.nextDueDate === 'string'
          ? new Date(matchingBill.nextDueDate + 'T00:00:00')
          : new Date(matchingBill.nextDueDate);

        const proposedNextDueDate = getNextOccurrence(
          currentDueDate,
          matchingBill.frequency,
          matchingBill.dayOfMonth,
          matchingBill.dayOfWeek,
          matchingBill.weekOfMonth
        );

        const hasProjectedTransaction = updatedTransactions.some(t => {
          if (!t.description.includes('(Projected)')) return false;
          if (t.recurringBillId !== matchingBill.id) return false;
          return t.date > txWithAccount.date &&
                 Math.abs(t.date.getTime() - proposedNextDueDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
        });

        if (!hasProjectedTransaction) {
          billsToUpdate.add(matchingBill.id);
          const existingData = billUpdateData.get(matchingBill.id);
          if (!existingData || txWithAccount.date > existingData.date) {
            billUpdateData.set(matchingBill.id, {
              amount: txWithAccount.amount,
              date: txWithAccount.date
            });
          }
        }
      }

      // Check for duplicates
      const existingByIdIndex = originalTransactions.findIndex(t =>
        t.id === txWithAccount.id && t.accountId === activeAccountId
      );

      const existingPendingIndex = originalTransactions.findIndex(t => {
        if (t.accountId !== activeAccountId || !t.isPending) return false;
        if (Math.abs(t.amount - txWithAccount.amount) >= 0.01) return false;
        const existingDesc = t.description.toLowerCase().trim();
        const newDesc = txWithAccount.description.toLowerCase().trim();
        return existingDesc === newDesc || existingDesc.includes(newDesc) || newDesc.includes(existingDesc);
      });

      const existingByDataIndex = originalTransactions.findIndex(t => {
        if (t.accountId !== activeAccountId || t.isPending) return false;
        if (t.date.toDateString() !== txWithAccount.date.toDateString()) return false;
        if (Math.abs(t.amount - txWithAccount.amount) >= 0.01) return false;
        const existingDesc = t.description.toLowerCase().trim();
        const newDesc = txWithAccount.description.toLowerCase().trim();
        return existingDesc === newDesc || existingDesc.includes(newDesc) || newDesc.includes(existingDesc);
      });

      let existingIndex = -1;
      let isPendingToPosted = false;
      let isPendingDuplicate = false;

      if (existingByIdIndex !== -1) {
        existingIndex = existingByIdIndex;
      } else if (existingPendingIndex !== -1) {
        existingIndex = existingPendingIndex;
        if (!txWithAccount.isPending) {
          isPendingToPosted = true;
        } else {
          isPendingDuplicate = true;
        }
      } else if (existingByDataIndex !== -1) {
        existingIndex = existingByDataIndex;
      }

      if (existingIndex !== -1) {
        const existing = updatedTransactions[existingIndex];
        const shouldMarkReconciled = shouldReconcile && reconciliationDate && txWithAccount.date <= reconciliationDate;

        if (isPendingToPosted) {
          updatedTransactions[existingIndex] = {
            ...txWithAccount,
            isReconciled: shouldMarkReconciled || existing.isReconciled,
            isPending: false,
          };
          postedCount++;
        } else if (isPendingDuplicate) {
          updatedTransactions[existingIndex] = {
            ...existing,
            ...txWithAccount,
            isReconciled: shouldMarkReconciled || existing.isReconciled,
            recurringBillId: txWithAccount.recurringBillId || existing.recurringBillId,
            category: txWithAccount.recurringBillId ? txWithAccount.category : existing.category,
          };
          updatedCount++;
        } else if (existing.isManual) {
          updatedTransactions[existingIndex] = {
            ...txWithAccount,
            isReconciled: shouldMarkReconciled || existing.isReconciled,
          };
          updatedCount++;
        } else if (existing.isReconciled) {
          skippedCount++;
        } else {
          skippedCount++;
        }
      } else {
        if (txWithAccount.recurringBillId) {
          const projectedIndex = updatedTransactions.findIndex(t => {
            if (!t.description.includes('(Projected)')) return false;
            if (t.recurringBillId !== txWithAccount.recurringBillId) return false;
            const daysDiff = Math.abs((t.date.getTime() - txWithAccount.date.getTime()) / (1000 * 60 * 60 * 24));
            return daysDiff <= 7;
          });

          if (projectedIndex !== -1) {
            updatedTransactions[projectedIndex] = txWithAccount;
            newCount++;
          } else {
            updatedTransactions.push(txWithAccount);
            newCount++;
          }
        } else {
          updatedTransactions.push(txWithAccount);
          newCount++;
        }
      }
    });

    setTransactions(updatedTransactions);

    // Prepare recurring bill updates
    if (billsToUpdate.size > 0) {
      const updates = Array.from(billsToUpdate).map(billId => {
        const bill = recurringBills.find(b => b.id === billId);
        const importedData = billUpdateData.get(billId);
        if (!bill || !importedData) return null;

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

      setPendingBillUpdates(updates);
    }

    // Update account balance
    if (account && (currentBalance !== undefined || accountSummary || statementData)) {
      const updatedAccount = { ...account };

      if (statementData?.closingDate && statementData?.endingBalance !== undefined) {
        updatedAccount.reconciliationDate = statementData.closingDate;
        const balanceToStore = account.accountType === 'credit_card'
          ? -Math.abs(statementData.endingBalance)
          : statementData.endingBalance;
        updatedAccount.reconciliationBalance = balanceToStore;
        const monthYear = statementData.closingDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        updatedAccount.lastReconciliationSource = `${account.institution} Statement - ${monthYear}`;
        updatedAccount.availableBalance = balanceToStore;
      } else {
        if (currentBalance !== undefined) {
          updatedAccount.availableBalance = currentBalance;
        } else if (accountSummary?.newBalance !== undefined) {
          updatedAccount.availableBalance = accountSummary.newBalance;
        }
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
      const postedMsg = postedCount > 0 ? `\nPending→Posted: ${postedCount}` : '';
      alert(`Import complete!\nNew: ${newCount}\nUpdated: ${updatedCount}\nSkipped: ${skippedCount}${postedMsg}`);
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
    if (transaction.id.startsWith('proj-')) {
      const newVisibility = new Map(projectedVisibility);
      newVisibility.set(transaction.id, transaction.isProjectedVisible !== false);
      setProjectedVisibility(newVisibility);

      const newState = new Map(projectedState);
      newState.set(transaction.id, {
        isReconciled: transaction.isReconciled,
        isPending: transaction.isPending,
        isProjectedVisible: transaction.isProjectedVisible,
      });
      setProjectedState(newState);
    } else {
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

      const updatedBill = { ...bill };
      if (approval.updateDate) {
        updatedBill.nextDueDate = pendingUpdate.proposedNextDueDate;
      }
      if (approval.updateAmount) {
        updatedBill.amount = pendingUpdate.importedAmount;
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


  // Helper function to calculate current balance from reconciliation point
  const calculateBalanceFromReconciliation = useCallback((acc: Account, txs: Transaction[]): number => {
    if (!acc.reconciliationDate || acc.reconciliationBalance === undefined) {
      return acc.availableBalance || 0;
    }

    let balance = acc.reconciliationBalance;
    const transactionsAfterReconciliation = txs.filter(t =>
      t.accountId === acc.id &&
      t.date > acc.reconciliationDate! &&
      !t.description.includes('(Projected)')
    );

    for (const tx of transactionsAfterReconciliation) {
      balance -= tx.amount;
    }

    return Math.round(balance * 100) / 100;
  }, []);

  // Get effective available balance for current account
  const effectiveAvailableBalance = useMemo(() => {
    if (!account) return 0;
    return calculateBalanceFromReconciliation(account, transactions);
  }, [account, transactions, calculateBalanceFromReconciliation]);

  // All transactions with projections
  const allTransactionsWithProjections = useMemo(() => {
    if (!account) {
      return calculateBalances(accountTransactions, 0);
    }

    const effectiveBalance = calculateBalanceFromReconciliation(account, transactions);
    const today = new Date();
    const endOfTwoMonthsOut = new Date(today.getFullYear(), today.getMonth() + 3, 0, 23, 59, 59, 999);
    const daysAhead = Math.ceil((endOfTwoMonthsOut.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const projections = generateProjections(accountRecurringBills, daysAhead)
      .filter(projection => {
        if (dismissedProjections.has(projection.id)) return false;
        const projectionDate = projection.date.toDateString();
        const projectionDesc = projection.description.replace(' (Projected)', '');
        return !accountTransactions.some(t =>
          t.date.toDateString() === projectionDate &&
          t.description.toLowerCase() === projectionDesc.toLowerCase()
        );
      })
      .map(projection => {
        const storedState = projectedState.get(projection.id);
        return {
          ...projection,
          isProjectedVisible: storedState?.isProjectedVisible !== undefined
            ? storedState.isProjectedVisible
            : (projectedVisibility.has(projection.id) ? projectedVisibility.get(projection.id)! : true),
          isReconciled: storedState?.isReconciled || false,
          isPending: storedState?.isPending !== undefined ? storedState.isPending : true,
        };
      });

    return calculateBalances([...accountTransactions, ...projections], effectiveBalance, account?.reconciliationBalance);
  }, [account, accountTransactions, accountRecurringBills, dismissedProjections, projectedState, projectedVisibility, transactions, calculateBalanceFromReconciliation]);

  // Transactions for display in register - filtered by showProjections checkbox
  const allTransactions = useMemo(() => {
    if (!showProjections) {
      return calculateBalances(accountTransactions, effectiveAvailableBalance, account?.reconciliationBalance);
    }
    return allTransactionsWithProjections;
  }, [showProjections, allTransactionsWithProjections, accountTransactions, effectiveAvailableBalance, account]);

  // Calculate current balance
  const currentBalance = useMemo(() => {
    const actualTransactions = allTransactions.filter(t =>
      !t.description.includes('(Projected)')
    );

    if (actualTransactions.length === 0) {
      return effectiveAvailableBalance;
    }

    return actualTransactions[actualTransactions.length - 1].balance;
  }, [allTransactions, effectiveAvailableBalance]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-2 pb-2">
        <div className="px-3">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl p-3 border border-gray-700">
            {/* Top Bar: Hamburger Menu, Logo, and Title */}
            <div className="flex items-center gap-3 mb-3">
              <MobileHamburgerMenu
                accounts={accounts}
                activeAccountId={activeAccountId}
                transactions={transactions}
                onSelectAccount={handleSelectAccount}
                onManageAccounts={() => setShowAccountManagement(true)}
                onShowSummary={() => setShowSummary(true)}
              />
              <button
                onClick={() => setShowSummary(true)}
                className="flex-1 flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
              >
                <img
                  src={logo}
                  alt={`${APP_OWNER}'s Finance Tracker`}
                  className="h-[58px] w-auto object-contain"
                  title={`${APP_OWNER}'s Finance Tracker`}
                />
                <h1 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 tracking-wide">
                  Downey Finance Tracker
                </h1>
              </button>
              <div className="w-10"></div>
            </div>

            {/* Account Info Header - hide when showing summary */}
            {!showSummary && (
              <div className="mb-3">
                <MobileAccountHeader account={account} currentBalance={currentBalance} />
              </div>
            )}

            {/* Projection Bar - hide when showing summary */}
            {!showSummary && account && (
              <div className="mb-3">
                <MobileProjectionBar
                  allTransactionsWithProjections={allTransactionsWithProjections}
                  currentBalance={currentBalance}
                />
              </div>
            )}

            {/* Tab Navigation - hide when showing summary */}
            {!showSummary && (
              <MobileTabNav currentTab={currentTab} onTabChange={setCurrentTab} />
            )}

            {/* Quick Actions Row */}
            <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
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
                        let statementData: any = undefined;
                        if (isPDF) {
                          const { parseBankStatementPDF } = await import('./utils/pdfParser');
                          const pdfData = await parseBankStatementPDF(file);
                          data = pdfData;
                          statementData = pdfData.statementData;
                        } else {
                          data = await parseCSV(file, account?.accountType);
                        }
                        handleImportComplete(data, undefined, undefined, statementData);
                      } catch (error) {
                        console.error('Error parsing file:', error);
                        alert(`Failed to parse ${isPDF ? 'PDF' : 'CSV'} file. Please check the format.`);
                      }
                    }
                  };
                  input.click();
                }}
                className="flex-shrink-0 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all text-xs flex items-center gap-1.5 border border-green-500/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="whitespace-nowrap">Import</span>
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
                        const data = JSON.parse(text);

                        // Validate the data structure
                        if (!data.transactions || !data.accounts) {
                          alert('Invalid data file format. Please select a valid finance tracker JSON file.');
                          return;
                        }

                        // Load the data
                        handleDataLoaded({
                          transactions: data.transactions.map((t: any) => ({
                            ...t,
                            date: new Date(t.date)
                          })),
                          accounts: data.accounts.map((a: any) => ({
                            ...a,
                            reconciliationDate: a.reconciliationDate ? new Date(a.reconciliationDate) : undefined,
                            paymentDueDate: a.paymentDueDate ? new Date(a.paymentDueDate) : undefined
                          })),
                          activeAccountId: data.activeAccountId,
                          recurringBills: data.recurringBills.map((b: any) => ({
                            ...b,
                            nextDueDate: new Date(b.nextDueDate)
                          })),
                          debts: data.debts || []
                        });

                        alert('Data updated successfully from file!');
                      } catch (error) {
                        console.error('Error loading data file:', error);
                        alert('Failed to load data file. Please check the file format.');
                      }
                    }
                  };
                  input.click();
                }}
                className="flex-shrink-0 px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg transition-all text-xs flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="whitespace-nowrap">Update Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-3 pb-5">
        <div className="bg-gray-800 rounded-2xl shadow-xl p-4 border border-gray-700">
          {/* Summary View */}
          {showSummary && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Account Summary</h2>
                <button
                  onClick={() => setShowSummary(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close summary"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <MobileSummary
                accounts={accounts}
                transactions={transactions}
                onSelectAccount={(accountId) => {
                  setActiveAccountId(accountId);
                  setShowSummary(false);
                }}
              />
            </div>
          )}

          {/* Account Details Tab */}
          {!showSummary && currentTab === 'account' && (
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                <dl className="grid grid-cols-1 gap-4">
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
                    <dd className="text-lg font-medium text-white">
                      {account?.accountType === 'credit_card' ? 'Credit Card' : account?.accountType === 'checking' ? 'Checking' : 'Savings'}
                    </dd>
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
          {!showSummary && currentTab === 'register' && (
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
          {!showSummary && currentTab === 'recurring' && (
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
          {!showSummary && currentTab === 'projections' && (
            <Projections
              transactions={allTransactionsWithProjections}
              currentBalance={account?.availableBalance || 0}
            />
          )}

          {/* Spending Charts Tab */}
          {!showSummary && currentTab === 'charts' && (
            <SpendingCharts
              transactions={transactions}
              accounts={accounts}
              activeAccountId={activeAccountId}
            />
          )}

          {/* Merchants Tab */}
          {!showSummary && currentTab === 'merchants' && (
            <MerchantManagement
              transactions={accountTransactions}
            />
          )}

          {/* Debts Tab */}
          {!showSummary && currentTab === 'debts' && (
            <DebtsTracker
              debts={debts}
              onAddDebt={handleAddDebt}
              onUpdateDebt={handleUpdateDebt}
              onDeleteDebt={handleDeleteDebt}
            />
          )}

          {/* iCloud Sync Tab */}
          {!showSummary && currentTab === 'sync' && (
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

export default AppMobile;
