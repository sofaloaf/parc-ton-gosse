# 🌐 Deploy Frontend - Visual Step-by-Step Guide

## Your Backend URL
**✅ Backend:** `https://parc-ton-gosse-production.up.railway.app`

---

## Step 1: Create Frontend Service

### In Railway Dashboard:

1. **Look at the top of your Railway project page**
2. **Find the "+ New" button** (usually top right, or in the services list)
3. **Click it**
4. **You'll see options like:**
   - "GitHub Repo"
   - "Empty Service"
   - "Template"
5. **Click "GitHub Repo"** (or "Deploy from GitHub repo")

### If you don't see "+ New":

- Look for **"Add Service"** button
- Or **"New Service"** button
- Or click on your project name, then look for service options

---

## Step 2: Select Repository

1. **A list of your GitHub repositories will appear**
2. **Find and click:** `parc-ton-gosse`
3. **Click "Deploy"** or "Add"

Railway will start creating the service.

---

## Step 3: Configure the Service

After Railway creates the service, you'll see it in your services list.

### 3.1 Set Root Directory

1. **Click on the new service** (it might be named `parc-ton-gosse` or similar)
2. **Click "Settings" tab** (gear icon on the left sidebar)
3. **Look for "Source" section**
4. **Find "Root Directory" field**
5. **Type:** `client`
6. **Click "Save"** or "Update"

**If you can't find Root Directory:**
- Railway might auto-detect it
- Skip this step and continue
- Check if build works in Deployments tab

### 3.2 Set Build Commands

1. **Still in Settings tab**
2. **Look for "Deploy" section**
3. **Find "Build Command" field**
4. **Type:** `npm install && npm run build`
5. **Find "Start Command" field**
6. **Type:** `npx serve -s dist -l $PORT`
7. **Click "Save"**

**If these fields don't exist:**
- Railway might auto-detect from `client/railway.json`
- Check Deployments tab to see if build works

---

## Step 4: Set Environment Variable

1. **Click "Variables" tab** (in your frontend service)
2. **Click "New Variable" button**
3. **Fill in:**
   - **Name:** `VITE_API_URL`
   - **Value:** `https://parc-ton-gosse-production.up.railway.app/api`
4. **Click "Add"** or "Save"

---

## Step 5: Generate Domain

1. **Click "Settings" tab**
2. **Click "Networking"** (or look for "Networking" tab)
3. **Find "Generate Domain" button**
4. **Click it**
5. **Copy the URL** that appears

**🎉 THIS IS YOUR WEBSITE URL!**

Example: `https://parc-ton-gosse-frontend-production.up.railway.app`

---

## Step 6: Update Backend CORS

1. **Go back to your backend service**
2. **Click "Variables" tab**
3. **Find `CORS_ORIGIN` variable** (or create it)
4. **Update value to your frontend URL:**
   ```
   https://your-frontend-url.railway.app
   ```
5. **Save**

---

## 🆘 Troubleshooting: "Can't Deploy Frontend"

### Issue 1: Can't find "+ New" button

**Solution:**
- Make sure you're in your Railway project (not the main dashboard)
- Look for "Add Service" or "New Service" instead
- Try refreshing the page

### Issue 2: Service already exists

**Solution:**
- Check if you already have a frontend service
- Look in your services list
- If it exists, click on it and configure it

### Issue 3: Build fails

**Solution:**
- Check Deployments tab → Latest deployment → Logs
- Look for error messages
- Common fixes:
  - Make sure Root Directory is set to `client`
  - Check Build Command is correct
  - Verify `client/package.json` exists

### Issue 4: Can't find settings

**Solution:**
- Railway UI might be different
- Try clicking on the service name
- Look for tabs: Settings, Variables, Deployments, Networking

---

## 📸 What Railway Dashboard Looks Like

```
Railway Dashboard
├── Your Project Name
    ├── Services (list)
    │   ├── Backend Service (parc-ton-gosse)
    │   └── [Empty space for new service]
    ├── + New button (top right)
    └── Settings (project level)
```

**When you click "+ New":**
- Modal or dropdown appears
- Options: GitHub Repo, Empty Service, Template
- Select "GitHub Repo"

---

## ✅ Quick Checklist

- [ ] Found "+ New" button
- [ ] Created new service from GitHub repo
- [ ] Set Root Directory to `client`
- [ ] Set Build Command: `npm install && npm run build`
- [ ] Set Start Command: `npx serve -s dist -l $PORT`
- [ ] Set `VITE_API_URL` variable
- [ ] Generated domain
- [ ] Updated backend `CORS_ORIGIN`
- [ ] Tested website

---

## 🎯 Alternative: Use Railway CLI

If the UI is too confusing, use command line:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Create new service for frontend
railway service create frontend

# Set root directory
railway variables set RAILWAY_ROOT_DIRECTORY=client --service frontend

# Set environment variable
railway variables set VITE_API_URL=https://parc-ton-gosse-production.up.railway.app/api --service frontend

# Deploy
railway up --service frontend
```

---

**What specific step are you stuck on?** Describe what you see when you try to deploy the frontend!

