# CLAUDE.md - gallery2-to-static

## Project Overview

This project converts a Menalto Gallery 2 MySQL database into a fully static, client-side React gallery application. It consists of two independent parts:

- **Backend** (`backend/`): A one-shot Node.js/TypeScript extraction script run manually by an admin. It reads the Gallery 2 database, produces JSON files and thumbnails, then is no longer needed. The backend is never exposed to end users or the internet.
- **Frontend** (`frontend/`): A React 18 SPA (Vite + TypeScript) that consumes the static JSON files and serves the gallery. No server-side logic at runtime, all data is pre-generated.

The original gallery this was built for is a Swedish photography site (lanbilder.se), which explains the Nordic character handling throughout the codebase.

## Architecture

### Data Flow

```
Gallery 2 MySQL DB
       |
       v
  backend/index.ts  (one-time extraction, run manually)
       |
       v
  data/*.json + frontend/public/g2data/thumbnails/
       |
       v
  frontend/ (static React SPA, serves JSON + images)
```

### Backend (Extraction Script)

- **Purpose**: Extract albums, images, metadata, and hierarchy from Gallery 2 database into JSON files
- **Runtime**: Run once by hand (`cd backend && npx ts-node index.ts`), then the database server can be shut down
- **Security context**: Local admin tool only, never internet-facing. Vulnerabilities in backend code have very limited impact
- **Database**: MySQL via `mysql2` with parameterized queries (no SQL injection risk)
- **Image processing**: `sharp` for thumbnail generation
- **Output**: Per-album JSON files in `data/`, thumbnails in `frontend/public/g2data/thumbnails/`, path index in `data/index.json`
- **Config**: `backend/config.json` (copied from `config_example.json`), contains DB credentials, never committed to git

### Frontend (Static SPA)

- **Framework**: React 18 + React Router v6 (HashRouter for static hosting compatibility)
- **Build**: Vite 8 (Rolldown, Oxc minifier), Vitest 5, TypeScript 5 (strict mode), ES2020 target, ESNext modules
- **Routing**: `HashRouter` with routes: `/` (home), `/album/:id`, `/album/:albumId/image/:imageId`, path-based album URLs via `PathResolverPage`
- **State**: React Context API (ThemeContext, FilterContext, ViewAbortContext), no Redux/Zustand
- **Styling**: Plain CSS files per component (not CSS Modules), CSS custom properties for theming, no CSS-in-JS
- **Icons**: Font Awesome 7 (`@fortawesome/react-fontawesome`)
- **Virtual scrolling**: `react-virtuoso` for large album grids
- **Code splitting**: Lazy-loaded pages via `React.lazy()`, manual vendor chunks (react, router, web-vitals)
- **Images**: Fixed base URLs (`/g2data/albums`, `/g2data/thumbnails`), progressive loading with object URLs, LRU cache, abort on navigation

## Directory Structure

```
/workspace/
  CLAUDE.md              # This file
  README.md              # User-facing readme
  TODO.md                # Task tracking (currently empty)
  shared/
    decodeHtmlEntities.ts  # Shared HTML entity decoding (single source of truth, imported by both backend and frontend)
  test-vectors/
    nordic-path-normalization.json  # Shared test vectors for backend/frontend path normalization parity
  backend/
    index.ts             # Main extraction entry point (supports env var overrides for DB credentials)
    types.ts             # Shared type definitions (source of truth)
    config.json          # DB credentials (gitignored)
    config_example.json  # Template config
    sqlUtils.ts          # Parameterized SQL queries (factory pattern, field-level validation via validateRow.ts)
    validateRow.ts       # Database result field validation helpers (type checks, length limits, Buffer decoding)
    pathResolution.ts    # URL path building from pathComponent chains (with traversal validation)
    pathSegments.ts      # Segment-based path operations
    cleanupUipath.ts     # UI path normalization (Nordic chars, illegal chars) — coupled with frontend/albumPath.ts
    generateThumbnail.ts # Sharp-based thumbnail generation (with path traversal validation)
    verifyImagePaths.ts  # Image URL/file verification (SSRF protection, symlink-safe containment)
    descendantImageCount.ts  # Recursive image counting
    ownerDisplayName.ts  # Owner name normalization
    bbcode.ts            # Iterative BBCode stripping (handles nested brackets, max 10 iterations)
    *.test.ts            # Tests using Node assert (no framework)
  frontend/
    src/
      main.tsx           # App entry point (StrictMode + ErrorBoundary)
      App.tsx             # Router and route definitions
      components/         # Feature-grouped components (23 directories)
        AlbumGrid/        # Album grid with card, skeleton, empty states
        Breadcrumbs/      # Navigation breadcrumbs
        Layout/           # App shell (header, sidebar in classic theme)
        Lightbox/         # Code-split image viewer
        RootAlbumListBlock/ # Root album list item
        SearchBar/        # Search input
        ThemeDropdown/    # Theme selector
        VirtualGrid/      # Virtuoso-based grid wrapper
        ...
      hooks/              # 24+ custom hooks
        useAlbumData.ts   # Album data fetching with retry
        useProgressiveImage.ts # Progressive image loading
        useImageCache.ts  # LRU image cache
        useSearch.ts      # Client-side search
        useSort.ts        # Sorting logic
        ...
      contexts/           # React contexts with barrel exports
        ThemeContext.tsx   # Theme management (light/dark/classic)
        FilterContext.tsx  # Filter state
        ViewAbortContext.tsx # Navigation abort controller
      utils/              # 45+ pure utility functions
        dataLoader.ts     # Album JSON loading and caching
        imageUrl.ts       # Image URL construction
        albumPath.ts      # Path building with Nordic normalization
        bbcode.ts         # Full BBCode parser producing React elements
        decodeHtmlEntities.ts # HTML entity decoding
        imageCache.ts     # LRU cache implementation
        searchIndex.ts    # Client-side search index
        fetchImageAsObjectUrl.ts # Fetch-to-blob-to-objectURL
        ...
      pages/              # Route page components
        HomePage.tsx      # Root album list
        AlbumDetailPage.tsx
        ImageDetailPage.tsx
        SearchResultsPage.tsx
        PathResolverPage.tsx # Path-based URL resolution
        NotFoundPage.tsx
      types/
        index.ts          # Frontend types, re-exports backend/types.ts
        albumThemes.ts    # Theme config types
      styles/
        global.css        # Minimal reset
        themes.css        # CSS custom properties for all themes
      config/
        themes.ts         # Theme registry (THEME_REGISTRY)
      test/
        setup.ts          # Vitest global setup (fetch mock, matchMedia, IntersectionObserver, useProgressiveImage mock)
      test-utils.tsx      # Custom render with MemoryRouter + ThemeProvider + FilterProvider
      __mocks__/
        mockData.ts       # Pre-built test data matching Child interface
    public/
      album-themes.json   # Per-album theme overrides
      image-config.json   # Image path config (for backend verification)
      g2data/             # Local image/thumbnail files (gitignored)
    aliases.config.ts     # Shared path alias definitions (imported by both vite and vitest configs)
    vitest.config.ts      # Test config (jsdom, v8 coverage, imports aliases.config.ts)
    vite.config.ts        # Build config (custom data plugin, chunk splitting, imports aliases.config.ts)
    eslint.config.js      # ESLint 9 flat config (recommended + typescript-eslint + react + hooks + prettier)
    .prettierrc           # Prettier config
  docs/
    theming/              # Theme system documentation
    dev-notes/            # 45+ implementation session notes
    orig-page/            # Original Gallery 2 design reference (HTML/CSS)
  scripts/                # Utility scripts (asset checking, fuzzy matching)
  data/                   # Generated album JSON files (gitignored)
  .claude/plans/          # Implementation plans for completed SEC/LOGIC/ARCH items
```

## Development Commands

### Frontend

```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Vite dev server (serves data/ via custom plugin)
npm run build            # TypeScript check (shipped code only, tsconfig.json) + Vite production build
npm run typecheck        # Type-check shipped code only (tsconfig.json; tests excluded)
npm run typecheck:test   # Type-check including tests (tsconfig.test.json)
npm run preview          # Preview production build
npm test                 # Vitest in watch mode
npm run test:run         # Single test run
npm run test:coverage    # Coverage report (v8)
npm run test:ui          # Vitest UI
npm run lint             # ESLint (zero warnings enforced)
npm run lint:fix         # ESLint autofix
npm run format           # Prettier write
npm run format:check     # Prettier check
npm run build:analyze    # Build with bundle visualizer + sourcemaps (--mode analyze; never deploy this)
npm run check:dist       # Fail if dist/ has images, g2data/, *.map or stats.html
npm run size-check       # Check bundle size limits
```

### Backend

```bash
cd backend
npm install              # Install dependencies
npx ts-node index.ts     # Run extraction (requires config.json with DB credentials)
npm test                 # Run all backend *.test.ts (runTests.mjs); npm test -- <name> for a subset
npx ts-node <file>.test.ts  # Run individual test files
```

## Code Conventions

### TypeScript

- **Strict mode** enabled in both frontend and backend
- Frontend enforces `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Use `type` keyword for type-only imports: `import type { Child } from '@/types'`
- Path aliases in frontend: `@/components/*`, `@/utils/*`, `@/hooks/*`, `@/types/*`, `@/pages/*`, `@/contexts/*`, `@/styles/*`
- Backend uses direct relative imports (no aliases)
- Types defined in `backend/types.ts` (source of truth), re-exported in `frontend/src/types/index.ts`

### Naming

- **Components**: PascalCase (`AlbumGrid`, `SearchBar`)
- **Props interfaces**: suffixed with `Props` (`AlbumGridProps`)
- **Hooks**: `use` prefix, camelCase (`useAlbumData`, `useProgressiveImage`)
- **Utils/functions**: camelCase with action verb prefix (`getImageUrl`, `buildPathFromBreadcrumb`, `decodeHtmlEntities`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT_MS`, `MAX_ITERATIONS`)
- **SQL templates**: `SQL_` prefix (`SQL_GET_CHILDREN`)
- **CSS classes**: kebab-case (`.album-card-thumbnail`, `.root-album-list-block`)
- **CSS variables**: `--color-{category}-{element}-{state}` or `--{component}-{property}`
- **Files**: camelCase for utils/hooks (`imageUrl.ts`), PascalCase for components (`AlbumGrid.tsx`)

### React Patterns

- Functional components only, no class components
- Components exported as **named exports only** (no default exports — standardized across all barrel files)
- Each component folder has an `index.ts` barrel export (named exports only, no `export default`)
- JSDoc on all components and hooks
- Custom `render` in `test-utils.tsx` wraps with `MemoryRouter` + `ThemeProvider` + `FilterProvider`
- Memoize context values to prevent re-renders
- Use request ID counters (not `isMountedRef`) for stale request guarding in async hooks
- `useAlbumData` uses `requestIdRef` counter to prevent stale data from old album IDs on rapid navigation
- `useProgressiveImage` has three-layer cleanup: per-effect, image-change, and unmount URL revocation
- `ViewAbortContext` captures AbortController in closure, uses `pathname` + `search` as dependencies (not `location.key`)
- Theme migration runs as a direct function call at the top of ThemeProvider body (not `useMemo`)

### CSS Patterns

- One `.css` file per component, imported in the component file
- CSS custom properties for all theme-dependent values
- Three themes: `light`, `dark`, `classic` (Gallery 2 reproduction)
- Theme applied via `data-theme` attribute on root element
- Responsive design with `@media (min-width: 768px)` breakpoint
- Transitions on theme-dependent properties (disabled under `prefers-reduced-motion`)

### Backend Patterns

- Factory pattern for SQL utilities: `export default (connection, config) => ({ ... })`
- Pure functions for utilities, no shared mutable state
- Status union return types: `'generated' | 'skipped' | 'missing' | 'invalid'`
- `console.warn` for non-critical issues during extraction
- Null coalescing and explicit null checks for database values
- HTML entities decoded and BBCode stripped during extraction (frontend receives clean text for titles)
- Field-level validation for database results via `validateRow.ts` helpers (type checks, length limits, Buffer-to-UTF8)
- Environment variables (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_PORT`) override `config.json` for sensitive values
- Path traversal validation in `generateThumbnail.ts`, `pathResolution.ts`, and `verifyImagePaths.ts`
- SSRF protection in `verifyImageUrl()` — blocks localhost, private IP ranges (10.x, 172.16-31.x, 192.168.x)

### Testing

- **Frontend**: Vitest + React Testing Library + vitest-axe
  - Tests colocated with source (`.test.ts` / `.test.tsx` next to implementation)
  - `describe`/`it`/`expect` pattern
  - **1,421 tests, 100% pass rate** (93% statement coverage, 89% branch coverage)
  - Mock data in `src/__mocks__/mockData.ts`
  - Global mocks in `src/test/setup.ts`: `fetch` (returns 404 by default), `matchMedia`, `IntersectionObserver`, `useProgressiveImage` (returns synchronous URLs)
  - Use custom `render()` from `test-utils.tsx`, not raw RTL render
  - Accessibility testing with `vitest-axe`
  - **Important test patterns**:
    - `useProgressiveImage` is globally mocked — tests for the hook itself use `vi.unmock('@/hooks/useProgressiveImage')`
    - `vi.clearAllMocks()` in `beforeEach` destroys module-level mock implementations — re-establish critical mocks (like `loadPathIndex`, `resolvePathToAlbumId`) after clearing
    - Use `await act(async () => { await vi.advanceTimersByTimeAsync(X); })` for hooks that combine timers + promises
    - Use `fireEvent.change()` for date inputs (not `userEvent.type()`)
    - Wrap IntersectionObserver callback invocations in `act()` for state updates to flush
    - For error state tests on image components, override the `useProgressiveImage` mock with `mockReturnValue({ hasError: true, ... })`
- **Backend**: Node.js `assert` module (no test framework)
  - Tests run directly: `npx ts-node bbcode.test.ts`
  - Sequential assertions in a `run()` function
  - `console.log('... tests passed')` on success
  - Shared test vectors in `test-vectors/` for cross-backend/frontend validation

### Formatting

- Prettier: semicolons, double quotes, 2-space indent, trailing commas (es5), 80 char width, always parens on arrows
- ESLint 9 (flat config `frontend/eslint.config.js`, .ts/.tsx only): recommended + typescript-eslint recommended + React + React hooks (rules-of-hooks, exhaustive-deps) + react-refresh + Prettier. ESLint 10 waits on eslint-plugin-react (supports up to 9).

## Theme System

Three themes available, selected via `ThemeDropdown` or `ThemeSwitcher`:

| Theme | Description | CSS Selector |
|-------|-------------|--------------|
| `light` | Warm greys, terracotta/navy accents | `[data-theme="light"]` |
| `dark` | Dark greys, purple accents, reduced contrast | `[data-theme="dark"]` |
| `classic` | Gallery 2 reproduction (lanbilder.se), two-column sidebar layout, blue links with orange hover | `[data-theme="classic"]` |

- Default theme: `classic`
- Per-album theme overrides via `frontend/public/album-themes.json`
- Theme preference stored in localStorage key `"gallery-theme-preference"`
- Legacy `"original"` value auto-migrated to `"classic"`
- `ThemeContext` exposes: `theme`, `effectiveTheme`, `setTheme`, `isDark`, `isLight`, `isClassic`

## Image Handling

- **Full-size images**: served from `/g2data/albums/` (fixed constant `IMAGE_BASE_URL`)
- **Thumbnails**: served from `/g2data/thumbnails/` (fixed constant `THUMBNAIL_BASE_URL`)
- No async config loading, no proxy, no dynamic base URLs
- Progressive loading: thumbnail first (as object URL), then full-size
- Object URLs revoked via three-layer cleanup: per-effect, image-change, and unmount
- `ViewAbortContext` cancels in-flight image fetches on route change
- LRU image cache in `imageCache.ts` — uses Map insertion-order for O(1) operations (delete+reinsert pattern)
- Album data cache limited to 100 entries with LRU eviction (`dataLoader.ts`)
- Search result cache limited to 50 entries with LRU eviction (`useSearch.ts`)
- Image preloading limited to 4 concurrent fetches (`imagePreload.ts`)
- Thumbnail fallback order: `thumbnailUrlPath` -> `highlightThumbnailUrlPath` -> `highlightImageUrl`

## Data Model

The core type is `Child` (defined in `backend/types.ts`):

- `type`: `'GalleryAlbumItem'` (album) or `'GalleryPhotoItem'` (image)
- `id`: numeric gallery item ID
- `title`, `description`, `summary`: pre-decoded text (entities decoded, BBCode stripped by backend)
- `pathComponent`: URL-safe path segment
- `urlPath`, `thumbnailUrlPath`, `highlightThumbnailUrlPath`: pre-computed paths
- `timestamp`: creation date
- `width`, `height`, `thumb_width`, `thumb_height`: dimensions (images)
- `totalDescendantImageCount`: recursive image count (albums)
- `breadcrumbPath`: `BreadcrumbItem[]` for navigation

Album JSON files (`data/{albumId}.json`) contain:
```typescript
interface AlbumFile {
  metadata: AlbumMetadata;  // albumId, albumTitle, albumDescription, breadcrumbPath, etc.
  children: Child[];        // albums and images in this album
}
```

Frontend type guards: `isAlbum(child)` and `isImage(child)` for discriminated union.

## Shared Code

- `shared/decodeHtmlEntities.ts` - **Single source of truth** for HTML entity decoding. Imported by both backend (`../shared/decodeHtmlEntities`) and frontend (re-exported from `frontend/src/utils/decodeHtmlEntities.ts`). Includes `safeFromCodePoint()` validation for numeric entities.
- `test-vectors/nordic-path-normalization.json` - Shared test vectors ensuring backend `cleanupUipath.ts` and frontend `albumPath.ts` produce identical path normalization output.
- `frontend/aliases.config.ts` - Shared path alias definitions imported by both `vite.config.ts` and `vitest.config.ts`.

### Intentionally Separate Implementations

- `bbcode.ts` - Backend strips BBCode (iterative regex, handles nested brackets), frontend parses to React elements (600+ lines with caching). Different purposes require different implementations.
- Path normalization - `cleanupUipath.ts` (backend, uses `unidecode`) vs `albumPath.ts` (frontend, subset of normalizations). Coupling documented in both files' JSDoc. The shared test vectors in `test-vectors/` validate parity.

The backend strips BBCode and decodes entities during extraction, so frontend titles are already clean text. The frontend's full BBCode parser is used for descriptions/summaries that retain formatting.

## Bundle Size Budgets

Enforced via `size-limit` in `frontend/package.json`:
- Initial bundle: 200 KB (gzipped)
- Route chunks: 50 KB each
- Lightbox chunk: 30 KB
- Total: 500 KB

## Key Configuration Files

| File | Purpose | Committed |
|------|---------|-----------|
| `backend/config.json` | DB credentials + extraction settings (env vars override) | No (gitignored) |
| `backend/config_example.json` | Template for config.json | Yes |
| `frontend/public/album-themes.json` | Per-album theme overrides | Yes |
| `frontend/public/image-config.json` | Image paths (backend verification only) | Yes |
| `frontend/aliases.config.ts` | Shared path aliases for vite + vitest | Yes |
| `frontend/vite.config.ts` | Build config + dev data plugin | Yes |
| `frontend/vitest.config.ts` | Test config (jsdom, coverage) | Yes |

## Security Hardening (SEC-01 through SEC-11)

All implemented and tested:

| Area | Protection | Files |
|------|-----------|-------|
| HTML entities | `safeFromCodePoint()` validates codepoints (rejects control chars, surrogates, out-of-range) | `shared/decodeHtmlEntities.ts` |
| BBCode URLs | `isValidHttpUrl()` via `URL` constructor (rejects malformed URLs, non-http schemes) | `frontend/src/utils/bbcode.ts` |
| BBCode styles | `CSS_INJECTION_PATTERN` blocks `expression()`, `url()`, `javascript:`, `@import` | `frontend/src/utils/bbcode.ts` |
| Image URLs | Path traversal prevention (rejects `..` segments and null bytes) | `frontend/src/utils/imageUrl.ts` |
| Thumbnails | `validateNoTraversal()` on source/dest paths | `backend/generateThumbnail.ts` |
| Local files | `fs.realpath()` for symlink-safe containment | `backend/verifyImagePaths.ts` |
| Search | Linear two-pointer subsequence match (no regex, no backtracking); query max `MAX_SEARCH_QUERY_LENGTH` = 32, also the SearchBar `maxLength` | `frontend/src/utils/searchUtils.ts`, `SearchBar.tsx` |
| HTTP requests | `isPublicUrl()` blocks localhost and private IP ranges | `backend/verifyImagePaths.ts` |
| DB credentials | Environment variable overrides (`MYSQL_*`) | `backend/index.ts` |
| Path components | Rejects `..`, `/`, `\`, null bytes in path chain | `backend/pathResolution.ts` |
| Route params | Strict `/^\d+$/` validation before parseInt | `frontend/src/utils/routeParams.ts` |

## Documentation

- `docs/theming/` - Theme system architecture, CSS variables, adding themes, per-album config
- `docs/dev-notes/` - 45+ implementation session notes with decisions and rationale
- `docs/orig-page/` - Original Gallery 2 (lanbilder.se) HTML/CSS reference
- `frontend/docs/user-guides/` - Getting started, configuration, usage, features, deployment, troubleshooting
- `frontend/docs/architecture.md` - Frontend architecture overview
- `frontend/docs/bundle-optimization.md` - Code splitting and bundle strategy
- `frontend/docs/performance-testing.md` - Performance targets and testing methods
- `frontend/TESTING.md` - Testing stack, patterns, and best practices

## Important Notes

- The backend is a one-shot admin tool, not a running server. It connects to MySQL, extracts data, writes JSON/thumbnails, and exits. Despite this, security hardening (SEC-01 through SEC-11) has been applied for defense-in-depth.
- The frontend is fully static after build. No API calls, no server, no authentication. All data comes from pre-generated JSON files.
- Nordic character normalization (Swedish: a, o, a with diacritics) is a recurring concern in path handling. Both backend and frontend normalize these for URL-safe paths while preserving display titles. Coupling is documented in JSDoc and validated via shared test vectors in `test-vectors/`.
- The `classic` theme reproduces the original Gallery 2 Classic appearance from the lanbilder.se site, including the two-column sidebar layout, specific color palette (#6b8cb7 links, #f4560f hover), and Verdana/Arial typography.
- Album ID 7 is the default root album for this specific gallery instance. The frontend tries ID 7 first, then falls back to discovery via `data/index.json`.
- `data/` directory (album JSONs) is gitignored because it's generated output.
- `frontend/public/g2data/` (local images/thumbnails) is gitignored because it contains large binary assets.
- `THEME_REGISTRY` in `config/themes.ts` is frozen with `Object.freeze()` for runtime immutability.
- The BBCode parser's `parseTag` splits on the first space character — values containing spaces (like `rgb(255, 0, 0)`) must use no-space form (`rgb(255,0,0)`) in BBCode attributes.
- `decodeHtmlEntities` is shared code in `shared/` — the frontend re-exports it; the backend imports directly. Do not create separate copies.
