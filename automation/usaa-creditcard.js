/**
 * USAA Credit Card CSV Download Automation
 *
 * This script automates downloading transaction CSV files from USAA credit card accounts.
 *
 * USAGE:
 *   node automation/usaa-creditcard.js
 *   node automation/usaa-creditcard.js --from="2025-01-01" --to="2025-10-15"
 *
 * WORKFLOW:
 *   1. Opens USAA login page in headed browser
 *   2. User manually logs in (to avoid storing credentials)
 *   3. Script waits for successful login
 *   4. Navigates to credit card accounts
 *   5. Downloads CSV for specified credit card
 *
 * REQUIREMENTS:
 *   - Playwright installed (npm install playwright)
 *   - Chromium browser installed (npx playwright install chromium)
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1].replace(/"/g, '') : null;
};

const fromDate = getArg('from');
const toDate = getArg('to');

// Configuration
const CONFIG = {
  USAA_LOGIN_URL: 'https://www.usaa.com/login',
  DOWNLOAD_DIR: path.join(__dirname, '..', 'downloads'),
  TIMEOUT: 300000, // 5 minutes for manual login
  HEADLESS: false, // Must be false for manual login
  FROM_DATE: fromDate,
  TO_DATE: toDate,
};

// Ensure download directory exists
if (!fs.existsSync(CONFIG.DOWNLOAD_DIR)) {
  fs.mkdirSync(CONFIG.DOWNLOAD_DIR, { recursive: true });
}

async function downloadUSAACreditCard() {
  console.log('🚀 Starting USAA Credit Card CSV Download...\n');

  if (CONFIG.FROM_DATE && CONFIG.TO_DATE) {
    console.log(`📅 Date Range: ${CONFIG.FROM_DATE} to ${CONFIG.TO_DATE}\n`);
  }

  // Use persistent context to save login between sessions
  const userDataDir = path.join(__dirname, '..', '.playwright-data');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  console.log('💾 Using persistent browser session (login will be saved)...\n');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: CONFIG.HEADLESS,
    acceptDownloads: true,
    downloadsPath: CONFIG.DOWNLOAD_DIR,
  });

  const page = context.pages()[0] || await context.newPage();

  try {
    // Step 1: Navigate to USAA login
    console.log('📱 Opening USAA login page...');
    await page.goto(CONFIG.USAA_LOGIN_URL, { waitUntil: 'networkidle' });

    // Step 2: Wait for manual login
    console.log('\n⏳ Please log in manually in the browser window...');
    console.log('   (Waiting up to 5 minutes for login completion)\n');

    // Wait for navigation to accounts page after login
    await page.waitForURL('**/my/**', {
      timeout: CONFIG.TIMEOUT,
      waitUntil: 'networkidle'
    });

    console.log('✅ Login successful!\n');

    // Step 3: Navigate to Credit Cards
    console.log('💳 Navigating to Credit Cards...');

    // Try to find credit card navigation link
    const creditCardSelectors = [
      'a[href*="/my/credit-cards"]',
      'a[href*="/creditcard"]',
      'a:has-text("Credit Cards")',
      'button:has-text("Credit Cards")',
    ];

    let navigationSuccess = false;
    for (const selector of creditCardSelectors) {
      try {
        const link = await page.$(selector);
        if (link) {
          await link.click();
          await page.waitForLoadState('networkidle');
          navigationSuccess = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!navigationSuccess) {
      // Try navigating via Accounts page first
      console.log('Trying via Accounts page...');
      await page.click('a[href*="/my/banking/accounts"]', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    }

    console.log('✅ On Credit Cards page\n');

    // Step 4: Select the credit card
    console.log('💳 Looking for credit card account...');

    // Wait for account tiles to load
    await page.waitForSelector('[data-testid*="account"], [class*="account-tile"], [class*="card-tile"]', { timeout: 10000 });

    // Find credit card accounts
    const accountTiles = await page.$$('[class*="credit"], [data-testid*="credit"], [class*="card-tile"]');

    if (accountTiles.length === 0) {
      // Fallback: get all account tiles and find credit card
      const allTiles = await page.$$('[data-testid*="account"], [class*="account-tile"]');
      console.log(`Found ${allTiles.length} account tile(s)\n`);

      // Look for text containing "Credit" or "Card"
      for (const tile of allTiles) {
        const text = await tile.innerText();
        if (text.toLowerCase().includes('credit') || text.toLowerCase().includes('card')) {
          await tile.click();
          await page.waitForLoadState('networkidle');
          break;
        }
      }
    } else {
      console.log(`Found ${accountTiles.length} credit card(s)\n`);
      await accountTiles[0].click();
      await page.waitForLoadState('networkidle');
    }

    console.log('✅ Credit card selected\n');

    // Step 5: Navigate to Transactions/Activity
    console.log('📊 Navigating to transactions...');

    const transactionSelectors = [
      'a:has-text("Transactions")',
      'a:has-text("Activity")',
      'button:has-text("Transactions")',
      'button:has-text("Activity")',
      '[data-testid*="transaction"]',
      '[data-testid*="activity"]',
    ];

    for (const selector of transactionSelectors) {
      try {
        const link = await page.$(selector);
        if (link) {
          await link.click();
          await page.waitForLoadState('networkidle');
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    console.log('✅ On transactions page\n');

    // Step 6: Download CSV
    console.log('💾 Initiating CSV download...');

    // Look for "Download" or "Export" button
    const downloadSelectors = [
      'button:has-text("Download")',
      'button:has-text("Export")',
      'a:has-text("Download")',
      'a:has-text("Export")',
      '[data-testid*="download"]',
      '[data-testid*="export"]',
      'button[aria-label*="Download"]',
      'button[aria-label*="Export"]',
    ];

    let downloadButton = null;
    for (const selector of downloadSelectors) {
      try {
        downloadButton = await page.$(selector);
        if (downloadButton) {
          console.log(`Found download button: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!downloadButton) {
      console.log('⚠️  Could not find download button automatically');
      console.log('Please look for and click the Download/Export button...');
      console.log('(Waiting 30 seconds for manual action)\n');
      await page.waitForTimeout(30000);
    } else {
      await downloadButton.click();
      await page.waitForTimeout(2000);
    }

    // Look for CSV format option
    const csvSelectors = [
      'button:has-text("CSV")',
      'input[type="radio"][value*="csv"]',
      'option:has-text("CSV")',
      'label:has-text("CSV")',
    ];

    for (const selector of csvSelectors) {
      try {
        const csvOption = await page.$(selector);
        if (csvOption) {
          console.log('Found CSV format option');
          await csvOption.click();
          await page.waitForTimeout(1000);
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    // Set date range if needed (default is usually last 90 days)
    console.log('Using default date range (typically last 90 days)');

    // Wait for download to start
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

    // Click final download/confirm button
    const confirmSelectors = [
      'button:has-text("Download")',
      'button:has-text("Export")',
      'button:has-text("Continue")',
      'button:has-text("Confirm")',
      'button[type="submit"]',
    ];

    for (const selector of confirmSelectors) {
      try {
        const confirmButton = await page.$(selector);
        if (confirmButton && await confirmButton.isVisible()) {
          await confirmButton.click();
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    // Wait for download
    const download = await downloadPromise;
    const fileName = download.suggestedFilename();
    const filePath = path.join(CONFIG.DOWNLOAD_DIR, fileName);

    await download.saveAs(filePath);

    console.log(`\n✅ Download complete!`);
    console.log(`📁 File saved to: ${filePath}\n`);

    // Keep browser open for a moment
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('\n❌ Error occurred:', error.message);
    console.log('\n💡 Tips:');
    console.log('   - Make sure you log in within 2 minutes');
    console.log('   - Check that you have a credit card account');
    console.log('   - Verify USAA website structure hasn\'t changed');
    console.log('   - You may need to manually click download buttons');
    console.log('   - Some steps may require manual intervention\n');
  } finally {
    console.log('🔒 Closing browser...');
    await context.close();
    console.log('✅ Done!\n');
  }
}

// Run the script if called directly (ES module)
downloadUSAACreditCard().catch(console.error);
