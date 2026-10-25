# Local image copy

All images load from `frontend/public/g2data` (symlink):

- Full-size: `g2data/albums/...` (URL `/g2data/albums/...`)
- Thumbnails: `g2data/thumbnails/...` (URL `/g2data/thumbnails/...`)

Path structure must match the path components in your data (`pathComponent`, `urlPath`, `thumbnailUrlPath` from album/photo JSON). The Vite dev server serves `public/` at `/`, so `public/g2data/` is available at `/g2data/` in development. `vite build` does not copy it into `dist/` (see `PUBLIC_FILES_TO_SHIP` in `vite.config.ts`); serve `/g2data/` separately in production.
