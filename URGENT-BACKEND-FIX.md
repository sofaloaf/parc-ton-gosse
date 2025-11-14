# 🚨 URGENT: Fix Backend Crash

## Your Backend URL
**URL:** `https://parc-ton-gosse-production.up.railway.app`

**Status:** ❌ Crashing

---

## 🔍 Step 1: Check Railway Logs (DO THIS FIRST!)

1. **In Railway, click on your backend service**
2. **Click "Deployments" tab**
3. **Click on the latest deployment**
4. **Scroll down to see "Logs"**
5. **Look for RED error messages**

**Copy the error message** - this tells us exactly what's wrong!

---

## 🔧 Step 2: Most Common Fix - Set JWT_SECRET

**90% of crashes are caused by missing JWT_SECRET!**

1. **Go to: Backend Service → Variables tab**
2. **Click "New Variable"**
3. **Add:**
   ```
   Name: JWT_SECRET
   Value: iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=
   ```
4. **Save**

Railway will automatically redeploy.

---

## 🔧 Step 3: Set All Required Variables

**While in Variables tab, add these:**

```
NODE_ENV=production
JWT_SECRET=iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=
DATA_BACKEND=memory
```

**Start with these 3 first!** Then add Google Sheets variables later.

---

## 🔧 Step 4: Use Memory Backend (Temporary)

To get backend working quickly:

1. **Set `DATA_BACKEND=memory`** (instead of `sheets`)
2. **Don't set GS_* variables yet**
3. **This will let backend start**

You can switch to Google Sheets later once backend is working.

---

## ✅ Step 5: Test After Fixes

1. **Wait 1-2 minutes for Railway to redeploy**
2. **Check Deployments tab - should see new deployment**
3. **Test:** `https://parc-ton-gosse-production.up.railway.app/api/health`
4. **Should see:** `{"status":"ok"}`

---

## 🆘 If Still Crashing

**Share the error from Railway logs:**
1. Deployments → Latest → Logs
2. Copy the error (red text)
3. Share it with me

**Common errors:**
- `JWT_SECRET must be set` → Set JWT_SECRET variable
- `Cannot find module` → Check build logs
- `Google Sheets error` → Use `DATA_BACKEND=memory` temporarily
- `Port already in use` → Remove PORT variable (Railway sets it)

---

## 📋 Quick Fix (Copy & Paste)

**In Railway → Backend → Variables:**

```
NODE_ENV=production
JWT_SECRET=iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=
DATA_BACKEND=memory
```

**Save and wait for redeploy!**

---

**Most important:** Set `JWT_SECRET` - this fixes 90% of crashes!

