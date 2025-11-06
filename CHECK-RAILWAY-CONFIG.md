# 🔍 Check Railway Configuration

## Server Starts But Doesn't Respond - Check These Settings

---

## Step 1: Check Start Command

**In Railway → lovely-perception → Backend Service → Settings:**

**Look for "Start Command" or "Deploy" section:**

**Should be one of:**
- `cd server && NODE_ENV=production node index.js`
- `npm start` (if package.json has start script)
- `node server/index.js`

**If it's wrong, update it to:**
```
cd server && NODE_ENV=production node index.js
```

---

## Step 2: Check Root Directory

**In Railway → lovely-perception → Backend Service → Settings:**

**Look for "Root Directory":**

**Should be:**
- `server` (if your backend code is in server folder)
- Or empty/not set (if using root)

**If wrong, set it to:** `server`

---

## Step 3: Check Build Command

**In Railway → lovely-perception → Backend Service → Settings:**

**Look for "Build Command":**

**Should be:**
- `cd server && npm install --omit=dev`
- Or `npm install` (if in root)

---

## Step 4: Check Health Check Settings

**In Railway → lovely-perception → Backend Service → Settings:**

**Look for "Health Check" or "Health Probe":**

1. **Is it enabled?**
2. **What endpoint is it checking?**
   - Should be: `/api/health` or `/`
3. **What's the timeout?**
   - Should be at least 30 seconds

**If health check is failing, try:**
- Disable it temporarily
- Or set it to: `/api/health`
- Or increase timeout

---

## Step 5: Check Port Configuration

**In Railway → lovely-perception → Backend Service → Variables:**

**Check if PORT is set:**
- **If PORT is set manually:** DELETE it
- **Railway sets PORT automatically**
- **Don't set PORT manually**

---

## Step 6: Verify Service is Actually Running

**In Railway → lovely-perception → Backend Service:**

1. **Check "Metrics" tab:**
   - Is CPU usage showing?
   - Is memory usage showing?
   - This confirms the service is running

2. **Check "Deployments" tab:**
   - Latest deployment status: "Active"?
   - When was it deployed?

---

## Common Railway Configuration Issues

### Issue 1: Wrong Start Command
**Problem:** Railway is running the wrong command
**Fix:** Set Start Command to: `cd server && NODE_ENV=production node index.js`

### Issue 2: Wrong Root Directory
**Problem:** Railway can't find your code
**Fix:** Set Root Directory to: `server`

### Issue 3: Health Check Failing
**Problem:** Railway thinks server is unhealthy
**Fix:** Disable health check or set to `/api/health`

### Issue 4: Port Conflict
**Problem:** PORT variable set incorrectly
**Fix:** Delete PORT variable (Railway sets it automatically)

---

## Quick Fix: Verify All Settings

**In Railway → lovely-perception → Backend Service → Settings:**

1. **Root Directory:** `server` (or empty if root)
2. **Start Command:** `cd server && NODE_ENV=production node index.js`
3. **Build Command:** `cd server && npm install --omit=dev`
4. **Health Check:** Disabled or `/api/health`
5. **Port:** Not set (Railway handles it)

---

## Alternative: Use Railway.json

**I've created `server/railway.json` - Railway should use this automatically.**

**Check if Railway is using it:**
- Look in deployment logs
- Should see Railway reading the config

---

## What to Check Now

1. ✅ **Start Command** - Is it correct?
2. ✅ **Root Directory** - Is it set correctly?
3. ✅ **Health Check** - Is it configured?
4. ✅ **Port** - Is it set manually? (Shouldn't be)
5. ✅ **Metrics** - Is the service actually running?

---

**Share what you find in these settings and I'll help fix it!**

