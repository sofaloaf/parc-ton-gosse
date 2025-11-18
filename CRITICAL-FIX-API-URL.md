# 🚨 CRITICAL: Fix Frontend API URL - IMMEDIATE FIX APPLIED

## ✅ What I Just Fixed

I've added a **runtime override** in `client/index.html` that will work **immediately** without rebuilding:

```html
<script>
  window.__PTG_API_URL__ = 'https://parc-ton-gosse-backend-production.up.railway.app/api';
</script>
```

This sets the API URL before React loads, so it will work right away.

---

## 🚀 Next Steps

### 1. Redeploy Frontend in Railway

**The HTML change needs to be deployed:**

1. **Commit and push** the changes (or Railway will auto-deploy if connected to GitHub)
2. **Or manually redeploy** in Railway:
   - Railway Dashboard → Frontend Service → Deployments → Redeploy

### 2. Clear Browser Cache

After redeploy:
- **Hard refresh:** `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- **Or clear cache:** DevTools → Application → Clear Storage → Clear site data

### 3. Verify It Works

After redeploy and cache clear, check browser console:
```
🔧 Runtime API URL override set: https://parc-ton-gosse-backend-production.up.railway.app/api
🔍 API URL resolved from runtime override: https://parc-ton-gosse-backend-production.up.railway.app/api
```

Network tab should show requests to:
```
https://parc-ton-gosse-backend-production.up.railway.app/api/activities ✅
```

NOT:
```
https://parc-ton-gosse-production.up.railway.app/api/activities ❌
```

---

## 🔍 Also Set VITE_API_URL (For Future Builds)

**In Railway → Frontend Service → Variables:**

Add:
```
VITE_API_URL=https://parc-ton-gosse-backend-production.up.railway.app/api
```

This ensures future builds have the correct URL baked in.

---

## ✅ What Changed

1. **`client/index.html`** - Added runtime script that sets API URL before React loads
2. **`client/src/shared/api.js`** - Improved Railway domain detection logic

---

**Redeploy frontend now and clear browser cache!**

