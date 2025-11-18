# Fix: Frontend Needs Rebuild Even With Correct VITE_API_URL

## The Problem

Even though `VITE_API_URL` is set correctly in Railway, the frontend is still using the wrong URL:
- ❌ `https://parc-ton-gosse-production.up.railway.app/api/activities`
- ✅ Should be: `https://parc-ton-gosse-backend-production.up.railway.app/api/activities`

## Why This Happens

**Vite environment variables are baked into the build at BUILD TIME.**

Even if you set `VITE_API_URL` correctly now, if the frontend was built BEFORE you set it correctly, the old (wrong) value is still in the built files.

**Solution: Rebuild the frontend** so it picks up the correct environment variable.

---

## Step 1: Verify VITE_API_URL is Set

**Go to:** Railway → Frontend service → Variables

**Verify:**
- `VITE_API_URL` = `https://parc-ton-gosse-backend-production.up.railway.app/api`
- **Or** it's empty (code will auto-detect)

**If it's wrong or missing**, fix it first.

---

## Step 2: Force Rebuild Frontend

**Go to:** Railway → Frontend service → Deployments

**Click:** "Redeploy" or "Deploy Latest"

**This will:**
1. Rebuild the frontend with the current environment variables
2. Bake `VITE_API_URL` into the build
3. Deploy the new build

**Wait 3-5 minutes** for deployment to complete.

---

## Step 3: Clear Browser Cache

**After deployment:**

1. **Open DevTools** (F12)
2. **Application tab** → **Storage** → **Clear site data**
3. **Hard refresh:** Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

**This ensures you're not seeing cached old files.**

---

## Step 4: Verify It's Fixed

**Check Network tab:**
1. Refresh the page
2. Look for `/api/activities` request
3. **URL should be:** `https://parc-ton-gosse-backend-production.up.railway.app/api/activities`
4. **Status should be:** `200 OK`
5. **Activities should load!**

---

## Alternative: Check if Frontend is Using Runtime Override

**In browser console, type:**
```javascript
window.__PTG_API_URL__
```

**If this returns a value**, that's overriding the build-time variable. This would be set in the HTML or by some script.

**To check what URL is actually being used:**
```javascript
// In browser console
fetch('/api/activities').then(r => console.log('URL:', r.url))
```

---

## Why Rebuild is Necessary

Vite replaces `import.meta.env.VITE_API_URL` at BUILD TIME, not runtime. So:

1. **Old build** → Has wrong URL baked in → Uses wrong URL
2. **New build** → Has correct URL baked in → Uses correct URL

**Even if the environment variable is correct now, you need to rebuild!**

---

## Quick Checklist

- [ ] Verify `VITE_API_URL` is correct in Railway
- [ ] Redeploy frontend (forces rebuild)
- [ ] Wait for deployment to complete
- [ ] Clear browser cache
- [ ] Test - activities should load!

---

**The key is: REBUILD the frontend so it picks up the correct environment variable!**

---

**Last Updated:** $(date)

