# Railway Configuration Fix Guide

## 🔴 URGENT: Fix Required Now

Your backend CORS is **actually working correctly** (verified via curl), but the activities endpoint is timing out, which suggests a **Google Sheets connection issue**.

---

## Step 1: Fix CORS in Railway (Even Though It's Working)

**Location:** Railway Dashboard → Your Project → Backend Service → Variables Tab

### Set This Variable:
```
CORS_ORIGIN=https://victorious-gentleness-production.up.railway.app
```

**CRITICAL:**
- ✅ NO trailing slash
- ✅ NO spaces before or after
- ✅ Exact match to frontend URL

---

## Step 2: Verify Google Sheets Configuration

**Location:** Same Variables Tab (Backend Service)

### Required Variables for Google Sheets:

```
DATA_BACKEND=sheets
```

```
GS_SERVICE_ACCOUNT=your-service-account@project-id.iam.gserviceaccount.com
```

```
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

```
GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0
```

### Important Notes:

1. **GS_PRIVATE_KEY Format:**
   - Must include the entire key from the JSON file
   - Must include `\n` characters (they represent newlines)
   - Must be in quotes: `"..."` or `'...'`
   - Example format:
     ```
     GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...very long key...\n-----END PRIVATE KEY-----\n"
     ```

2. **GS_SHEET_ID:**
   - Get from Google Sheets URL: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`
   - NO quotes needed
   - NO spaces

3. **Service Account Sharing:**
   - Your Google Sheet MUST be shared with the service account email
   - Go to Google Sheet → Share button
   - Add the `GS_SERVICE_ACCOUNT` email
   - Give it "Editor" permissions

---

## Step 3: Verify All Backend Variables

**Location:** Railway → Backend Service → Variables

### Complete List (Backend Service):

```
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://victorious-gentleness-production.up.railway.app
DATA_BACKEND=sheets
JWT_SECRET=your-secret-key-here-min-16-chars
GS_SERVICE_ACCOUNT=your-service-account@project-id.iam.gserviceaccount.com
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GS_SHEET_ID=your-sheet-id-here
```

---

## Step 4: Verify Frontend Variables

**Location:** Railway → Frontend Service → Variables

### Required Variable:

```
VITE_API_URL=https://parc-ton-gosse-backend-production.up.railway.app/api
```

**CRITICAL:**
- ✅ NO trailing slash
- ✅ NO spaces
- ✅ Must end with `/api`

---

## Step 5: Check Backend Logs

**Location:** Railway → Backend Service → Deployments → Latest → View Logs

### Look For:

✅ **Good Signs:**
- `✅ CORS configured for origins: https://victorious-gentleness-production.up.railway.app`
- `✅ Data store initialized: sheets`
- `✅ Server listening on port...`

❌ **Bad Signs:**
- `⚠️ Falling back to memory backend`
- `❌ Failed to initialize data store`
- `Invalid credentials`
- `Unable to parse range`

---

## Step 6: Test After Changes

### Test 1: Health Check
```bash
curl https://parc-ton-gosse-backend-production.up.railway.app/api/health
```
Expected: `{"ok":true,"status":"healthy",...}`

### Test 2: CORS Headers
```bash
curl -i -H "Origin: https://victorious-gentleness-production.up.railway.app" \
  https://parc-ton-gosse-backend-production.up.railway.app/api/activities | grep -i "access-control"
```
Expected: `access-control-allow-origin: https://victorious-gentleness-production.up.railway.app`

### Test 3: Activities Endpoint
```bash
curl -m 10 https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```
Expected: JSON array (even if empty `[]`)

**If this times out:** Google Sheets connection is failing. Check:
1. `GS_SERVICE_ACCOUNT` is correct
2. `GS_PRIVATE_KEY` format is correct (with `\n`)
3. `GS_SHEET_ID` is correct
4. Google Sheet is shared with service account email

---

## Step 7: Redeploy Services

After changing variables:

1. **Backend:** Will auto-redeploy when you save variables
2. **Frontend:** May need manual redeploy if `VITE_API_URL` changed
   - Go to Frontend Service → Deployments
   - Click "Redeploy" or wait for auto-deploy

---

## Common Issues & Quick Fixes

### Issue: "CORS Missing Allow Origin" in Browser
**Fix:** 
- Verify `CORS_ORIGIN` in Railway backend variables
- Must be exact match: `https://victorious-gentleness-production.up.railway.app`
- Clear browser cache and hard refresh

### Issue: Activities Endpoint Times Out
**Fix:**
- Check `DATA_BACKEND=sheets` (not `memory`)
- Verify Google Sheets credentials are correct
- Check backend logs for Google Sheets errors
- Verify sheet is shared with service account

### Issue: "Invalid credentials" in Logs
**Fix:**
- Check `GS_SERVICE_ACCOUNT` email is correct
- Check `GS_PRIVATE_KEY` includes full key with `\n` characters
- Verify Google Sheet is shared with service account email

### Issue: "Unable to parse range" in Logs
**Fix:**
- Check `GS_SHEET_ID` is correct (from Google Sheets URL)
- Verify sheet has an "Activities" tab
- Check sheet is shared with service account

### Issue: Backend Returns Empty Array `[]`
**Fix:**
- This is OK if your Google Sheet is empty
- Check Google Sheet has data in "Activities" tab
- Verify column names match expected format (see SETUP-GOOGLE-SHEETS.md)

---

## Verification Checklist

Before testing in browser:

- [ ] `CORS_ORIGIN` set correctly in backend (no trailing slash, no spaces)
- [ ] `DATA_BACKEND=sheets` in backend
- [ ] `GS_SERVICE_ACCOUNT` set in backend
- [ ] `GS_PRIVATE_KEY` set correctly (with `\n`, in quotes)
- [ ] `GS_SHEET_ID` set correctly
- [ ] Google Sheet shared with service account email
- [ ] `VITE_API_URL` set correctly in frontend (ends with `/api`)
- [ ] Backend logs show `✅ Data store initialized: sheets`
- [ ] Backend logs show `✅ CORS configured for origins: ...`
- [ ] Health endpoint returns `{"ok":true}`
- [ ] Activities endpoint returns JSON (even if empty)

---

## Next Steps After Fix

1. **Wait for redeploy** (usually 1-2 minutes)
2. **Check backend logs** for initialization messages
3. **Test with curl** commands above
4. **Open frontend in browser** with DevTools Network tab open
5. **Hard refresh** (Cmd+Shift+R / Ctrl+Shift+R)
6. **Check Network tab** for `/api/activities` request:
   - Status should be `200 OK`
   - Response should contain activities array
   - Headers should include CORS headers

---

**Last Updated:** $(date)

