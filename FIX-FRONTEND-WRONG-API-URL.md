# Fix: Frontend Using Wrong Backend URL

## The Problem

**Frontend is trying to connect to:**
- ❌ `https://parc-ton-gosse-production.up.railway.app/api/activities` (WRONG - missing "backend")

**Should be:**
- ✅ `https://parc-ton-gosse-backend-production.up.railway.app/api/activities` (CORRECT)

**Status code 502** means that wrong URL doesn't exist or isn't running.

---

## The Fix

The frontend code is correct, but either:
1. **`VITE_API_URL` environment variable is set incorrectly** in Railway
2. **Frontend was built with old/wrong environment variable** and needs to be rebuilt

---

## Step 1: Check Frontend Environment Variables

**Go to:** Railway → Frontend service (`victorious-gentleness-production`) → Variables

**Check for:**
- **Variable:** `VITE_API_URL`
- **If it exists**, check its value:
  - ❌ **Wrong:** `https://parc-ton-gosse-production.up.railway.app/api`
  - ✅ **Correct:** `https://parc-ton-gosse-backend-production.up.railway.app/api`
  - ✅ **Or:** Leave it **empty** (code will auto-detect)

**Action:**
- **If `VITE_API_URL` is set to the wrong URL**, either:
  - **Delete it** (recommended - let code auto-detect)
  - **Or change it to:** `https://parc-ton-gosse-backend-production.up.railway.app/api`

---

## Step 2: Redeploy Frontend

**After fixing the environment variable:**

1. **Go to:** Railway → Frontend service → Deployments
2. **Click:** "Redeploy" or "Deploy Latest"
3. **Wait 3-5 minutes** for deployment

**This will rebuild the frontend with the correct API URL.**

---

## Step 3: Verify After Deployment

**After redeploy:**

1. **Clear browser cache:**
   - DevTools → Application → Storage → Clear site data
   - Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

2. **Check Network tab:**
   - Look for `/api/activities` request
   - **URL should be:** `https://parc-ton-gosse-backend-production.up.railway.app/api/activities`
   - **Status should be:** `200 OK`

3. **Activities should load!**

---

## Why This Happened

Vite environment variables (`VITE_*`) are **baked into the build** at build time. If `VITE_API_URL` was set to the wrong value when the frontend was built, it will use that wrong value until you rebuild.

**Solution:** Fix the environment variable and rebuild.

---

## Quick Checklist

- [ ] Check `VITE_API_URL` in Railway frontend variables
- [ ] Delete it (or set to correct URL)
- [ ] Redeploy frontend
- [ ] Clear browser cache
- [ ] Test - activities should load!

---

**The backend is working perfectly - we just need to fix the frontend's API URL!**

---

**Last Updated:** $(date)

