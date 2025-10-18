# Deployment URLs

All instances of Downey Finance Tracker are now live!

## Live URLs

### Main Version (Family)
**URL**: https://ejdprops.github.io/DowneyFinanceTracker/

This is the main family version.

### Ethan's Version
**URL**: https://ejdprops.github.io/DowneyFinanceTracker/ethan/

Completely isolated instance for Ethan with separate data storage.

### Ac's Version
**URL**: https://ejdprops.github.io/DowneyFinanceTracker/ac/

Completely isolated instance for Ac with separate data storage.

### Kendra's Version
**URL**: https://ejdprops.github.io/DowneyFinanceTracker/kendra/

Completely isolated instance for Kendra with separate data storage.

---

## Data Isolation

Each instance is **completely isolated**:

- ✅ **Separate localStorage**: Data is scoped by URL path
- ✅ **Separate iCloud folders**: Each person selects their own folder
- ✅ **No data sharing**: Transactions, accounts, bills are completely separate
- ✅ **Same features**: All instances have identical functionality

## Sharing With Your Kids

Simply send them their respective URL:
- Ethan: https://ejdprops.github.io/DowneyFinanceTracker/ethan/
- Ac: https://ejdprops.github.io/DowneyFinanceTracker/ac/
- Kendra: https://ejdprops.github.io/DowneyFinanceTracker/kendra/

They can bookmark it, add it to their home screen, or save it in their browser.

## Important Notes

1. **Bookmarks Matter**: Make sure everyone bookmarks their own URL
2. **No Mixing**: Data will NEVER mix between instances - each URL has its own storage
3. **Independent Updates**: Each person can update their data without affecting others
4. **Same App**: All instances run the exact same code, just with different URLs

## Future Updates

When you deploy updates using `npm run deploy:all`, ALL instances get updated with the new features automatically.
