# 🔧 Complete Backend Crash Fix

## ✅ Fixes Applied

1. ✅ **Better error handling** - Server won't crash on missing variables
2. ✅ **Fallback to memory backend** - If Google Sheets fails, uses memory
3. ✅ **JWT_SECRET warning** - Warns but doesn't crash
4. ✅ **Listen on 0.0.0.0** - Required for Railway
5. ✅ **Better error messages** - Tells you exactly what's missing

---

## 🚨 URGENT: Set Environment Variables

**The backend is crashing because environment variables are missing.**

### Step 1: Check Railway Logs

1. **Go to: Backend Service → Deployments → Latest → Logs**
2. **Look for error messages** (usually at the end)
3. **Copy the error** - this tells us what's missing

### Step 2: Set Minimum Required Variables

**In Railway → Backend Service → Variables Tab:**

**Add these 3 variables (minimum to get backend running):**

```
NODE_ENV=production
JWT_SECRET=iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=
DATA_BACKEND=memory
```

**This will get your backend running!** You can add Google Sheets later.

### Step 3: Wait for Redeploy

1. **Save the variables**
2. **Railway will automatically redeploy**
3. **Wait 1-2 minutes**
4. **Check Deployments tab for new deployment**

### Step 4: Test Backend

Visit: `https://parc-ton-gosse-production.up.railway.app/api/health`

Should see: `{"status":"ok"}` or `{"ok":true}`

---

## 🔧 If Using Google Sheets

**After backend is working, add these variables:**

```
DATA_BACKEND=sheets
GS_SERVICE_ACCOUNT=parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0
```

**Then update `DATA_BACKEND` from `memory` to `sheets`**

---

## 📋 Quick Fix Checklist

- [ ] Check Railway logs for error message
- [ ] Set `NODE_ENV=production`
- [ ] Set `JWT_SECRET` (required!)
- [ ] Set `DATA_BACKEND=memory` (for quick fix)
- [ ] Save variables
- [ ] Wait for redeploy
- [ ] Test `/api/health` endpoint
- [ ] Backend should work!

---

## 🆘 Common Errors

### Error: "JWT_SECRET must be set"
**Fix:** Set `JWT_SECRET` variable (see Step 2)

### Error: "Google Sheets credentials required"
**Fix:** Set `DATA_BACKEND=memory` (temporarily)

### Error: "Cannot find module"
**Fix:** Check build logs - `npm install` might have failed

### Error: "Port already in use"
**Fix:** Don't set PORT manually - Railway sets it automatically

---

## ✅ After Backend Works

1. **Test:** `https://parc-ton-gosse-production.up.railway.app/api/health`
2. **Deploy frontend** (see DEPLOY-FRONTEND-STEP-BY-STEP.md)
3. **Get your website URL!**

---

**Most important:** Set `JWT_SECRET` and `DATA_BACKEND=memory` - this will fix the crash!

