# Backend Usage

This guide explains how to run the backend conversion script that reads data from your Gallery 2 MySQL database and generates JSON files for the frontend gallery application.

## Overview

The backend conversion script (`backend/index.ts`) performs the following tasks:

1. Connects to your MySQL database using settings from `backend/config.json`
2. Recursively reads album and photo data from the Gallery 2 database
3. Generates JSON files in the `../data/` directory (project root)
4. Creates one JSON file per album, named `{albumId}.json`

## Running the Conversion

### Basic Usage

Navigate to the backend directory and run:

```bash
cd backend
npx ts-node index.ts
```

Or if you have TypeScript installed globally:

```bash
cd backend
ts-node index.ts
```

### What Happens During Conversion

1. **Database Connection**: The script connects to MySQL using your `backend/config.json` settings
2. **Root Album Discovery**: The script starts from album ID 7 (hardcoded in `backend/index.ts`)
3. **Recursive Processing**: For each album:
   - Reads all children (sub-albums and photos)
   - Recursively processes sub-albums
   - Generates a JSON file with all children
4. **File Generation**: JSON files are written to `../data/{albumId}.json` (project root)
5. **Completion**: The script exits when all albums are processed

### Expected Output

During conversion, you may see:
- Console output (if the script includes logging)
- JSON files appearing in the `../data/` directory (project root)
- Processing time depends on gallery size

The script runs silently by default. If errors occur, they will be displayed in the console.

## Root Album ID

The script is hardcoded to start from album ID 7. This is the default root album ID in many Gallery 2 installations.

### Changing the Root Album ID

If your root album has a different ID, you need to modify `backend/index.ts`:

1. Open `backend/index.ts` in a text editor
2. Find the line: `await main(7);`
3. Change `7` to your root album ID: `await main(10);`
4. Save the file

**Note**: The root album ID is the top-level album that contains all other albums in your gallery.

## Output Structure

### Directory Location

JSON files are generated in the `../data/` directory (project root, relative to backend directory).

### File Naming

Each album gets a JSON file named `{albumId}.json` where `{albumId}` is the numeric ID of the album.

**Examples**:
- Album ID 7 → `7.json`
- Album ID 10 → `10.json`
- Album ID 25 → `25.json`

### File Contents

Each JSON file contains an array of child items. Each item represents either:
- A sub-album (`type: "GalleryAlbumItem"`)
- A photo (`type: "GalleryPhotoItem"`)

**Example JSON structure**:

```json
[
  {
    "id": 10,
    "type": "GalleryAlbumItem",
    "hasChildren": true,
    "title": "Vacation Photos",
    "description": "Photos from summer vacation",
    "pathComponent": "vacation",
    "timestamp": 1234567890,
    "width": null,
    "height": null,
    "thumb_width": null,
    "thumb_height": null
  },
  {
    "id": 15,
    "type": "GalleryPhotoItem",
    "hasChildren": false,
    "title": "Beach Sunset",
    "description": "Beautiful sunset at the beach",
    "pathComponent": "beach-sunset.jpg",
    "timestamp": 1234567890,
    "width": 1920,
    "height": 1080,
    "thumb_width": 200,
    "thumb_height": 150
  }
]
```

### Data Structure

Each item in the JSON array contains:

- **id**: Unique numeric identifier
- **type**: Either `"GalleryAlbumItem"` or `"GalleryPhotoItem"`
- **hasChildren**: Boolean indicating if item has children (always `true` for albums with sub-items)
- **title**: Display title
- **description**: Description text (may be empty)
- **pathComponent**: URL-friendly path component
- **timestamp**: Unix timestamp (seconds since epoch)
- **width/height**: Image dimensions (null for albums, numbers for photos)
- **thumb_width/thumb_height**: Thumbnail dimensions (null if no thumbnail)

## Understanding the Conversion Process

### Recursive Traversal

The script uses a recursive algorithm:

1. Start at root album (ID 7)
2. Get all children of current album
3. For each child:
   - If it's an album (`hasChildren: true`), recursively process it
   - If it's a photo, include it in the current album's JSON
4. Write JSON file for current album
5. Continue with sub-albums

### Album Hierarchy

The conversion preserves the album hierarchy:
- Root album (ID 7) → `7.json`
- Sub-album (ID 10) → `10.json`
- Sub-sub-album (ID 15) → `15.json`

Each JSON file contains only the direct children of that album, not the entire tree.

### Path Components

For photos, the `pathComponent` field contains the full path from the root:

- Root album photo: `"photo.jpg"`
- Nested album photo: `"vacation/beach/photo.jpg"`

This path is used by the frontend to construct image URLs.

## Verifying Conversion

After running the conversion, verify the results:

### 1. Check Files Were Created

```bash
ls data/
```

You should see JSON files for each album.

### 2. Check Root Album File

Verify the root album file exists:

```bash
cat data/7.json
```

Or on Windows:

```bash
type data\7.json
```

You should see a JSON array with album/photo items.

### 3. Check File Sizes

JSON files should have reasonable sizes:
- Small albums: A few KB
- Large albums: Several MB (depending on number of items)

Empty albums will have empty arrays `[]`.

### 4. Validate JSON Format

Ensure files are valid JSON (they should parse without errors). You can use online JSON validators or command-line tools.

## Common Issues

### No Files Generated

**Possible Causes**:
- Root album ID is incorrect (not 7)
- Database connection failed
- Root album has no children
- Configuration errors

**Solutions**:
- Check database connection in `backend/config.json`
- Verify root album ID matches your Gallery 2 installation
- Check console for error messages

### Empty JSON Files

**Possible Causes**:
- Album has no children
- Album filtering excluded all children
- Database query returned no results

**Solutions**:
- Empty arrays `[]` are normal for empty albums
- Check `ignoreAlbums` and `onlyAlbums` settings
- Verify database contains data

### Missing Albums

**Possible Causes**:
- Root album ID doesn't include those albums
- Albums are not children of the root album
- Database connection issues

**Solutions**:
- Verify root album ID includes desired albums in the hierarchy
- Check that albums are actually children of the root album in the database
- Check database connectivity
- **Note**: The `ignoreAlbums` and `onlyAlbums` configuration options are not currently implemented

### Database Connection Errors

See [07-troubleshooting.md](07-troubleshooting.md) for database connection troubleshooting.

## Performance Considerations

### Large Galleries

For galleries with many albums and photos:
- Conversion time increases with gallery size
- JSON files may be large (several MB for albums with thousands of photos)
- Ensure sufficient disk space in `../data/` directory (project root)

### Optimization Tips

- **Note**: The `onlyAlbums` and `ignoreAlbums` configuration options are not currently implemented
- For large galleries, consider processing in batches manually if needed
- Ensure sufficient disk space for all JSON files

## Next Steps

After successful conversion:

1. **Verify Data**: Check that JSON files look correct
2. **Start Frontend**: See [04-frontend-usage.md](04-frontend-usage.md) to view your gallery
3. **Deploy**: See [06-building-deployment.md](06-building-deployment.md) for deployment

## Re-running Conversion

You can re-run the conversion at any time:

- **Update Data**: If your Gallery 2 database changes, re-run to update JSON files
- **Configuration Changes**: After changing `backend/config.json`, re-run to apply new settings
- **Incremental Updates**: The script will overwrite existing JSON files

**Note**: Always back up your `data/` directory before re-running if you've made manual changes.
