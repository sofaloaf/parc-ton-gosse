# Fix: Railway Backend Service Error

## 🔴 Error
```
npm error command sh -c serve -s dist -l 8080
```

This means Railway is trying to run a **frontend command** in your **backend service**.

## ✅ Solution

### Step 1: Check Backend Service Configuration

**In Railway Dashboard:**
1. Go to your **Backend Service** (`parc-ton-gosse-backend-production`)
2. Click **Settings** tab
3. Check these settings:

**Root Directory:**
- Should be: `server`
- **NOT:** `client` or empty

**Start Command:**
- Should be: `npm run start` (or `NODE_ENV=production node index.js`)
- **NOT:** `serve -s dist -l 8080` or any frontend command

**Build Command:**
- Should be: `npm install` (or empty, Railway auto-detects)
- **NOT:** `npm run build` (that's for frontend)

### Step 2: Fix the Configuration

**If Root Directory is wrong:**
1. In Railway Dashboard → Backend Service → **Settings**
2. Find **"Root Directory"** field
3. Set it to: `server`
4. Click **Save**

**If Start Command is wrong:**
1. In Railway Dashboard → Backend Service → **Settings**
2. Find **"Start Command"** field
3. Set it to: `npm run start`
   - OR: `cd server && NODE_ENV=production node index.js`
4. Click **Save**

**If Build Command is wrong:**
1. In Railway Dashboard → Backend Service → **Settings**
2. Find **"Build Command"** field
3. Set it to: `npm install` (or leave empty)
4. Click **Save**

### Step 3: Verify Configuration

**Backend Service Settings Should Be:**
```
Root Directory: server
Start Command: npm run start
Build Command: npm install (or empty)
```

### Step 4: Redeploy

After fixing settings:
1. Railway will automatically redeploy
2. OR manually trigger: **Deployments** → **Redeploy**

### Step 5: Check Logs

After redeploy, logs should show:
```
✅ Server listening on port 4000
✅ Data store initialized: sheets
```

**NOT:**
```
npm error command sh -c serve -s dist -l 8080
```

---

## 🔍 Alternative: Use railway.json

If Railway isn't reading your `railway.json` correctly, you can also set these in the dashboard:

**Backend Service:**
- Root Directory: `server`
- Start Command: `npm run start`
- Build Command: (empty or `npm install`)

**Frontend Service:**
- Root Directory: `client`
- Start Command: `npx serve -s dist -l $PORT`
- Build Command: `npm install && npm run build`

---

## 📋 Quick Checklist

- [ ] Backend service Root Directory = `server`
- [ ] Backend service Start Command = `npm run start`
- [ ] Backend service Build Command = `npm install` (or empty)
- [ ] Frontend service Root Directory = `client`
- [ ] Frontend service Start Command = `npx serve -s dist -l $PORT`
- [ ] Frontend service Build Command = `npm install && npm run build`

---

## 🎯 Expected Result

After fix:
- ✅ Backend logs show: `Server listening on port...`
- ✅ Backend logs show: `Data store initialized`
- ✅ No `serve -s dist` errors
- ✅ Backend health check works

---

**The issue is Railway configuration, not the code. Fix the Root Directory and Start Command in Railway dashboard!**

