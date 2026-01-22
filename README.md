# gallery2-to-static
Generate a static copy of your Menalto Gallery 2 structure

## What
This script is meant to be used to create a static archive of a Gallery 2. It reads the database and
creates a static directory structure and HTML files to display the albums.

## Why
Since Menalto ceased development of the Gallery product it's almost impossible to maintain a secure
gallery. So the options are to convert to another gallery like Flikr or Piwig, or just create a
static dump of the current state. This does the latter.

## How
Copy `config_example.json` to `config.json` and edit it to your liking, then just run `index.ts`.

## Documentation

Comprehensive user documentation is available in the [frontend/docs/user-guides/](frontend/docs/user-guides/) directory:

- **[Getting Started](frontend/docs/user-guides/01-getting-started.md)** - Installation and first steps
- **[Configuration](frontend/docs/user-guides/02-configuration.md)** - Complete configuration reference
- **[Backend Usage](frontend/docs/user-guides/03-backend-usage.md)** - Running the conversion script
- **[Frontend Usage](frontend/docs/user-guides/04-frontend-usage.md)** - Using the gallery application
- **[Features](frontend/docs/user-guides/05-features.md)** - Detailed feature documentation
- **[Building & Deployment](frontend/docs/user-guides/06-building-deployment.md)** - Production build and deployment
- **[Troubleshooting](frontend/docs/user-guides/07-troubleshooting.md)** - Common issues and solutions

See [frontend/docs/user-guides/README.md](frontend/docs/user-guides/README.md) for the complete documentation index.

## Browser Support

The frontend application supports modern browsers with ES2020 support:

- **Desktop**: Chrome (80+), Firefox (75+), Safari (13.1+), Edge (80+)
- **Mobile**: iOS Safari (12.2+), Chrome Mobile (Android)

All CSS features (Grid, Flexbox, Custom Properties) and JavaScript features (async/await, IntersectionObserver) are natively supported in these browsers. The application includes graceful degradation for unsupported features.

For detailed browser support information, see [`__docs/browser-support.md`](__docs/browser-support.md).

## Does it really work?
Well, works for me.