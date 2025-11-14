# 📍 Find Railway Settings - Top Right

## Settings is at Top Right, Not Left Sidebar!

---

## Step-by-Step Guide

### Step 1: Go to Your Project

1. **Open Railway:** https://railway.app
2. **Login** to your account
3. **Click on project:** `lovely-perception`

---

### Step 2: Go to Your Backend Service

1. **You'll see a list of services**
2. **Click on your backend service** (might be named "parc-ton-gosse" or similar)

---

### Step 3: Find Settings Button

**Look at the TOP RIGHT of the page:**

**You should see buttons like:**
- Settings ⚙️ (top right)
- Or a gear icon
- Or "Settings" text button

**Click on "Settings"** (top right)

---

### Step 4: Find Root Directory

**After clicking Settings, you'll see a settings page or modal.**

**Look for:**

1. **"Source" section:**
   - Find "Root Directory" field
   - Should show: `server` or empty

2. **OR "Deploy" section:**
   - Find "Root Directory" field
   - Should show: `server` or empty

3. **OR "Build & Deploy" section:**
   - Find "Root Directory" field
   - Should show: `server` or empty

**Scroll down if you don't see it immediately.**

---

### Step 5: Find Start Command

**In the Settings page/modal, look for:**

1. **"Deploy" section:**
   - Find "Start Command" field
   - Should show: `cd server && NODE_ENV=production node index.js`

2. **OR "Build & Deploy" section:**
   - Find "Start Command" field

**Scroll down to find it.**

---

### Step 6: Find Health Check

**In the Settings page/modal, look for:**

1. **"Health Check" section:**
   - Health Check enabled/disabled
   - Health Check path

2. **OR "Deploy" section:**
   - Health Check settings

**Note:** Health Check might not be visible on all Railway plans.

---

## Visual Guide

```
Railway Dashboard
└── lovely-perception (Project)
    └── Backend Service (click on it)
        └── [Main page with service info]
            └── Settings Button ⚙️ (TOP RIGHT)
                └── Settings Page/Modal
                    ├── Source Section
                    │   └── Root Directory: [here]
                    ├── Deploy Section
                    │   ├── Start Command: [here]
                    │   └── Health Check: [here, if available]
                    └── Other sections...
```

---

## Alternative: Check Service Overview

**If Settings button doesn't show what you need:**

1. **Click on your backend service**
2. **Look at the main page** (service overview)
3. **Might show:**
   - Start Command
   - Root Directory
   - Configuration info

---

## What to Look For

### Root Directory
- **Where:** Settings (top right) → Source or Deploy section
- **Should be:** `server` or empty
- **If wrong:** Change it to `server`

### Start Command
- **Where:** Settings (top right) → Deploy section
- **Should be:** `cd server && NODE_ENV=production node index.js`
- **If wrong:** Change it to the above

### Health Check
- **Where:** Settings (top right) → Deploy or Health Check section
- **Should be:** Disabled OR set to `/api/health`
- **If enabled with wrong path:** Change it or disable it

---

## Quick Checklist

- [ ] Opened Railway dashboard
- [ ] Clicked on `lovely-perception` project
- [ ] Clicked on backend service
- [ ] Found "Settings" button (TOP RIGHT)
- [ ] Clicked Settings
- [ ] Found "Root Directory" field
- [ ] Found "Start Command" field
- [ ] Found "Health Check" settings (if available)

---

## If You Still Can't Find It

**Tell me:**
1. What do you see when you click on your backend service?
2. What buttons/options are at the top right?
3. What do you see when you click Settings?
4. What sections are visible in the Settings page?

**I'll help you find it!**

---

## Screenshot Help

**If you can take a screenshot:**
1. The service page (after clicking on backend service)
2. The Settings page (after clicking Settings)
3. Any configuration fields you see

**This will help me guide you better!**

