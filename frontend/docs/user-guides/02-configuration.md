# Configuration

This guide explains all configuration options available in the `config.json` file. This file controls how the backend conversion script connects to your database and processes your gallery data.

## Configuration File Location

The configuration file is named `config.json` and should be placed in the `backend` directory (same directory as `index.ts`).

## Creating Your Configuration

1. Copy the example file: `cp backend/config_example.json backend/config.json`
2. Edit `backend/config.json` with your settings
3. Save the file

**Important**: Never commit `config.json` to version control as it contains sensitive database credentials. The file is already listed in `.gitignore`.

## Configuration Structure

The configuration file uses JSON format with the following structure:

```json
{
    "mysqlSettings": { ... },
    "gallerySettings": { ... },
    "thumbPrefix": "...",
    "ignoreAlbums": [ ... ],
    "onlyAlbums": [ ... ]
}
```

## MySQL Settings

The `mysqlSettings` section configures the database connection.

### host

- **Type**: String
- **Required**: Yes
- **Description**: The MySQL database server address
- **Examples**:
  - `"127.0.0.1"` - Local database
  - `"localhost"` - Local database (alternative)
  - `"192.168.1.100"` - Remote database on local network
  - `"db.example.com"` - Remote database hostname

```json
"mysqlSettings": {
    "host": "127.0.0.1"
}
```

### user

- **Type**: String
- **Required**: Yes
- **Description**: MySQL database username
- **Example**: `"gallery_user"` or `"root"`

```json
"mysqlSettings": {
    "user": "gallery_user"
}
```

### password

- **Type**: String
- **Required**: No (optional)
- **Description**: MySQL database password
- **Security Note**: If your database doesn't require a password, you can omit this field

```json
"mysqlSettings": {
    "password": "your_secure_password"
}
```

### database

- **Type**: String
- **Required**: Yes
- **Description**: Name of the MySQL database containing your Gallery 2 data
- **Example**: `"gallery2"` or `"gallery"`

```json
"mysqlSettings": {
    "database": "gallery2"
}
```

### Complete MySQL Settings Example

```json
"mysqlSettings": {
    "host": "127.0.0.1",
    "user": "gallery_user",
    "password": "secure_password",
    "database": "gallery2"
}
```

## Gallery Settings

The `gallerySettings` section configures how the script identifies tables and columns in your Gallery 2 database.

### tablePrefix

- **Type**: String
- **Required**: Yes
- **Default**: `"g2_"`
- **Description**: Prefix used for all Gallery 2 database table names
- **When to Change**: If your Gallery 2 installation uses a different table prefix

Most Gallery 2 installations use `"g2_"` as the prefix, so tables are named like:
- `g2_Entity`
- `g2_Item`
- `g2_ChildEntity`
- etc.

If your installation uses a different prefix (e.g., `"gallery_"`), change this value.

```json
"gallerySettings": {
    "tablePrefix": "g2_"
}
```

### columnPrefix

- **Type**: String
- **Required**: Yes
- **Default**: `"g_"`
- **Description**: Prefix used for all Gallery 2 database column names
- **When to Change**: If your Gallery 2 installation uses a different column prefix

Most Gallery 2 installations use `"g_"` as the column prefix, so columns are named like:
- `g_id`
- `g_title`
- `g_description`
- etc.

If your installation uses a different prefix (e.g., `"gal_"`), change this value.

```json
"gallerySettings": {
    "columnPrefix": "g_"
}
```

### Complete Gallery Settings Example

```json
"gallerySettings": {
    "tablePrefix": "g2_",
    "columnPrefix": "g_"
}
```

## Thumbnail Prefix

### thumbPrefix

- **Type**: String
- **Required**: Yes
- **Default**: `"__t_"`
- **Description**: Prefix used to identify thumbnail files in the file system
- **When to Change**: If your Gallery 2 installation uses a different thumbnail prefix

This prefix is used when processing image paths. Gallery 2 typically prefixes thumbnail files with `"__t_"` to distinguish them from full-size images.

```json
"thumbPrefix": "__t_"
```

## Album Filtering

The configuration file includes two options for controlling which albums are included in the conversion: `ignoreAlbums` and `onlyAlbums`.

### ignoreAlbums

- **Type**: Array of strings or numbers
- **Required**: No
- **Default**: `[]` (empty array - no albums ignored)
- **Description**: List of album IDs to exclude from conversion. **Implemented.** Listed albums and all their descendants are excluded silently (no JSON files, no entries in parent `children` arrays, not in search index).
- **Use Case**: Exclude specific albums you don't want in the static gallery

Album IDs may be strings (e.g. `"10"`, `"25"`) or numbers; both are normalized. Invalid entries are skipped with a warning. If the root album is listed, the conversion skips entirely (no export, no `index.json`).

```json
"ignoreAlbums": ["10", "25", 30]
```

**Example**: If you want to exclude a "Private" album with ID 10 and a "Drafts" album with ID 25:

```json
"ignoreAlbums": ["10", "25"]
```

### onlyAlbums

- **Type**: Array of strings
- **Required**: No
- **Default**: `[]` (empty array - all albums included)
- **Description**: List of album IDs to include in conversion (exclusive - only these albums). **Not currently implemented.**
- **Use Case**: Convert only specific albums, ignoring everything else
- **Status**: Not currently implemented

Album IDs are specified as strings. When implemented, **only** the albums listed (and their children) will be converted. All other albums will be ignored.

```json
"onlyAlbums": ["7", "15", "20"]
```

**Example**: If you only want to convert albums with IDs 7, 15, and 20:

```json
"onlyAlbums": ["7", "15", "20"]
```

### ignoreAlbums vs onlyAlbums

- **ignoreAlbums**: "Convert everything except these albums"
- **onlyAlbums**: "Convert only these albums and nothing else"

**Important**: These options are mutually exclusive in practice. When `onlyAlbums` is implemented, specifying it will cause `ignoreAlbums` to be ignored.

## Complete Configuration Example

Here's a complete example configuration file:

```json
{
    "mysqlSettings": {
        "host": "127.0.0.1",
        "user": "gallery_user",
        "password": "my_secure_password",
        "database": "gallery2"
    },
    "gallerySettings": {
        "tablePrefix": "g2_",
        "columnPrefix": "g_"
    },
    "thumbPrefix": "__t_",
    "ignoreAlbums": [],
    "onlyAlbums": []
}
```

## Configuration Validation

The script will attempt to connect to the database using your configuration when it runs. Common configuration errors:

- **Connection refused**: Check `host` and ensure MySQL server is running
- **Access denied**: Check `user` and `password`
- **Unknown database**: Check `database` name
- **Table not found**: Check `tablePrefix` matches your Gallery 2 installation
- **Column not found**: Check `columnPrefix` matches your Gallery 2 installation

## Security Considerations

1. **Never commit `config.json`**: It contains sensitive credentials
2. **Use strong passwords**: Protect your database with secure passwords
3. **Restrict database access**: Use a database user with minimal required permissions
4. **Local development**: For local development, `127.0.0.1` is safer than `localhost` in some configurations

## Finding Your Gallery 2 Settings

If you're unsure about your Gallery 2 table/column prefixes:

1. **Check Gallery 2 config**: Look in your Gallery 2 installation's `config.php` or database configuration
2. **Inspect database**: Connect to MySQL and list tables:
   ```sql
   SHOW TABLES;
   ```
   Look for the pattern (e.g., `g2_Entity`, `g2_Item`)
3. **Check columns**: Inspect a table to see column naming:
   ```sql
   DESCRIBE g2_Item;
   ```
   Look for the pattern (e.g., `g_id`, `g_title`)

## Next Steps

After configuring your settings:

1. Test the configuration by running the conversion script
2. See [03-backend-usage.md](03-backend-usage.md) for how to run the conversion
3. See [07-troubleshooting.md](07-troubleshooting.md) if you encounter configuration errors
