# Troubleshooting

This guide helps you resolve common issues when using Gallery 2 to Static.

## Backend Issues

### Database Connection Errors

**Error**: Connection refused, access denied, or timeout

**Possible Causes**:
- Incorrect host, username, or password in `config.json`
- MySQL server not running
- Firewall blocking connection
- Database doesn't exist

**Solutions**:
1. Verify MySQL server is running: `systemctl status mysql` (Linux) or check services (Windows)
2. Test connection manually: `mysql -h host -u user -p database`
3. Check `config.json` settings match your MySQL configuration
4. Verify database name is correct
5. Check firewall rules allow MySQL connections
6. Verify user has proper permissions

### Configuration File Errors

**Error**: Cannot find module './config.json' or JSON parse errors

**Possible Causes**:
- `config.json` file doesn't exist
- Invalid JSON syntax
- File in wrong location

**Solutions**:
1. Ensure `config.json` exists in project root (same directory as `index.ts`)
2. Copy from `config_example.json` if missing
3. Validate JSON syntax (use online JSON validator)
4. Check for trailing commas or syntax errors
5. Verify file encoding is UTF-8

### Missing Data Directory

**Error**: ENOENT: no such file or directory, './data'

**Possible Causes**:
- `data/` directory doesn't exist
- Permission errors creating directory

**Solutions**:
1. Create `data/` directory manually: `mkdir data`
2. Check write permissions on directory
3. Run script from project root directory

### Permission Errors

**Error**: EACCES: permission denied

**Possible Causes**:
- Insufficient permissions to write files
- Directory permissions incorrect

**Solutions**:
1. Check directory permissions: `chmod 755 data` (Linux/Mac)
2. Run with appropriate permissions
3. Check disk space availability

### Invalid Album IDs

**Error**: No results returned or empty JSON files

**Possible Causes**:
- Root album ID incorrect (not 7)
- Album IDs don't exist in database
- Database schema mismatch

**Solutions**:
1. Verify root album ID in your Gallery 2 database
2. Check `index.ts` has correct root album ID
3. Query database to find root album: `SELECT * FROM g2_Entity WHERE g_entityType = 'GalleryAlbumItem' AND g_parentId IS NULL`
4. Verify table/column prefixes in `config.json` match your installation

### Table/Column Not Found Errors

**Error**: Table 'g2_Entity' doesn't exist or Unknown column 'g_id'

**Possible Causes**:
- Incorrect `tablePrefix` or `columnPrefix` in `config.json`
- Database schema doesn't match expected structure

**Solutions**:
1. Check actual table names in database: `SHOW TABLES;`
2. Check actual column names: `DESCRIBE g2_Item;`
3. Update `tablePrefix` and `columnPrefix` in `config.json` to match
4. Verify you're connecting to the correct Gallery 2 database

## Frontend Issues

### Data Files Not Loading (404 Errors)

**Problem**: Browser console shows 404 errors for JSON files

**Possible Causes**:
- JSON files not in correct location
- Server not configured to serve JSON files
- Incorrect file paths

**Solutions**:
1. **Development**: Verify files are in `frontend/public/data/` or accessible via Vite config
2. **Production**: Verify files are in `dist/data/` directory
3. Check Network tab in browser DevTools to see actual request URLs
4. Verify file naming: `{id}.json` format
5. Check server configuration serves JSON files with correct MIME type
6. Verify CORS settings if files are on different domain

### Root Album Not Found

**Problem**: Gallery shows "Root album not found" error

**Possible Causes**:
- `7.json` doesn't exist
- Root album has different ID
- Data files not accessible

**Solutions**:
1. Verify `7.json` exists in data directory
2. Check if root album has different ID (check `data/` directory for other JSON files)
3. Verify data files are in correct location
4. Check browser console for specific error messages
5. Try accessing `http://localhost:5173/data/7.json` directly to test file access

### Images Not Displaying

**Problem**: Images show broken image icons or don't load

**Possible Causes**:
- Image paths incorrect
- Images not accessible
- CORS issues
- Image files missing

**Solutions**:
1. Check browser console for image loading errors
2. Verify image URLs in Network tab
3. Check CORS settings if images are on different domain
4. Verify image files exist at expected paths
5. Check `pathComponent` in JSON files matches actual file structure
6. Verify image server is accessible

### Search Not Working

**Problem**: Search doesn't return results or shows errors

**Possible Causes**:
- JSON files don't contain searchable content
- Search index not building
- JavaScript errors

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify JSON files contain `title` and `description` fields
3. Try simple search terms first
4. Check that search results page loads (`/search?q=test`)
5. Verify data files are loading correctly

### Theme Not Persisting

**Problem**: Theme resets to default on page refresh

**Possible Causes**:
- Browser storage disabled
- Storage quota exceeded
- Browser privacy settings

**Solutions**:
1. Check browser allows localStorage
2. Check browser console for storage errors
3. Verify browser privacy settings allow site data
4. Try different browser to test
5. Clear browser cache and try again

### Build Failures

**Problem**: `npm run build` fails with errors

**Possible Causes**:
- TypeScript errors
- Missing dependencies
- Syntax errors
- Configuration issues

**Solutions**:
1. Check build output for specific error messages
2. Run `npm run build` to see TypeScript errors
3. Verify all dependencies installed: `npm install`
4. Check for syntax errors in code
5. Review `vite.config.ts` for configuration issues
6. Check Node.js version compatibility

### Development Server Won't Start

**Problem**: `npm run dev` fails or doesn't start

**Possible Causes**:
- Port already in use
- Missing dependencies
- Configuration errors

**Solutions**:
1. Check if port 5173 is already in use
2. Kill process using port or change port in `vite.config.ts`
3. Verify dependencies installed: `npm install`
4. Check for error messages in terminal
5. Try clearing node_modules and reinstalling: `rm -rf node_modules && npm install`

## Data Issues

### Missing JSON Files

**Problem**: Some albums don't have JSON files

**Possible Causes**:
- Albums not in root album hierarchy
- Conversion didn't complete
- Albums are not children of the root album

**Solutions**:
1. Verify albums are children of root album in the database
2. Check that albums are in the hierarchy starting from the root album ID
3. Re-run conversion script
4. Check conversion script completed without errors
5. **Note**: The `ignoreAlbums` and `onlyAlbums` configuration options are not currently implemented

### Invalid JSON Structure

**Problem**: JSON files have syntax errors or wrong structure

**Possible Causes**:
- Database data corruption
- Conversion script errors
- Manual file editing errors

**Solutions**:
1. Validate JSON files with JSON validator
2. Check database for corrupted data
3. Re-run conversion script
4. Verify JSON matches expected `Child[]` structure
5. Check for special characters causing JSON issues

### Empty Albums

**Problem**: Albums show as empty when they should have content

**Possible Causes**:
- Album actually empty in database
- Children filtered out
- JSON file contains empty array

**Solutions**:
1. Check JSON file content (should be array, not empty `[]`)
2. Verify album has children in database
3. Check filter settings
4. Verify conversion included all children

### Root Album Discovery Fails

**Problem**: Frontend can't find root album

**Possible Causes**:
- Root album ID doesn't match expected (7, 1, or 0)
- JSON files not accessible
- File naming incorrect

**Solutions**:
1. Verify root album JSON file exists
2. Check file naming: `{id}.json` format
3. Try accessing file directly in browser
4. Check if root album has different ID
5. Verify data directory location

## Performance Issues

### Slow Loading Times

**Problem**: Gallery takes long time to load

**Possible Causes**:
- Large JSON files
- Many images loading
- Network issues
- Unoptimized build

**Solutions**:
1. Check JSON file sizes (should be reasonable)
2. Verify lazy loading is working
3. Check Network tab for slow requests
4. Use production build (not development)
5. Consider code splitting optimizations
6. Check image sizes and formats

### Large Bundle Sizes

**Problem**: Build warns about bundle size limits

**Possible Causes**:
- Too many dependencies
- Unused code included
- No code splitting

**Solutions**:
1. Run bundle analysis: `npm run build:analyze`
2. Review large dependencies
3. Remove unused code
4. Check code splitting configuration
5. Consider lazy loading more components

### Memory Issues with Large Galleries

**Problem**: Browser becomes slow or crashes with large galleries

**Possible Causes**:
- Too many images loaded at once
- Virtual scrolling not working
- Memory leaks

**Solutions**:
1. Verify virtual scrolling is active for large albums
2. Check image lazy loading is working
3. Close other browser tabs
4. Use production build (more optimized)
5. Consider pagination for very large albums

## Browser-Specific Issues

### Feature Not Working in Specific Browser

**Problem**: Feature works in one browser but not another

**Possible Causes**:
- Browser compatibility
- Missing polyfills
- Browser bugs

**Solutions**:
1. Check browser compatibility in main README
2. Update browser to latest version
3. Check browser console for errors
4. Test in different browser
5. Check if feature requires modern browser

### Console Errors

**Problem**: Browser console shows errors

**Possible Causes**:
- JavaScript errors
- Missing files
- CORS issues
- API errors

**Solutions**:
1. Read error message carefully
2. Check error stack trace
3. Verify files referenced exist
4. Check CORS settings
5. Review Network tab for failed requests

## Getting More Help

If you can't resolve an issue:

1. **Check Error Messages**: Read error messages carefully - they often indicate the problem
2. **Browser Console**: Check browser DevTools console for JavaScript errors
3. **Network Tab**: Check Network tab for failed requests
4. **Verify Configuration**: Double-check all configuration settings
5. **Test Incrementally**: Test each component separately to isolate the issue
6. **Review Documentation**: Check relevant documentation sections
7. **Check Logs**: Review any log files or console output

## Common Error Messages

### "Cannot find module './config.json'"

- **Cause**: Config file missing or wrong location
- **Solution**: Create `config.json` from `config_example.json` in project root

### "ECONNREFUSED" or "Access denied"

- **Cause**: Database connection issue
- **Solution**: Check MySQL settings and server status

### "Root album not found"

- **Cause**: Root album JSON file missing or inaccessible
- **Solution**: Verify `7.json` exists and is accessible

### "Failed to fetch" or CORS errors

- **Cause**: CORS configuration or file access issues
- **Solution**: Check server CORS settings and file accessibility

### "Module not found" or import errors

- **Cause**: Missing dependencies or incorrect imports
- **Solution**: Run `npm install` and check import paths

## Prevention Tips

To avoid common issues:

1. **Backup Data**: Always backup your `data/` directory before changes
2. **Test Locally**: Test thoroughly before deploying
3. **Verify Configuration**: Double-check `config.json` settings
4. **Check Dependencies**: Keep dependencies up to date
5. **Monitor Console**: Regularly check browser console for warnings
6. **Validate JSON**: Validate JSON files after conversion
7. **Test Features**: Test all features after deployment

## Next Steps

- **Configuration**: Review [02-configuration.md](02-configuration.md) for configuration help
- **Usage**: Review [03-backend-usage.md](03-backend-usage.md) and [04-frontend-usage.md](04-frontend-usage.md)
- **Features**: See [05-features.md](05-features.md) for feature documentation
- **Deployment**: See [06-building-deployment.md](06-building-deployment.md) for deployment help
