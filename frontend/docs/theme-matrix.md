# Classic theme = Gallery 2 Matrix, as lanbilder.se ran it in 2006

Spec for THEME-01 (Sprint 11). The default theme (`classic`) reproduces Gallery 2.0's **Matrix** theme as lanbilder.se served it, 1:1, with the leave-outs below. The light and dark themes keep their own layout.

**Template** for every album page, the root included (operator, 2026-10-25): `docs/orig-page/2006/dhphotos.html` (DreamHack Winter 05 › Battlefrag.com, 287 photos). Photo page: `docs/orig-page/2006/photo-CIMG0053_.html`. CSS: `docs/orig-page/2006/matrix-theme.css`. Sources and the other captures: `docs/orig-page/README.md`.

## Page structure (top to bottom)

```
#gallery (padding 8px, white)
├─ #gsNavBar  (border top+bottom 1px #ccc)
│   ├─ .gbSystemLinks (float right)        ← Login / Register: LEFT OUT (see below)
│   └─ .gbBreadCrumb  "lanbilder.se » DreamHack » DreamHack Winter 05 » Battlefrag.com"
└─ table 100%: [ #gsSidebarCol | content ]
    ├─ #gsSidebar (175px, border-right 1px #ccc)
    │   ├─ search block: text box "Search the Gallery" (size 18) + "Advanced Search" (icon)
    │   ├─ item links: "View Slideshow", "View Slideshow (Fullscreen)" (icons)   ← "Add Comment" LEFT OUT
    │   └─ peer list: h3 parent title; "1. DH-Photo" … "6. G3", "...", "18. mave"; current = bold #0b6cff, not a link
    └─ #gsContent (border 1px #ccc where gbBlock borders apply)
        ├─ .gbBlock.gcBackground1: [ h2 title + description | 30%: Date / Owner / Size: N items ]
        ├─ .gbBlock.gcBackground2.gbNavigator: first/previous (left) … next/last (right)
        ├─ .gbBlock: table#gsThumbMatrix, 3 columns × 4 rows (width 33% each)
        │     cell: thumbnail (150px box) / bold title / "Date: 11/26/2005" / "Views: 1074"
        ├─ navigator again
        └─ #gsPages.gbBlock.gcBackground1: "Page: 1 2 3 4 5 6 ... 24" (current unlinked)
#gsFooter: badges XHTML 1.0, Gallery 2, "Unpossible" (80×15 each)
```

Photo page: same frame. Header block: h2 photo title | 30%: Date, Owner, "Size:" select (we have one size), "Full size: 1200x1600" link. Navigator, `#gsImageView` with the image (Gallery 2 showed a 768px resize), navigator. Sidebar peer list lists the album's photos ("1. CIMG0053_.JPG" … "287. CIMG0056h.JPG").

## Peer list

Ported from Gallery 2.3.2 (`utils/matrixPeers.ts`): the window of `core.LoadPeers` with the theme's windowSize 6 (the current peer with neighbours to six entries, widened when it touches an end, plus the first and the last; "..." for a gap) and `entitytruncate:14` for titles (cut to 11 characters at a word boundary, then "..."). An album lists its siblings under the parent's title; a photo lists its album's items. Checked against both 2006 pages (`inspo/screens/t05-sidebar-compare.png`).

## Values (from `matrix-theme.css`)

| What | Value |
|---|---|
| Base font | `#gallery`: Verdana, Arial, Helvetica, sans-serif; 62.5% (10px); colour #333; background #fff |
| Headings h2/h3/h4, `.giTitle` | "Trebuchet MS", Arial, Verdana, Helvetica; 1.3em (13px) bold; margin 0 |
| Links | bold, no underline, #6b8cb7; hover underline #f4560f; active #f9c190 |
| Backgrounds | `.gcBackground1` #eee, `.gcBackground2` #e7e7e7 |
| Borders | `.gcBorder1` 0 solid #ccc (each block sets the widths) |
| `.gbBlock` | padding 0.7em; border-bottom 1px (inherits #ccc) |
| `#gallery` | padding 8px |
| Nav bar | border top + bottom 1px; breadcrumb 1.1em (11px) bold, padding 4px 8px; each item after the first: 14px left padding with `icon_path_separator.gif` (10×10 "»") |
| System links | float right, padding 4px 6px, items 0 4px |
| Sidebar | 175px wide, border-right 1px, overflow hidden; column `width: 1%` |
| Sidebar links | search "Advanced Search": block, padding 3px; item links block, padding 3px, 22px left padding for the 20×16 icon; peer list links block, padding 3px |
| `.giDescription` | 1.1em (11px), line-height 1.4em |
| `.giInfo` | 0.9em (9px), #888; each `span.summary` on its own line |
| Item cell | `td.giItemCell`: padding 1em, centered |
| Navigator | next/last float right (`text-align: right` when there is no previous); links get 27px padding with the 27×11 arrow gifs (`nav_first/prev/next/last.gif`) |
| Pager | `#gsPages span`: padding 0 0.3em |
| Thumbnails | Gallery 2 made 150px thumbnails (longest side); ours are 300px for 2× screens, shown in a 150px box |
| Date format | US, `MM/DD/YYYY` ("Date: 11/26/2005") |
| Items per page | 12 (3 columns × 4 rows), the site's Matrix setting (287 items → 24 pages) |

Assets (`frontend/src/assets/matrix/`, all under 1.3 KB, so Vite inlines them into the CSS; no image file reaches `dist/`): the 2006 files, byte-identical to Gallery 2.3.2's: `icon_path_separator.gif`, `nav_first|prev|next|last.gif` (themes/matrix/images), `advanced_search.gif`, `view_slideshow.gif`, `view_fullscreen_slideshow.gif` (icon pack paularmstrongdesigns), footer badges `xhtml10.png`, `gallery.gif`, `g2-unpossible.png`. Gallery 2 © the Gallery project, GPL-2.0. The CSS is written for this app from the values above, not copied.

## Left out (operator, 2026-10-25)

- Login / Register links (nav bar, right). Notes for the future below.
- "Add Comment" (sidebar item links): there are no comments.
- The ad banner text in the header ("Ju fler som klickar på bannern…", "Varför har vi reklam på Sidan?") and AdSense; `#gsHeader` is empty, so it is left out.
- The "About us" block below the footer.
- Template bug: the peer list on `dhw05.html` has no line breaks and overflows; long titles wrap here.

## Login / Register (for later, FUT-02)

Operator: "create detailed notes about the login/register links, we will need it in the future update."

- **Place:** `#gsNavBar .gbSystemLinks`, floated right on the breadcrumb line, padding 4px 6px; each link a `span.block-core-SystemLink` with 0 4px padding. Same style as the breadcrumb: 11px bold, link colour #6b8cb7, hover #f4560f underlined. Order: "Login", "Register".
- **Gallery 2.0 targets** (from `dhphotos.html`): `main.php?g2_view=core.UserAdmin&g2_subView=core.UserLogin&g2_return=<this page>&g2_returnName=album` and `main.php?g2_view=core.UserAdmin&g2_subView=register.UserSelfRegistration&g2_return=<this page>&g2_returnName=album`. Gallery 2 returned to `g2_return` after login. Session in `g2_GALLERYSID` (URL or cookie).
- **Logged in,** Gallery 2 showed "Your Account" (`core.UserAdmin`, `core.UserPreferences`) and "Logout" (`core.Logout`) in the same place, and the sidebar item-link block gained the album actions the user was allowed (as in `/srv/share/lanbilder2/inspo/gallery2_theme/107388-81263-i_rc.jpg`: edit album, add album, delete album, move album, set as highlight, edit permissions, edit captions, add items, delete items, reorder items, RSS feeds), each with its icon from the same icon pack.
- **New design (FUT-02):** the public site keeps them hidden. On the admin hostname the same two places render: "Login" goes to the Cloudflare Access login and back to the same page; "Register" becomes a request-access link (no self-registration). After login: "Your account" and "Logout"; item links show only what the user's album delegation allows.

## Phones

Gallery 2 had no small-screen layout. Below 700px wide: the sidebar moves under the content, the matrix drops to 2 columns, and text is set so the smallest (`.giInfo`) is at least 12px. Checked per device in Sprint 11 T-11.
