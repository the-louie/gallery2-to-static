# Features

This guide provides detailed documentation for all features available in the frontend gallery application.

## Search

The search feature allows you to find albums and images by searching their titles and descriptions.

### Accessing Search

The search bar is located in the header at the top of every page. It's always visible and accessible.

### How to Search

1. Click in the search bar or use keyboard focus
2. Type your search query
3. Results appear automatically as you type (debounced)
4. Press Enter to navigate to search results
5. Click the X button to clear the search

### What Gets Searched

Search looks through:
- Album titles
- Album descriptions
- Image titles
- Image descriptions

### Search Results

- **Results Page**: Navigate to `/search?q=your-query`
- **Highlighted Matches**: Matching text is highlighted in results
- **Click to Navigate**: Click any result to go to that album or image
- **Clear Search**: Clear the search bar to return to browsing

### Search Tips

- Search is case-insensitive
- Partial matches are supported
- Multiple words are searched independently
- Empty search clears results and returns to home

## Filters

The filter panel allows you to filter albums and images by various criteria.

### Accessing Filters

The filter panel appears on the home page and album detail pages. It can be collapsed/expanded using the toggle button.

### Filter Types

#### Type Filter

Filter by item type:
- **All**: Show both albums and images
- **Albums Only**: Show only albums
- **Images Only**: Show only images

#### Date Range Filter

Filter items by creation date:
- **Start Date**: Earliest date to include
- **End Date**: Latest date to include
- **Clear Dates**: Remove date filter

### Using Filters

1. Open the filter panel
2. Select filter options
3. Results update automatically
4. Use filter badges to see active filters
5. Click "Clear All Filters" to remove all filters

### Filter Badges

Active filters are shown as badges:
- Each badge shows the filter type and value
- Click a badge to remove that specific filter
- Badges update as you change filters

### Filter Combinations

Multiple filters can be active simultaneously:
- Type filter + Date range filter
- All filters work together (AND logic)
- Clear individual filters or all at once

## Sorting

The sort dropdown allows you to organize albums and images in different ways.

### Accessing Sort

The sort dropdown appears on album detail pages. It's typically located near the view mode toggle.

### Sort Options

Available sort options:

- **Date (Newest First)**: Most recent items first
- **Date (Oldest First)**: Oldest items first
- **Name (A-Z)**: Alphabetical order
- **Name (Z-A)**: Reverse alphabetical order
- **Size (Smallest First)**: Smallest images first (by dimensions)
- **Size (Largest First)**: Largest images first (by dimensions)

### Using Sort

1. Open the sort dropdown
2. Select a sort option
3. Items reorganize immediately
4. Sort persists as you navigate

### Sort Interactions

- **With Filters**: Sort applies to filtered results
- **With Search**: Sort applies to search results
- **View Modes**: Sort works in both grid and list views

## View Modes

View modes control how albums and images are displayed.

### Available View Modes

#### Grid View

- Items displayed in a responsive grid
- Thumbnails shown for images
- Album cards with preview images
- Optimized for visual browsing

#### List View

- Items displayed in a vertical list
- More information visible per item
- Compact layout
- Optimized for text-based browsing

### Switching View Modes

1. Find the view mode toggle (grid/list icons)
2. Click the desired view mode
3. Layout updates immediately
4. Preference is saved per content type

### View Mode Preferences

- **Separate Preferences**: Albums and images have separate view mode preferences
- **Persistent**: Your preference is saved and remembered
- **Per Content Type**: Grid for albums, list for images (or vice versa)

## Lightbox (Image Viewing)

The lightbox provides full-screen image viewing with advanced features.

### Opening the Lightbox

Click on any image thumbnail to open it in the lightbox.

### Lightbox Features

#### Image Display

- **Full-Screen**: Image displayed in modal overlay
- **Progressive Loading**: Thumbnail loads first, then full image
- **Loading States**: Visual feedback during image loading
- **Error Handling**: Graceful error display if image fails to load

#### Navigation

- **Previous/Next Buttons**: Click to navigate between images
- **Keyboard Arrows**: Use Left/Right arrow keys
- **Image Counter**: Shows current position (e.g., "3 of 15")
- **Disabled States**: Buttons disabled at first/last image

#### Zoom and Pan

- **Zoom In/Out Buttons**: Click to zoom
- **Mouse Wheel**: Ctrl/Cmd + scroll to zoom
- **Touch Pinch**: Pinch to zoom on mobile
- **Pan**: Drag to pan when zoomed
- **Reset Zoom**: Button to return to fit-to-screen
- **Zoom Limits**: 100% to 400% zoom range

#### Image Information

- **Title**: Image title displayed
- **Description**: Image description (if available)
- **Dimensions**: Image width × height
- **Date**: Formatted creation date

#### Closing the Lightbox

- **Close Button**: Click X button
- **Backdrop Click**: Click outside the image
- **Escape Key**: Press Escape
- **Touch Swipe**: Swipe up/down on mobile (when not zoomed)

### Keyboard Shortcuts

- **Arrow Left**: Previous image
- **Arrow Right**: Next image
- **Escape**: Close lightbox
- **Ctrl/Cmd + Mouse Wheel**: Zoom in/out
- **Tab**: Navigate between controls

### Touch Gestures (Mobile)

- **Swipe Left/Right**: Navigate between images (when not zoomed)
- **Swipe Up/Down**: Close lightbox (when not zoomed)
- **Pinch**: Zoom in/out
- **Drag**: Pan when zoomed

### Lightbox Behavior

- **Focus Management**: Focus trapped within lightbox
- **Body Scroll Lock**: Prevents background scrolling
- **Accessibility**: Full ARIA support for screen readers
- **Responsive**: Adapts to screen size

## Breadcrumb Navigation

Breadcrumbs show your current location in the album hierarchy.

### Understanding Breadcrumbs

Breadcrumbs display the path from the root album to the current album:
- **Home** → **Vacation** → **2024** → **Beach Photos**

### Using Breadcrumbs

- **Click to Navigate**: Click any breadcrumb to go to that album
- **Current Location**: Last item shows current page (not clickable)
- **Home Link**: First item links to home page

### Breadcrumb Display

- **Hidden on Home**: Breadcrumbs hidden on home page (only one level)
- **Visible on Albums**: Shown on all album detail pages
- **Semantic HTML**: Proper navigation structure for accessibility

## Themes

The theme system allows you to customize the appearance of the gallery.

### Available Themes

- **Light Mode**: Light background, dark text
- **Dark Mode**: Dark background, light text
- **System Mode**: Follows your operating system preference

### Accessing Theme Switcher

The theme switcher is located in the header, next to the search bar.

### Switching Themes

1. Click the theme switcher button
2. Theme cycles: Light → Dark → System → Light
3. Change applies immediately
4. Preference is saved

### Theme Features

- **Persistent**: Your preference is saved in browser storage
- **System Detection**: System mode detects OS theme preference
- **Smooth Transitions**: Theme changes animate smoothly
- **All Pages**: Theme applies to entire application

### Theme Icons

- **Sun Icon**: Light mode
- **Moon Icon**: Dark mode
- **Monitor Icon**: System mode

## Virtual Scrolling

For large albums with many items, virtual scrolling improves performance.

### What Is Virtual Scrolling?

Virtual scrolling only renders visible items, improving performance for large lists.

### When It Activates

Virtual scrolling automatically activates for:
- Large albums (hundreds or thousands of items)
- Both grid and list views
- Smooth scrolling experience

### Benefits

- **Faster Loading**: Only visible items rendered
- **Smooth Scrolling**: No lag with large datasets
- **Lower Memory**: Reduced memory usage
- **Better Performance**: Improved frame rates

### User Experience

- **Transparent**: Works automatically, no user action needed
- **Smooth**: Seamless scrolling experience
- **Responsive**: Adapts to scroll speed

## Responsive Design

The application adapts to different screen sizes and devices.

### Desktop Layout

- **Wide Grid**: Multiple columns for albums/images
- **Full Features**: All features available
- **Mouse Navigation**: Optimized for mouse interaction
- **Keyboard Support**: Full keyboard navigation

### Tablet Layout

- **Adaptive Grid**: Fewer columns, larger items
- **Touch Optimized**: Larger touch targets
- **All Features**: Full feature set available
- **Orientation Support**: Works in portrait and landscape

### Mobile Layout

- **Single Column**: Stacked layout
- **Touch Gestures**: Swipe navigation
- **Collapsible Panels**: Filters and panels can collapse
- **Optimized Controls**: Larger buttons and touch targets

### Responsive Features

- **Flexible Grid**: Adapts to screen width
- **Responsive Images**: Images scale appropriately
- **Touch Gestures**: Mobile-optimized interactions
- **Viewport Adaptation**: Works on all screen sizes

## Accessibility

The application includes comprehensive accessibility features.

### Keyboard Navigation

- **Tab Navigation**: Navigate all interactive elements
- **Enter/Space**: Activate buttons and links
- **Arrow Keys**: Navigate lightbox images
- **Escape**: Close modals and clear inputs

### Screen Reader Support

- **ARIA Labels**: Descriptive labels for all controls
- **Semantic HTML**: Proper HTML structure
- **Focus Indicators**: Clear focus indicators
- **Alt Text**: Images have descriptive alt text

### Visual Accessibility

- **High Contrast**: Themes support high contrast
- **Focus Indicators**: Clear focus states
- **Color Independence**: Information not conveyed by color alone
- **Text Alternatives**: Text alternatives for icons

## Performance Features

Several features improve application performance.

### Lazy Loading

- **Images**: Images load as they come into view
- **Components**: Components load on demand
- **Routes**: Pages load when navigated to

### Progressive Image Loading

- **Thumbnail First**: Thumbnail loads quickly
- **Full Image**: Full image loads progressively
- **Blur Effect**: Smooth transition from thumbnail to full image

### Image Caching

- **Browser Cache**: Images cached by browser
- **Memory Cache**: Frequently viewed images cached in memory
- **Reduced Requests**: Cached images don't re-download

### Code Splitting

- **Route-Based**: Each route loads separately
- **Vendor Chunks**: Libraries in separate bundles
- **Faster Initial Load**: Only necessary code loads first

## Next Steps

- **Build and Deploy**: See [06-building-deployment.md](06-building-deployment.md)
- **Troubleshooting**: See [07-troubleshooting.md](07-troubleshooting.md) if you encounter issues
