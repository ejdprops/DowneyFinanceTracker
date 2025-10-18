#!/usr/bin/env node

/**
 * USAA CSV Download - Interactive Menu
 *
 * This script provides an interactive menu to download CSV files from USAA accounts.
 *
 * USAGE:
 *   node automation/usaa-download.js
 *   OR
 *   npm run download:usaa
 */

import readline from 'readline';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function runScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = join(__dirname, scriptName);
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   USAA CSV Download Automation Tool       ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log('Select account type to download:\n');
  console.log('  1. Checking/Savings Account');
  console.log('  2. Credit Card Account');
  console.log('  3. Exit\n');

  const choice = await ask('Enter your choice (1-3): ');

  let fromDate, toDate;

  if (choice.trim() === '1' || choice.trim() === '2') {
    fromDate = await ask('\nEnter start date (YYYY-MM-DD) or press Enter for default: ');
    toDate = await ask('Enter end date (YYYY-MM-DD) or press Enter for default: ');
  }

  rl.close();

  const args = [];
  if (fromDate && fromDate.trim()) {
    args.push(`--from="${fromDate.trim()}"`);
  }
  if (toDate && toDate.trim()) {
    args.push(`--to="${toDate.trim()}"`);
  }

  switch (choice.trim()) {
    case '1':
      console.log('\n📊 Starting Checking/Savings account download...\n');
      await runScript('usaa-checking.js', args);
      break;

    case '2':
      console.log('\n💳 Starting Credit Card account download...\n');
      await runScript('usaa-creditcard.js', args);
      break;

    case '3':
      console.log('\n👋 Goodbye!\n');
      break;

    default:
      console.log('\n❌ Invalid choice. Please run the script again.\n');
      break;
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
