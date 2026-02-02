# Per-Album Theme Configuration

You can assign a specific theme to individual albums via `album-themes.json`. When a user views an album with an override, that theme is applied instead of their stored preference.

## File Location

- **Path:** `frontend/public/album-themes.json`
- **Example:** `frontend/public/album-themes.json.example`

The file is fetched at runtime from `/album-themes.json` (served from `public/`).

## Schema

```json
{
  "defaultTheme": "classic",
  "albumThemes": {
    "7": "dark",
    "12": "light"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `defaultTheme` | string | No | Theme used when an album has no override. Must be a valid theme name (`light`, `dark`, `classic`). Defaults to `classic` if omitted or invalid. |
| `albumThemes` | object | No | Map of album ID (string key) to theme name. Keys must be numeric album IDs as strings. Values must be valid theme names. |

## Behaviour

1. **Home page (`/`), Search (`/search`):** User's stored theme preference is used. No album override.
2. **Album page (`/album/7`):** Album ID 7 is extracted from the path. Config is loaded. If `albumThemes["7"]` exists and is valid, that theme is applied. Otherwise, `defaultTheme` is used.
3. **Image page (`/album/7/image/10`):** Same as album page; album ID 7 is used for theme lookup.
4. **Invalid theme names:** Fall back to `defaultTheme` (or app default if `defaultTheme` is also invalid).
5. **Missing file (404), malformed JSON, invalid schema:** Default config is used (`defaultTheme: "classic"`, `albumThemes: {}`).

## Album ID Format

- Album IDs in the config are **string keys** (JSON keys are always strings).
- Example: `"7"` for album ID 7, not `7`.
- IDs must match the numeric album IDs from the gallery data (from route `/album/:id`).

## Caching

The config is loaded once and cached for the application lifetime. Clearing the cache is only possible programmatically (`clearAlbumThemesConfigCache()`) and is used for testing. In production, a page refresh loads a fresh config if the file changed.

## Example Configurations

**All albums use default (classic):**
```json
{
  "defaultTheme": "classic",
  "albumThemes": {}
}
```

**Specific albums override:**
```json
{
  "defaultTheme": "light",
  "albumThemes": {
    "7": "dark",
    "12": "classic",
    "25": "light"
  }
}
```

**Minimal (omit optional fields):**
```json
{}
```
This uses app default (`classic`) and no album overrides.

## TypeScript Types

```typescript
interface AlbumThemesConfig {
  defaultTheme?: string;
  albumThemes?: Record<string, string>;
}
```

Defined in `frontend/src/types/albumThemes.ts`.

## Related Code

- `frontend/src/utils/albumThemesConfig.ts` — Loading, validation, `getThemeForAlbum()`, `getAlbumIdFromPath()`
- `frontend/src/contexts/ThemeContext.tsx` — Uses config to resolve `effectiveTheme` when on album pages
