# Complete Deployment Audit - Parc Ton Gosse

**Date:** $(date)  
**Status:** 🔴 Critical Issues Found

---

## 🔍 Executive Summary

The deployment has **CORS configuration issues** preventing the frontend from accessing the backend API. Additionally, we need to verify Google Sheets connectivity.

---

## 1. CORS Configuration Issue ⚠️ CRITICAL

### Problem
Frontend is getting "CORS Missing Allow Origin" errors when trying to fetch activities.

### Root Cause
The backend's `CORS_ORIGIN` environment variable in Railway may be:
- Not set correctly
- Has trailing spaces/characters
- Doesn't match the exact frontend URL

### Current Configuration
- **Frontend URL:** `https://victorious-gentleness-production.up.railway.app`
- **Backend URL:** `https://parc-ton-gosse-backend-production.up.railway.app`
- **Expected CORS_ORIGIN:** `https://victorious-gentleness-production.up.railway.app` (NO trailing slash, NO spaces)

### Backend CORS Code (server/index.js:76-85)
```javascript
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean) || [];
app.use(cors({ 
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*', 
    credentials: true 
}));
```

### Fix Required
1. Go to Railway → Backend Service → Variables
2. Set `CORS_ORIGIN` to exactly: `https://victorious-gentleness-production.up.railway.app`
3. **NO trailing slash**
4. **NO spaces before or after**
5. Redeploy backend service

---

## 2. Google Sheets Connection

### Required Environment Variables (Backend Service)
- `DATA_BACKEND=sheets` (must be exactly "sheets", not "memory")
- `GS_SERVICE_ACCOUNT=<service-account-email>`
- `GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`
- `GS_SHEET_ID=<your-sheet-id>`

### Verification Steps
1. Check Railway backend logs for:
   - `✅ Data store initialized: sheets`
   - NOT `⚠️ Falling back to memory backend`

2. Test Google Sheets connection:
   ```bash
   curl https://parc-ton-gosse-backend-production.up.railway.app/api/activities
   ```
   Should return activities array (even if empty `[]`)

### Common Issues
- **"Invalid credentials"**: Service account email not shared with Google Sheet
- **"Unable to parse range"**: Sheet ID incorrect or sheet not shared
- **"Authentication failed"**: Private key format wrong (needs `\n` characters)

---

## 3. Frontend API Configuration

### Current Setup (client/src/shared/api.js)
- **Production API URL:** `https://parc-ton-gosse-backend-production.up.railway.app/api`
- **Frontend Detection:** Checks for `victorious-gentleness` or `railway` in hostname
- **Fallback Logic:** Uses `VITE_API_URL` if set, otherwise detects production

### Railway Frontend Service Variables
- `VITE_API_URL` should be: `https://parc-ton-gosse-backend-production.up.railway.app/api`
- **NO trailing slash**
- **NO spaces**

---

## 4. Backend Service Configuration

### Railway Backend Service Settings
- **Root Directory:** `server`
- **Build Command:** `npm install --prefix server --omit=dev` (or auto-detected)
- **Start Command:** `NODE_ENV=production node index.js` (or auto-detected)

### Required Environment Variables
```
NODE_ENV=production
PORT=4000 (Railway sets this automatically)
CORS_ORIGIN=https://victorious-gentleness-production.up.railway.app
DATA_BACKEND=sheets
JWT_SECRET=<your-secret>
GS_SERVICE_ACCOUNT=<service-account-email>
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GS_SHEET_ID=<your-sheet-id>
```

---

## 5. Testing Checklist

### ✅ Backend Health Check
```bash
curl https://parc-ton-gosse-backend-production.up.railway.app/api/health
```
Expected: `{"ok":true,"status":"healthy",...}`

### ✅ CORS Test
```bash
curl -i -H "Origin: https://victorious-gentleness-production.up.railway.app" \
  https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```
Expected: `Access-Control-Allow-Origin: https://victorious-gentleness-production.up.railway.app`

### ✅ Activities Endpoint
```bash
curl https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```
Expected: JSON array of activities (or `[]` if empty)

### ✅ Frontend Network Tab
1. Open browser DevTools → Network tab
2. Visit frontend URL
3. Check for `/api/activities` request
4. Should show:
   - Status: `200 OK`
   - Response: JSON array
   - Headers include: `Access-Control-Allow-Origin`

---

## 6. Common Issues & Solutions

### Issue: "CORS Missing Allow Origin"
**Solution:**
1. Check `CORS_ORIGIN` in Railway backend variables
2. Ensure exact match: `https://victorious-gentleness-production.up.railway.app`
3. No trailing slash, no spaces
4. Redeploy backend

### Issue: "NetworkError when attempting to fetch resource"
**Solution:**
1. Check frontend `VITE_API_URL` is set correctly
2. Clear browser cache (Application → Storage → Clear site data)
3. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### Issue: "0 activities" or empty array
**Solution:**
1. Check backend logs for Google Sheets connection errors
2. Verify `DATA_BACKEND=sheets` (not `memory`)
3. Verify Google Sheet is shared with service account email
4. Check `GS_SHEET_ID` is correct

### Issue: Backend returns 502 or crashes
**Solution:**
1. Check Railway backend logs
2. Verify `Root Directory` is set to `server`
3. Verify `Start Command` is correct
4. Check all required environment variables are set

---

## 7. Step-by-Step Fix Procedure

### Step 1: Fix CORS in Railway Backend
1. Go to Railway → Your Project → Backend Service
2. Click "Variables" tab
3. Find `CORS_ORIGIN`
4. Set value to: `https://victorious-gentleness-production.up.railway.app`
5. **Double-check:** No trailing slash, no spaces
6. Click "Save"
7. Service will auto-redeploy

### Step 2: Verify Google Sheets Variables
1. In same Variables tab, verify:
   - `DATA_BACKEND=sheets`
   - `GS_SERVICE_ACCOUNT` is set (email address)
   - `GS_PRIVATE_KEY` is set (full key with `\n`)
   - `GS_SHEET_ID` is set (sheet ID from URL)
2. If any missing, add them

### Step 3: Check Backend Logs
1. Go to Railway → Backend Service → Deployments
2. Click latest deployment → View Logs
3. Look for:
   - `✅ Data store initialized: sheets`
   - `✅ Server listening on port...`
   - Any error messages

### Step 4: Test Backend API
```bash
# Test health
curl https://parc-ton-gosse-backend-production.up.railway.app/api/health

# Test CORS
curl -i -H "Origin: https://victorious-gentleness-production.up.railway.app" \
  https://parc-ton-gosse-backend-production.up.railway.app/api/activities

# Test activities
curl https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```

### Step 5: Verify Frontend
1. Go to Railway → Frontend Service → Variables
2. Verify `VITE_API_URL=https://parc-ton-gosse-backend-production.up.railway.app/api`
3. No trailing slash, no spaces
4. Redeploy frontend if changed

### Step 6: Test in Browser
1. Open frontend URL in browser
2. Open DevTools → Network tab
3. Hard refresh (Cmd+Shift+R)
4. Check `/api/activities` request:
   - Status should be `200`
   - Response should contain activities
   - Headers should include CORS headers

---

## 8. Current Status (Updated)

### ✅ Working
- Backend server is running and healthy
- CORS headers are correctly configured (verified via curl)
- Frontend is deployed
- Google Sheets integration code is correct
- CORS middleware returns correct `Access-Control-Allow-Origin` header

### ❌ Not Working
- Activities endpoint is timing out (likely Google Sheets connection issue)
- Frontend cannot fetch activities (due to timeout, not CORS)

### ⚠️ Needs Verification
- Google Sheets credentials in Railway backend variables
- `DATA_BACKEND=sheets` must be set (not `memory`)
- Google Sheet must be shared with service account email
- Backend logs should show `✅ Data store initialized: sheets`

### 🔍 Test Results
```bash
# CORS Test: ✅ PASSING
curl -i -H "Origin: https://victorious-gentleness-production.up.railway.app" \
  https://parc-ton-gosse-backend-production.up.railway.app/api/activities
# Returns: access-control-allow-origin: https://victorious-gentleness-production.up.railway.app

# Health Check: ✅ PASSING
curl https://parc-ton-gosse-backend-production.up.railway.app/api/health
# Returns: {"ok":true,"status":"healthy",...}

# Activities Endpoint: ❌ TIMING OUT
curl https://parc-ton-gosse-backend-production.up.railway.app/api/activities
# Times out after 15 seconds - indicates Google Sheets connection issue
```

---

## 9. Next Steps

1. **IMMEDIATE:** Fix `CORS_ORIGIN` in Railway backend service
2. **VERIFY:** Check backend logs for Google Sheets initialization
3. **TEST:** Use curl commands above to verify API works
4. **DEPLOY:** Redeploy both services if variables changed
5. **VALIDATE:** Test in browser with DevTools open

---

## 10. Support Commands

### Check Backend Status
```bash
curl -s https://parc-ton-gosse-backend-production.up.railway.app/api/health | jq
```

### Test CORS Headers
```bash
curl -i -H "Origin: https://victorious-gentleness-production.up.railway.app" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS \
  https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```

### Get Activities Count
```bash
curl -s https://parc-ton-gosse-backend-production.up.railway.app/api/activities | jq 'length'
```

---

**Last Updated:** $(date)  
**Next Review:** After CORS fix deployment

