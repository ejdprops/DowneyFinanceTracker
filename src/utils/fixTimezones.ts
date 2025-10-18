import { loadRecurringBills, saveRecurringBills } from './storage';

/**
 * Fix timezone issues in recurring bills by re-parsing dates
 * This function loads all recurring bills and ensures their dates are in local timezone
 */
export const fixRecurringBillTimezones = (): { fixed: number; bills: Array<{ description: string; oldDate: string; newDate?: string }> } => {
  const bills = loadRecurringBills();

  const fixedBills = bills.map(bill => {
    // Get the date string from the Date object
    const dateStr = bill.nextDueDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Create a new date in local timezone
    const fixedDate = new Date(dateStr + 'T00:00:00');

    return {
      ...bill,
      nextDueDate: fixedDate,
    };
  });

  // Save the fixed bills
  saveRecurringBills(fixedBills);

  return {
    fixed: fixedBills.length,
    bills: fixedBills.map(b => ({
      description: b.description,
      oldDate: b.nextDueDate.toISOString(),
      newDate: fixedBills.find(fb => fb.id === b.id)?.nextDueDate.toISOString(),
    })),
  };
};

/**
 * Run this in the browser console to fix all dates:
 *
 * ```javascript
 * import('./utils/fixTimezones').then(m => {
 *   const result = m.fixRecurringBillTimezones();
 *   console.log(`Fixed ${result.fixed} bills`);
 *   console.table(result.bills);
 * });
 * ```
 */
