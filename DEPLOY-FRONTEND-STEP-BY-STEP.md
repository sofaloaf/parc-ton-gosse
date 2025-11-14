# 🌐 Deploy Frontend - Step by Step

## Your Backend URL

**Backend URL:** `https://parc-ton-gosse-production.up.railway.app`

**Test it:** Visit `https://parc-ton-gosse-production.up.railway.app/api/health`

---

## 🚀 Deploy Frontend on Railway

### Step 1: Create Frontend Service

1. **In Railway dashboard, go to your project**
2. **Click "+ New"** button (top right, or in the services list)
3. **Select "GitHub Repo"** (or "Deploy from GitHub repo")
4. **Choose your repository:** `parc-ton-gosse`
5. **Click "Deploy"** or "Add Service"

### Step 2: Configure Frontend Service

1. **Click on the newly created service** (it might be named `parc-ton-gosse` or similar)
2. **Go to "Settings" tab** (gear icon on the left)
3. **Look for "Source" section:**
   - Find **"Root Directory"** field
   - Set it to: `client`
   - Click "Save" or "Update"

4. **Go to "Deploy" section** (in Settings):
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npx serve -s dist -l $PORT`
   - **Port:** Leave default (Railway will set it automatically)
   - Click "Save"

### Step 3: Set Environment Variable

1. **Go to "Variables" tab** (in your frontend service)
2. **Click "New Variable"**
3. **Add:**
   - **Name:** `VITE_API_URL`
   - **Value:** `https://parc-ton-gosse-production.up.railway.app/api`
   - Click "Add" or "Save"

### Step 4: Generate Domain

1. **Go to "Settings" → "Networking"** (or "Networking" tab)
2. **Click "Generate Domain"** button
3. **Copy the URL** (e.g., `https://parc-ton-gosse-frontend-production.up.railway.app`)

**🎉 THIS IS YOUR WEBSITE URL!**

### Step 5: Update Backend CORS

1. **Go back to your backend service**
2. **Go to "Variables" tab**
3. **Find `CORS_ORIGIN` variable** (or create it if it doesn't exist)
4. **Update the value to your frontend URL:**
   ```
   https://your-frontend-url.railway.app
   ```
5. **Save**

Railway will automatically redeploy the backend.

---

## 🆘 Troubleshooting

### Can't find "+ New" button?
- Look at the top of the Railway dashboard
- Or look for "Add Service" or "New Service"
- It might be in the project overview page

### Can't find Root Directory setting?
- Railway might auto-detect it
- Check if the build is working in Deployments tab
- If build fails, we'll need to use a different method

### Build fails?
- Check Deployments tab → Latest deployment → Logs
- Look for error messages
- Common issues:
  - Missing dependencies
  - Build command wrong
  - Port configuration

### Frontend can't connect to backend?
- Check `VITE_API_URL` is correct (include `/api`)
- Check backend CORS_ORIGIN includes frontend URL
- Check browser console for errors

---

## 📋 Alternative: If Railway UI Doesn't Show Options

If you can't find the settings in Railway UI, use Railway CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Set root directory for frontend service
railway variables set RAILWAY_ROOT_DIRECTORY=client --service your-frontend-service-name

# Set environment variable
railway variables set VITE_API_URL=https://parc-ton-gosse-production.up.railway.app/api --service your-frontend-service-name
```

---

## ✅ After Deployment

1. **Test frontend:** Visit your frontend URL
2. **Test backend connection:** Check browser console for errors
3. **Test login:** Try signing up/logging in

---

## 📋 All Your URLs

### Backend:
- **API:** `https://parc-ton-gosse-production.up.railway.app`
- **Health:** `https://parc-ton-gosse-production.up.railway.app/api/health`

### Frontend (after deployment):
- **Website:** `https://your-frontend-url.railway.app`
- **Login:** `https://your-frontend-url.railway.app/profile`

---

**Need help?** Describe what you see when you try to create the frontend service!

