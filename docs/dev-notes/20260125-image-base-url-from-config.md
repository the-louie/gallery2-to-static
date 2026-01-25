# Image base URL from config fix

## Objective
Images were loading from `http://localhost:5173/images/...` instead of the configured base URL (e.g. `https://lanbilder.se/...`) from `frontend/public/image-config.json`.

## Cause
`getImageBaseUrl()` in `imageConfig.ts` is synchronous: it returns the cached value or kicks off an async `loadImageConfig()` and immediately returns `DEFAULT_BASE_URL` (`/images`). The first render (and any URL built before the fetch completed) therefore used `/images`. The module did call `loadImageConfig()` on import, but components often rendered before that promise resolved.

## Solution
- **ImageConfigProvider** loads config on mount via exported `loadImageConfig()`, stores the resolved base URL in React state, and exposes it via **ImageConfigContext** and **useImageBaseUrl()**.
- Initial provider state is `DEFAULT_BASE_URL` so the first paint uses `/images`; when the config load completes, state updates to the real base URL and all consumers re-render with correct URLs.
- **imageConfig.ts**: Exported `loadImageConfig` and `DEFAULT_BASE_URL` for use by the provider.
- **imageUrl.ts**: All URL helpers accept an optional `baseUrlOverride`. When provided (e.g. from `useImageBaseUrl()`), it is used; otherwise they fall back to `getImageBaseUrl()`.
- **Consumers** now pass the context base URL into URL construction: `useProgressiveImage`, `useImagePreload`, `RootAlbumListBlock`, and `AlbumCard` use `useImageBaseUrl()` and pass it into `getImageUrl`, `getAlbumThumbnailUrl`, and `getAlbumHighlightImageUrl`.
- **App.tsx** wraps the app with `ImageConfigProvider` so all routes have access to the context.

## Files changed
- `frontend/src/utils/imageConfig.ts`: export `loadImageConfig`, `DEFAULT_BASE_URL`
- `frontend/src/contexts/ImageConfigContext.tsx`: new provider and `useImageBaseUrl` hook
- `frontend/src/contexts/index.ts`: export ImageConfig context
- `frontend/src/utils/imageUrl.ts`: optional `baseUrlOverride` on getImageUrl, getImageUrlWithFormat, getAlbumThumbnailUrl, getAlbumHighlightImageUrl and internal constructors
- `frontend/src/hooks/useProgressiveImage.ts`: use `useImageBaseUrl()`, pass baseUrl into getImageUrl and into reset effect deps
- `frontend/src/hooks/useImagePreload.ts`: use `useImageBaseUrl()`, pass baseUrl into getImageUrl and effect deps
- `frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx`: use `useImageBaseUrl()`, pass to getAlbumHighlightImageUrl and getAlbumThumbnailUrl
- `frontend/src/components/AlbumGrid/AlbumCard.tsx`: use `useImageBaseUrl()`, pass to getAlbumThumbnailUrl
- `frontend/src/App.tsx`: wrap with ImageConfigProvider, fix Layout/Suspense indentation

## Verification
- Lint clean on modified files.
- All existing tests pass; new parameters are optional so no test signature changes required.
