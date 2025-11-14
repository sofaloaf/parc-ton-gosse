# 🔧 Fix CORS Error - Step by Step

## Problem
Network tab shows CORS error - backend is blocking frontend requests.

---

## ✅ Step-by-Step Fix

### Step 1: Get Exact Frontend URL

1. **In Railway**, click on **frontend service** ("victorious-gentleness")
2. **Go to Settings → Networking**
3. **Copy your EXACT frontend URL** (e.g., `https://victorious-gentleness-production.up.railway.app`)
4. **Write it down** - we need it EXACTLY as shown

### Step 2: Check Current CORS_ORIGIN Value

1. **Click on backend service** ("parc-ton-gosse")
2. **Go to Variables tab**
3. **Find `CORS_ORIGIN` variable**
4. **Check the EXACT value:**
   - Does it match your frontend URL EXACTLY?
   - No trailing slash? (should NOT end with `/`)
   - Starts with `https://`?
   - No extra spaces?

**Common mistakes:**
- ❌ `https://victorious-gentleness-production.up.railway.app/` (trailing slash)
- ❌ `victorious-gentleness-production.up.railway.app` (missing https://)
- ❌ `https://victorious-gentleness-production.up.railway.app ` (trailing space)
- ✅ `https://victorious-gentleness-production.up.railway.app` (correct!)

### Step 3: Update CORS_ORIGIN (If Needed)

1. **Edit `CORS_ORIGIN` variable**
2. **Set it to your EXACT frontend URL:**
   ```
   https://victorious-gentleness-production.up.railway.app
   ```
   (Replace with your actual URL - NO trailing slash!)

3. **Click "Save"**

### Step 4: Verify Backend Redeployed

**After saving CORS_ORIGIN, backend MUST redeploy:**

1. **Go to Deployments tab** in backend service
2. **You should see a new deployment starting**
3. **Wait for it to show "Active"** (usually 2-3 minutes)
4. **If no deployment started:**
   - Make a small change to trigger it:
   - Or wait 1-2 minutes - Railway might be slow

### Step 5: Test Backend CORS Directly

**Test if backend allows your frontend origin:**

1. **Open a new browser tab**
2. **Go to your backend health endpoint:**
   ```
   https://parc-ton-gosse-production.up.railway.app/api/health
   ```
3. **Open Developer Tools** (F12)
4. **Go to Console tab**
5. **Run this command:**
   ```javascript
   fetch('https://parc-ton-gosse-production.up.railway.app/api/activities', {
     method: 'GET',
     credentials: 'include',
     headers: {
       'Content-Type': 'application/json'
     }
   })
   .then(r => r.json())
   .then(console.log)
   .catch(console.error)
   ```
6. **Check the result:**
   - If it works → CORS is fixed!
   - If you see CORS error → CORS_ORIGIN still wrong

### Step 6: Check Backend Logs

**See what origin the backend is receiving:**

1. **In Railway**, backend service → **Logs** tab
2. **Look for CORS-related messages**
3. **Check if backend is receiving requests from your frontend URL**

### Step 7: Clear Browser Cache

**Sometimes browser caches CORS errors:**

1. **Hard refresh:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Or clear cache:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Select "Cached images and files"
   - Clear

### Step 8: Test Frontend Again

1. **Wait 3-5 minutes** after updating CORS_ORIGIN
2. **Hard refresh** your frontend site (Ctrl+Shift+R)
3. **Check Network tab** again
4. **CORS error should be gone!**

---

## 🔍 Common CORS Issues

### Issue: URL Mismatch
**Problem:** CORS_ORIGIN doesn't match frontend URL exactly  
**Fix:** Copy frontend URL EXACTLY (no trailing slash, include https://)

### Issue: Backend Not Redeployed
**Problem:** Changed CORS_ORIGIN but backend hasn't restarted  
**Fix:** Wait for backend deployment to complete (check Deployments tab)

### Issue: Multiple Origins Needed
**Problem:** Testing from different URLs (localhost, production, etc.)  
**Fix:** Set CORS_ORIGIN to multiple origins separated by commas:
```
CORS_ORIGIN=https://victorious-gentleness-production.up.railway.app,http://localhost:5173
```

### Issue: Browser Cache
**Problem:** Browser cached the CORS error  
**Fix:** Hard refresh (Ctrl+Shift+R) or clear cache

---

## 📋 Quick Checklist

- [ ] Got exact frontend URL from Settings → Networking
- [ ] Checked CORS_ORIGIN value in backend Variables
- [ ] Updated CORS_ORIGIN to match frontend URL EXACTLY (no trailing slash)
- [ ] Saved CORS_ORIGIN variable
- [ ] Checked backend Deployments tab - new deployment started
- [ ] Waited for backend to show "Active" (2-3 minutes)
- [ ] Tested backend CORS directly (Step 5)
- [ ] Cleared browser cache / hard refresh
- [ ] Tested frontend again
- [ ] CORS error gone! ✅

---

## 🎯 Most Likely Fix

**The issue is usually one of these:**

1. **CORS_ORIGIN has trailing slash** → Remove it!
2. **Backend hasn't redeployed** → Wait for deployment to complete
3. **URL mismatch** → Copy frontend URL EXACTLY

**Do this:**
1. Copy your frontend URL EXACTLY from Settings → Networking
2. Set CORS_ORIGIN to that EXACT value (no trailing slash)
3. Save and wait for backend to redeploy
4. Hard refresh your frontend site

**What's your exact frontend URL? Share it and I'll help you set CORS_ORIGIN correctly!**

