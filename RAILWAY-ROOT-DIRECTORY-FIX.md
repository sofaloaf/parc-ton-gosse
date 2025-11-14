# 🔧 Railway Root Directory Setting - How to Find It

## Option 1: Using Railway.json (Easiest - Recommended)

Railway will automatically detect the `railway.json` file in your `server/` folder. This is already set up for you!

**Just make sure:**
1. Your repository is connected
2. Railway detects it as a Node.js project
3. The `server/railway.json` file exists (it does!)

Railway should automatically use the `server/` folder as the root.

---

## Option 2: Find Root Directory in Railway UI

The Root Directory setting might be in different places depending on Railway's UI:

### Location A: Service Settings
1. Click on your **backend service** (the one you just created)
2. Go to **Settings** tab (gear icon on the left)
3. Look for **"Source"** section
4. Find **"Root Directory"** or **"Working Directory"**
5. Enter: `server`

### Location B: Deploy Settings
1. Click on your **backend service**
2. Go to **Settings** tab
3. Look for **"Deploy"** section
4. Find **"Root Directory"** or **"Working Directory"**
5. Enter: `server`

### Location C: Service Configuration
1. Click on your **backend service**
2. Look for **"Configure"** or **"Settings"** button
3. Find **"Root Directory"** field
4. Enter: `server`

---

## Option 3: Use Nixpacks Configuration (Alternative)

If you can't find the Root Directory setting, create a `nixpacks.toml` file:

### Create `server/nixpacks.toml`:
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.install]
cmds = ["npm install"]

[start]
cmd = "npm start"
```

Then Railway will use this file to configure the build.

---

## Option 4: Manual Configuration via Railway CLI

If the UI doesn't work, use Railway CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Set root directory
railway variables set RAILWAY_ROOT_DIRECTORY=server
```

---

## Option 5: Create Separate Repository (Last Resort)

If nothing else works:
1. Create a new GitHub repository just for the backend
2. Copy only the `server/` folder contents
3. Push to the new repository
4. Deploy that repository on Railway (no root directory needed)

---

## ✅ Recommended: Check if It's Already Working

Railway might have already detected the correct setup! Check:

1. **Go to your backend service**
2. **Click on "Deployments" tab**
3. **Check the build logs**
4. **Look for:**
   - `npm install` running
   - Files being built from `server/` folder
   - Build completing successfully

If the build is working, you might not need to set the root directory!

---

## 🎯 Quick Check: What to Look For

In Railway, when you click on your service, you should see:

1. **Service name** (e.g., "parc-ton-gosse-backend")
2. **Settings** tab (gear icon)
3. **Variables** tab (for environment variables)
4. **Deployments** tab (to see build logs)
5. **Metrics** tab (to see usage)

The Root Directory is usually in the **Settings** tab, under **"Source"** or **"Deploy"** section.

---

## 📸 Visual Guide

If you're still stuck, here's what to look for:

```
Railway Dashboard
├── Your Project
    ├── Backend Service (click here)
        ├── Settings (gear icon) ← Look here first
        │   ├── Source
        │   │   └── Root Directory ← Should be here
        │   ├── Deploy
        │   │   └── Root Directory ← Or here
        │   └── Variables
        ├── Deployments
        └── Metrics
```

---

## 🆘 Still Can't Find It?

**Try this:**
1. **Don't worry about Root Directory for now**
2. **Just set the environment variables** (this is more important)
3. **Let Railway auto-detect** the setup
4. **Check the build logs** - if it's trying to run `npm install` from the root, you might need to:
   - Create a `railway.json` in the root with the correct configuration
   - Or use the Railway CLI method above

---

## 💡 Pro Tip

The `server/railway.json` file you already have should handle this automatically. Railway reads this file and knows to use the `server/` folder.

**Just proceed with setting environment variables** - that's the most important step!

---

**Next Step:** Set your environment variables (see `RAILWAY-ENV-VARIABLES.md`)

