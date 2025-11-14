# 🔍 Debug: NetworkError - Check Network Tab

## Issue
- CORS_ORIGIN is set correctly ✅
- Still getting NetworkError ❌
- Console tab shows nothing (this is normal - check Network tab instead!)

---

## ✅ Debugging Steps

### Step 1: Check Network Tab (Not Console!)

**The error is in the Network tab, not Console!**

1. **Open Developer Tools** (F12)
2. **Click "Network" tab** (not Console!)
3. **Refresh your page** (F5 or Ctrl+R)
4. **Look for failed requests:**
   - Find requests to `/api/activities` or your backend URL
   - They might be red/failed
   - Click on them to see details

5. **Check the failed request:**
   - What's the URL it's trying to reach?
   - What's the status code? (404, 500, CORS error?)
   - What's the error message?

**This will tell us exactly what's wrong!**

### Step 2: Verify VITE_API_URL is Correct

**Important:** If you set `VITE_API_URL` AFTER deploying, the frontend needs to be rebuilt!

1. **In Railway**, go to frontend service → **Variables** tab
2. **Check `VITE_API_URL`** is set to:
   ```
   https://parc-ton-gosse-production.up.railway.app/api
   ```
   (Must include `/api` at the end!)

3. **If it's correct but still not working:**
   - The frontend was built BEFORE you set this variable
   - You need to **redeploy the frontend** for it to take effect!

### Step 3: Redeploy Frontend

**After setting/changing VITE_API_URL, you MUST redeploy:**

**Option A: Via Railway**
1. Go to **Deployments** tab
2. Click **"Redeploy"** button (or "..." menu → Redeploy)
3. Wait for deployment to complete

**Option B: Via Git Push**
```bash
cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"
echo "// Trigger redeploy" >> client/src/App.jsx
git add client/src/App.jsx
git commit -m "Redeploy frontend with API URL"
git push
```

### Step 4: Test Backend Directly

**Verify backend is working:**

1. **Open in browser:**
   ```
   https://parc-ton-gosse-production.up.railway.app/api/health
   ```
   
2. **You should see:**
   ```json
   {"ok": true, "status": "healthy", ...}
   ```

3. **Test activities endpoint:**
   ```
   https://parc-ton-gosse-production.up.railway.app/api/activities
   ```
   
   **You should see:** `[]` (empty array) or activities data

**If these don't work, backend might have issues!**

### Step 5: Check What URL Frontend is Using

**In Network tab, check the actual request URL:**

1. **Open Network tab**
2. **Refresh page**
3. **Find the request to `/activities`**
4. **Check the full URL:**
   - Should be: `https://parc-ton-gosse-production.up.railway.app/api/activities`
   - If it's something else (like `http://localhost:4000`), VITE_API_URL isn't set correctly!

---

## 🔍 Common Issues

### Issue: Network Tab Shows Request to `localhost:4000`
**Problem:** VITE_API_URL not set or frontend not redeployed  
**Fix:** Set VITE_API_URL and redeploy frontend

### Issue: Network Tab Shows 404
**Problem:** Backend URL might be wrong  
**Fix:** Check VITE_API_URL includes `/api` at the end

### Issue: Network Tab Shows CORS Error
**Problem:** CORS_ORIGIN might not match exactly  
**Fix:** Double-check CORS_ORIGIN matches frontend URL exactly (including `https://`)

### Issue: Network Tab Shows "Failed to fetch" or "NetworkError"
**Problem:** Backend might be down or unreachable  
**Fix:** Test backend directly (Step 4 above)

---

## 📋 Quick Checklist

- [ ] Opened Network tab (not Console!)
- [ ] Refreshed page and checked failed requests
- [ ] Verified VITE_API_URL is set correctly
- [ ] Redeployed frontend after setting VITE_API_URL
- [ ] Tested backend directly (`/api/health` works)
- [ ] Checked Network tab shows correct backend URL
- [ ] Activities now load! ✅

---

## 🎯 Most Likely Issue

**If you set `VITE_API_URL` AFTER the frontend was deployed, it won't work until you redeploy!**

The frontend was built with the old API URL (or no URL). You need to rebuild it.

**Do this:**
1. Check Network tab to see what URL it's trying
2. If it's wrong, verify VITE_API_URL is set
3. Redeploy frontend
4. Check again

**Start with Step 1 - check the Network tab and tell me what URL you see in the failed request!**

