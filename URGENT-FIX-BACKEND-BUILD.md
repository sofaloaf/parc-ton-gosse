# URGENT: Fix Backend Build Failure

## The Problem

Backend is failing to build on Railway, which means:
- Old code might be running (without latest CORS fixes)
- New deployments aren't working
- Frontend can't connect properly

---

## Step 1: Check Build Error

**Go to:** Railway → `parc-ton-gosse-backend` → Deployments

**Click on the latest deployment** (should show red X or failed status)

**Check the logs** - look for:
- Build errors
- npm install errors
- Missing dependencies
- Script errors

**Share the error message** from the logs.

---

## Step 2: Common Build Issues

### Issue 1: Missing package.json in server/
**Error:** "Cannot find package.json"
**Fix:** Verify Root Directory is set to `server` (not `/server`)

### Issue 2: npm install failing
**Error:** "npm ERR!" or dependency errors
**Fix:** Check if all dependencies are in package.json

### Issue 3: Build script failing
**Error:** "npm run build" or "npm start" failing
**Fix:** Check package.json scripts

### Issue 4: Node version mismatch
**Error:** "Unsupported Node version"
**Fix:** Set NODE_VERSION in Railway variables

---

## Step 3: Verify Root Directory

**Go to:** Railway → `parc-ton-gosse-backend` → Settings

**Check:**
- **Root Directory:** Should be `server` (NO leading slash)
- **If it shows `/server`**, change to `server`

---

## Step 4: Check Build Command

**Go to:** Railway → `parc-ton-gosse-backend` → Settings

**Check:**
- **Build Command:** Should be empty or `npm install`
- **Start Command:** Should be `npm start` or `npm --prefix server run start`

**If using monorepo:**
- **Build Command:** `npm install`
- **Start Command:** `npm --prefix server run start`

---

## Step 5: Check package.json Scripts

**The server/package.json should have:**
```json
{
  "scripts": {
    "start": "NODE_ENV=production node index.js"
  }
}
```

---

## Step 6: Manual Redeploy

**After fixing settings:**

1. **Go to:** Deployments tab
2. **Click:** "Redeploy" or "Deploy Latest"
3. **Wait 3-5 minutes**
4. **Check logs** for success

---

## What to Share

**Please share:**
1. **The exact error message** from the failed deployment logs
2. **Root Directory** value (screenshot or text)
3. **Build Command** value (if set)
4. **Start Command** value (if set)

---

## Quick Fixes to Try

### Fix 1: Clear Root Directory
- Set Root Directory to: `server` (no slash)
- Redeploy

### Fix 2: Set Build Command
- Build Command: `npm install`
- Start Command: `npm --prefix server run start`
- Redeploy

### Fix 3: Check Node Version
- Add variable: `NODE_VERSION=20` (or `18`)
- Redeploy

---

**The build error message will tell us exactly what's wrong!**

---

**Last Updated:** $(date)

