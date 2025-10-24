# Node.js Installation Instructions

## Option 1: Download from Official Website (Recommended)

1. Visit the official Node.js website: https://nodejs.org/
2. Download the LTS version (recommended for most users)
3. Run the installer and follow the installation wizard
4. Restart your terminal/PowerShell after installation

## Option 2: Using Chocolatey (if you have it installed)

```powershell
choco install nodejs
```

## Option 3: Using winget (Windows Package Manager)

```powershell
winget install OpenJS.NodeJS
```

## Verify Installation

After installation, restart your terminal and run:

```powershell
node --version
npm --version
```

Both commands should return version numbers if installed correctly.

## Next Steps

Once Node.js is installed, you can run the dashboard:

```powershell
cd "c:\Users\anant\OneDrive\Documents\GitHub\DLB Dashboard"
npm install
npm run dev
```

The dashboard will be available at http://localhost:8080