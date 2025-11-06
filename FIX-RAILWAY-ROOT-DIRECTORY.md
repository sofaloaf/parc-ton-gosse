# 🔧 Fix Railway Root Directory Issue

## Problem Found!

**Build error:**
```
/bin/bash: line 1: cd: server: No such file or directory
```

**This means Railway can't find the `server` folder during build.**

---

## Solution: Set Root Directory in Railway

**The Root Directory MUST be set to `server` in Railway Settings.**

---

## How to Fix

### Step 1: Go to Service Settings

1. **Railway → lovely-perception → Backend Service**
2. **Click Settings** (top right)
3. **Scroll to "Source" or "Deploy" section**

### Step 2: Set Root Directory

**Find "Root Directory" field:**

**Set it to:**
```
server
```

**This tells Railway: "The code is in the server folder"**

### Step 3: Update Start Command

**In the same Settings, find "Start Command" field:**

**Set it to:**
```
NODE_ENV=production node index.js
```

**NOT:** `cd server && ...` (because Root Directory is already `server`)

### Step 4: Save and Redeploy

1. **Save all changes**
2. **Wait 2-3 minutes** for Railway to redeploy
3. **Check build logs** - should succeed now!

---

## Why This Fixes It

**When Root Directory is set to `server`:**
- Railway builds from the `server` folder
- No need for `cd server` in commands
- Build can find `package.json` and `index.js`

**When Root Directory is empty/wrong:**
- Railway builds from root
- Commands try `cd server` but folder doesn't exist in build context
- Build fails

---

## Quick Checklist

- [ ] Root Directory = `server`
- [ ] Start Command = `NODE_ENV=production node index.js` (no `cd server`)
- [ ] Save changes
- [ ] Wait for redeploy
- [ ] Build should succeed!

---

## Alternative: If Root Directory Can't Be Set

**If Railway doesn't let you set Root Directory:**

1. **Update Start Command to:**
   ```
   NODE_ENV=production node server/index.js
   ```

2. **Update Build Command to:**
   ```
   npm install --prefix server --omit=dev
   ```

**But setting Root Directory to `server` is the best solution!**

---

**Set Root Directory to `server` and update Start Command - this will fix the build!**

