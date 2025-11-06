# 🔧 Fix Backend - Exact Steps

## Issues Found in Logs

1. ❌ **JWT_SECRET not set or too short** - "JWT_SECRET length must be at least 16 characters long"
2. ❌ **DATA_BACKEND is "sheets"** - Should be "memory" to avoid Google Sheets errors
3. ✅ **Server IS starting** - "Server listening on port 8080" (Good!)

---

## ✅ Fix: Set Environment Variables

### In Railway → Backend Service → Variables Tab:

**Update/Add these 3 variables:**

1. **JWT_SECRET:**
   ```
   Name: JWT_SECRET
   Value: iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=
   ```
   (This is 44 characters - more than enough!)

2. **DATA_BACKEND:**
   ```
   Name: DATA_BACKEND
   Value: memory
   ```
   (Change from "sheets" to "memory")

3. **NODE_ENV:**
   ```
   Name: NODE_ENV
   Value: production
   ```

**Save all variables and wait 2 minutes for Railway to redeploy.**

---

## ✅ After Fix

**Test the health endpoint:**
```
https://parc-ton-gosse-production.up.railway.app/api/health
```

**You should see:**
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2025-11-06T...",
  "dataStore": true
}
```

**✅ If you see this, backend is working!**

---

## Why This Will Work

1. **JWT_SECRET** - Server needs this for authentication (currently missing/too short)
2. **DATA_BACKEND=memory** - Avoids Google Sheets errors (Google disabled your key)
3. **Server is already starting** - Just needs the right variables!

---

## Quick Checklist

- [ ] Set `JWT_SECRET` = `iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=`
- [ ] Set `DATA_BACKEND` = `memory` (change from "sheets")
- [ ] Set `NODE_ENV` = `production`
- [ ] Save variables
- [ ] Wait 2 minutes for redeploy
- [ ] Test `/api/health` endpoint
- [ ] Should work! ✅

---

**The server is already running - just needs the right environment variables!**

