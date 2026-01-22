# Frontend Usage

This guide explains how to use the frontend gallery application. You'll learn how to start the development server, navigate the gallery, and understand the interface.

## Starting the Development Server

### Basic Usage

Navigate to the `frontend` directory and start the development server:

```bash
cd frontend
npm run dev
```

The server will start and display output like:

```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Accessing the Application

Open the displayed URL (usually `http://localhost:5173`) in your web browser.

### Development Server Features

- **Hot Reload**: Changes to code automatically refresh the browser
- **Fast Refresh**: React components update without losing state
- **Error Display**: Compilation errors appear in the browser
- **Source Maps**: Debug with original source code in browser DevTools

### Stopping the Server

Press `Ctrl+C` in the terminal to stop the development server.

## Application Structure

### Pages

The application has several page types:

- **Home Page** (`/`): Displays the root album
- **Album Detail Page** (`/album/:id`): Displays a specific album's contents
- **Image Detail Page** (`/album/:albumId/image/:imageId` or `/image/:id`): Displays an image in lightbox
- **Search Results Page** (`/search?q=query`): Displays search results
- **404 Page**: Displays when a page is not found

### Navigation Methods

You can navigate the gallery in several ways:

1. **Clicking Albums/Images**: Click on album cards or image thumbnails
2. **Breadcrumb Navigation**: Click breadcrumb links to go to parent albums
3. **Browser Navigation**: Use browser back/forward buttons
4. **Direct URLs**: Navigate directly to album or image URLs
5. **Search**: Use the search bar to find specific items

## Data Requirements

### JSON Files Location

The frontend expects JSON files to be in the `/data/` directory (relative to the frontend root when served).

**Development**: Files should be at `frontend/public/data/` or accessible via the Vite server configuration.

**Production**: Files should be in the `dist/data/` directory after building.

### File Naming

JSON files must be named `{id}.json` where `{id}` is the album ID number.

**Examples**:
- `7.json` - Root album
- `10.json` - Album with ID 10
- `25.json` - Album with ID 25

### Data Structure

JSON files must contain arrays of items matching the `Child` interface structure. See [03-backend-usage.md](03-backend-usage.md) for the expected data format.

### Root Album Discovery

The frontend automatically discovers the root album by:

1. First checking for `7.json` (default root)
2. If not found, trying common root IDs (1, 0)
3. Displaying an error if no root album is found

## Using the Gallery Interface

### Home Page

The home page shows:
- **Filter Panel**: Filter albums and images by type, date range
- **View Mode Toggle**: Switch between grid and list views
- **Album Grid**: All albums and images in the root album

### Album Detail Page

Album detail pages show:
- **Breadcrumb Navigation**: Path from root to current album
- **Filter Panel**: Filter current album's contents
- **View Mode Toggle**: Switch between grid and list views
- **Sort Dropdown**: Sort albums and images
- **Content Grid**: Albums and images in the current album

### Image Viewing

Click on any image to open it in the lightbox:

- **Full-Screen Display**: Image displayed in modal overlay
- **Navigation**: Previous/Next buttons or arrow keys
- **Zoom**: Zoom in/out with controls or mouse wheel
- **Pan**: Drag to pan when zoomed
- **Close**: Click backdrop, close button, or press Escape
- **Metadata**: View image title, description, dimensions, date

See [05-features.md](05-features.md) for detailed lightbox features.

### Search

Use the search bar in the header:

1. Type your search query
2. Results appear on the search results page
3. Click results to navigate to items
4. Search highlights matching text

See [05-features.md](05-features.md) for detailed search features.

## Browser Compatibility

The application supports modern browsers with ES2020 support:

- **Desktop**: Chrome (80+), Firefox (75+), Safari (13.1+), Edge (80+)
- **Mobile**: iOS Safari (12.2+), Chrome Mobile (Android)

For detailed browser support, see the main [README.md](../../../README.md).

## Development vs Production

### Development Mode

- **Source Maps**: Enabled for debugging
- **Hot Reload**: Automatic refresh on code changes
- **Verbose Logging**: Additional console messages
- **Unminified Code**: Easier to read and debug

### Production Mode

- **Optimized Build**: Minified and optimized code
- **Code Splitting**: Separate bundles for faster loading
- **Asset Optimization**: Compressed images and assets
- **No Source Maps**: Smaller bundle size (optional)

See [06-building-deployment.md](06-building-deployment.md) for building for production.

## Common Usage Scenarios

### Viewing a Specific Album

1. Navigate to the album using breadcrumbs or clicking
2. Use filters to narrow down content
3. Use sort dropdown to organize items
4. Switch between grid and list views

### Finding a Specific Image

1. Use the search bar to search for image title or description
2. Click on search results to view the image
3. Use lightbox navigation to browse related images

### Browsing the Entire Gallery

1. Start at the home page
2. Click through albums to explore
3. Use breadcrumbs to navigate back
4. Use browser back/forward buttons

### Filtering Content

1. Open the filter panel
2. Set date range or type filters
3. View filtered results
4. Clear filters to see all content again

## Keyboard Shortcuts

### General Navigation

- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals, clear search

### Lightbox (when image is open)

- **Arrow Left**: Previous image
- **Arrow Right**: Next image
- **Escape**: Close lightbox
- **Ctrl/Cmd + Mouse Wheel**: Zoom in/out
- **Mouse Drag**: Pan when zoomed

### Search

- **Enter**: Perform search
- **Escape**: Clear search

## Mobile Usage

The application is fully responsive and works on mobile devices:

- **Touch Gestures**: Swipe left/right to navigate images
- **Pinch Zoom**: Pinch to zoom images in lightbox
- **Touch Navigation**: Tap to open albums and images
- **Responsive Layout**: Adapts to screen size

See [05-features.md](05-features.md) for detailed mobile features.

## Troubleshooting

### Gallery Won't Load

- **Check Data Files**: Verify JSON files exist in the correct location
- **Check Browser Console**: Look for error messages
- **Verify Root Album**: Ensure root album JSON file exists
- **Check Network Tab**: Verify JSON files are loading (not 404 errors)

### Images Not Displaying

- **Check Image Paths**: Verify image URLs are correct
- **Check CORS**: Ensure images are accessible (if on different domain)
- **Check Browser Console**: Look for image loading errors

### Search Not Working

- **Check Data**: Verify JSON files contain searchable content
- **Check Browser Console**: Look for JavaScript errors
- **Try Different Query**: Test with simple search terms

For more troubleshooting help, see [07-troubleshooting.md](07-troubleshooting.md).

## Next Steps

- **Explore Features**: See [05-features.md](05-features.md) for all available features
- **Build for Production**: See [06-building-deployment.md](06-building-deployment.md)
- **Get Help**: See [07-troubleshooting.md](07-troubleshooting.md) for common issues
