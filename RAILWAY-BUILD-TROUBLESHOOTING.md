# Railway Build Troubleshooting - Blank Screen Fix

## Current Issue
Production site still shows blank screen. HTML references old JS file (`index-DJ_AMrr4.js`) instead of new one (`index-cXAyp2ch.js`).

## Root Cause
Railway is either:
1. Not rebuilding the frontend
2. Serving cached/stale build files
3. Not running build in correct directory

## Solutions Applied

### ✅ Fix 1: Force Clean Build
- Updated `build.sh` to remove `dist/` before building
- Ensures no stale files are left behind

### ✅ Fix 2: Enhanced Build Logging
- Added directory logging to see where build runs
- Added verification of build output

## Manual Steps to Fix in Railway

### Step 1: Verify Root Directory
1. Go to Railway Dashboard
2. Select **Frontend Service**
3. Go to **Settings** tab
4. Check **"Root Directory"** setting:
   - Should be: `client` (if available)
   - Or leave empty if railway.json is in client/

### Step 2: Check Build Logs
1. Go to Railway Dashboard
2. Select **Frontend Service**
3. Go to **Deployments** tab
4. Click on latest deployment
5. Check **Build Logs** for:
   - ✅ "Building from: /app/client" (or similar)
   - ✅ "✅ Build completed successfully"
   - ✅ "✅ index.html exists"
   - ✅ JS file reference in HTML matches actual file

### Step 3: Force Redeploy
1. Go to Railway Dashboard
2. Select **Frontend Service**
3. Click **"Redeploy"** button
4. Select **"Clear build cache"** if available
5. Wait for deployment to complete

### Step 4: Verify Deployment
After deployment, check:
```bash
# Check HTML references correct JS file
curl https://victorious-gentleness-production.up.railway.app/ | grep "index-.*\.js"

# Should show: index-cXAyp2ch.js (or current build)
```

## If Still Not Working

### Option 1: Manual Build Check
Check Railway build logs should show:
```
🚀 Starting build process...
📂 Current directory: /app/client
📂 Building from: /app/client
🔨 Building application...
✅ Build completed successfully
✅ dist directory exists
✅ index.html exists
📄 Checking JS file reference in index.html:
index-cXAyp2ch.js
```

### Option 2: Check Railway Service Settings
1. **Root Directory**: Should be `client` or empty
2. **Build Command**: Should be `bash build.sh`
3. **Start Command**: Should be `npm start`

### Option 3: Verify railway.json Location
- `railway.json` should be in `client/` directory
- Railway should detect it automatically

### Option 4: Clear Railway Cache
If Railway has build caching:
1. Go to Service Settings
2. Look for "Clear Cache" or "Rebuild" option
3. Trigger a fresh build

## Expected Build Output

After successful build, Railway should have:
```
client/
  dist/
    index.html          (references index-cXAyp2ch.js)
    assets/
      index-cXAyp2ch.js
      react-vendor-*.js
      leaflet-vendor-*.js
    api-url-override.js
```

## Verification Commands

After deployment, run these to verify:

```bash
# 1. Check HTML
curl https://victorious-gentleness-production.up.railway.app/ | grep "index-.*\.js"

# 2. Check if JS file exists
curl -I https://victorious-gentleness-production.up.railway.app/assets/index-cXAyp2ch.js
# Should return: 200 OK, Content-Type: application/javascript

# 3. Check if old file is gone
curl -I https://victorious-gentleness-production.up.railway.app/assets/index-DJ_AMrr4.js
# Should return: 404 Not Found
```

## Next Steps

1. ✅ **Wait for Railway to deploy** (automatic after git push)
2. ✅ **Check Railway build logs** to verify build succeeded
3. ✅ **Test production site** after deployment completes
4. ✅ **Verify HTML references correct JS file**

## Status

✅ **Changes pushed**: Build script updated to force clean build
⏳ **Pending**: Railway deployment and verification

