# Multi-Build Setup for Downey Finance Tracker

This project supports building multiple isolated instances of the Finance Tracker, each with its own URL and data storage.

## Instances

The following instances are configured:

1. **Main (Family)**: `https://ejdprops.github.io/DowneyFinanceTracker/`
2. **Ethan**: `https://ejdprops.github.io/DowneyFinanceTracker/ethan/`
3. **Ac**: `https://ejdprops.github.io/DowneyFinanceTracker/ac/`
4. **Kendra**: `https://ejdprops.github.io/DowneyFinanceTracker/kendra/`

## How It Works

Each instance is completely isolated:
- **Separate URLs**: Each person has their own URL path
- **Separate Data Storage**: localStorage is scoped by URL, so data never mixes
- **Separate iCloud Folders**: Each person selects their own iCloud Drive folder
- **Same Code**: All instances run the same application code

## Building

### Build All Instances

To build all instances at once:

```bash
npm run build:all
```

This creates separate builds in `dist-all/`:
- `dist-all/main/` - Family version
- `dist-all/ethan/` - Ethan's version
- `dist-all/ac/` - Ac's version
- `dist-all/kendra/` - Kendra's version

### Build Single Instance

To build just the main version:

```bash
npm run build
```

To build a specific instance:

```bash
# Ethan's version
VITE_BASE_PATH="/DowneyFinanceTracker/ethan/" VITE_APP_OWNER="Ethan" npm run build

# Ac's version
VITE_BASE_PATH="/DowneyFinanceTracker/ac/" VITE_APP_OWNER="Ac" npm run build

# Kendra's version
VITE_BASE_PATH="/DowneyFinanceTracker/kendra/" VITE_APP_OWNER="Kendra" npm run build
```

## Deploying

### Deploy All Instances

To deploy all instances to GitHub Pages:

```bash
npm run deploy:all
```

This will:
1. Build all instances
2. Combine them into a single `dist/` folder
3. Deploy to GitHub Pages with proper subdirectories

### Deploy Single Instance (Main Only)

To deploy just the main version:

```bash
npm run deploy
```

## Adding New Instances

To add a new instance for another family member:

1. **Update `build-all.sh`**: Add a new build section:
   ```bash
   echo "Building NewName's version..."
   VITE_BASE_PATH="/DowneyFinanceTracker/newname/" VITE_APP_OWNER="NewName" npm run build
   mv dist dist-all/newname
   ```

2. **Update `deploy-all.sh`**: Add deployment for the new instance:
   ```bash
   mkdir -p dist/newname
   cp -r dist-all/newname/* dist/newname/
   ```

3. **Update this file**: Add the new instance to the list above

## Customization

Each instance can be customized by using the `APP_OWNER` variable:
- Logo alt text: `{APP_OWNER}'s Finance Tracker`
- Page title: Can be set dynamically based on `APP_OWNER`
- Welcome messages or other personalization

## Technical Details

- **Base Path**: Set via `VITE_BASE_PATH` environment variable
- **App Owner**: Set via `VITE_APP_OWNER` environment variable
- **Vite Config**: Reads these variables and injects them at build time
- **App Code**: Accesses via global constants `__APP_OWNER__`
- **Data Isolation**: Achieved through URL-scoped localStorage
