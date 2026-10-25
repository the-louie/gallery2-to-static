# Original Gallery 2 (lanbilder.se) pages, as served in 2006

Raw captures from the Wayback Machine (`id_` URLs: the page as the server sent it, no Wayback toolbar), fetched 2026-10-25. Before that, this folder held a `main.html` and `theme.css` *reconstructed* from screenshots; the real 2006 Classic `theme.css` differs from that reconstruction by 811 diff lines, so both were replaced.

| File | Source |
|---|---|
| `2006/dhphotos.html` | https://web.archive.org/web/20060208090028/http://www.lanbilder.se/v/dreamhack/dhw05/dhphotos/ — **the template for every album page** (operator, 2026-10-25) |
| `2006/photo-CIMG0053_.html` | https://web.archive.org/web/20060215034132/http://www.lanbilder.se:80/v/dreamhack/dhw05/dhphotos/CIMG0053_.JPG.html — a photo page in the same theme |
| `2006/dhw05.html` | https://web.archive.org/web/20060515025935/http://www.lanbilder.se/v/dreamhack/dhw05/ — same theme; its sidebar peer list overflows (no line breaks): do not copy that |
| `2006/main.html` | https://web.archive.org/web/20060718022536/http://www.lanbilder.se/main.php — the root, which used the Classic theme's list layout then; the new root uses the Matrix layout |
| `2006/matrix-theme.css` | `/themes/matrix/theme.css` as served in 2006 (Gallery 2.0; base + Matrix rules concatenated) |
| `2006/classic-theme.css` | `/themes/classic/theme.css` as served in 2006 |
| `2006/icons.css` | `/modules/icons/iconpacks/paularmstrongdesigns/icons.css` |

The pages are ISO-8859-1 bytes despite their UTF-8 meta tag, and contain the 2006 ads and analytics scripts; they are reference material, never served. Screenshots of them (1280px) and the Gallery 2.3.2 source are on the operator share (`/srv/share/lanbilder2/inspo/`), not in the repository. The implementation spec is `frontend/docs/theme-matrix.md`.

Gallery 2 is © the Gallery project, GPL-2.0.
