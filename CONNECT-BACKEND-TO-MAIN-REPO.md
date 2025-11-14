# Connect Backend to Main Repo

## Current Situation

- **Backend service is connected to:** `sofaloaf/parc-ton-gosse-backend`
- **Your code is in:** `sofaloaf/parc-ton-gosse` (main repo)
- **Result:** Backend doesn't have the latest code with base64 support

---

## Solution: Connect Backend to Main Repo

### Step 1: Change Source in Railway

1. **Go to:** Railway Dashboard
2. **Click:** `parc-ton-gosse-backend` service
3. **Go to:** Settings → Source (or GitHub)
4. **Click:** "Disconnect" or "Change Source"
5. **Click:** "Connect GitHub"
6. **Select repository:** `sofaloaf/parc-ton-gosse` (the main repo)
7. **Select branch:** `main`
8. **Click:** "Connect" or "Save"

### Step 2: Set Root Directory (Important!)

After connecting, you need to set the root directory:

1. **Still in Settings**, find **"Root Directory"**
2. **Set it to:** `server`
3. **Save**

**This tells Railway where the backend code is in the monorepo.**

### Step 3: Wait for Auto-Deploy

Railway will automatically detect the connection and start deploying (1-2 minutes).

---

## Alternative: Push Code to Backend Repo

If you prefer to keep the repos separate:

1. **Add the backend repo as a remote:**
   ```bash
   git remote add backend-repo https://github.com/sofaloaf/parc-ton-gosse-backend.git
   ```

2. **Push to it:**
   ```bash
   git push backend-repo main
   ```

**But this creates duplicate code in two repos - not recommended.**

---

## Recommended: Use Main Repo

**Best approach:** Connect backend service to main repo (`sofaloaf/parc-ton-gosse`) and set Root Directory to `server`.

**Benefits:**
- ✅ All code in one place
- ✅ Easier to maintain
- ✅ Frontend and backend stay in sync
- ✅ No duplicate repos

---

## After Connecting

1. **Railway will auto-deploy** from main repo
2. **Check logs** - should see new debug messages
3. **Base64 key should work!**

---

**Connect the backend service to `sofaloaf/parc-ton-gosse` and set Root Directory to `server`!**

---

**Last Updated:** $(date)

