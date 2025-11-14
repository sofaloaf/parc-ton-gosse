# 🚀 Railway Simple Setup - Skip Root Directory

## The Easy Way: Railway Auto-Detection

Railway is smart! It can auto-detect your setup. Here's the simplest approach:

---

## Step 1: Deploy Backend (Simplified)

1. **In Railway, create a new service:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `parc-ton-gosse`

2. **Railway will auto-detect:**
   - It sees `server/package.json`
   - It knows it's a Node.js project
   - It should automatically use the `server/` folder

3. **If it doesn't auto-detect correctly:**
   - Don't worry! We'll fix it with the start command

---

## Step 2: Configure Start Command

Instead of setting Root Directory, set the **Start Command**:

1. **Click on your backend service**
2. **Go to Settings tab**
3. **Find "Deploy" section**
4. **Look for "Start Command"** or **"Run Command"**
5. **Set it to:**
   ```
   cd server && npm start
   ```

This tells Railway to:
- Change to the `server/` directory
- Run `npm start`

---

## Step 3: Set Build Command (If Available)

Some Railway setups have a Build Command:

1. **In Settings → Deploy**
2. **Find "Build Command"**
3. **Set it to:**
   ```
   cd server && npm install
   ```

---

## Step 4: Set Environment Variables

This is the MOST IMPORTANT step:

1. **Click on your backend service**
2. **Go to "Variables" tab**
3. **Click "New Variable"**
4. **Add each variable from `RAILWAY-ENV-VARIABLES.md`**

**Required variables:**
- `NODE_ENV=production`
- `PORT=4000` (Railway might set this automatically)
- `JWT_SECRET=your-strong-secret`
- `CORS_ORIGIN=https://your-frontend-url.railway.app` (update after frontend deploy)
- `DATA_BACKEND=sheets`
- `GS_SERVICE_ACCOUNT=parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com`
- `GS_PRIVATE_KEY="your-private-key"`
- `GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0`

---

## Step 5: Generate Domain

1. **Go to Settings → Networking**
2. **Click "Generate Domain"**
3. **Copy the URL** (e.g., `https://parc-ton-gosse-backend-production.up.railway.app`)

---

## Alternative: Use Railway.json in Root

I've created a `railway.json` file in your root directory that tells Railway to:
- Change to `server/` folder
- Run `npm start`

Railway should automatically detect this file!

---

## ✅ What to Check

After deploying, check the **Deployments** tab:

1. **Click "Deployments"**
2. **Click on the latest deployment**
3. **Check the logs:**
   - Should see: `cd server && npm install`
   - Should see: `cd server && npm start`
   - Should see: `Server running on port 4000`

If you see errors about "package.json not found", the root directory isn't set correctly.

---

## 🆘 If It Still Doesn't Work

**Option 1: Use Railway CLI**
```bash
npm install -g @railway/cli
railway login
railway link
railway variables set RAILWAY_ROOT_DIRECTORY=server
```

**Option 2: Contact Railway Support**
- They're very helpful!
- Go to Railway dashboard → Help → Support

**Option 3: Create Separate Backend Repo**
- Create new GitHub repo: `parc-ton-gosse-backend`
- Copy only `server/` folder contents
- Deploy that repo (no root directory needed)

---

## 🎯 Most Important: Environment Variables

**Don't get stuck on Root Directory!** The most important thing is setting your environment variables correctly. Railway can often figure out the rest.

**Focus on:**
1. ✅ Setting environment variables
2. ✅ Getting the backend URL
3. ✅ Testing the backend (visit `/api/health`)

---

**Next:** Set your environment variables and test the backend!

