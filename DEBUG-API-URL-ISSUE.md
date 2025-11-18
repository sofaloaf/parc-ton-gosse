# 🔍 Debug: Frontend Still Calling Wrong API URL

## Problem

Frontend is still calling:
- ❌ `https://parc-ton-gosse-production.up.railway.app/api/...` (404)

Should be calling:
- ✅ `https://parc-ton-gosse-backend-production.up.railway.app/api/...` (200)

## 🔍 Debug Steps

### Step 1: Check Browser Console

Open browser console (F12) and look for these messages:

**Expected messages:**
```
🔧 Runtime API URL override set: https://parc-ton-gosse-backend-production.up.railway.app/api
🔍 API URL Resolution Debug:
   hostname: victorious-gentleness-production.up.railway.app
   origin: https://victorious-gentleness-production.up.railway.app
   window.__PTG_API_URL__: https://parc-ton-gosse-backend-production.up.railway.app/api
   import.meta.env.VITE_API_URL: https://parc-ton-gosse-backend-production.up.railway.app/api
✅ API URL resolved from runtime override: https://parc-ton-gosse-backend-production.up.railway.app/api
```

**If you see:**
- `window.__PTG_API_URL__: undefined` → Script file not loading
- `⚠️ Falling back to same-origin API` → Detection logic failed

### Step 2: Check Network Tab

1. Open DevTools → Network tab
2. Filter by "api-url-override.js"
3. Check if the file loads (status 200)
4. If 404, the file isn't being served

### Step 3: Verify Script File is Deployed

Test in browser:
```
https://victorious-gentleness-production.up.railway.app/api-url-override.js
```

Should return the JavaScript code (not 404).

### Step 4: Check Built HTML

The built `dist/index.html` should include:
```html
<script src="/api-url-override.js"></script>
```

If it doesn't, the frontend needs to be rebuilt.

---

## 🚨 Possible Issues

### Issue 1: Script File Not Loading
**Symptom:** `window.__PTG_API_URL__` is `undefined` in console

**Fix:**
- Verify script file exists in `client/public/api-url-override.js`
- Verify it's accessible at deployed URL
- Check Railway build logs to ensure `public/` folder is copied

### Issue 2: Old Build Deployed
**Symptom:** Built `dist/index.html` doesn't have script tag

**Fix:**
- Force rebuild in Railway
- Clear Railway build cache
- Redeploy

### Issue 3: Browser Cache
**Symptom:** Old JavaScript bundle still running

**Fix:**
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear all site data: DevTools → Application → Clear Storage

### Issue 4: Wrong Frontend Service
**Symptom:** Requests going to `parc-ton-gosse-production` instead of `victorious-gentleness-production`

**Fix:**
- Verify you're visiting the correct frontend URL
- Check Railway dashboard for which service is actually deployed

---

## ✅ Quick Test

Open browser console and run:
```javascript
console.log('Override:', window.__PTG_API_URL__);
console.log('VITE:', import.meta.env.VITE_API_URL);
console.log('Hostname:', window.location.hostname);
```

**Expected output:**
```
Override: https://parc-ton-gosse-backend-production.up.railway.app/api
VITE: https://parc-ton-gosse-backend-production.up.railway.app/api
Hostname: victorious-gentleness-production.up.railway.app
```

---

**Please check browser console and share what you see!**

