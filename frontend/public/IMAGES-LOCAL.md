# Local image copy

To serve gallery images from a local path (same-origin, no CORS):

1. Place your image tree under `frontend/public/images/` so that paths match the path components in your data (e.g. `pathComponent`, `thumbnailPathComponent` from album/photo JSON). Example: if data has `thumbnailPathComponent: "internationella/event/__t_photo.jpg"`, the file should be at `frontend/public/images/internationella/event/__t_photo.jpg` (URL `/images/internationella/event/__t_photo.jpg`).

2. Set `baseUrl` to `"/images"` in `frontend/public/image-config.json` (copy from `image-config.json.example.local`), or set build-time env `VITE_IMAGE_BASE_URL=/images`.

No trailing slash in `baseUrl`. Vite serves `public/` at `/`, so `public/images/` is served at `/images/`.
