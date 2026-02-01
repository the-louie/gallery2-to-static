# Theme-Related Components

## ThemeProvider

**Location:** `frontend/src/contexts/ThemeContext.tsx`

**Purpose:** Provides theme state to the application. Must wrap the app and be inside a Router (uses `useLocation()`).

**Props:**
- `children`: React node
- `defaultTheme?`: Theme when no stored preference exists (default: `"original"`)

**Usage:**
```tsx
<ThemeProvider defaultTheme="original">
  <App />
</ThemeProvider>
```

**Behaviour:**
- Migrates old theme preference from localStorage on mount
- Reads user preference from `localStorage` key `gallery-theme`
- Resolves effective theme from path (album ID) and `album-themes.json`
- Applies theme via `document.documentElement.setAttribute('data-theme', ...)`
- Provides context value to children

---

## useTheme

**Location:** `frontend/src/contexts/ThemeContext.tsx`

**Purpose:** Hook to access theme context. Must be used within ThemeProvider.

**Returns:**
```typescript
interface ThemeContextValue {
  theme: Theme;           // User's stored preference
  effectiveTheme: Theme;  // Theme actually applied (may be album override)
  setTheme: (theme: ThemeName) => void;
  availableThemes: readonly ThemeDefinition[];
  isDark: boolean;
  isLight: boolean;
  isOriginal: boolean;
}
```

**Usage:**
```tsx
const { theme, effectiveTheme, setTheme, isOriginal } = useTheme();
```

**Throws:** Error if used outside ThemeProvider.

---

## ThemeDropdown

**Location:** `frontend/src/components/ThemeDropdown/ThemeDropdown.tsx`

**Purpose:** Accessible dropdown for selecting themes. Shows all available themes with icons.

**Props:**
- `className?`: Optional CSS class

**Usage:**
```tsx
<ThemeDropdown />
<ThemeDropdown className="header-dropdown" />
```

**Features:**
- Keyboard navigation (ArrowUp/ArrowDown, Enter, Escape, Tab)
- Click-outside-to-close
- ARIA attributes for accessibility
- Icons: Sun (light), Moon (dark), Frame (original)
- Displays current theme; selects and applies on choice

**Context:** Uses `useTheme()` for `theme`, `setTheme`, `availableThemes`.

---

## ThemeSwitcher

**Location:** `frontend/src/components/ThemeSwitcher/ThemeSwitcher.tsx`

**Purpose:** Alternate theme control that cycles through themes on click (Light → Dark → Original → Light). May be used in place of or alongside ThemeDropdown.

**Context:** Uses `useTheme()` for `theme`, `setTheme`.

---

## Layout Integration

**Location:** `frontend/src/components/Layout/Layout.tsx`

**Usage:** `const { isOriginal } = useTheme();`

**Behaviour:**
- When `isOriginal` is true: Renders two-column layout with sidebar (search, RSS, Slideshow links); site name is plain text; Search and Sort in sidebar
- When `isOriginal` is false: Single-column layout; site name is a link; Search and Sort in header

---

## RootAlbumListBlock

**Location:** `frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx`

**Usage:** `const { isOriginal } = useTheme();`

**Behaviour:**
- When `isOriginal`: Shows "Album: " prefix before titles; different subalbum display; no highlight image in certain cases
- When not original: Standard display

---

## Test Utilities

**ThemeProvider in tests:** Must be wrapped with `MemoryRouter` because ThemeProvider uses `useLocation()`:

```tsx
<MemoryRouter initialEntries={['/album/7']}>
  <ThemeProvider defaultTheme="light">
    {children}
  </ThemeProvider>
</MemoryRouter>
```

**Clearing album themes cache:** Call `clearAlbumThemesConfigCache()` from `albumThemesConfig` in `beforeEach`/`afterEach` when testing per-album behaviour.
