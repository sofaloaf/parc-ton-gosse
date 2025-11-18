# 🚨 URGENT: Fix Frontend API URL

## Problem

Frontend is calling **WRONG** backend URL:
- ❌ `https://parc-ton-gosse-production.up.railway.app/api/...` (404 - doesn't exist)

Should be calling:
- ✅ `https://parc-ton-gosse-backend-production.up.railway.app/api/...` (200 - works)

## Root Cause

The frontend is falling back to same-origin API (`/api` on frontend URL) instead of using the correct backend URL.

## ✅ Solution: Set VITE_API_URL in Railway

**This is the BEST fix** - it bakes the correct URL into the frontend at build time.

### Steps:

1. **Go to Railway Dashboard**
2. **Click on Frontend Service** (the one serving the website)
3. **Go to Variables tab**
4. **Add/Update this variable:**
   ```
   Name: VITE_API_URL
   Value: https://parc-ton-gosse-backend-production.up.railway.app/api
   ```
   **Important:**
   - Must include `/api` at the end
   - No trailing slash after `/api`
   - Exact URL: `https://parc-ton-gosse-backend-production.up.railway.app/api`

5. **Save**
6. **Redeploy Frontend Service** (Deployments → Redeploy latest)

---

## 🔍 Also Check CORS_ORIGIN

Make sure the backend allows your frontend URL:

**In Railway → Backend Service → Variables:**

Check `CORS_ORIGIN` includes your frontend URL:
```
CORS_ORIGIN=https://victorious-gentleness-production.up.railway.app,https://parc-ton-gosse-production.up.railway.app
```

(Add both URLs if you have multiple frontend services)

---

## After Fix

After setting `VITE_API_URL` and redeploying:

1. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Reload website**
3. **Check browser console** - should see:
   ```
   🔍 API URL resolved from VITE_API_URL: https://parc-ton-gosse-backend-production.up.railway.app/api
   ```
4. **Network tab** - should show requests to:
   ```
   https://parc-ton-gosse-backend-production.up.railway.app/api/activities
   ```

---

## Quick Test

After redeploy, test in browser console:
```javascript
fetch('https://parc-ton-gosse-backend-production.up.railway.app/api/health')
  .then(r => r.json())
  .then(console.log)
```

Should return: `{"status":"ok",...}`

---

**Set VITE_API_URL in Railway frontend variables and redeploy!**

