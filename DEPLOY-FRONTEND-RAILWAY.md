# 🚀 Deploy Frontend to Railway

## Prerequisites

✅ **Backend must be deployed and working first!**
- Backend URL: `https://parc-ton-gosse-production.up.railway.app`
- Backend health check: `https://parc-ton-gosse-production.up.railway.app/api/health`

---

## Step 1: Create New Frontend Service in Railway

### Option A: Add Service to Existing Project (Recommended)

1. **Go to Railway → lovely-perception project**
2. **Click "+ New" button** (top right)
3. **Select "GitHub Repo"**
4. **Select your repository:** `sofaloaf/parc-ton-gosse`
5. **Railway will detect it's a monorepo**

### Option B: Create New Project

1. **Go to Railway Dashboard**
2. **Click "+ New Project"**
3. **Select "GitHub Repo"**
4. **Select your repository:** `sofaloaf/parc-ton-gosse`
5. **Railway will create a new project**

---

## Step 2: Configure Frontend Service

### 2.1 Set Root Directory

1. **Click on the new frontend service**
2. **Go to Settings** (top right)
3. **Find "Root Directory" field**
4. **Set it to:** `client`

### 2.2 Set Build Command

**In Settings → Build Command:**
```
npm install && npm run build
```

**Or leave empty** - Railway will auto-detect from `package.json`

### 2.3 Set Start Command

**In Settings → Start Command:**
```
npx serve -s dist -l $PORT
```

**This serves the built frontend files**

### 2.4 Set Environment Variables

**In Settings → Variables tab, add:**

```
VITE_API_URL=https://parc-ton-gosse-production.up.railway.app/api
NODE_ENV=production
```

**Important:** Replace `parc-ton-gosse-production.up.railway.app` with your actual backend URL!

---

## Step 3: Generate Public URL

1. **Go to the frontend service**
2. **Click "Settings"**
3. **Go to "Networking" tab**
4. **Click "Generate Domain"**
5. **Railway will create a public URL like:**
   - `https://parc-ton-gosse-frontend.up.railway.app`

---

## Step 4: Update CORS in Backend

**The backend needs to allow requests from the frontend URL!**

1. **Go to backend service in Railway**
2. **Settings → Variables**
3. **Add or update:**
   ```
   CORS_ORIGIN=https://parc-ton-gosse-frontend.up.railway.app
   ```
   (Replace with your actual frontend URL)

4. **Redeploy backend** (Railway will auto-redeploy when you save)

---

## Step 5: Test Frontend

1. **Wait for deployment to complete** (2-3 minutes)
2. **Visit your frontend URL:**
   - `https://parc-ton-gosse-frontend.up.railway.app`
3. **Test features:**
   - ✅ Homepage loads
   - ✅ Activities load from backend
   - ✅ Search works
   - ✅ Filters work
   - ✅ Language toggle works

---

## Troubleshooting

### Frontend shows "Cannot connect to backend"

**Check:**
1. ✅ `VITE_API_URL` is set correctly in frontend service
2. ✅ Backend URL is correct (no trailing slash)
3. ✅ `CORS_ORIGIN` in backend includes frontend URL
4. ✅ Backend is running and healthy

### Build fails

**Check:**
1. ✅ Root Directory is set to `client`
2. ✅ Build command is correct
3. ✅ Check build logs for errors

### Frontend loads but no data

**Check:**
1. ✅ Backend is accessible: `https://your-backend-url/api/health`
2. ✅ Browser console (F12) for errors
3. ✅ Network tab shows API requests

---

## Quick Checklist

- [ ] Frontend service created in Railway
- [ ] Root Directory = `client`
- [ ] Start Command = `npx serve -s dist -l $PORT`
- [ ] `VITE_API_URL` set to backend URL
- [ ] Frontend URL generated
- [ ] `CORS_ORIGIN` in backend includes frontend URL
- [ ] Frontend deployed and accessible
- [ ] Test all features

---

## Alternative: Deploy to Vercel (Easier)

**Vercel is easier for frontend deployment:**

1. **Go to:** https://vercel.com
2. **Sign in with GitHub**
3. **Import repository:** `sofaloaf/parc-ton-gosse`
4. **Configure:**
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Environment Variable:**
     - `VITE_API_URL=https://parc-ton-gosse-production.up.railway.app/api`
5. **Deploy!**

**Vercel automatically:**
- ✅ Generates a URL
- ✅ Handles HTTPS
- ✅ Auto-deploys on git push

---

## Next Steps After Deployment

1. ✅ **Test the full site**
2. ✅ **Update QR code** with new frontend URL
3. ✅ **Share the URL** with users
4. ✅ **Monitor logs** for errors

---

**Ready to deploy? Follow the steps above!**


