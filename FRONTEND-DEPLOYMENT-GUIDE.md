# 🚀 Frontend Deployment Guide - Get Your Site Online!

## ✅ Current Status

- ✅ **Backend is deployed and working** at: `https://parc-ton-gosse-production.up.railway.app`
- ✅ **Frontend configuration files are ready** (`client/railway.json` exists)
- ⏳ **Frontend needs to be deployed** - Follow steps below!

---

## 📋 Step-by-Step Deployment Instructions

### Step 1: Go to Railway Dashboard

1. Open your browser and go to: **https://railway.app**
2. Log in to your account
3. Find your project (likely named "lovely-perception" or "parc-ton-gosse")
4. You should see your **backend service** already running

### Step 2: Create Frontend Service

1. In your Railway project, click the **"+ New"** button (top right)
2. Select **"GitHub Repo"** from the dropdown
3. Choose your repository: **`parc-ton-gosse`** (or whatever your repo is named)
4. Click **"Deploy"** or **"Add Service"**

**Note:** Railway will start deploying automatically, but we need to configure it first!

### Step 3: Configure Root Directory

1. Click on the **new service** you just created (it might be named `parc-ton-gosse`)
2. Go to the **"Settings"** tab
3. Scroll down to find **"Source"** section
4. Find the **"Root Directory"** field
5. Set it to: **`client`**
6. Click **"Save"** or wait for auto-save

**This tells Railway to look in the `client` folder for your frontend code.**

**Important:** After saving, Railway should automatically start deploying. If it doesn't, see troubleshooting below.

### Step 4: Set Environment Variable

1. Still in your frontend service, go to the **"Variables"** tab
2. Click **"New Variable"** button
3. Add this variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://parc-ton-gosse-production.up.railway.app/api`
4. Click **"Add"** or **"Save"**

**This connects your frontend to your backend API.**

### Step 5: Wait for Initial Deployment

**Important:** Railway needs to deploy the service first before you can generate a domain!

1. After setting Root Directory and `VITE_API_URL`, Railway will automatically start deploying
2. Go to the **"Deployments"** tab to watch the build progress
3. Wait for the deployment to show **"Active"** status (usually 2-5 minutes)
4. You'll see a progress indicator - wait until it says "Active" ✅

**Once the service is deployed, you can generate a domain!**

### Step 6: Generate Public Domain

**Now that the service is deployed, you can generate a domain:**

1. Go to **"Settings"** tab
2. Scroll to **"Networking"** section
3. You should now see the **"Generate Domain"** button (it was hidden before!)
4. Click **"Generate Domain"** button
5. Railway will create a URL like: `https://parc-ton-gosse-frontend-production.up.railway.app`
6. **Copy this URL** - This is your website URL! 🎉

**Note:** If you still see "Deploy the service to see networking settings", wait a bit longer for the deployment to complete.

### Step 7: Update Backend CORS Settings

1. Go back to your **backend service** (the one that's already running)
2. Go to **"Variables"** tab
3. Look for `CORS_ORIGIN` variable:
   - If it exists, click to edit it
   - If it doesn't exist, click **"New Variable"**
4. Set the value to your **frontend URL** (from Step 6):
   ```
   CORS_ORIGIN=https://parc-ton-gosse-frontend-production.up.railway.app
   ```
   (Replace with your actual frontend URL)
5. Click **"Save"**

**This allows your frontend to communicate with your backend.**

Railway will automatically redeploy the backend with the new CORS settings.

---

## ✅ Verify Deployment

### Test Your Frontend

1. **Visit your frontend URL** in a browser:
   ```
   https://your-frontend-url.railway.app
   ```

2. **You should see:**
   - Your website homepage
   - Search bar
   - Filter options
   - Activities list (might be empty if no data)
   - Language toggle (FR/EN)

### Test Backend Connection

1. Open browser **Developer Tools** (F12 or Right-click → Inspect)
2. Go to **"Console"** tab
3. Look for any errors
4. If you see CORS errors, check that `CORS_ORIGIN` is set correctly

### Test Login/Sign Up

1. Click **"Sign In"** or **"Connexion"** button
2. Try creating an account or logging in
3. If it works, your deployment is successful! 🎉

---

## 🔧 Configuration Files (Already Set Up!)

Your project already has the correct configuration files:

### `client/railway.json` ✅
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npx serve -s dist -l $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

This file tells Railway:
- How to build your frontend (`npm install && npm run build`)
- How to serve it (`npx serve -s dist -l $PORT`)

---

## 🆘 Troubleshooting

### Service not deploying? "There is no active deployment for this service"

**This means Railway hasn't started deploying yet. Try these:**

1. **Manual Trigger:**
   - Go to **Deployments** tab
   - Look for **"Redeploy"** or **"Deploy"** button and click it
   - Or go to Settings → Source → Check "Auto Deploy" is ON

2. **Trigger via Git Push:**
   ```bash
   # Make a small change and push
   echo "# Trigger deployment" >> client/README.md
   git add client/README.md
   git commit -m "Trigger Railway deployment"
   git push
   ```
   Railway will detect the push and start deploying automatically.

3. **Check Service Configuration:**
   - Settings → Source → Verify repository is connected
   - Settings → Source → Verify Root Directory is `client`
   - Settings → Source → Verify Auto Deploy is enabled

**See `RAILWAY-DEPLOYMENT-TROUBLESHOOTING.md` for more detailed troubleshooting.**

### Frontend shows "Cannot GET /" or 404 errors?

**Solution:**
- Make sure **Root Directory** is set to `client` (not `client/` or empty)
- Check that the build completed successfully in the **Deployments** tab
- Verify the **Start Command** is: `npx serve -s dist -l $PORT`

### Frontend can't connect to backend?

**Check:**
1. `VITE_API_URL` is set to: `https://parc-ton-gosse-production.up.railway.app/api`
2. Backend `CORS_ORIGIN` includes your frontend URL
3. Both services are showing "Active" status

**Fix:**
- Update `CORS_ORIGIN` in backend variables
- Wait 2-3 minutes for redeployment
- Clear browser cache and refresh

### Build fails?

**Check logs:**
- Go to **Deployments** tab
- Click on the failed deployment
- Check **Logs** tab for error messages

**Common issues:**
- Missing dependencies → Check `package.json`
- Build errors → Check for syntax errors in code
- Port conflicts → Railway handles this automatically

### Login/Sign Up doesn't work?

**Check:**
1. Backend is running (visit `https://parc-ton-gosse-production.up.railway.app/api/health`)
2. Browser console for errors (F12 → Console)
3. `CORS_ORIGIN` is set correctly
4. Cookies are enabled in your browser

---

## 📱 After Deployment

### Your URLs:

- **Backend API:** `https://parc-ton-gosse-production.up.railway.app`
- **Frontend Website:** `https://your-frontend-url.railway.app` ← **Share this with users!**

### Generate QR Code:

Once you have your frontend URL, you can generate a QR code:

```bash
npm run qr https://your-frontend-url.railway.app
```

---

## ✅ Quick Checklist

Before deploying:
- [ ] Backend is running and accessible
- [ ] `client/railway.json` exists (✅ Already done!)
- [ ] Code is pushed to GitHub

During deployment:
- [ ] Created new frontend service in Railway
- [ ] Set Root Directory to `client`
- [ ] Set `VITE_API_URL` environment variable
- [ ] Waited for initial deployment to complete (service shows "Active")
- [ ] Generated public domain (after deployment completes)
- [ ] Updated backend `CORS_ORIGIN` variable
- [ ] Waited for final deployment to complete

After deployment:
- [ ] Frontend URL loads in browser
- [ ] No errors in browser console
- [ ] Activities page loads
- [ ] Login/Sign Up works
- [ ] Language toggle works

---

## 🎉 Success!

Once all steps are complete, you'll have:
- ✅ A live website accessible to anyone
- ✅ Frontend connected to backend
- ✅ User authentication working
- ✅ All features accessible online

**Your site is now live and ready for testing!** 🚀

---

## 💡 Tips

1. **Monitor Logs:** Check Railway logs regularly during deployment
2. **Test Thoroughly:** Test all features after deployment
3. **Keep Backend Running:** Don't stop the backend service
4. **Environment Variables:** Keep your `VITE_API_URL` updated if backend URL changes
5. **CORS:** Always update `CORS_ORIGIN` when frontend URL changes

---

**Need help?** Check Railway's documentation or review the logs for specific error messages!

