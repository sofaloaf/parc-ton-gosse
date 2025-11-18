# Fix: Frontend Using Wrong Backend URL

## 🔴 Problem

Frontend is calling:
- ❌ `https://parc-ton-gosse-production.up.railway.app/api/...` (404 - doesn't exist)

Should be calling:
- ✅ `https://parc-ton-gosse-backend-production.up.railway.app/api/...` (200 - works)

## Root Cause

The frontend is falling back to same-origin API (`/api` on the frontend URL) instead of using the correct backend URL.

## ✅ Solution

### Option 1: Set VITE_API_URL in Railway (Recommended)

**In Railway Dashboard → Frontend Service → Variables:**

Add/Update:
```env
VITE_API_URL=https://parc-ton-gosse-backend-production.up.railway.app/api
```

**Important:**
- Must include `/api` at the end
- No trailing slash after `/api`
- Exact URL: `https://parc-ton-gosse-backend-production.up.railway.app/api`

**After setting this, you MUST redeploy the frontend** (Vite bakes env vars at build time).

### Option 2: Fix Frontend Code Detection

The frontend code should detect Railway and use the correct backend, but it's falling back to same-origin. Let me check the detection logic.

---

## 🔍 Current Frontend URL Detection

The code checks:
```javascript
if (hostname.includes('victorious-gentleness') || hostname.includes('railway')) {
    cachedBaseUrl = PRODUCTION_API_URL; // Correct backend URL
}
```

**But if this doesn't match, it falls back to:**
```javascript
cachedBaseUrl = `${origin.replace(/\/$/, '')}/api`; // Same origin - WRONG!
```

---

## 🚀 Quick Fix

**Set `VITE_API_URL` in Railway frontend service variables:**
```
VITE_API_URL=https://parc-ton-gosse-backend-production.up.railway.app/api
```

**Then redeploy frontend service.**

---

## 📋 Steps

1. **Railway Dashboard** → **Frontend Service** → **Variables**
2. **Add/Update:**
   - Name: `VITE_API_URL`
   - Value: `https://parc-ton-gosse-backend-production.up.railway.app/api`
3. **Save**
4. **Redeploy Frontend** (Deployments → Redeploy)
5. **Test website** - should now use correct backend

---

**Set VITE_API_URL in Railway frontend variables and redeploy!**

