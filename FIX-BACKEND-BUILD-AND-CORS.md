# Fix Backend Build and CORS Issues

## Current Problems

1. **Backend failing to build** on Railway
2. **Frontend shows CORS errors** - "CORS Missing allow origin"
3. **Activities not loading**

---

## Root Cause

The backend service has **Root Directory = `server`**, which means Railway looks for `server/railway.json`. But the root `railway.json` has the correct monorepo build commands.

**Solution:** Delete `server/railway.json` so Railway uses the root config.

---

## Step 1: Delete server/railway.json

The `server/railway.json` has the wrong start command for a monorepo setup. We need to use the root `railway.json` instead.

**Action:** Delete `server/railway.json` file

---

## Step 2: Verify Root railway.json

**The root `railway.json` should have:**
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install --prefix server --omit=dev"
  },
  "deploy": {
    "startCommand": "npm --prefix server run start"
  }
}
```

**This is correct** ✅

---

## Step 3: Verify Root Directory

**Go to:** Railway → `parc-ton-gosse-backend` → Settings

**Check:**
- **Root Directory:** `server` (no leading slash)
- **If it shows `/server`**, change to `server`

---

## Step 4: Check Environment Variables

**Go to:** Railway → `parc-ton-gosse-backend` → Variables

**Verify these are set:**
- ✅ `CORS_ORIGIN` = `https://victorious-gentleness-production.up.railway.app`
- ✅ `GS_PRIVATE_KEY_BASE64` = (your base64 key, no quotes)
- ✅ `GS_SERVICE_ACCOUNT` = (your service account email)
- ✅ `GS_SHEET_ID` = (your sheet ID)
- ✅ `DATA_BACKEND` = `sheets`

---

## Step 5: Redeploy Backend

**After deleting `server/railway.json`:**

1. **Go to:** Railway → `parc-ton-gosse-backend` → Deployments
2. **Click:** "Redeploy" or "Deploy Latest"
3. **Wait 3-5 minutes**
4. **Check logs** - should show:
   ```
   📦 Initializing data store: sheets
   🔍 DEBUG: About to check environment variables...
   ✅ Using GS_PRIVATE_KEY_BASE64 (base64-encoded)
   ✅ Base64 key decoded successfully
   ```

---

## Step 6: Clear Frontend Cache

**The frontend might be cached with old code:**

1. **Open browser DevTools** (F12)
2. **Application tab** → **Storage** → **Clear site data**
3. **Hard refresh:** Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

---

## Step 7: Verify Frontend API URL

**The frontend should auto-detect the backend URL**, but verify:

1. **Open browser DevTools** (F12)
2. **Console tab**
3. **Type:** `window.location.hostname`
4. **Should show:** `victorious-gentleness-production.up.railway.app`

**The frontend code will automatically use:**
`https://parc-ton-gosse-backend-production.up.railway.app/api`

---

## What to Check After Fix

### Backend Logs Should Show:
```
✅ CORS configured for origins: https://victorious-gentleness-production.up.railway.app
✅ Server listening on port 8080
✅ Data backend: sheets
```

### Frontend Network Tab Should Show:
- `/api/activities` request → **200 OK**
- **Response headers** include: `access-control-allow-origin: https://victorious-gentleness-production.up.railway.app`
- **Response body** contains activity data

---

## If Still Not Working

**Share:**
1. **Backend deployment logs** (full startup logs)
2. **Frontend Network tab screenshot** (showing the failed request)
3. **Browser Console errors** (any red errors)

---

**First step: Delete `server/railway.json` and redeploy!**

---

**Last Updated:** $(date)

