export interface Transaction {
  id: string;
  date: Date;
  description: string;
  category: string;
  amount: number; // Negative for debits, positive for credits
  balance: number;
  isPending: boolean;
  isManual: boolean; // True if manually entered vs imported
  isReconciled?: boolean; // True if transaction has been reconciled
  sortOrder?: number; // Preserves original CSV order
}

export interface Account {
  id: string;
  name: string;
  accountNumber: string;
  routingNumber: string;
  availableBalance: number;
  institution: string;
}

export interface RecurringBill {
  id: string;
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
