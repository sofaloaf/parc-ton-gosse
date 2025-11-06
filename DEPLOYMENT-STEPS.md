# 🚀 Step-by-Step Deployment Guide

## Overview
You need to deploy TWO parts:
1. **Backend (Server)** - API that handles data, authentication, etc.
2. **Frontend (Client)** - React app that users see

---

## Option 1: Railway (Recommended - Easiest for Full-Stack)

Railway can host both your backend and frontend. Free tier available.

### STEP 1: Prepare Your Code

1. **Make sure your code is in a Git repository:**
   ```bash
   cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"
   
   # Check if git is initialized
   git status
   
   # If not, initialize git:
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create a GitHub repository:**
   - Go to https://github.com/new
   - Create a new repository (e.g., "parc-ton-gosse")
   - **DO NOT** initialize with README
   - Copy the repository URL

3. **Push your code to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/parc-ton-gosse.git
   git branch -M main
   git push -u origin main
   ```

### STEP 2: Deploy Backend on Railway

1. **Sign up for Railway:**
   - Go to https://railway.app
   - Click "Start a New Project"
   - Sign up with GitHub (easiest)

2. **Create Backend Service:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will detect it's a Node.js project

3. **Configure Backend:**
   - Railway will auto-detect the `server/` folder
   - If not, go to Settings → Source → Root Directory: `server`
   - Go to Settings → Deploy → Start Command: `npm start`

4. **Set Environment Variables:**
   Go to Variables tab and add these (click "New Variable" for each):

   ```
   NODE_ENV=production
   PORT=4000
   JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
   CORS_ORIGIN=https://your-frontend-url.railway.app
   DATA_BACKEND=sheets
   GS_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
   GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0
   ```

   **Important:** 
   - Generate a strong JWT_SECRET: `openssl rand -base64 32`
   - Copy your Google Sheets credentials from `server/.env` (if you have one)
   - CORS_ORIGIN will be your frontend URL (you'll update this after deploying frontend)

5. **Get Backend URL:**
   - Railway will give you a URL like: `https://parc-ton-gosse-backend-production.up.railway.app`
   - Copy this URL - you'll need it for the frontend

### STEP 3: Deploy Frontend on Railway

1. **Create Frontend Service:**
   - In the same Railway project, click "+ New"
   - Select "GitHub Repo"
   - Choose the same repository

2. **Configure Frontend:**
   - Go to Settings → Source → Root Directory: `client`
   - Go to Settings → Deploy:
     - Build Command: `npm install && npm run build`
     - Start Command: `npx serve -s dist -l 3000`
   - Go to Settings → Networking → Port: `3000`

3. **Set Environment Variables:**
   Go to Variables tab and add:

   ```
   VITE_API_URL=https://your-backend-url.railway.app/api
   ```

   **Replace `your-backend-url` with the actual backend URL from Step 2**

4. **Get Frontend URL:**
   - Railway will give you a URL like: `https://parc-ton-gosse-frontend-production.up.railway.app`
   - This is your website URL! 🎉

5. **Update Backend CORS:**
   - Go back to Backend service → Variables
   - Update `CORS_ORIGIN` to your frontend URL: `https://parc-ton-gosse-frontend-production.up.railway.app`

### STEP 4: Test Your Deployment

1. **Visit your frontend URL** in a browser
2. **Test features:**
   - Browse activities
   - Search and filter
   - Sign up / Login
   - View activity details

---

## Option 2: Render (Alternative - Also Easy)

### STEP 1: Prepare Code (Same as Railway Step 1)

### STEP 2: Deploy Backend on Render

1. **Sign up:** https://render.com
2. **Create Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Name: `parc-ton-gosse-backend`
   - Region: Choose closest to you
   - Branch: `main`
   - Root Directory: `server`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Set Environment Variables:**
   Click "Environment" and add all variables from Railway Step 2

4. **Get Backend URL:**
   - Render gives you: `https://parc-ton-gosse-backend.onrender.com`

### STEP 3: Deploy Frontend on Render

1. **Create Static Site:**
   - Click "New +" → "Static Site"
   - Connect GitHub repository
   - Name: `parc-ton-gosse-frontend`
   - Branch: `main`
   - Root Directory: `client`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

2. **Set Environment Variables:**
   - `VITE_API_URL=https://parc-ton-gosse-backend.onrender.com/api`

3. **Get Frontend URL:**
   - Render gives you: `https://parc-ton-gosse-frontend.onrender.com`

---

## Option 3: Vercel (Frontend) + Railway/Render (Backend)

### Deploy Frontend on Vercel:

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd client
   vercel
   ```

3. **Follow prompts:**
   - Link to existing project? No
   - Project name? `parc-ton-gosse`
   - Directory? `./`
   - Override settings? No

4. **Set Environment Variable:**
   - Go to Vercel dashboard → Your project → Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://your-backend-url.railway.app/api`

5. **Redeploy:**
   - Go to Deployments → Click "..." → Redeploy

---

## 🔧 Required Configuration Files

### Create `server/railway.json` (for Railway):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Create `client/railway.json` (for Railway):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npx serve -s dist -l $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Create `client/vercel.json` (for Vercel):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Create `server/render.yaml` (for Render):
```yaml
services:
  - type: web
    name: parc-ton-gosse-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 4000
```

---

## 📋 Environment Variables Checklist

### Backend Variables (Required):
- [ ] `NODE_ENV=production`
- [ ] `PORT=4000` (or let platform set it)
- [ ] `JWT_SECRET` (generate with: `openssl rand -base64 32`)
- [ ] `CORS_ORIGIN` (your frontend URL)
- [ ] `DATA_BACKEND=sheets` (or `memory` for testing)
- [ ] `GS_SERVICE_ACCOUNT` (if using Google Sheets)
- [ ] `GS_PRIVATE_KEY` (if using Google Sheets)
- [ ] `GS_SHEET_ID` (if using Google Sheets)

### Frontend Variables (Required):
- [ ] `VITE_API_URL` (your backend URL + `/api`)

---

## ✅ Post-Deployment Checklist

- [ ] Backend is accessible (test: `https://your-backend-url/api/health`)
- [ ] Frontend is accessible (visit your frontend URL)
- [ ] Frontend can connect to backend (check browser console for errors)
- [ ] Activities load correctly
- [ ] Search and filters work
- [ ] Authentication works (sign up/login)
- [ ] Google Sheets connection works (if using)
- [ ] Generate QR code with your frontend URL

---

## 🆘 Troubleshooting

### Backend not starting?
- Check Railway/Render logs
- Verify all environment variables are set
- Check `JWT_SECRET` is set
- Verify `PORT` is correct

### Frontend can't connect to backend?
- Check `VITE_API_URL` is correct (include `/api` at end)
- Verify `CORS_ORIGIN` in backend includes frontend URL
- Check browser console for CORS errors
- Redeploy frontend after changing `VITE_API_URL`

### 404 errors on frontend?
- Make sure routing is configured (Vercel needs `vercel.json`)
- Check that `index.html` is in the build output

### Google Sheets not working?
- Verify service account credentials are correct
- Check that private key includes `\n` for newlines
- Verify sheet ID is correct
- Check Railway/Render logs for errors

---

## 🎯 Quick Start Commands

### Generate JWT Secret:
```bash
openssl rand -base64 32
```

### Test Backend Locally:
```bash
cd server
npm install
npm start
# Visit http://localhost:4000/api/health
```

### Test Frontend Build:
```bash
cd client
npm install
npm run build
npx serve -s dist
# Visit http://localhost:3000
```

---

## 📱 After Deployment

1. **Get your frontend URL** (e.g., `https://parc-ton-gosse.railway.app`)

2. **Generate QR code:**
   ```bash
   npm run qr https://your-frontend-url.railway.app
   ```

3. **Share your website!** 🎉

---

## 💡 Recommended: Railway

**Why Railway?**
- ✅ Free tier available
- ✅ Easy to deploy both frontend and backend
- ✅ Automatic HTTPS
- ✅ Easy environment variable management
- ✅ Good documentation
- ✅ Fast deployments

**Get started:** https://railway.app

---

**Need help?** Check the platform's documentation or ask for specific help with any step!

