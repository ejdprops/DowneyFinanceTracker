export type CategoryType =
  | 'Income'
  | 'Transfer'
  | 'Bill'
  | 'Medical'
  | 'Spending'
  | 'Debt'
  | 'Other';

export const categoryColors: Record<CategoryType, string> = {
  Income: 'bg-green-400 text-black',
  Transfer: 'bg-gray-400 text-black',
  Bill: 'bg-yellow-300 text-black',
  Medical: 'bg-purple-400 text-white',
  Spending: 'bg-cyan-400 text-black',
  Debt: 'bg-red-500 text-white',
  Other: 'bg-gray-200 text-gray-700',
};

export const getCategoryColor = (category?: string): string => {
  if (!category) return categoryColors.Other;

  const normalized = category.toLowerCase();

  if (normalized.includes('income') || normalized.includes('salary') ||
      normalized.includes('pay') || normalized.includes('retirement') ||
      normalized.includes('disability')) {
    return categoryColors.Income;
  }

  if (normalized.includes('transfer')) {
    return categoryColors.Transfer;
  }

  if (normalized.includes('bill') || normalized.includes('insurance') ||
      normalized.includes('mortgage')) {
    return categoryColors.Bill;
  }

  if (normalized.includes('medical') || normalized.includes('health') ||
      normalized.includes('doctor') || normalized.includes('prescription')) {
    return categoryColors.Medical;
  }

  if (normalized.includes('spending') || normalized.includes('allowance') ||
      normalized.includes('groceries') || normalized.includes('gas')) {
    return categoryColors.Spending;
  }

  if (normalized.includes('debt') || normalized.includes('loan') ||
      normalized.includes('credit')) {
    return categoryColors.Debt;
  }

  return categoryColors.Other;
};

export const allCategories: CategoryType[] = [
  'Income',
  'Transfer',
  'Bill',
  'Medical',
  'Spending',
  'Debt',
  'Other',
];
