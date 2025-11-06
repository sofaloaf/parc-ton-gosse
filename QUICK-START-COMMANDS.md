# Quick Start Commands

## One-Time Setup (First Time Only)

### 1. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

---

## Start the Application

### Option 1: Automated Start (Recommended) 🚀

From the **root directory**:

```bash
# Mac/Linux
./start.sh

# OR using npm
npm start

# OR using Node directly
node start.js
```

This will:
- ✅ Start backend server on port 4000
- ✅ Start frontend client on port 5173
- ✅ Automatically open browser
- ✅ Both servers run in same terminal

**To stop:** Press `Ctrl+C`

---

### Option 2: Manual Start

#### Terminal 1 - Backend:
```bash
cd server
npm run dev
```

Server will start on: **http://localhost:4000**

#### Terminal 2 - Frontend:
```bash
cd client
npm run dev
```

Client will start on: **http://localhost:5173**

**To stop each:** Press `Ctrl+C` in each terminal

---

## Quick Reference

### Start Everything
```bash
npm start
```

### Start Backend Only
```bash
cd server && npm run dev
```

### Start Frontend Only
```bash
cd client && npm run dev
```

### Install Dependencies
```bash
# Server
cd server && npm install

# Client
cd client && npm install

# Both at once
cd server && npm install && cd ../client && npm install
```

### Check Server Status
```bash
curl http://localhost:4000/api/health
```

### Test API
```bash
curl http://localhost:4000/api/activities | python3 -m json.tool | head -20
```

---

## Troubleshooting

### "Command not found: npm"
Install Node.js from https://nodejs.org

### "Port already in use"
```bash
# Kill processes on ports 4000 or 5173
# Mac/Linux
lsof -ti:4000 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Or restart your computer
```

### "Dependencies not found"
```bash
cd server && npm install
cd ../client && npm install
```

### "Cannot find module"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Server starts but no data
- Check if Google Sheets connection is configured
- Look at `server/.env` file
- Check server logs for errors

---

## Environment Setup

### Server Configuration

Create `server/.env`:
```env
PORT=4000
CORS_ORIGIN=http://localhost:5173
DATA_BACKEND=sheets

# Google Sheets (your data)
GS_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0

# Optional: Google Maps Geocoding
GOOGLE_MAPS_API_KEY=your-api-key-here
```

### Client Configuration

Create `client/.env`:
```env
VITE_API_URL=http://localhost:4000/api
```

---

## URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000/api
- **Health Check:** http://localhost:4000/api/health
- **Activities:** http://localhost:4000/api/activities

---

## Common Workflows

### Daily Development
```bash
npm start
```

### Add New Dependencies
```bash
# Server
cd server && npm install package-name

# Client
cd client && npm install package-name
```

### Debug Server
```bash
cd server
npm run dev
# Watch terminal for errors
```

### Debug Client
```bash
cd client
npm run dev
# Open browser console (F12) for errors
```

### Production Build
```bash
# Build client
cd client && npm run build

# Serve production files
npm run preview
```

---

## File Structure

```
parc-ton-gosse/
├── server/              # Backend Node.js API
│   ├── .env            # Server configuration
│   ├── index.js        # Main server file
│   ├── package.json    # Server dependencies
│   └── ...
├── client/             # Frontend React app
│   ├── .env           # Client configuration
│   ├── package.json   # Client dependencies
│   └── ...
├── start.js            # Automated startup script
├── start.sh            # Shell startup script
└── package.json        # Root package.json
```

---

## Got Questions?

1. **Check logs** - Look at terminal output
2. **Check browser console** - F12 for frontend errors
3. **Check server logs** - Terminal running `npm run dev`
4. **Test API** - Use curl commands above
5. **Review docs** - README.md, QUICK-START.md

---

**Ready to go? Run:** `npm start`

