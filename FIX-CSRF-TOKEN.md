# 🔧 Fix: CSRF Token Mismatch Error

## Problem

When trying to register, you get:
```
{"error":"CSRF token mismatch"}
```

## Root Cause

The CSRF cookie is set with `sameSite: 'strict'`, which prevents it from being sent in cross-origin requests. Since your frontend (`victorious-gentleness-production.up.railway.app`) and backend (`parc-ton-gosse-backend-production.up.railway.app`) are on different subdomains, the cookie isn't sent with the request.

## ✅ Fix Applied

Changed `sameSite` from `'strict'` to:
- **Production:** `'none'` (allows cross-origin cookies, requires `secure: true`)
- **Development:** `'lax'` (more permissive for local testing)

This allows the CSRF cookie to be sent in cross-origin requests.

---

## 🚀 Deploy

### Step 1: Commit and Push

```bash
git add .
git commit -m "Fix: CSRF cookie sameSite for cross-origin requests"
git push
```

### Step 2: Wait for Railway Auto-Deploy

Railway should automatically detect the push and redeploy the backend.

**OR manually redeploy:**
- Railway Dashboard → Backend Service → Deployments → Redeploy

### Step 3: Test Registration

After deployment:
1. **Go to your website**
2. **Try to register again**
3. **Should work now!** ✅

---

## 🔍 What Changed

**Before:**
```javascript
sameSite: 'strict'  // Cookie not sent in cross-origin requests
```

**After:**
```javascript
sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
// Production: 'none' allows cross-origin (requires secure: true)
// Development: 'lax' is more permissive
```

---

## ✅ Verification

After deployment, test:
1. **Open website**
2. **Try to register** with email and password
3. **Should succeed** without CSRF error ✅

---

**Deploy the backend fix and test registration!**

