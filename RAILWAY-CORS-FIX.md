# Railway CORS Fix - Deployment Instructions

## Issue
CORS error: "CORS missing allow origin" when fetching activities from frontend.

## Fix Applied
✅ Improved CORS handling with:
- Better origin normalization
- Explicit OPTIONS preflight handler
- Enhanced logging for debugging
- Normalized origin matching (handles trailing slashes)

## Railway Deployment Steps

### 1. Update Backend Environment Variables

**Go to Railway Dashboard:**
1. Navigate to your **Backend Service** (`parc-ton-gosse-backend-production`)
2. Click **Variables** tab
3. **Verify/Update these variables:**

```env
CORS_ORIGIN=https://victorious-gentleness-production.up.railway.app
NODE_ENV=production
DATA_BACKEND=sheets
GS_SERVICE_ACCOUNT=parc-ton-gosse-data@parc-ton-gosse.iam.gserviceaccount.com
GS_PRIVATE_KEY_BASE64=<your_base64_key>
GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0
```

**Important:**
- `CORS_ORIGIN` must be **exactly**: `https://victorious-gentleness-production.up.railway.app`
- **NO trailing slash**
- **NO spaces**
- Must include `https://`

### 2. Redeploy Backend

**Option A: Via Railway Dashboard**
1. Go to Backend Service → **Deployments**
2. Click **"Redeploy"** on the latest deployment
3. Or click **"Deploy"** to trigger a new deployment

**Option B: Via Git Push**
```bash
cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"
git add .
git commit -m "Fix CORS configuration"
git push
```

Railway will automatically redeploy.

### 3. Verify Deployment

**Wait for deployment to complete**, then test:

```bash
# Test OPTIONS preflight
curl -i -X OPTIONS \
  -H "Origin: https://victorious-gentleness-production.up.railway.app" \
  -H "Access-Control-Request-Method: GET" \
  https://parc-ton-gosse-backend-production.up.railway.app/api/activities

# Test actual GET request
curl -i -H "Origin: https://victorious-gentleness-production.up.railway.app" \
  https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```

**Both should return:**
```
access-control-allow-origin: https://victorious-gentleness-production.up.railway.app
access-control-allow-credentials: true
```

### 4. Check Railway Logs

**After redeploy:**
1. Go to Backend Service → **Deployments** → Latest → **View Logs**
2. Look for:
   ```
   ✅ CORS configured for origins: https://victorious-gentleness-production.up.railway.app
   ```
3. When frontend makes requests, you should see:
   ```
   📥 GET /api/activities from origin: https://victorious-gentleness-production.up.railway.app
   ✅ CORS allowed for origin: https://victorious-gentleness-production.up.railway.app
   ```

### 5. Test Website

1. **Open:** `https://victorious-gentleness-production.up.railway.app`
2. **Open browser DevTools** (F12)
3. **Check Console tab** - should see activities loading
4. **Check Network tab** - `/api/activities` request should have:
   - Status: `200 OK`
   - Response headers include: `access-control-allow-origin`

## Troubleshooting

### Still Getting CORS Error?

1. **Check CORS_ORIGIN in Railway:**
   - Must be exact match: `https://victorious-gentleness-production.up.railway.app`
   - No trailing slash
   - No spaces

2. **Check Railway Logs:**
   - Look for CORS-related messages
   - Check if origin is being blocked

3. **Clear Browser Cache:**
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - Or clear site data in DevTools

4. **Test with curl:**
   ```bash
   curl -v -H "Origin: https://victorious-gentleness-production.up.railway.app" \
     https://parc-ton-gosse-backend-production.up.railway.app/api/activities
   ```

### CORS_ORIGIN Not Working?

If you see in logs:
```
⚠️  CORS allowing all origins (CORS_ORIGIN not set)
```

This means `CORS_ORIGIN` is not set in Railway. **Set it in Variables tab.**

## Expected Result

After redeploy:
- ✅ Website loads at: `https://victorious-gentleness-production.up.railway.app`
- ✅ Activities display correctly
- ✅ No CORS errors in browser console
- ✅ Network requests return `200 OK`

## Next Steps

1. **Redeploy backend** with updated code
2. **Verify CORS_ORIGIN** is set correctly in Railway
3. **Test website** - activities should load
4. **Check logs** if issues persist

---

**The CORS fix is in the code. Just redeploy the backend service in Railway!**

