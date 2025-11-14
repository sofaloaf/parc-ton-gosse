# 🔧 Fix Railway Start Command

## Issue: Server Starts But Doesn't Respond

**The problem might be the Start Command in Railway.**

---

## What I Just Fixed

**Updated `server/railway.json` to use the correct start command:**
- **Before:** `npm start` (might not work if not in root)
- **After:** `cd server && NODE_ENV=production node index.js`

**This ensures Railway runs the server from the correct directory.**

---

## Verify Railway Settings

**In Railway → lovely-perception → Backend Service → Settings:**

### Check Start Command

**Should be:**
```
cd server && NODE_ENV=production node index.js
```

**If it's different, update it to the above.**

### Check Root Directory

**Should be:**
- `server` (if your backend code is in server folder)
- Or empty/not set

**If wrong, set it correctly.**

---

## After Fix

1. **Wait 2 minutes** for Railway to redeploy
2. **Check new logs** - should see server starting
3. **Test endpoints:**
   - `https://parc-ton-gosse-production.up.railway.app/`
   - `https://parc-ton-gosse-production.up.railway.app/api/health`

---

## If Still Not Working

**Check Railway Service Settings:**

1. **Go to Settings → Deploy**
2. **Look for "Start Command"**
3. **Make sure it matches:** `cd server && NODE_ENV=production node index.js`
4. **Save if you changed it**

**Railway should auto-detect from `server/railway.json`, but you can also set it manually.**

---

**The fix is pushed. Wait for redeploy and test again!**

