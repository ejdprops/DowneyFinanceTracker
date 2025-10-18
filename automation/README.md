# USAA Browser Automation

Automated CSV download scripts for USAA checking, savings, and credit card accounts using Playwright.

## Features

- **Manual Login**: You log in manually (no credential storage)
- **Automated Download**: Script automates the CSV download process
- **Headed Browser**: See what's happening in real-time
- **Multiple Account Types**: Checking, Savings, and Credit Cards
- **Safe & Secure**: No credentials stored anywhere

## Prerequisites

1. **Node.js** installed (v14 or higher)
2. **Playwright** installed with Chromium browser

## Installation

Playwright is already installed in the project. If you need to reinstall:

```bash
npm install playwright
npx playwright install chromium
```

## Usage

### Option 1: Interactive Menu (Recommended)

Run the interactive menu to select which account to download:

```bash
npm run download:usaa
```

You'll see a menu like:
```
╔════════════════════════════════════════════╗
║   USAA CSV Download Automation Tool       ║
╚════════════════════════════════════════════╝

Select account type to download:

  1. Checking/Savings Account
  2. Credit Card Account
  3. Exit

Enter your choice (1-3):
```

### Option 2: Direct Script Execution

Run specific account type directly:

**For Checking/Savings:**
```bash
npm run download:usaa-checking
```

**For Credit Cards:**
```bash
npm run download:usaa-creditcard
```

## How It Works

1. **Browser Opens**: A Chromium browser window opens with the USAA login page
2. **Manual Login**: You log in manually using your username, password, and 2FA
3. **Wait for Success**: Script detects successful login (up to 2 minutes)
4. **Automation Begins**: Script navigates to accounts and initiates CSV download
5. **File Saved**: CSV file is saved to `downloads/` folder
6. **Browser Closes**: Browser closes automatically when complete

## Download Location

All CSV files are saved to:
```
DowneyFinanceTracker/downloads/
```

The downloaded files will have names like:
- `USAA_Checking_Transactions_2025-10-15.csv`
- `USAA_CreditCard_Activity_2025-10-15.csv`

## Workflow Details

### Checking/Savings Account

1. Opens USAA login page
2. Waits for manual login
3. Navigates to Accounts page
4. Selects checking account
5. Clicks Download/Export
6. Selects CSV format
7. Downloads transactions

### Credit Card Account

1. Opens USAA login page
2. Waits for manual login
3. Navigates to Credit Cards section
4. Selects credit card
5. Goes to Transactions/Activity
6. Clicks Download/Export
7. Selects CSV format
8. Downloads transactions (typically last 90 days)

## Troubleshooting

### Issue: "Could not find download button"

**Solution**: The script will wait 30 seconds. Manually click the Download/Export button.

USAA's website structure changes occasionally. If the automation can't find buttons:
1. Watch the browser
2. Manually click any buttons it misses
3. The download should still work

### Issue: "Login timeout"

**Solution**: You have 2 minutes to complete login. Make sure to:
- Enter username and password quickly
- Complete 2FA promptly
- If you need more time, edit `CONFIG.TIMEOUT` in the script

### Issue: "No accounts found"

**Solution**:
- Verify you have the account type you're trying to download
- Check that the account is visible in USAA web interface
- Try the other account type script

### Issue: Download didn't work

**Solution**:
1. Check the `downloads/` folder - file may already be there
2. Check your browser's default Downloads folder
3. Try running the script again
4. Manually complete the download steps while the browser is open

## Security Notes

### ✅ What's Safe

- **No Credentials Stored**: You log in manually every time
- **No Sensitive Data**: Scripts don't capture or store login info
- **Local Execution**: Everything runs on your computer
- **Open Source**: All code is visible and auditable

### ⚠️ Security Best Practices

1. **Keep Scripts Private**: Don't share these scripts with downloaded CSV files
2. **Secure Downloads**: The `downloads/` folder contains sensitive financial data
3. **Clean Up**: Delete old CSV files after importing them
4. **Update Regularly**: Keep Playwright updated for security patches

## Customization

### Change Download Folder

Edit the `CONFIG` object in the scripts:

```javascript
const CONFIG = {
  DOWNLOAD_DIR: path.join(__dirname, '..', 'my-custom-folder'),
  // ...
};
```

### Adjust Login Timeout

Change the timeout duration (in milliseconds):

```javascript
const CONFIG = {
  TIMEOUT: 180000, // 3 minutes instead of 2
  // ...
};
```

### Select Specific Account

By default, scripts select the first account found. To target a specific account:

1. Modify the script to look for specific account text
2. Add account number matching logic
3. Use CSS selectors for specific accounts

## Advanced Usage

### Run Without npm Scripts

```bash
node automation/usaa-checking.js
node automation/usaa-creditcard.js
node automation/usaa-download.js
```

### Debug Mode

To see detailed Playwright logs:

```bash
DEBUG=pw:api node automation/usaa-checking.js
```

### Headless Mode (Not Recommended)

For headless execution (no browser window), edit the script:

```javascript
const CONFIG = {
  HEADLESS: true,  // Changed from false
  // ...
};
```

**Note**: Headless mode won't work for manual login. You'd need to implement automated login (not recommended for security).

## Importing to DowneyFinanceTracker

After downloading CSVs:

1. Open DowneyFinanceTracker in browser
2. Go to **Account Info** tab
3. Click **Import CSV**
4. Select downloaded file from `downloads/` folder
5. Review and confirm import

## Future Enhancements

Possible improvements:
- [ ] Support for multiple accounts (select which one)
- [ ] Automatic date range selection
- [ ] Direct integration with FinanceTracker app
- [ ] Support for other banks (Capital One, Chase, etc.)
- [ ] Browser extension approach
- [ ] Scheduled downloads

## File Structure

```
automation/
├── README.md                 # This file
├── usaa-checking.js          # Checking/Savings automation
├── usaa-creditcard.js        # Credit Card automation
└── usaa-download.js          # Interactive menu

downloads/                    # Downloaded CSV files (created automatically)
```

## Support

If you encounter issues:

1. Check USAA website hasn't changed significantly
2. Update Playwright: `npm install playwright@latest`
3. Review console logs for error details
4. Try manual intervention when script pauses
5. Check this README for troubleshooting tips

## License

Part of DowneyFinanceTracker - Personal use only.

---

**Happy Automating!** 🤖💰
