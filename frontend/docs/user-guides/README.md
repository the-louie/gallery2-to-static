# User Guides

Welcome to the Gallery 2 to Static user documentation. This guide will help you set up, configure, and use the gallery conversion tool and the resulting static gallery application.

## Overview

Gallery 2 to Static is a tool that converts your Menalto Gallery 2 database into a static, modern web gallery. The tool consists of two parts:

1. **Backend Conversion Script**: Reads data from your Gallery 2 MySQL database and generates JSON files
2. **Frontend Gallery Application**: A modern React-based web application that displays your gallery from the generated JSON files

## Documentation Structure

This documentation is organized into the following guides:

### Getting Started
- **[01-getting-started.md](01-getting-started.md)** - Prerequisites, installation, and first steps

### Configuration
- **[02-configuration.md](02-configuration.md)** - Complete configuration file reference

### Usage
- **[03-backend-usage.md](03-backend-usage.md)** - Running the backend conversion script
- **[04-frontend-usage.md](04-frontend-usage.md)** - Using the frontend gallery application

### Features
- **[05-features.md](05-features.md)** - Detailed feature documentation (search, filters, themes, lightbox, etc.)

### Deployment
- **[06-building-deployment.md](06-building-deployment.md)** - Building and deploying the application

### Troubleshooting
- **[07-troubleshooting.md](07-troubleshooting.md)** - Common issues and solutions

## Quick Start

1. **Install dependencies**: Install Node.js dependencies for both backend and frontend
2. **Configure**: Create `backend/config.json` from `backend/config_example.json` and configure your database connection
3. **Convert**: Run the backend script to generate JSON files from your Gallery 2 database
4. **View**: Start the frontend development server to view your gallery
5. **Deploy**: Build the frontend and deploy to a static hosting service

For detailed instructions, see [01-getting-started.md](01-getting-started.md).

## Who Is This Documentation For?

This documentation is designed for:

- **Gallery Administrators**: People who want to convert their Gallery 2 installation to a static archive
- **End Users**: People who want to use the generated static gallery application
- **Developers**: People who need to understand the system for customization or troubleshooting

## Additional Resources

- **Technical Documentation**: See `../architecture.md`, `../bundle-optimization.md`, and `../performance-testing.md` for technical details
- **Testing Documentation**: See `../../TESTING.md` for testing information
- **Project README**: See `../../../README.md` for project overview

## Getting Help

If you encounter issues not covered in the troubleshooting guide, please:

1. Check the [troubleshooting guide](07-troubleshooting.md) for common solutions
2. Review the relevant configuration or usage documentation
3. Check browser console for error messages
4. Verify your configuration file matches the examples

## Documentation Updates

This documentation is maintained alongside the codebase. If you find errors or have suggestions for improvement, please contribute updates.
