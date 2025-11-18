# Fix Railway Backend Service Error

## 🔴 Error
```
npm error command sh -c serve -s dist -l 8080
```

Railway is trying to run the **frontend command** in your **backend service**.

## ✅ Solution

### The Problem
Railway is reading `client/railway.json` instead of the backend configuration. This happens when:
1. Root Directory is not set correctly
2. Railway auto-detects the wrong service type
3. There's no `server/railway.json` file

### Fix Applied
I've created `server/railway.json` with the correct backend configuration.

### Step 1: Verify Railway Settings

**In Railway Dashboard → Backend Service → Settings:**

**Root Directory:**
- Must be: `server`
- **NOT:** `client`, empty, or `/server`

**Start Command:**
- Should be: `npm run start` (or leave empty to use railway.json)
- **NOT:** `serve -s dist -l 8080`

**Build Command:**
- Should be: `npm install` (or leave empty)
- **NOT:** `npm run build`

### Step 2: Redeploy

**After fixing settings:**
1. Railway will auto-redeploy
2. OR: **Deployments** → **Redeploy**

### Step 3: Verify Logs

**After redeploy, you should see:**
```
✅ Server listening on port 8080
✅ Data store initialized: sheets
```

**NOT:**
```
npm error command sh -c serve -s dist -l 8080
```

---

## 📋 Railway Service Configuration

### Backend Service (`parc-ton-gosse-backend-production`)

**Settings:**
```
Root Directory: server
Start Command: (empty - uses server/railway.json)
Build Command: (empty - uses server/railway.json)
```

**OR manually set:**
```
Root Directory: server
Start Command: npm run start
Build Command: npm install
```

### Frontend Service (`victorious-gentleness-production`)

**Settings:**
```
Root Directory: client
Start Command: (empty - uses client/railway.json)
Build Command: (empty - uses client/railway.json)
```

---

## 🔍 What I Fixed

1. ✅ Created `server/railway.json` with correct backend commands
2. ✅ This ensures Railway uses the right config for backend service

---

## 🚀 Next Steps

1. **Verify Root Directory** in Railway dashboard = `server`
2. **Clear Start Command** (let it use `server/railway.json`)
3. **Redeploy backend service**
4. **Check logs** - should see server starting correctly

---

**The fix is applied. Just verify Root Directory = `server` in Railway and redeploy!**

