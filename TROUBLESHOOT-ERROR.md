# 🔍 Troubleshoot Backend Error - Step by Step

## We Need More Information!

To fix the error, I need to know:

1. **What error message do you see?**
   - In the browser when visiting the backend URL?
   - In Railway logs?

2. **Did you set the environment variables?**
   - JWT_SECRET
   - DATA_BACKEND=memory
   - NODE_ENV=production

3. **What happens when you visit the health endpoint?**
   - `https://parc-ton-gosse-production.up.railway.app/api/health`

---

## Step 1: Check What Error You're Seeing

### Option A: Browser Error

**Visit:** `https://parc-ton-gosse-production.up.railway.app/api/health`

**What do you see?**
- "Application failed to respond"?
- A JSON response?
- A blank page?
- Something else?

**Copy the exact error message or take a screenshot.**

---

### Option B: Railway Logs Error

1. **Go to Railway Dashboard**
2. **Click on your backend service**
3. **Click "Deployments" tab**
4. **Click on the latest deployment**
5. **Scroll to "Logs" section**
6. **Look for RED error messages**
7. **Copy the error message**

---

## Step 2: Verify Environment Variables

1. **Go to Railway → Backend Service → Variables tab**
2. **Check if these variables exist:**

   - `JWT_SECRET` - Should have a value (at least 16 characters)
   - `DATA_BACKEND` - Should be `memory`
   - `NODE_ENV` - Should be `production`

3. **If any are missing, add them:**
   - Click "New Variable"
   - Add the name and value
   - Save

4. **If they exist but have wrong values, update them:**
   - Click on the variable
   - Update the value
   - Save

---

## Step 3: Check Latest Deployment

1. **Go to Railway → Backend Service → Deployments tab**
2. **Look at the latest deployment:**
   - Status: "Active" or "Failed"?
   - When was it deployed? (should be recent)
   - Any error messages?

3. **If deployment failed:**
   - Click on it
   - Check the logs
   - Copy the error

---

## Step 4: Test Health Endpoint

**Open a new browser tab and visit:**
```
https://parc-ton-gosse-production.up.railway.app/api/health
```

**What do you see?**

### If you see JSON:
```json
{
  "ok": true,
  "status": "healthy",
  ...
}
```
**✅ Backend is working!** The issue might be with a different endpoint.

### If you see "Application failed to respond":
**❌ Backend is crashing.** Check Railway logs for the error.

### If you see something else:
**Copy the exact message and share it.**

---

## Step 5: Check Railway Logs (Detailed)

1. **Railway Dashboard → Backend Service**
2. **Click "Deployments" tab**
3. **Click on the latest deployment**
4. **Scroll down to see all logs**
5. **Look for:**
   - Error messages (usually in red or with "Error:" prefix)
   - "Failed to" messages
   - "Cannot" messages
   - Any stack traces

6. **Copy the last 20-30 lines of logs** (especially any errors)

---

## Common Errors and Fixes

### Error: "Application failed to respond"
**Cause:** Server is crashing on startup
**Fix:** Check Railway logs for the actual error

### Error: "JWT_SECRET must be set"
**Fix:** Set `JWT_SECRET` variable in Railway

### Error: "Invalid JWT Signature" (Google Sheets)
**Fix:** Set `DATA_BACKEND=memory` to avoid Google Sheets

### Error: "Cannot find module"
**Fix:** Check build logs - npm install might have failed

### Error: "Port already in use"
**Fix:** Don't set PORT manually - Railway sets it automatically

### Error: "Environment validation error"
**Fix:** Check which variable is failing and set it correctly

---

## Quick Test Commands

**If you have curl installed, test from terminal:**
```bash
curl https://parc-ton-gosse-production.up.railway.app/api/health
```

**Or use your browser's developer console:**
1. Open browser developer tools (F12)
2. Go to "Console" tab
3. Type: `fetch('https://parc-ton-gosse-production.up.railway.app/api/health').then(r => r.json()).then(console.log)`
4. Press Enter
5. See what it returns

---

## What to Share With Me

**Please share:**

1. **The exact error message** (from browser or logs)
2. **Screenshot** (if possible)
3. **Railway logs** (last 20-30 lines, especially errors)
4. **What you see** when visiting `/api/health`
5. **Environment variables** you've set (just the names, not values)

**This will help me fix it immediately!**

---

## Emergency: Use Memory Backend

**If nothing works, try this:**

1. **In Railway → Backend → Variables:**
   - Set `DATA_BACKEND=memory`
   - Set `JWT_SECRET=iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=`
   - Set `NODE_ENV=production`
   - **Remove or ignore** all `GS_*` variables

2. **Save and wait for redeploy**

3. **Test:** `https://parc-ton-gosse-production.up.railway.app/api/health`

**This should work!**

