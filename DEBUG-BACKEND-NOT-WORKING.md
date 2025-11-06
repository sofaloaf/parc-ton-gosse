# 🔍 Debug Backend Not Working

## What Error Do You See?

**When you visit:** `https://parc-ton-gosse-production.up.railway.app/api/health`

**What happens?**
- "Application failed to respond"?
- Blank page?
- Error message?
- Something else?

**Please share the exact error message or what you see.**

---

## Step 1: Check Railway Logs

**This is the most important step!**

1. **Go to Railway Dashboard**
2. **Click on your backend service**
3. **Click "Deployments" tab**
4. **Click on the latest deployment**
5. **Scroll down to "Logs" section**
6. **Look for:**
   - Error messages (usually in red)
   - "Failed" messages
   - Stack traces
   - Any warnings

7. **Copy the last 30-50 lines of logs** (especially any errors)

**Share the logs with me - this will tell us exactly what's wrong!**

---

## Step 2: Verify Environment Variables

**In Railway → Backend Service → Variables Tab:**

**Check if these exist and have correct values:**

1. **JWT_SECRET:**
   - Should exist
   - Value should be: `iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=`
   - Should be at least 16 characters

2. **DATA_BACKEND:**
   - Should exist
   - Value should be: `memory`

3. **NODE_ENV:**
   - Should exist
   - Value should be: `production`

**If any are missing or wrong, fix them and save.**

---

## Step 3: Check Deployment Status

**In Railway → Backend Service → Deployments Tab:**

1. **Look at the latest deployment:**
   - Status: "Active" (green) or "Failed" (red)?
   - When was it deployed? (should be recent)

2. **If status is "Failed":**
   - Click on it
   - Check the logs
   - Copy the error

3. **If status is "Active":**
   - The server should be running
   - Check the logs for any runtime errors

---

## Step 4: Test Different Endpoints

**Try these URLs:**

1. **Health endpoint:**
   ```
   https://parc-ton-gosse-production.up.railway.app/api/health
   ```

2. **Root endpoint:**
   ```
   https://parc-ton-gosse-production.up.railway.app/
   ```

3. **Activities endpoint:**
   ```
   https://parc-ton-gosse-production.up.railway.app/api/activities
   ```

**What do you see for each?**
- Same error for all?
- Different errors?
- Some work, some don't?

---

## Step 5: Check Build Logs

**In Railway → Backend Service → Deployments → Latest:**

1. **Look for "Build" section** (before runtime logs)
2. **Check if build succeeded:**
   - Should see: "Build completed successfully"
   - Should NOT see: "Build failed" or errors

3. **If build failed:**
   - Copy the build error
   - Common issues:
     - `npm install` failed
     - Missing dependencies
     - Syntax errors

---

## Common Issues & Fixes

### Issue 1: "Application failed to respond"
**Cause:** Server is crashing on startup
**Fix:** Check Railway logs for the error

### Issue 2: "Cannot find module"
**Cause:** Build failed or dependencies missing
**Fix:** Check build logs, make sure `npm install` completed

### Issue 3: "JWT_SECRET must be set"
**Cause:** JWT_SECRET not set or too short
**Fix:** Set `JWT_SECRET` variable in Railway

### Issue 4: "Port already in use"
**Cause:** PORT variable set incorrectly
**Fix:** Don't set PORT manually - Railway sets it automatically

### Issue 5: "Invalid JWT Signature" (Google Sheets)
**Cause:** Google Sheets credentials invalid
**Fix:** Set `DATA_BACKEND=memory` to avoid Google Sheets

### Issue 6: Server starts but health endpoint doesn't work
**Cause:** Route not registered or CORS issue
**Fix:** Check server logs, verify routes are loaded

---

## Quick Test: Use curl or Browser Console

**If you have curl installed:**
```bash
curl https://parc-ton-gosse-production.up.railway.app/api/health
```

**Or use browser console (F12):**
```javascript
fetch('https://parc-ton-gosse-production.up.railway.app/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**This will show you the exact response or error.**

---

## What to Share With Me

**Please share:**

1. **Exact error message** (from browser or curl)
2. **Railway logs** (last 30-50 lines, especially errors)
3. **Deployment status** (Active or Failed?)
4. **Environment variables** you've set (just the names, not values)
5. **What you see** when visiting the health endpoint

**With this information, I can fix it immediately!**

---

## Emergency: Try Memory Backend Only

**If nothing works, try this minimal setup:**

1. **In Railway → Backend → Variables:**
   - Delete ALL variables
   - Add ONLY these 3:
     - `NODE_ENV=production`
     - `JWT_SECRET=iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=`
     - `DATA_BACKEND=memory`

2. **Save and wait 2-3 minutes**

3. **Check deployment logs** - should see server starting

4. **Test health endpoint**

**This minimal setup should work. If it doesn't, the issue is with Railway or the code itself.**

---

**Most important: Share the Railway logs - that will tell us exactly what's wrong!**

