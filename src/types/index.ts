export interface Transaction {
  id: string;
  accountId: string; // Links transaction to specific account
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
  isDefault?: boolean; // Mark one account as default
}

export interface RecurringBill {
  id: string;
  accountId: string; // Links bill to specific account
  description: string;
  category: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  dayOfMonth?: number; // For monthly bills
  dayOfWeek?: number; // For weekly bills (0-6)
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
