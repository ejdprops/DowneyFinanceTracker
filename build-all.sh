#!/bin/bash

# Build script for multiple versions of Downey Finance Tracker
# Creates separate builds for main app and each child

set -e

echo "Building all versions of Downey Finance Tracker..."

# Clean previous builds
rm -rf dist-all
mkdir -p dist-all

# Build main version (Family)
echo ""
echo "Building main version..."
VITE_BASE_PATH="/DowneyFinanceTracker/" VITE_APP_OWNER="Family" npm run build
mv dist dist-all/main

# Build Ethan's version
echo ""
echo "Building Ethan's version..."
VITE_BASE_PATH="/DowneyFinanceTracker/ethan/" VITE_APP_OWNER="Ethan" npm run build
mv dist dist-all/ethan

# Build Ac's version
echo ""
echo "Building Ac's version..."
VITE_BASE_PATH="/DowneyFinanceTracker/ac/" VITE_APP_OWNER="Ac" npm run build
mv dist dist-all/ac

# Build Kendra's version
echo ""
echo "Building Kendra's version..."
VITE_BASE_PATH="/DowneyFinanceTracker/kendra/" VITE_APP_OWNER="Kendra" npm run build
mv dist dist-all/kendra

echo ""
echo "All builds complete!"
echo "Main version: dist-all/main"
echo "Ethan's version: dist-all/ethan"
echo "Ac's version: dist-all/ac"
echo "Kendra's version: dist-all/kendra"
