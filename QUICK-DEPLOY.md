# 🚀 Quick Deployment Guide - TL;DR Version

## Fastest Way: Railway (Recommended)

### 1. Push Code to GitHub
```bash
cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/parc-ton-gosse.git
git push -u origin main
```

### 2. Deploy Backend on Railway
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway auto-detects `server/` folder
6. Go to **Variables** tab, add:
   ```
   NODE_ENV=production
   JWT_SECRET=generate-with-openssl-rand-base64-32
   CORS_ORIGIN=https://your-frontend-url.railway.app
   DATA_BACKEND=sheets
   GS_SERVICE_ACCOUNT=your-email@project.iam.gserviceaccount.com
   GS_PRIVATE_KEY="your-private-key"
   GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0
   ```
7. Copy backend URL (e.g., `https://xxx.railway.app`)

### 3. Deploy Frontend on Railway
1. In same Railway project, click "+ New" → "GitHub Repo"
2. Select same repository
3. Settings → Root Directory: `client`
4. Settings → Build Command: `npm install && npm run build`
5. Settings → Start Command: `npx serve -s dist -l $PORT`
6. Variables tab, add:
   ```
   VITE_API_URL=https://your-backend-url.railway.app/api
   ```
7. Copy frontend URL - **THIS IS YOUR WEBSITE URL!** 🎉

### 4. Update Backend CORS
- Go back to backend service
- Update `CORS_ORIGIN` variable to your frontend URL

### 5. Generate QR Code
```bash
npm run qr https://your-frontend-url.railway.app
```

---

## Generate JWT Secret
```bash
openssl rand -base64 32
```

---

## That's It! 🎉

Your website is now live at: `https://your-frontend-url.railway.app`

**For detailed instructions, see:** `DEPLOYMENT-STEPS.md`

