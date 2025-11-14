# Fix: Root Directory Has Leading Slash

## 🔴 The Problem

Your Root Directory is set to: `/server` (with leading slash)

**It should be:** `server` (without leading slash)

The leading slash might cause Railway to interpret it as an absolute path, which could cause deployment issues.

---

## Step 1: Fix Root Directory

1. **Go to:** Railway → `parc-ton-gosse-backend` → Settings
2. **Find:** "Root Directory" field
3. **Change from:** `/server`
4. **Change to:** `server` (remove the leading slash)
5. **Click:** "Save" or press Enter

---

## Step 2: Trigger Redeploy

After fixing the Root Directory:

1. **Go to:** Deployments tab
2. **Click:** "Redeploy" or "Deploy Latest"
3. **Wait 2-3 minutes**

---

## Step 3: Check Logs

After redeploy, you should see:

```
📦 Initializing data store: sheets
🔍 DEBUG: About to check environment variables...
🔍 DEBUG: All env vars starting with GS_: ...
```

**If you still don't see these**, there might be another issue.

---

## Alternative: Check Deployment Status

**Go to:** Railway → `parc-ton-gosse-backend` → Deployments

**Check:**
- **Which commit is deploying?** (should be latest: "Fix duplicate code...")
- **Is deployment successful?** (green checkmark)
- **Or is it failing?** (red X)

---

**Change Root Directory from `/server` to `server` (no leading slash) and redeploy!**

---

**Last Updated:** $(date)

