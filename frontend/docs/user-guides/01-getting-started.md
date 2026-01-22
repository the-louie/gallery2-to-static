# Getting Started

This guide will help you get started with Gallery 2 to Static. You'll learn what you need before starting, how to install the software, and how to take your first steps.

## Prerequisites

Before you begin, make sure you have the following:

### Required Software

- **Node.js**: Version 14 or higher (check with `node --version`)
- **npm**: Usually comes with Node.js (check with `npm --version`)
- **MySQL Database Access**: You need access to your Gallery 2 MySQL database with:
  - Database host address
  - Database username
  - Database password (if required)
  - Database name
- **Gallery 2 Database**: Your Gallery 2 installation must be accessible via MySQL

### Optional but Recommended

- A text editor for editing configuration files
- Basic familiarity with command-line interfaces
- A web browser for viewing the gallery

## Installation

### Step 1: Get the Project

Download or clone the gallery2-to-static project to your computer.

### Step 2: Install Backend Dependencies

Navigate to the `backend` directory and install dependencies:

```bash
cd backend
npm install
```

This installs the MySQL database connection libraries needed for the conversion script.

### Step 3: Install Frontend Dependencies

Navigate to the `frontend` directory and install dependencies:

```bash
cd frontend
npm install
```

This installs React, Vite, and all other frontend dependencies.

### Step 4: Create Configuration File

Copy the example configuration file to create your own:

```bash
# From project root
cp backend/config_example.json backend/config.json
```

Then edit `backend/config.json` with your database connection details. See [02-configuration.md](02-configuration.md) for detailed configuration instructions.

## Directory Structure

After installation, your project structure should look like this:

```
gallery2-to-static/
├── backend/
│   ├── config.json          # Your configuration (create this)
│   ├── config_example.json  # Example configuration
│   ├── index.ts             # Backend conversion script
│   ├── package.json         # Backend dependencies
│   ├── types.ts             # Type definitions
│   └── sqlUtils.ts          # Database utilities
├── data/                    # Generated JSON files (created after conversion)
└── frontend/
    ├── package.json        # Frontend dependencies
    ├── vite.config.ts      # Build configuration
    ├── src/                # Source code
    └── docs/               # Documentation
```

## First Steps

### 1. Configure Database Connection

Edit `backend/config.json` and set your MySQL connection details:

```json
{
    "mysqlSettings": {
        "host": "127.0.0.1",
        "user": "your_username",
        "password": "your_password",
        "database": "gallery2"
    },
    ...
}
```

See [02-configuration.md](02-configuration.md) for complete configuration options.

### 2. Run the Conversion

Navigate to the backend directory and run the conversion script:

```bash
cd backend
npx ts-node index.ts
```

Or if you have TypeScript installed globally:

```bash
cd backend
ts-node index.ts
```

The script will:
- Connect to your MySQL database
- Read album and photo data
- Generate JSON files in the `../data/` directory (project root)
- Create one JSON file per album (named `{albumId}.json`)

**Note**: The script starts from album ID 7 by default. If your root album has a different ID, you'll need to modify `backend/index.ts`.

### 3. Verify Generated Data

Check that JSON files were created in the `./data/` directory:

```bash
ls data/
```

You should see files like `7.json`, `10.json`, etc., one for each album.

### 4. Start the Development Server

Navigate to the frontend directory and start the development server:

```bash
cd frontend
npm run dev
```

The server will start and display a URL (usually `http://localhost:5173`). Open this URL in your web browser.

### 5. View Your Gallery

You should now see your gallery in the browser:
- The home page shows the root album
- Click on albums to navigate into them
- Click on images to view them in full-screen lightbox
- Use the search bar to search for albums and images
- Try the theme switcher to toggle between light and dark modes

## Verifying Installation

To verify everything is working correctly:

1. **Backend**: Check that JSON files were generated in `./data/`
2. **Frontend**: Check that the development server starts without errors
3. **Browser**: Check that the gallery loads and displays albums/images
4. **Navigation**: Try clicking through albums and images
5. **Features**: Test search, filters, and theme switching

## Next Steps

Now that you have the basic setup working:

1. **Configure Options**: Review [02-configuration.md](02-configuration.md) for advanced configuration
2. **Learn Usage**: Read [03-backend-usage.md](03-backend-usage.md) and [04-frontend-usage.md](04-frontend-usage.md)
3. **Explore Features**: Check out [05-features.md](05-features.md) for all available features
4. **Deploy**: When ready, see [06-building-deployment.md](06-building-deployment.md) for deployment instructions

## Common First-Time Issues

If you encounter problems:

- **Database connection errors**: Verify your MySQL credentials in `backend/config.json`
- **No JSON files generated**: Check that the root album ID is correct (default is 7)
- **Frontend won't start**: Make sure you installed frontend dependencies (`cd frontend && npm install`)
- **Gallery shows "Root album not found"**: Verify that `7.json` exists in the `data/` directory, or check if your root album has a different ID

For more troubleshooting help, see [07-troubleshooting.md](07-troubleshooting.md).
