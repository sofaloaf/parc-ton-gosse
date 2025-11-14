# 🚨 URGENT: Debug Backend Crash

## Problem
Backend URL shows "Application failed to respond" - server is crashing on startup.

---

## ✅ Fixes Applied

1. ✅ Made data store initialization non-blocking (server starts even if data store fails)
2. ✅ Added better error logging
3. ✅ Health check endpoint works even without data store
4. ✅ Added fallback error handling

---

## 🔍 STEP 1: Check Railway Logs (REQUIRED!)

**We need to see the actual error to fix it!**

### Quick Steps:
1. **Railway Dashboard** → Your Project → Backend Service
2. **Click "Deployments" tab**
3. **Click latest deployment** (top of list)
4. **Scroll down to "Logs" section**
5. **Look for RED error messages**
6. **Copy the error message**
7. **Share it with me!**

**See `CHECK-RAILWAY-LOGS.md` for detailed step-by-step guide with screenshots.**

---

## 🔧 STEP 2: Set Minimum Environment Variables

**While checking logs, also set these variables:**

### In Railway → Backend Service → Variables Tab:

```
NODE_ENV=production
JWT_SECRET=iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=
DATA_BACKEND=memory
```

**These 3 variables are the minimum to get backend running.**

---

## 🔧 STEP 3: Common Fixes Based on Error

### If Error: "JWT_SECRET must be set"
**Fix:** Set `JWT_SECRET` variable (see Step 2)

### If Error: "Cannot find module"
**Fix:** 
- Check build logs
- Make sure `npm install` completed
- Railway should handle this automatically

### If Error: "Google Sheets credentials required"
**Fix:** Set `DATA_BACKEND=memory` (see Step 2)

### If Error: "SyntaxError" or code error
**Fix:** Share the error - I'll fix the code

### If Error: "Port already in use"
**Fix:** Don't set PORT manually - Railway sets it automatically

---

## 🧪 STEP 4: Test After Fixes

1. **Save environment variables**
2. **Wait 1-2 minutes for Railway to redeploy**
3. **Check Deployments tab for new deployment**
4. **Test:** `https://parc-ton-gosse-production.up.railway.app/api/health`
5. **Should see:** `{"ok":true,"status":"healthy",...}`

---

## 📋 Quick Action Items

- [ ] Check Railway logs for error message
- [ ] Copy error message and share with me
- [ ] Set `NODE_ENV=production`
- [ ] Set `JWT_SECRET` (see value above)
- [ ] Set `DATA_BACKEND=memory`
- [ ] Save variables
- [ ] Wait for redeploy
- [ ] Test `/api/health` endpoint

---

## 🆘 Still Not Working?

**Share:**
1. The error message from Railway logs
2. Screenshot of the error (if possible)
3. What you see in the Variables tab

**I'll fix it immediately once I see the error!**

---

## 💡 Why This Happens

The backend is crashing because:
- Missing environment variables (most common)
- Code error (syntax error, import error)
- Build failure (npm install failed)
- Port conflict (unlikely on Railway)

**The logs will tell us exactly what's wrong!**

