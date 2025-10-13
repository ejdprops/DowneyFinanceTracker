export interface Transaction {
  id: string;
  accountId?: string; // Links transaction to specific account (optional for backward compatibility)
  date: Date;
  description: string;
  category: string;
  amount: number; // Negative for debits, positive for credits
  balance: number;
  isPending: boolean;
  isManual: boolean; // True if manually entered vs imported
  isReconciled?: boolean; // True if transaction has been reconciled
  sortOrder?: number; // Preserves original CSV order
  isProjectedVisible?: boolean; // For projected transactions - controls visibility in balance calculations
}

export interface Account {
  id: string;
  name: string;
  accountType: 'checking' | 'savings' | 'credit_card';
  accountNumber: string;
  routingNumber?: string; // Optional for credit cards
  availableBalance: number;
  institution: string;
  creditLimit?: number; // For credit cards
  apr?: number; // Annual Percentage Rate for credit cards
  isDefault?: boolean; // Mark one account as default
}

export interface RecurringBill {
  id: string;
  accountId?: string; // Links bill to specific account (optional for backward compatibility)
  description: string;
  category: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfMonth?: number; // For monthly bills (1-31)
  dayOfWeek?: number; // For weekly bills (0-6: Sunday-Saturday)
  weekOfMonth?: number; // For monthly bills on specific week (1-4: 1st, 2nd, 3rd, 4th, or 5 for last)
  nextDueDate: Date;
  isActive: boolean;
}

export interface Debt {
  id: string;
  name: string;
  type: 'credit_card' | 'loan' | 'mortgage' | 'student_loan' | 'other';
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate?: number; // Day of month
  institution?: string;
}

export interface ParsedCSVData {
  transactions: Transaction[];
  errors: string[];
}

export interface MerchantMapping {
  id: string;
  originalDescriptions: string[]; // List of raw descriptions that map to this merchant
  displayName: string; // The unified name to show
  category?: string; // Optional default category
  isCustom: boolean; // True if user-created, false if auto-detected
  createdAt: Date;
  updatedAt: Date;
}
