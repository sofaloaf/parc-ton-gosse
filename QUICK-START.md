# Quick Start Guide

## 🚀 Fastest Way to Run the App

### Method 1: One Command (Recommended)

```bash
# From the project root directory:
npm start
```

This starts both servers and opens your browser automatically!

---

### Method 2: Shell Script

```bash
# Make it executable (first time only):
chmod +x start.sh

# Run it:
./start.sh
```

---

### Method 3: Manual (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd server
npm install  # First time only
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm install  # First time only
npm run dev
```

Then manually open: http://localhost:5173

---

## 📋 First Time Setup Checklist

Before running, make sure:

- [ ] **Backend dependencies installed:**
  ```bash
  cd server
  npm install
  ```

- [ ] **Client dependencies installed:**
  ```bash
  cd client
  npm install
  ```

- [ ] **Environment file configured:**
  - Create `server/.env` file
  - Set `DATA_BACKEND=sheets` (or `memory` for testing)
  - Add Google Sheets credentials if using Sheets

- [ ] **Google Sheet shared** (if using Sheets):
  - Share your Google Sheet with the service account email
  - Give it "Editor" permissions

---

## 🔍 Verify It's Working

Once started, you should see:

**Backend Console:**
```
Server listening on http://localhost:4000
```

**Frontend Console:**
```
VITE v5.4.21  ready in XXX ms
➜  Local:   http://localhost:5173/
```

**Browser:**
- Should automatically open to http://localhost:5173
- You should see the "Parc Ton Gosse" homepage

---

## 🛑 Stopping the Servers

**If using automated script:**
- Press `Ctrl+C` in the terminal
- Both servers will stop automatically

**If running manually:**
- Press `Ctrl+C` in each terminal window

---

## 🐛 Troubleshooting

**Port already in use?**
- Kill the process using the port:
  ```bash
  # For port 4000:
  lsof -ti:4000 | xargs kill -9
  
  # For port 5173:
  lsof -ti:5173 | xargs kill -9
  ```

**Can't connect to backend?**
- Make sure backend is running on port 4000
- Check `server/.env` has correct configuration
- Verify no errors in backend console

**Can't see the frontend?**
- Make sure client is running on port 5173
- Check `client/.env` has `VITE_API_URL=http://localhost:4000/api`
- Try clearing browser cache

---

## 📝 Next Steps

Once running:
1. **Test the API:** Visit http://localhost:4000/api/health
2. **Browse activities:** Use the search and filter on the homepage
3. **Create account:** Click "Profile" to sign up
4. **Add activities:** If logged in as provider/admin, use the dashboard

