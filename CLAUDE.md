# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DowneyFinanceTracker is a personal budget management web application that helps track finances, project account balances, and manage debt. The app runs entirely client-side in the browser and is deployed to GitHub Pages.

**Key Features:**
- CSV/PDF import from multiple banks (USAA, Chase, Capital One, Apple Card, Bank of America, Wells Fargo)
- Automatic bank format detection
- PDF statement parsing with bank-specific parsers
- Category management and spending limits
- Recurring transaction predictions
- Multiple account support (checking, savings, credit cards)
- Historical trend analysis with charts
- Merchant grouping and management
- Debt tracking with interest rate calculations
- Payment schedule optimization
- Payoff timeline projections
- Mobile device detection and responsive design
- iCloud Drive sync via File System Access API

**Data Storage:**
- Financial data stored in iCloud Drive folder (user-selected)
- All processing happens client-side in browser
- No backend server required

## Technology Stack

- **React 19** with **TypeScript** - UI framework
- **Vite** - Build tool and dev server with code splitting
- **Tailwind CSS 4** - Styling
- **Recharts** - Charts and data visualization
- **PapaParse** - CSV parsing
- **PDF.js (pdfjs-dist)** - PDF statement parsing (lazy-loaded)
- **GitHub Pages** - Free hosting for static site

## Project Architecture

This is a **pure client-side application** with no backend:

1. User selects CSV file from iCloud Drive via browser file picker
2. CSV parsed and processed in browser using PapaParse
3. All calculations (projections, interest, debt payoff) done client-side
4. Data persisted to iCloud Drive as JSON/SQLite files (user saves manually or via File System Access API)
5. Static app deployed to GitHub Pages

**File Structure:**
- `/src/components/` - React components
- `/src/utils/` - Helper functions for calculations (interest, projections, etc.)
- `/src/types/` - TypeScript type definitions
- `/src/hooks/` - Custom React hooks

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run linter
npm run lint

# Deploy to GitHub Pages
npm run deploy
```

## GitHub Pages Deployment

The app is configured to deploy to GitHub Pages at `https://<username>.github.io/DowneyFinanceTracker/`

**Important:** The `base` path in `vite.config.ts` is set to `/DowneyFinanceTracker/` for GitHub Pages routing.

To deploy:
1. Ensure you have a GitHub repository created
2. Run `npm run deploy` (builds and pushes to `gh-pages` branch)
3. Enable GitHub Pages in repository settings (source: `gh-pages` branch)

## Supported Bank CSV/PDF Formats

The app automatically detects and parses multiple bank formats:

### CSV Formats

1. **USAA Checking/Savings:**
   - Format: `Date, Description, Original Description, Category, Amount, Status`
   - Single Amount column: positive = spent, negative = received

2. **USAA Credit Card:**
   - Same format as checking but with reversed signs in the CSV file
   - CSV file: Positive = payments received, negative = charges
   - After parsing: Signs are inverted so positive = charges, negative = payments (consistent with other cards)
   - Auto-detected by presence of "Credit Card Payment" transactions OR by account type

3. **Capital One:**
   - Format: `Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit`
   - Separate Debit/Credit columns
   - After parsing: Debits = charges (positive), Credits = payments (negative)

4. **Apple Card:**
   - Format: `Transaction Date, Clearing Date, Description, Merchant, Category, Type, Amount (USD), Purchased By`
   - Type field indicates Purchase/Payment
   - After parsing: Purchases = positive (debt), Payments = negative (credit)
   - Pending transactions have no Clearing Date

5. **Chase:**
   - Format: `Transaction Date, Post Date, Description, Category, Type, Amount, Memo`
   - Single Amount column with signed values

6. **Bank of America:**
   - Format: `Date, Description, Amount, Running Bal.`
   - Unique "Running Bal" column

7. **Wells Fargo:**
   - Format: `Date, Amount, *, Check Number, Description`
   - Unique "Check Number" column

### PDF Formats

Supported PDF bank statements:
- **Apple Card** - Detects Goldman Sachs/Apple Card statements
- **USAA** - Parses USAA bank statements
- **Chase** - Parses Chase bank statements
- **Bank of America** - Parses BofA statements

PDF parsing uses `pdfjs-dist` with lazy loading to avoid loading the ~1MB library until needed.

## Financial Calculations

Key calculation modules needed:
- **Balance projection:** Forecast account balances based on recurring transactions and scheduled payments
- **Debt payoff:** Calculate optimal payment schedules using avalanche/snowball methods
- **Interest calculations:** Compound interest for debts with different rates
- **Budget variance:** Compare actual vs. budgeted spending by category

## Data Model

Core entities:
- **Transaction:** Date, amount, description, category, account, isPending, isReconciled, isManual
- **Account:** Name, type (checking/savings/credit_card), institution, accountNumber, routingNumber, availableBalance, creditLimit (for credit cards), apr, statementDueDate
- **RecurringBill:** Name, amount, frequency (weekly/biweekly/monthly/yearly), nextDueDate, category, accountId
- **Debt:** Name, balance, interest rate, minimum payment, target payoff date
- **Merchant:** Pattern matching for grouping similar merchants (e.g., all Amazon transactions)

## iCloud Integration

Uses browser File System Access API:
- User selects iCloud folder location on first use
- App stores folder path in localStorage
- Quick sync button in header for one-click sync
- Manual export/import via JSON files on iCloud Sync tab
- All data synced as JSON with timestamp

## UI Design

### Header
- Account selector buttons across top showing account name and current balance
- Active account highlighted with blue-to-purple gradient
- Buttons wrap to multiple lines when needed
- "Manage" button next to account name for quick account settings access
- iCloud sync button in header when connected
- **Credit card balances** displayed in red as negative numbers to show debt owed
  - Positive balance (you owe money) = displayed as negative in red (e.g., -$500.00)
  - Negative balance (credit/overpayment) = displayed as positive in white (e.g., $50.00)
- Credit card accounts show credit limit, available credit, APR, and due date

### Tabs
- Account Info - Summary boxes, import CSV/PDF
- Transactions - Register with filtering, reconciliation
- Recurring Bills - Manager and suggestions
- Projections - 60-day balance forecast
- Spending Charts - Category breakdown with timeframe filters
- Merchants - Merchant grouping management
- Debts - Debt tracker with payoff calculator
- iCloud Sync - Folder selection and manual sync

### Mobile Support
- Responsive design with mobile detection
- Touch capability detection to avoid false positives on desktop
- Optimized layouts for mobile screens

## Important Implementation Notes

### CSV Parsing
- Bank format detection happens automatically based on headers
- Order matters: more specific formats (Apple Card, Capital One) checked before generic formats
- USAA credit cards auto-detected by scanning for "Credit Card Payment" transactions (>5% threshold)
- Capital One must be detected before Chase (both have "Transaction Date" but Capital One has Debit/Credit columns)
- **Transaction sign convention**: All transactions are stored with positive = spent/owe, negative = received/paid
  - For credit cards: positive amounts increase debt, negative amounts decrease debt
  - For checking/savings: positive amounts decrease balance, negative amounts increase balance

### PDF Parsing
- Lazy-loaded to avoid loading 1MB+ PDF.js library until needed
- Worker bundled locally (not CDN) for reliability
- Multiple bank-specific parsers with fallback to generic parser

### Balance Calculations
- Balances calculated by `calculateBalances()` in utils/projections.ts
- Starts from account's availableBalance and works through sorted transactions
- Credit cards show balance owed (positive = owe, negative = overpaid)
- Checking accounts show available balance

### Transaction States
- **isPending:** Not yet posted to account
- **isReconciled:** Cleared/reconciled (checkmark in register)
- **isManual:** User-created (not imported from CSV/PDF)
- **Projected transactions:** Generated from recurring bills, dismissible

### Merchant Grouping
- Pattern-based matching in SpendingCharts component
- Amazon patterns include: amazon, amzn, mktpl, mktp (to catch "AMAZON MKTPL*..." transactions)
- Case-insensitive matching
- Keywords array for additional matching flexibility
