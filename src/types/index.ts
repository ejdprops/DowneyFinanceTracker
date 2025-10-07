export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  balance?: number;
  category?: string;
  account?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit';
  currentBalance: number;
  institution?: string;
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  rollover: boolean;
}

export interface Debt {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  targetPayoffDate?: Date;
}

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate?: Date;
}

export interface ParsedCSVData {
  transactions: Transaction[];
  errors: string[];
}
