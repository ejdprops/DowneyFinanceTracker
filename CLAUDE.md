# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DowneyFinanceTracker is a personal budget management web application that helps track finances, project account balances, and manage debt. The app runs entirely client-side in the browser and is deployed to GitHub Pages.

**Key Features:**
- CSV import from USAA Savings Bank transactions
- Category management and spending limits
- Recurring transaction predictions
- Multiple account support (checking, savings, credit cards)
- Historical trend analysis with charts
- Debt tracking with interest rate calculations
- Payment schedule optimization
- Payoff timeline projections

**Data Storage:**
- Financial data stored in iCloud Drive folder (user-selected)
- All processing happens client-side in browser
- No backend server required

## Technology Stack

- **React 19** with **TypeScript** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS 4** - Styling
- **Recharts** - Charts and data visualization
- **PapaParse** - CSV parsing
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

## USAA CSV Format

The app expects CSV files from USAA Savings Bank with the following structure (exact column names may vary):
- Date
- Description
- Category (optional)
- Amount/Debit/Credit
- Balance

Parser should be flexible to handle variations in USAA's export format.

## Financial Calculations

Key calculation modules needed:
- **Balance projection:** Forecast account balances based on recurring transactions and scheduled payments
- **Debt payoff:** Calculate optimal payment schedules using avalanche/snowball methods
- **Interest calculations:** Compound interest for debts with different rates
- **Budget variance:** Compare actual vs. budgeted spending by category

## Data Model

Core entities:
- **Transaction:** Date, amount, description, category, account
- **Account:** Name, type (checking/savings/credit), current balance
- **Budget:** Category, monthly limit, rollover settings
- **Debt:** Name, balance, interest rate, minimum payment, target payoff date
- **RecurringTransaction:** Pattern, frequency, amount, category

## iCloud Integration

Use browser File System Access API where supported, fallback to manual file upload/download:
- User selects iCloud folder location on first use
- App requests persistent file access permission
- Automatic save/load when permission granted
- Manual export/import as fallback
