export interface Transaction {
  id: string;
  accountId?: string; // Links transaction to specific account (optional for backward compatibility)
  recurringBillId?: string; // Links transaction to recurring bill (for projected and matched transactions)
  linkedTransactionId?: string; // Links to corresponding transaction in another account (e.g., payment from checking to credit card)
  date: Date;
  description: string;
  category: string;
  amount: number; // Negative for debits, positive for credits
  balance: number;
  isPending: boolean;
  isPosted?: boolean; // True if transaction is posted (from CSV Status field)
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
  statementDueDate?: number; // Day of month when statement is due (1-31) for credit cards
  minimumPayment?: number; // Minimum payment amount for credit cards
  paymentDueDate?: Date; // Exact payment due date for credit cards
  isDefault?: boolean; // Mark one account as default
  promotionalPurchases?: PromotionalPurchase[]; // Promotional purchases (Synchrony only)
  reconciliationDate?: Date; // Date of last statement reconciliation
  reconciliationBalance?: number; // Statement ending balance at that date
  lastReconciliationSource?: string; // e.g., "Apple Card Statement - Jan 2025"
}

export interface RecurringBill {
  id: string;
  accountId?: string; // Links bill to specific account (optional for backward compatibility)
  description: string;
  category: string;
  amount: number;
  amountType?: 'fixed' | 'variable'; // Whether amount is fixed or can vary
  amountTolerance?: number; // For variable amounts: percentage tolerance (e.g., 10 = ±10%)
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
  accountBalance?: number; // Optional account balance extracted from statement
  promotionalPurchases?: PromotionalPurchase[]; // Optional promotional purchases (Synchrony only)
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

export interface PromotionalPurchase {
  id: string;
  transactionDate: Date; // Original purchase date
  description: string; // e.g., "Equal Payment No Interest"
  initialAmount: number; // Original purchase amount
  promotionalBalance: number; // Remaining balance on promotion
  expirationDate: Date; // Date by which balance must be paid to avoid deferred interest
  deferredInterestCharge: number; // Amount of deferred interest if not paid in full
}
