# Deploy Your Website to Railway (Make it Public)

## 🎯 Goal
Deploy your website so anyone can access it at a public URL (not just localhost).

---

## Step 1: Create Railway Account

1. Go to: https://railway.app/
2. Click **"Start a New Project"**
3. Sign up with GitHub (recommended) or email
4. Authorize Railway to access your GitHub (if using GitHub)

---

## Step 2: Deploy Backend

### Option A: Deploy from GitHub (Recommended)

1. **Push your code to GitHub** (if not already):
   ```bash
   # Make sure you're in the project directory
   cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"
   
   # Initialize git if needed
   git init
   git add .
   git commit -m "Ready for deployment"
   
   # Create a new GitHub repo and push
   # (Go to github.com, create new repo, then:)
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **In Railway Dashboard:**
   - Click **"New Project"**
   - Select **"Deploy from GitHub repo"**
   - Choose your repository
   - Railway will auto-detect it's a Node.js project

3. **Configure Backend Service:**
   - **Root Directory:** Set to `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm run start`

### Option B: Deploy from Local (Railway CLI)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse/server"
railway init

# Deploy
railway up
```

---

## Step 3: Set Backend Environment Variables

**In Railway Dashboard → Your Backend Service → Variables:**

Add these variables (copy from your `server/.env` file):

```env
PORT=4000
NODE_ENV=production
DATA_BACKEND=sheets

# Google Sheets
GS_SERVICE_ACCOUNT=parc-ton-gosse-data@parc-ton-gosse.iam.gserviceaccount.com
GS_PRIVATE_KEY_BASE64=<paste_your_base64_key_here>
GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0

# CORS (will update after frontend deploys)
CORS_ORIGIN=https://your-frontend-url.railway.app

# JWT Secret (generate a strong random string)
JWT_SECRET=<generate_a_strong_random_string>
```

**To generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important:** 
- Copy the `GS_PRIVATE_KEY_BASE64` value from your local `.env` file
- Don't set `CORS_ORIGIN` yet - we'll update it after frontend deploys

---

## Step 4: Get Backend URL

**After backend deploys:**
1. Go to Railway Dashboard → Your Backend Service
2. Click **"Settings"** → **"Generate Domain"**
3. Copy the URL (e.g., `https://parc-ton-gosse-backend-production.up.railway.app`)
4. **Save this URL** - you'll need it for the frontend!

**Test the backend:**
```bash
curl https://your-backend-url.railway.app/api/health
```

Should return: `{"ok": true, "status": "healthy"}`

---

## Step 5: Deploy Frontend

### In Railway Dashboard:

1. **Add New Service:**
   - Click **"New"** → **"GitHub Repo"** (or **"Empty Service"**)
   - If using GitHub, select the same repo

2. **Configure Frontend Service:**
   - **Root Directory:** Set to `client`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npx serve -s dist -l $PORT`
   - **OR** use Railway's static file serving (see below)

3. **Alternative: Use Static File Serving:**
   - Railway can serve static files automatically
   - After build, Railway will serve the `dist` folder
   - No start command needed for static sites

---

## Step 6: Set Frontend Environment Variables

**In Railway Dashboard → Your Frontend Service → Variables:**

```env
VITE_API_URL=https://your-backend-url.railway.app/api
```

**Replace `your-backend-url` with your actual backend URL from Step 4!**

**Important:** 
- Vite environment variables are baked in at build time
- If you change `VITE_API_URL`, you MUST redeploy the frontend

---

## Step 7: Update Backend CORS

**Go back to Backend Service → Variables:**

Update `CORS_ORIGIN`:
```env
CORS_ORIGIN=https://your-frontend-url.railway.app
```

**Replace `your-frontend-url` with your actual frontend URL!**

**Important:** 
- You can add multiple origins separated by commas
- Example: `https://frontend-url.railway.app,https://custom-domain.com`

---

## Step 8: Get Your Public Website URL

**After frontend deploys:**
1. Go to Railway Dashboard → Your Frontend Service
2. Click **"Settings"** → **"Generate Domain"**
3. Copy the URL (e.g., `https://parc-ton-gosse-frontend-production.up.railway.app`)

**This is your public website URL!** 🎉

---

## Step 9: Test Your Deployed Website

1. **Open the frontend URL in your browser**
2. **Check browser console** (F12) for errors
3. **Verify activities load**
4. **Test the API:**
   ```bash
   curl https://your-backend-url.railway.app/api/health/datastore
   ```

---

## Step 10: Generate QR Code (Optional)

Once you have your public URL:

```bash
cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"
npm run qr https://your-frontend-url.railway.app
```

This creates `qr-code.png` and `qr-code.svg` files you can share!

---

## 🎯 Quick Checklist

- [ ] Railway account created
- [ ] Backend deployed to Railway
- [ ] Backend environment variables set
- [ ] Backend URL obtained
- [ ] Frontend deployed to Railway
- [ ] Frontend `VITE_API_URL` set to backend URL
- [ ] Backend `CORS_ORIGIN` updated to frontend URL
- [ ] Website accessible at public URL
- [ ] Activities loading correctly
- [ ] QR code generated (optional)

---

## 🔧 Troubleshooting

### Backend not starting?
- Check Railway logs: Dashboard → Service → **"Deployments"** → Click latest → **"View Logs"**
- Verify environment variables are set correctly
- Check `GS_PRIVATE_KEY_BASE64` is correct

### Frontend shows "Failed to fetch"?
- Verify `VITE_API_URL` is set correctly
- Check backend `CORS_ORIGIN` includes frontend URL
- Make sure backend is running (check backend logs)

### Activities not loading?
- Check backend logs for Google Sheets errors
- Verify sheet is shared with service account
- Test backend API directly: `curl https://your-backend-url/api/activities`

### Frontend shows old data?
- Vite caches environment variables at build time
- If you changed `VITE_API_URL`, you must redeploy frontend
- Railway should auto-redeploy on git push, or manually trigger redeploy

---

## 📝 Railway Configuration Files

Your project already has Railway config files:
- `railway.json` - Backend configuration
- `client/railway.json` - Frontend configuration (if exists)
- `nixpacks.toml` - Build configuration

Railway will use these automatically!

---

## 🚀 Alternative: Deploy to Vercel (Easier for Frontend)

If Railway is too complex, you can also use:

**Vercel for Frontend:**
- Free and very easy
- Automatic deployments from GitHub
- Great for React/Vite apps

**Railway for Backend:**
- Keep backend on Railway
- Deploy frontend to Vercel
- Set `VITE_API_URL` to Railway backend URL

See `DEPLOYMENT-GUIDE.md` for Vercel instructions.

---

## 🎉 You're Done!

Once deployed, your website will be accessible at:
- **Frontend:** `https://your-frontend-url.railway.app`
- **Backend API:** `https://your-backend-url.railway.app/api`

**Share the frontend URL with anyone!** They can access your website from anywhere. 🌐

---

## Need Help?

- Check Railway logs for errors
- Verify all environment variables are set
- Test backend API directly with `curl`
- Check browser console for frontend errors

Good luck with your deployment! 🚀

