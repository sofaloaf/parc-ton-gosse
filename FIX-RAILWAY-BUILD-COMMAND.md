# Fix Railway Build Command Error

## 🔴 Current Issue

**Railway Settings:**
- Root Directory: `server` ✅
- Build Command: `npm run build` ❌ **WRONG**
- Start Command: `npm start` ✅

**Error:**
```
npm error command sh -c serve -s dist -l 8080
```

## ✅ Solution

### The Problem
`npm run build` in the backend tries to run the build script, which just echoes a message. But Railway might be detecting it as a frontend service or trying to run the wrong command.

### Fix in Railway Dashboard

**Go to Railway Dashboard → Backend Service → Settings:**

1. **Build Command:**
   - **Change from:** `npm run build`
   - **Change to:** `npm install`
   - **OR:** Leave it **empty** (Railway will use `server/railway.json`)

2. **Start Command:**
   - **Keep as:** `npm start`
   - **OR:** Leave it **empty** (Railway will use `server/railway.json`)

3. **Save** and **Redeploy**

---

## 📋 Correct Settings

### Backend Service:
```
Root Directory: server
Build Command: npm install (or empty)
Start Command: npm start (or empty)
```

### What Each Does:

**Build Command: `npm install`**
- Installs all dependencies
- This is what Railway needs to do before starting

**Start Command: `npm start`**
- Runs: `NODE_ENV=production node index.js`
- Starts the backend server

---

## 🚀 After Fix

**Redeploy and check logs - you should see:**
```
✅ Server listening on port 8080
✅ Data store initialized: sheets
```

**NOT:**
```
npm error command sh -c serve -s dist -l 8080
```

---

## 🔍 Why This Happens

Railway might be:
1. Auto-detecting the service type incorrectly
2. Reading the wrong package.json
3. Using cached configuration

**Solution:** Explicitly set Build Command to `npm install` (not `npm run build`)

---

**Change Build Command from `npm run build` to `npm install` in Railway dashboard!**

