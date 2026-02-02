# Local image setup

All images load from `frontend/public/g2data` (symlink). No configuration is required.

## Path structure

- **Full-size images:** `g2data/albums/...` (URL `/g2data/albums/...`)
- **Thumbnails:** `g2data/thumbnails/...` (URL `/g2data/thumbnails/...`)

Path structure under `g2data/` must match the path components in your album/photo JSON: `pathComponent`, `urlPath`, `thumbnailUrlPath`, and `highlightImageUrl` from backend extraction output.

Example: if data has `urlPath: "CV-LAN/CVLAN1/DSC00800.jpg"`, the file must be at `frontend/public/g2data/albums/CV-LAN/CVLAN1/DSC00800.jpg` (URL `/g2data/albums/CV-LAN/CVLAN1/DSC00800.jpg`).

## Verification checklist

With the app running:

1. **Root album list** – Thumbnails and highlight backgrounds load
2. **Album detail** – Album grid thumbnails load (AlbumCard)
3. **Lightbox** – Thumbnail and full-size load; next/previous work
4. **Browser console** – No CORS or OpaqueResponseBlocking errors

If any fail, check that files exist under `public/g2data/albums` and `public/g2data/thumbnails` with the same relative paths as in your JSON.
