# Fix Deployment - Step by Step

## The Problem

The code is in the repo, but Railway isn't deploying the latest version. The logs don't show the new debug messages.

---

## Step 1: Verify Root Directory is Set

**Go to:** Railway → `parc-ton-gosse-backend` → Settings

**Check:**
- **Root Directory** field
- **Should be:** `server`
- **If it's empty or something else**, set it to `server`
- **Save**

**This is CRITICAL!** Without this, Railway doesn't know where your backend code is.

---

## Step 2: Check Which Commit is Deploying

**Go to:** Railway → `parc-ton-gosse-backend` → Deployments → Latest

**Look for:**
- **Commit hash** or **commit message**
- **Should show:** "Fix duplicate code in private key processing" (latest commit)
- **If it shows an older commit**, the new code isn't deploying

---

## Step 3: Manually Trigger Redeploy

**To force Railway to deploy the latest code:**

1. **Go to:** Railway → `parc-ton-gosse-backend` → Deployments
2. **Click:** "Redeploy" button (or "Deploy Latest")
3. **Select:** "Deploy from GitHub" (if option available)
4. **Wait 2-3 minutes** for deployment

---

## Step 4: Verify Source Connection

**Go to:** Railway → `parc-ton-gosse-backend` → Settings → Source

**Verify:**
- **Repository:** `sofaloaf/parc-ton-gosse` (main repo)
- **Branch:** `main`
- **If wrong**, disconnect and reconnect

---

## Step 5: Check Logs After Redeploy

**After redeploy, the logs should show:**

```
📦 Initializing data store: sheets
🔍 DEBUG: About to check environment variables...
🔍 DEBUG: All env vars starting with GS_: GS_SERVICE_ACCOUNT, GS_PRIVATE_KEY_BASE64, GS_SHEET_ID
🔍 Checking for private key...
GS_PRIVATE_KEY_BASE64 exists: true
GS_PRIVATE_KEY_BASE64 length: <number>
```

**If you DON'T see these messages**, the old code is still running.

---

## Common Issues

### Issue: Root Directory Not Set
**Symptom:** Deployment fails or uses wrong code
**Fix:** Set Root Directory to `server` in Settings

### Issue: Wrong Branch
**Symptom:** Old code deploying
**Fix:** Verify branch is `main` in Source settings

### Issue: Deployment Cached
**Symptom:** New code not appearing
**Fix:** Manually trigger redeploy

---

## Quick Fix Checklist

1. ✅ **Root Directory** = `server`
2. ✅ **Source Repo** = `sofaloaf/parc-ton-gosse`
3. ✅ **Branch** = `main`
4. ✅ **Manually trigger redeploy**
5. ✅ **Check logs for debug messages**

---

**The most common issue is Root Directory not being set to `server`!**

---

**Last Updated:** $(date)

