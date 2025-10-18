/**
 * USAA Checking/Savings Account CSV Download Automation
 *
 * This script automates downloading transaction CSV files from USAA checking/savings accounts.
 *
 * USAGE:
 *   node automation/usaa-checking.js
 *   node automation/usaa-checking.js --from="2025-01-01" --to="2025-10-15"
 *
 * WORKFLOW:
 *   1. Opens USAA login page in headed browser
 *   2. User manually logs in (to avoid storing credentials)
 *   3. Script waits for successful login
 *   4. Navigates to accounts page
 *   5. Downloads CSV for specified account
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

async function downloadUSAAChecking() {
  console.log('🚀 Starting USAA Checking Account CSV Download...\n');

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
    // USAA redirects to /my/myusaa or similar after successful login
    await page.waitForURL('**/my/**', {
      timeout: CONFIG.TIMEOUT,
      waitUntil: 'networkidle'
    });

    console.log('✅ Login successful!\n');

    // Step 3: Navigate to Accounts page
    console.log('📊 Navigating to Accounts page...');

    // Click on "Accounts" in the navigation
    await page.click('a[href*="/my/banking/accounts"]', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log('✅ On Accounts page\n');

    // Step 4: Select the checking account
    console.log('🏦 Looking for checking account...');

    // Wait for account tiles to load
    await page.waitForSelector('[data-testid*="account"]', { timeout: 10000 });

    // Find checking account (you may need to adjust the selector)
    // USAA uses different identifiers - this is a generic approach
    const accountTiles = await page.$$('[class*="account-tile"], [data-testid*="account"]');

    if (accountTiles.length === 0) {
      throw new Error('No accounts found on the page');
    }

    console.log(`Found ${accountTiles.length} account(s)\n`);

    // Click on the first checking account
    // You may want to make this more specific based on account name or number
    await accountTiles[0].click();
    await page.waitForLoadState('networkidle');

    console.log('✅ Account selected\n');

    // Step 5: Download CSV
    console.log('💾 Initiating CSV download...');

    // Look for "Download" or "Export" button
    // Try multiple possible selectors
    const downloadSelectors = [
      'button:has-text("Download")',
      'button:has-text("Export")',
      'a:has-text("Download")',
      'a:has-text("Export")',
      '[data-testid*="download"]',
      '[data-testid*="export"]',
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
      console.log('Please click the Download/Export button manually...');
      await page.waitForTimeout(30000); // Wait 30 seconds for manual action
    } else {
      await downloadButton.click();
      await page.waitForTimeout(2000); // Wait for download dialog
    }

    // Look for CSV format option
    const csvSelectors = [
      'button:has-text("CSV")',
      'input[type="radio"][value*="csv"]',
      'option:has-text("CSV")',
    ];

    for (const selector of csvSelectors) {
      try {
        const csvOption = await page.$(selector);
        if (csvOption) {
          console.log('Found CSV format option');
          await csvOption.click();
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    // Wait for download to start
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

    // Click final download/confirm button
    const confirmSelectors = [
      'button:has-text("Download")',
      'button:has-text("Export")',
      'button:has-text("Continue")',
      'button[type="submit"]',
    ];

    for (const selector of confirmSelectors) {
      try {
        const confirmButton = await page.$(selector);
        if (confirmButton) {
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
    console.log('   - Check that you have a checking account');
    console.log('   - Verify USAA website structure hasn\'t changed');
    console.log('   - You may need to manually click download buttons\n');
  } finally {
    console.log('🔒 Closing browser...');
    await context.close();
    console.log('✅ Done!\n');
  }
}

// Run the script if called directly (ES module)
downloadUSAAChecking().catch(console.error);
