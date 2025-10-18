#!/bin/bash

# Deployment script for multiple versions of Downey Finance Tracker
# Deploys main app and child versions to GitHub Pages

set -e

echo "Deploying all versions to GitHub Pages..."

# Build all versions first
./build-all.sh

# Create a combined dist folder for gh-pages
echo ""
echo "Creating combined deployment folder..."
rm -rf dist
mkdir -p dist

# Copy main version to root
cp -r dist-all/main/* dist/

# Copy child versions to subdirectories
mkdir -p dist/ethan
cp -r dist-all/ethan/* dist/ethan/

mkdir -p dist/ac
cp -r dist-all/ac/* dist/ac/

mkdir -p dist/kendra
cp -r dist-all/kendra/* dist/kendra/

# Deploy to GitHub Pages
echo ""
echo "Deploying to GitHub Pages..."
npx gh-pages -d dist

echo ""
echo "Deployment complete!"
echo "Main version: https://ejdprops.github.io/DowneyFinanceTracker/"
echo "Ethan's version: https://ejdprops.github.io/DowneyFinanceTracker/ethan/"
echo "Ac's version: https://ejdprops.github.io/DowneyFinanceTracker/ac/"
echo "Kendra's version: https://ejdprops.github.io/DowneyFinanceTracker/kendra/"
