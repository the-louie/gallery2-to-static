# Adding New Themes

To add a new theme to the gallery application, follow these steps.

## 1. Register the Theme

Edit `frontend/src/config/themes.ts` and add a new entry to `THEME_REGISTRY`:

```typescript
export const THEME_REGISTRY: readonly ThemeDefinition[] = [
  // ... existing themes
  {
    name: 'mytheme',
    displayName: 'My Theme',
    description: 'Description of the new theme',
    cssSelector: '[data-theme="mytheme"]',
  },
] as const;
```

The `name` must be unique and will be used in:
- `data-theme` attribute
- localStorage
- album-themes.json
- CSS selectors

## 2. Add CSS Variables

Edit `frontend/src/styles/themes.css` and add a new block:

```css
[data-theme="mytheme"] {
  /* Override variables from :root */
  --color-background-primary: #yourcolor;
  --color-text-primary: #yourcolor;
  /* ... other variables as needed */
}
```

You can override only the variables that differ from `:root`. Unset variables inherit from `:root`. Refer to [css-variables.md](css-variables.md) for the full list of variables.

## 3. Theme Transitions

Add your theme to the transition blocks so theme changes animate smoothly:

```css
:root,
[data-theme="light"],
[data-theme="dark"],
[data-theme="original"],
[data-theme="mytheme"] {
  transition: ...;
}
```

And in the `prefers-reduced-motion` media query.

## 4. Add Icon to ThemeDropdown (Optional)

If ThemeDropdown shows icons per theme, add a case in `frontend/src/components/ThemeDropdown/ThemeDropdown.tsx`:

```tsx
function getThemeIcon(themeName: string) {
  switch (themeName) {
    case 'light': return <SunIcon />;
    case 'dark': return <MoonIcon />;
    case 'original': return <FrameIcon />;
    case 'mytheme': return <MyThemeIcon />;
    default: return <SunIcon />;
  }
}
```

## 5. Layout Variations (Optional)

If your theme requires layout changes (like Original's sidebar), add logic in Layout or other components using `useTheme()`:

```tsx
const { effectiveTheme } = useTheme();
const useSidebarLayout = effectiveTheme === 'mytheme';
```

## 6. Update album-themes.json

Users can assign the new theme to albums by adding it to `album-themes.json`:

```json
{
  "albumThemes": {
    "7": "mytheme"
  }
}
```

## 7. Validation

The theme will be validated by `isValidTheme()` in `themes.ts`, which checks against `THEME_REGISTRY`. No additional validation code is needed.

## Checklist

- [ ] Add to THEME_REGISTRY in themes.ts
- [ ] Add [data-theme="mytheme"] block in themes.css
- [ ] Add to transition and prefers-reduced-motion blocks
- [ ] Add icon in ThemeDropdown if applicable
- [ ] Add layout logic if theme has unique layout
- [ ] Test theme switching, persistence, per-album override
