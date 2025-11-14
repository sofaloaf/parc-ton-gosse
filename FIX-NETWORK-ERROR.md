# 🔧 Fix: NetworkError - Frontend Can't Connect to Backend

## Problem
Your site loads but shows: **"NetworkError when attempting to fetch resource"**

This means the frontend can't connect to the backend API. This is usually a CORS or API URL configuration issue.

---

## ✅ Solution: Check and Fix Configuration

### Step 1: Get Your Frontend URL

1. **In Railway**, click on your **frontend service** ("victorious-gentleness")
2. **Go to Settings → Networking**
3. **Copy your frontend URL** (e.g., `https://victorious-gentleness-production.up.railway.app`)

### Step 2: Update Backend CORS_ORIGIN

**This is the most common issue!**

1. **Click on your backend service** ("parc-ton-gosse")
2. **Go to "Variables" tab**
3. **Find `CORS_ORIGIN` variable:**
   - If it exists, click to edit it
   - If it doesn't exist, click "New Variable"
4. **Set the value to your frontend URL:**
   ```
   CORS_ORIGIN=https://victorious-gentleness-production.up.railway.app
   ```
   **Replace with your actual frontend URL from Step 1!**
5. **Click "Save"**
6. **Wait 2-3 minutes** for backend to redeploy

### Step 3: Verify Frontend VITE_API_URL

1. **Go back to frontend service** ("victorious-gentleness")
2. **Go to "Variables" tab**
3. **Check `VITE_API_URL` is set to:**
   ```
   https://parc-ton-gosse-production.up.railway.app/api
   ```
   **Important:** Must include `/api` at the end!
4. **If it's wrong or missing:**
   - Click "New Variable" or edit existing
   - Name: `VITE_API_URL`
   - Value: `https://parc-ton-gosse-production.up.railway.app/api`
   - Save

**Note:** After changing `VITE_API_URL`, you need to redeploy the frontend for it to take effect!

### Step 4: Redeploy Frontend (if you changed VITE_API_URL)

If you changed `VITE_API_URL`:
1. **Go to Deployments tab**
2. **Click "Redeploy"** or make a small Git push:
   ```bash
   echo "// Update" >> client/src/App.jsx
   git add client/src/App.jsx
   git commit -m "Redeploy with correct API URL"
   git push
   ```

### Step 5: Test Backend Directly

**Verify backend is accessible:**
1. **Open in browser:**
   ```
   https://parc-ton-gosse-production.up.railway.app/api/health
   ```
2. **You should see:**
   ```json
   {"ok": true, "status": "healthy", ...}
   ```
3. **If this doesn't work**, backend might not be running properly

### Step 6: Test Frontend Again

1. **Wait 2-3 minutes** after updating CORS_ORIGIN
2. **Refresh your frontend site**
3. **Open browser Developer Tools** (F12)
4. **Go to "Console" tab**
5. **Look for errors:**
   - If you see CORS errors → CORS_ORIGIN not set correctly
   - If you see 404 errors → VITE_API_URL might be wrong
   - If you see network errors → Backend might be down

---

## 🔍 Common Issues & Fixes

### Issue: CORS Error in Browser Console
**Fix:** Make sure `CORS_ORIGIN` in backend exactly matches your frontend URL (including `https://`)

### Issue: 404 Not Found
**Fix:** Check `VITE_API_URL` includes `/api` at the end

### Issue: Backend Not Responding
**Fix:** 
- Check backend service is "Active" in Railway
- Visit backend URL directly: `https://parc-ton-gosse-production.up.railway.app/api/health`
- Check backend logs in Railway

### Issue: Frontend Still Shows Error After Fixes
**Fix:**
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Wait 3-5 minutes for both services to redeploy
- Check browser console for specific error messages

---

## 📋 Quick Checklist

- [ ] Got frontend URL from Settings → Networking
- [ ] Updated backend `CORS_ORIGIN` to frontend URL
- [ ] Verified frontend `VITE_API_URL` is `https://parc-ton-gosse-production.up.railway.app/api`
- [ ] Waited 2-3 minutes for backend to redeploy
- [ ] Redeployed frontend (if VITE_API_URL was changed)
- [ ] Tested backend directly: `/api/health` works
- [ ] Refreshed frontend site
- [ ] Checked browser console for errors
- [ ] Activities now load! ✅

---

## 🎯 Most Likely Fix

**90% of the time, this is a CORS issue:**

1. **Backend `CORS_ORIGIN`** must be set to your exact frontend URL
2. **Wait 2-3 minutes** after updating for backend to redeploy
3. **Refresh your site**

**Start with Step 2 - update the backend CORS_ORIGIN variable!**

