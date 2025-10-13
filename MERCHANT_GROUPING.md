# Merchant Grouping with Fuzzy Logic

## Overview

The SpendingCharts component now includes intelligent merchant grouping using fuzzy logic to automatically combine similar transaction descriptions into unified merchant names.

## Features

### 1. **Pattern Matching**
Pre-defined patterns for common merchants automatically normalize transaction descriptions:

**Examples:**
- `AMAZON.COM*1X23A456` → `Amazon`
- `AMZN MKTP US*ABC123` → `Amazon`
- `WALMART SUPERCENTER #1234` → `Walmart`
- `WM SUPERCENTER` → `Walmart`
- `STARBUCKS STORE #5678` → `Starbucks`
- `SBUX*DOWNTOWN` → `Starbucks`

### 2. **Transaction ID Cleaning**
Automatically removes transaction-specific identifiers:
- Removes: `*ABC123`, `#1234`, long number sequences
- Normalizes special characters and whitespace
- Converts to lowercase for comparison

### 3. **Fuzzy String Matching**
Uses the `string-similarity` library to find merchants with 70%+ similarity:

**Examples:**
- `SHELL OIL 12345` and `SHELL GAS STATION` → Both grouped as `Shell`
- `MCDONALDS #123` and `MCDONALD'S DOWNTOWN` → Both grouped as `McDonald's`

### 4. **Smart Fallback**
For unrecognized merchants:
- Cleans the description
- Removes words shorter than 3 characters
- Takes first 3 significant words
- Title-cases the result

**Examples:**
- `JOE'S PIZZA AND PASTA RESTAURANT` → `Joe's Pizza Pasta`
- `THE LOCAL COFFEE SHOP` → `Local Coffee Shop`

## Supported Merchants

The system includes patterns for 30+ major merchants:
- Retail: Amazon, Walmart, Target, Costco, Best Buy, Home Depot, Lowe's
- Food: McDonald's, Starbucks, Chipotle, Subway, Taco Bell, Dunkin, Panera
- Grocery: Whole Foods, Trader Joe's, Kroger, Safeway
- Pharmacy: CVS, Walgreens
- Gas: Shell, Exxon/Mobil, Chevron
- Services: Uber, Lyft, Netflix, Spotify, PayPal, Venmo, Zelle
- Delivery: DoorDash, GrubHub, Instacart
- Tech: Apple, Google

## How to Use

1. Go to the **Charts** tab in the app
2. Set **Group By** to "Description"
3. Enable the checkbox: **"Group similar merchants using fuzzy matching"**
4. The system will automatically:
   - Combine merchant variations
   - Clean transaction IDs
   - Group similar descriptions

## Toggle Control

The fuzzy matching can be turned on/off:
- **ON** (default): Merchants are grouped intelligently
- **OFF**: Show raw transaction descriptions

This is useful when you want to:
- See exact transaction descriptions
- Identify specific store locations
- Debug merchant categorization

## Technical Details

**Libraries Used:**
- `string-similarity` (v4.0.4): Computes similarity scores between strings
- `fuse.js` (v7.1.0): Available for future enhancements

**Algorithm:**
1. Filter transactions by date range and type
2. For each transaction description:
   - Check against known merchant patterns
   - Clean and normalize the text
   - Compare with other descriptions (70% threshold)
   - Group similar merchants together
3. Aggregate totals, counts, and percentages
4. Display in charts and tables

## Performance

- Similarity comparison runs in O(n²) for fuzzy matching
- Pattern matching is O(n × p) where p = number of patterns
- Optimized with useMemo to avoid recalculation
- Only runs when groupBy='description' and groupSimilar=true

## Future Enhancements

Potential improvements:
- User-customizable merchant patterns
- Machine learning for automatic pattern discovery
- Location-based merchant grouping
- Category suggestions based on merchant
- Import/export merchant rules
