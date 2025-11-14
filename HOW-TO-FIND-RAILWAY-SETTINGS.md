# 📍 How to Find Railway Settings - Step by Step

## Step-by-Step Guide to Check Root Directory and Health Check

---

## Step 1: Go to Your Project

1. **Open Railway:** https://railway.app
2. **Login** to your account
3. **Click on project:** `lovely-perception`

---

## Step 2: Go to Your Backend Service

1. **You'll see a list of services** (should see your backend service)
2. **Click on your backend service** (might be named "parc-ton-gosse" or similar)

---

## Step 3: Open Settings

**Look for the left sidebar with tabs:**

**You should see tabs like:**
- Deployments
- Metrics
- Logs
- Variables
- Settings ⚙️
- Networking

**Click on "Settings"** (gear icon ⚙️)

---

## Step 4: Find Root Directory

**In the Settings page, look for sections:**

### Option A: Look for "Source" Section

1. **Scroll down** in Settings
2. **Find "Source" section**
3. **Look for "Root Directory" field**
4. **Should show:** `server` or empty

### Option B: Look for "Deploy" Section

1. **Scroll down** in Settings
2. **Find "Deploy" section**
3. **Look for "Root Directory" field**
4. **Should show:** `server` or empty

### Option C: Look for "Build & Deploy" Section

1. **Scroll down** in Settings
2. **Find "Build & Deploy" section**
3. **Look for "Root Directory" field**
4. **Should show:** `server` or empty

**If you can't find it:**
- Railway might auto-detect it
- It might be in a different section
- Try looking in all sections

---

## Step 5: Find Health Check

**In the Settings page, look for:**

### Option A: "Health Check" Section

1. **Scroll down** in Settings
2. **Find "Health Check" section**
3. **Look for:**
   - Health Check enabled/disabled toggle
   - Health Check path/endpoint
   - Health Check timeout

### Option B: "Deploy" Section

1. **Scroll down** in Settings
2. **Find "Deploy" section**
3. **Look for "Health Check" settings**

### Option C: "Service" Section

1. **Scroll down** in Settings
2. **Find "Service" section**
3. **Look for "Health Check" settings**

**If you can't find it:**
- Health Check might not be visible
- It might be in "Advanced" settings
- Railway might not have this option (some plans don't)

---

## Step 6: Find Start Command

**In the Settings page, look for:**

### Option A: "Deploy" Section

1. **Scroll down** in Settings
2. **Find "Deploy" section**
3. **Look for "Start Command" field**
4. **Should show:** `cd server && NODE_ENV=production node index.js`

### Option B: "Build & Deploy" Section

1. **Scroll down** in Settings
2. **Find "Build & Deploy" section**
3. **Look for "Start Command" field**

### Option C: "Service" Section

1. **Scroll down** in Settings
2. **Find "Service" section**
3. **Look for "Start Command" field**

---

## Visual Guide: Where to Look

```
Railway Dashboard
└── lovely-perception (Project)
    └── Backend Service (click on it)
        └── Settings Tab (left sidebar, gear icon ⚙️)
            ├── Source Section
            │   └── Root Directory: [server or empty]
            ├── Deploy Section
            │   ├── Start Command: [cd server && NODE_ENV=production node index.js]
            │   └── Health Check: [enabled/disabled]
            └── Other sections...
```

---

## If You Can't Find Settings

### Alternative: Check Deployments

1. **Go to "Deployments" tab**
2. **Click on latest deployment**
3. **Look for configuration info**
4. **Might show Start Command there**

### Alternative: Check Service Overview

1. **Click on your backend service**
2. **Look at the main page** (not Settings)
3. **Might show configuration there**

### Alternative: Use Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link  # Select lovely-perception

# View service settings
railway status
```

---

## What to Look For

### Root Directory
- **Location:** Settings → Source or Deploy section
- **Should be:** `server` or empty
- **If wrong:** Change it to `server`

### Start Command
- **Location:** Settings → Deploy section
- **Should be:** `cd server && NODE_ENV=production node index.js`
- **If wrong:** Change it to the above

### Health Check
- **Location:** Settings → Deploy or Service section
- **Should be:** Disabled OR set to `/api/health`
- **If enabled with wrong path:** Change it or disable it

---

## Quick Checklist

- [ ] Opened Railway dashboard
- [ ] Clicked on `lovely-perception` project
- [ ] Clicked on backend service
- [ ] Clicked on "Settings" tab (gear icon)
- [ ] Found "Root Directory" field
- [ ] Found "Start Command" field
- [ ] Found "Health Check" settings (if available)

---

## Screenshot Locations

**If you can take a screenshot, show me:**
1. The Settings page
2. The Deploy section
3. Any configuration fields you see

**This will help me guide you better!**

---

## Can't Find It?

**Tell me:**
1. What sections do you see in Settings?
2. What tabs are available in the left sidebar?
3. Can you see "Deploy", "Source", or "Service" sections?

**I'll help you find it!**

