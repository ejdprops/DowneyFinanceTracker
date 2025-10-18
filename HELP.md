# DowneyFinanceTracker - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Downloading CSV Files from Banks](#downloading-csv-files)
   - [USAA Checking & Savings](#usaa-checking--savings)
   - [USAA Credit Cards](#usaa-credit-cards)
   - [Apple Card](#apple-card)
   - [Capital One](#capital-one)
   - [Chase](#chase)
   - [Bank of America](#bank-of-america)
   - [Wells Fargo](#wells-fargo)
3. [Importing Transactions](#importing-transactions)
4. [iCloud Sync Setup](#icloud-sync-setup)
5. [Managing Accounts](#managing-accounts)
6. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

DowneyFinanceTracker is a personal finance management tool that helps you track your finances across multiple accounts. The app runs entirely in your browser and can sync data to your iCloud Drive folder.

**Key Features:**
- Import transactions from CSV files or PDF statements
- Track multiple checking, savings, and credit card accounts
- Automatic balance calculations and projections
- Recurring bill tracking
- Spending analysis by category
- iCloud Drive sync (optional)

---

## Downloading CSV Files from Banks

### USAA Checking & Savings

**Step 1: Log in to USAA**
1. Go to [usaa.com](https://www.usaa.com)
2. Log in with your credentials

**Step 2: Navigate to Your Account**
1. Click on "Accounts" in the top menu
2. Select the checking or savings account you want to export

**Step 3: Download Transactions**
1. Look for "Transactions" or "Activity" tab
2. Click "Download" or "Export" button (usually at the top right)
3. Select date range (e.g., last 30 days, last 90 days, or custom range)
4. Choose format: **CSV** or **Comma Delimited**
5. Click "Download" or "Export"

**File Format:** The CSV will include columns: Date, Description, Original Description, Category, Amount, Status

**Important Notes:**
- Pending transactions will show "Pending" in the Status column
- Positive amounts = money spent, Negative amounts = money received
- When you re-import later, pending transactions that have cleared will be automatically updated

---

### USAA Credit Cards

**Step 1-2: Same as USAA Checking**
Follow steps 1-2 above, but select your credit card account

**Step 3: Download Transactions**
1. Look for "Transactions" or "Activity" tab
2. Click "Download" or "Export" button
3. Select date range
4. Choose format: **CSV** or **Comma Delimited**
5. Click "Download" or "Export"

**File Format:** Same format as checking, but amounts are reversed in the CSV

**Important Notes:**
- The app will automatically detect this is a credit card and invert the amounts
- In the CSV: Positive = payments, Negative = charges
- After import: Charges increase your debt, Payments decrease it

---

### Apple Card

**Step 1: Open Wallet App**
1. Open the **Wallet** app on your iPhone or iPad
2. Tap on your **Apple Card**

**Step 2: Export Transactions**
1. Tap the **•••** (three dots) in the top right corner
2. Scroll down and tap "**Export Transactions**"
3. Select the time period (e.g., "This Month", "Last Month", or custom date range)
4. Tap "**Export**"

**Step 3: Save the CSV File**
1. Choose how to share the file (AirDrop, Files app, etc.)
2. If using iCloud Drive, save directly to your DowneyFinanceTracker folder
3. If using another method, transfer the file to your computer

**File Format:** Columns include Transaction Date, Clearing Date, Description, Merchant, Category, Type, Amount (USD), Purchased By

**Important Notes:**
- The "Type" column indicates "Purchase" or "Payment"
- Pending transactions have no "Clearing Date"
- The app automatically handles the amount signs correctly

---

### Capital One

**Step 1: Log in to Capital One**
1. Go to [capitalone.com](https://www.capitalone.com)
2. Log in with your credentials

**Step 2: Navigate to Your Account**
1. Click on the credit card account you want to export
2. Click on "**View All Transactions**" or "**Transactions**"

**Step 3: Download Transactions**
1. Look for "**Download**" or "**Export**" option (usually near the search box)
2. Select date range
3. Choose format: **CSV** or **Comma Separated Values**
4. Click "Download"

**File Format:** Columns include Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit

**Important Notes:**
- Debit column = charges (money you owe)
- Credit column = payments and refunds
- The app handles the separate Debit/Credit columns automatically

---

### Chase

**Step 1: Log in to Chase**
1. Go to [chase.com](https://www.chase.com)
2. Log in with your credentials

**Step 2: Navigate to Your Account**
1. Click on the account you want to export
2. Go to "**Activity & statements**" or "**Transactions**"

**Step 3: Download Transactions**
1. Click "**Download**" (usually in the top right of the transaction list)
2. Select date range
3. Choose file type: **CSV**
4. Click "Download"

**File Format:** Columns include Transaction Date, Post Date, Description, Category, Type, Amount, Memo

**Important Notes:**
- Single amount column with signed values
- Type indicates "Sale", "Payment", "Adjustment", etc.

---

### Bank of America

**Step 1: Log in to Bank of America**
1. Go to [bankofamerica.com](https://www.bankofamerica.com)
2. Log in with your credentials

**Step 2: Navigate to Your Account**
1. Click on the account you want to export
2. Go to "**Transactions**" tab

**Step 3: Download Transactions**
1. Click "**Download transactions**" link (usually above transaction list)
2. Select download options:
   - File type: **Comma Delimited** or **CSV**
   - Date range: Choose your range
3. Click "Download"

**File Format:** Columns include Date, Description, Amount, Running Bal.

**Important Notes:**
- Has a unique "Running Bal." column showing balance after each transaction
- The app uses the Running Bal. column to verify balance calculations

---

### Wells Fargo

**Step 1: Log in to Wells Fargo**
1. Go to [wellsfargo.com](https://www.wellsfargo.com)
2. Log in with your credentials

**Step 2: Navigate to Your Account**
1. Click on the account you want to export
2. Click "**Download**" or look for download options

**Step 3: Download Transactions**
1. Select "**Download Account Activity**"
2. Choose:
   - File type: **Comma Delimited (CSV)**
   - Date range: Select your range
3. Click "Download"

**File Format:** Columns include Date, Amount, *, Check Number, Description

**Important Notes:**
- Has a unique "Check Number" column
- The * column is typically empty or contains transaction type codes

---

## Importing Transactions

**Step 1: Select Your Account**
1. In the header, click on the account button you want to import transactions for
2. Make sure the correct account is highlighted (blue/purple gradient)

**Step 2: Navigate to Account Information Tab**
1. Click the "**Account Info**" tab (first tab)
2. Scroll down to the "**Import Transactions**" section

**Step 3: Import CSV File**
1. Click the "**Import CSV**" button (or drag & drop the CSV file)
2. Select your CSV file from your computer
3. The app will automatically:
   - Detect which bank format it is
   - Parse the transactions
   - Match pending transactions that have cleared
   - Avoid importing duplicates

**Step 4: Enter Current Balance (Optional but Recommended)**
1. After parsing, you'll see a prompt asking for your current balance
2. Open your bank's website/app and check your current balance
3. Enter the exact balance shown in your bank
4. Click "Submit" (or "Skip" if you don't want to update the balance)

**Step 5: Review Import Results**
1. You'll see a summary: "X new, Y updated, Z skipped"
2. New = brand new transactions
3. Updated = pending transactions that cleared
4. Skipped = duplicates already in the system

**What Happens to Pending Transactions:**
- If you import a CSV with a pending transaction, it's marked as "Pending"
- When you import again and that transaction has cleared:
  - The app finds the matching pending transaction
  - Updates it with the new description, category, and date
  - Marks it as "Posted" (no longer pending)
  - No duplicate is created!

---

## iCloud Sync Setup

iCloud Sync allows you to store your financial data in your iCloud Drive folder, making it accessible across devices and providing automatic backups.

### First Time Setup

**Step 1: Enable iCloud Sync**
1. Click on the "**iCloud Sync**" tab
2. Click "**Select iCloud Folder**" button
3. A folder picker will appear

**Step 2: Choose Your Folder**
1. Navigate to your iCloud Drive (should appear in the left sidebar)
2. You can either:
   - Select an existing folder (e.g., "Documents/Finance")
   - Create a new folder (click "New Folder" button)
3. Click "**Select**" or "**Open**" to confirm

**Step 3: Grant Permissions**
1. Your browser will ask for permission to access the folder
2. Click "**Allow**" or "**Grant Access**"
3. The app will remember this folder

**Step 4: Initial Sync**
1. If the folder is empty, the app will save your current data
2. If there's existing data, you'll be asked if you want to load it
3. Choose "**Load**" to import existing data, or "**Cancel**" to keep current data

### Using iCloud Sync

**Quick Sync Button (in Header):**
- Once connected, you'll see a green "**Sync to iCloud**" button in the header
- Click it anytime to save your current data to iCloud
- The button shows a checkmark when sync is successful

**Manual Export/Import:**
1. Go to the "**iCloud Sync**" tab
2. You can:
   - **Export to JSON**: Download a backup file to your computer
   - **Import from JSON**: Upload a previously saved backup
   - **Sync to iCloud**: Save all data to your iCloud folder
   - **Load from iCloud**: Restore data from your iCloud folder

**What Gets Synced:**
- All transactions across all accounts
- All accounts and their settings
- All recurring bills
- All debt tracking information
- All merchant mappings
- Timestamp of last sync

**Important Notes:**
- **Browser Requirement**: iCloud Sync requires Safari, Chrome, or Edge (browsers that support File System Access API)
- **Permissions**: The browser may ask for permission again after closing/reopening the app
- **Manual Sync**: The app does NOT auto-sync. Click the sync button when you want to save changes
- **Multiple Devices**: If using multiple devices, always sync before making changes and after finishing work
- **Backups**: Consider using "Export to JSON" periodically for extra backups

### Troubleshooting iCloud Sync

**"Permission denied" error:**
- Click the folder picker again and re-grant permissions
- Make sure you selected a folder in iCloud Drive (not local Documents)

**"No data found" message:**
- The folder might be empty on first use (this is normal)
- The app will create a `finance-data.json` file on first sync

**Sync button not appearing:**
- Make sure you selected an iCloud folder first
- Try refreshing the page and re-selecting the folder

**Data not syncing across devices:**
- Make sure you clicked "Sync to iCloud" on the first device
- On the second device, click "Load from iCloud" to get the data
- Always sync before switching devices

---

## Managing Accounts

### Adding a New Account

**Step 1: Open Account Management**
1. Click the "**+**" button in the header (next to account buttons)
2. OR click "**Manage Accounts**" button

**Step 2: Fill in Account Details**
- **Account Name**: Give it a descriptive name (e.g., "USAA Checking", "Apple Card")
- **Account Type**: Select Checking, Savings, or Credit Card
- **Account Number**: Last 4 digits are fine (for display only)
- **Routing Number**: For checking/savings only
- **Institution**: Bank name (e.g., "USAA", "Apple", "Chase")
- **Available Balance**: Current balance from your bank

**For Credit Cards, Also Fill In:**
- **Credit Limit**: Your total credit limit
- **APR**: Annual Percentage Rate
- **Statement Due Date**: Day of month (1-31) when payment is due

**Step 3: Save**
1. Click "**Add Account**" button
2. The new account will appear in the header

### Editing an Account

1. Click "**Manage Accounts**" button or "**+**" in header
2. Click "**Edit**" on the account you want to modify
3. Update the fields
4. Click "**Update Account**"

### Deleting an Account

⚠️ **Warning**: Deleting an account will also delete ALL transactions and recurring bills for that account!

1. Click "**Manage Accounts**"
2. Click "**Delete**" on the account
3. Confirm the deletion

---

## Tips & Best Practices

### Import Workflow

**Recommended Import Frequency:**
- **Weekly**: For accounts you use frequently
- **Monthly**: For less active accounts
- **After large purchases**: To track pending → posted updates

**Best Import Practice:**
1. Always select the correct account BEFORE importing
2. Import newest transactions first (download last 30-90 days from bank)
3. Enter your current balance when prompted
4. Check the import summary to verify results
5. Sync to iCloud after importing

### Balance Management

**Checking Your Balance:**
- The header shows the current balance after all transactions
- Green = positive balance (or credit on credit card)
- Red = debt owed (credit card) or overdrawn (checking)

**Adjusting Balance:**
1. Go to "**Account Info**" tab
2. Click "**Adjust Balance**" button
3. Enter the exact balance from your bank
4. This recalculates all transaction balances

**When to Adjust:**
- After your first import for a new account
- If balance seems off after multiple imports
- After reconciling with your bank statement

### Handling Pending Transactions

**What are Pending Transactions?**
- Transactions that haven't fully cleared your bank yet
- Usually show "Pending" status in your bank's app
- May have limited information (generic description, no category)

**How the App Handles Them:**
1. **First Import**: Pending transaction is added with "Pending" status
2. **Second Import** (after it clears): App finds the pending transaction and updates it with:
   - New description (usually more detailed)
   - Updated category (USAA provides better categories when posted)
   - Actual posting date
   - "Posted" status

**Best Practice:**
- Import weekly to catch pending → posted transitions
- Don't manually edit pending transactions (they'll be updated when they post)

### Using Recurring Bills

**Why Use Recurring Bills:**
- Automatically projects future expenses
- Helps with balance forecasting
- Can create transactions from projections

**Setting Up Recurring Bills:**
1. Go to "**Recurring Bills**" tab
2. Click "**Add Bill**"
3. Enter details:
   - Description (e.g., "Netflix Subscription")
   - Amount
   - Frequency (weekly, biweekly, monthly, yearly)
   - Next Due Date
   - Category

**Projected Transactions:**
- Enable "Show Projections" to see future transactions
- Projected transactions appear in italics
- They're not included in CSV exports
- You can dismiss individual projections
- You can create actual transactions from projections

### Category Management

**Editing Categories:**
- Click on any transaction in the Register tab
- Click the category field to edit
- Categories are free-form text (no predefined list)

**Category Tips:**
- Use consistent naming (e.g., "Groceries" not "grocery", "Groceries", "Food-Grocery")
- Common categories: Groceries, Gas & Fuel, Dining, Shopping, Bills, Entertainment
- View category spending in "**Spending Charts**" tab

### Data Export & Backup

**Exporting Your Data:**
1. Go to "**iCloud Sync**" tab
2. Click "**Export to JSON**"
3. Save the file to a safe location
4. File includes ALL your data in JSON format

**When to Export:**
- Before major changes
- Monthly as a backup
- Before deleting accounts or large batches of transactions
- Before clearing browser data

**Importing Exported Data:**
1. Go to "**iCloud Sync**" tab
2. Click "**Import from JSON**"
3. Select your previously exported JSON file
4. Data will be restored

### Multiple Device Usage

**Using on Multiple Devices:**
1. **Setup**: Set up iCloud Sync on your first device
2. **First Device**: Make changes, then click "Sync to iCloud"
3. **Second Device**:
   - Set up iCloud Sync using the SAME folder
   - Click "Load from iCloud"
   - Make changes
   - Click "Sync to iCloud" when done
4. **Back to First Device**: Click "Load from iCloud" to get latest data

**Important:**
- Always sync before switching devices
- Only one person should edit at a time (no real-time collaboration)
- Last sync wins (newer data overwrites older)

### Security & Privacy

**Your Data is Private:**
- All data stays in your browser and iCloud Drive
- No data is sent to external servers
- No account required, no tracking

**Data Storage:**
- **Browser**: localStorage (stays on your device)
- **iCloud**: Encrypted by Apple (only you can access)
- **Sync**: Direct browser → iCloud (no intermediary servers)

**Keeping Data Safe:**
- Use iCloud Sync for automatic backups
- Export JSON backups monthly
- Don't share your iCloud folder
- Clear browser data will erase local data (use iCloud Sync first!)

### Performance Tips

**For Best Performance:**
- Keep transaction count under 5,000 per account
- Delete old transactions you don't need (export first!)
- Use date filters in Register tab to view subsets
- Close other browser tabs if app is slow

**If App Becomes Slow:**
1. Export your data to JSON
2. Delete old transactions (older than 1-2 years)
3. Or archive old data (export, then start fresh)

---

## Getting Help

**Common Questions:**

**Q: Can I use this on my phone?**
A: Yes! The app works on mobile browsers. For iCloud Sync on iOS, use Safari.

**Q: Will my data be deleted if I close the browser?**
A: No, data is saved in localStorage. However, clearing browser data WILL delete it (use iCloud Sync for backups).

**Q: Can multiple people use this?**
A: The app is designed for individual use. Multiple people can use it via iCloud Sync, but only one should edit at a time.

**Q: What if I import the same file twice?**
A: The app detects duplicates and skips them. You'll see "X skipped" in the import summary.

**Q: Can I export to Excel/Numbers?**
A: The JSON export can be opened in a text editor. For Excel, you can save individual bank CSVs before importing them.

**Q: Is my bank password stored anywhere?**
A: No! You download CSVs from your bank separately. The app never asks for or stores bank credentials.

---

**Need More Help?**
- Check the [GitHub repository](https://github.com/anthropics/DowneyFinanceTracker) for updates
- Review the code documentation in CLAUDE.md
- Submit issues or feature requests on GitHub

---

*Last Updated: January 2025*
*DowneyFinanceTracker v1.0*
