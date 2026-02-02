# Local image copy

All images load from `frontend/public/g2data` (symlink):

- Full-size: `g2data/albums/...` (URL `/g2data/albums/...`)
- Thumbnails: `g2data/thumbnails/...` (URL `/g2data/thumbnails/...`)

Path structure must match the path components in your data (`pathComponent`, `urlPath`, `thumbnailUrlPath` from album/photo JSON). Vite serves `public/` at `/`, so `public/g2data/` is available at `/g2data/`.
