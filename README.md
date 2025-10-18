# Downey Finance Tracker

A personal budget management web application that helps track finances, project account balances, and manage debt. The app runs entirely client-side in the browser and is deployed to GitHub Pages.

## Features

- **Multi-Account Support**: Track checking, savings, and credit card accounts
- **CSV/PDF Import**: Import from USAA, Chase, Capital One, Apple Card, Bank of America, Wells Fargo
- **Automated Downloads**: Browser automation scripts for USAA accounts
- **Recurring Bills**: Track and project recurring transactions
- **Balance Projections**: 60-day balance forecasts
- **Spending Analysis**: Category breakdown with charts
- **Debt Tracking**: Interest calculations and payoff planning
- **iCloud Sync**: Automatic sync via File System Access API
- **Merchant Grouping**: Organize similar transactions
- **Variable Amount Bills**: Handle bills with varying amounts

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

### Browser Automation (USAA CSV Downloads)

Automatically download CSV files from USAA accounts:

```bash
# Interactive menu
npm run download:usaa

# Or run specific account type
npm run download:usaa-checking
npm run download:usaa-creditcard
```

**How it works:**
1. Browser opens with USAA login
2. You log in manually (secure, no credentials stored)
3. Script automates the CSV download
4. File saved to `downloads/` folder
5. Import CSV in the app's Account Info tab

See [automation/README.md](automation/README.md) for detailed documentation.

## Technology Stack

- **React 19** with **TypeScript**
- **Vite** - Build tool and dev server
- **Tailwind CSS 4** - Styling
- **Recharts** - Charts and visualization
- **PapaParse** - CSV parsing
- **PDF.js** - PDF statement parsing
- **Playwright** - Browser automation
- **GitHub Pages** - Free static hosting

## Project Structure

```
DowneyFinanceTracker/
├── automation/           # Browser automation scripts
│   ├── README.md        # Automation documentation
│   ├── usaa-checking.js
│   ├── usaa-creditcard.js
│   └── usaa-download.js
├── downloads/           # Downloaded CSV files (gitignored)
├── src/
│   ├── components/      # React components
│   ├── utils/          # Helper functions
│   ├── types/          # TypeScript types
│   └── hooks/          # Custom React hooks
├── CLAUDE.md           # Development guidance
└── HELP.md             # User documentation
```

## Key Features Details

### Recurring Bills

- Set bills as **Fixed** or **Variable**
- Variable bills use tolerance percentage (±10%)
- Automatic matching with imported transactions
- Amount variation notifications
- One-click bill amount updates
- Automatic date advancement when bills post

### Transaction Matching

- Fuzzy description matching (70% similarity)
- Amount matching with tolerance for variable bills
- Replaces projected transactions with real ones
- Updates recurring bill nextDueDate automatically

### CSV Import

Supports multiple bank formats with automatic detection:
- USAA Checking/Savings
- USAA Credit Cards
- Capital One
- Apple Card
- Chase
- Bank of America
- Wells Fargo

### PDF Import

Parses PDF bank statements:
- Apple Card (Goldman Sachs)
- USAA statements
- Chase statements
- Bank of America statements

## Data Storage

- **Client-side only**: No backend server
- **iCloud Drive**: User-selected folder via File System Access API
- **Local Storage**: Quick session data
- **Manual Export**: JSON backup/restore

## Security

- ✅ No credentials stored
- ✅ All processing client-side
- ✅ Manual login for automation
- ✅ iCloud Drive sync (user-controlled)
- ⚠️ Keep downloaded CSVs secure
- ⚠️ Don't commit financial data to git

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Development guidance for AI assistants
- **[HELP.md](HELP.md)** - User documentation (accessible via Help button in app)
- **[automation/README.md](automation/README.md)** - Browser automation guide
- **[MERCHANT_GROUPING.md](MERCHANT_GROUPING.md)** - Merchant management guide

## GitHub Pages Deployment

Deployed at: `https://<username>.github.io/DowneyFinanceTracker/`

The `base` path in `vite.config.ts` is set to `/DowneyFinanceTracker/` for GitHub Pages routing.

```bash
npm run deploy
```

## Development Notes

- Pure client-side application (no backend)
- React functional components with hooks
- TypeScript for type safety
- Tailwind CSS with inline styles for critical colors
- ESLint for code quality
- Credit card debt stored as negative balances

## Browser Automation Benefits

- **Time Saving**: Automate repetitive CSV downloads
- **Secure**: Manual login, no stored credentials
- **Reliable**: Visible browser shows exactly what's happening
- **Flexible**: Easy to pause and intervene manually

## Troubleshooting

### Automation Issues

If browser automation fails:
1. USAA website may have changed
2. Update Playwright: `npm install playwright@latest`
3. Manually click buttons when script pauses
4. Check automation/README.md for details

### Build Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Fix linting errors
npm run lint
```

## Contributing

This is a personal finance tracker. Feel free to fork and customize for your needs.

## License

Private/Personal use only.

---

**Built with React, TypeScript, and Vite**
