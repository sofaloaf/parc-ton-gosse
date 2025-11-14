# Quick Verification Checklist

Use this checklist to verify everything is working after making changes in Railway.

---

## ✅ Step 1: Railway Backend Variables

Go to: **Railway → Backend Service → Variables**

Check these are set:

- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN=https://victorious-gentleness-production.up.railway.app` (no trailing slash, no spaces)
- [ ] `DATA_BACKEND=sheets` (exactly "sheets", not "memory")
- [ ] `GS_SERVICE_ACCOUNT=<your-service-account-email>`
- [ ] `GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` (in quotes, with \n)
- [ ] `GS_SHEET_ID=<your-sheet-id>` (no quotes, no spaces)
- [ ] `JWT_SECRET=<your-secret>` (at least 16 characters)

---

## ✅ Step 2: Railway Frontend Variables

Go to: **Railway → Frontend Service → Variables**

Check:

- [ ] `VITE_API_URL=https://parc-ton-gosse-backend-production.up.railway.app/api` (no trailing slash, no spaces)

---

## ✅ Step 3: Google Sheet Sharing

1. Open your Google Sheet
2. Click **"Share"** button
3. Verify the service account email (from `GS_SERVICE_ACCOUNT`) is listed
4. Verify it has **"Editor"** permissions
5. If not shared, add it and give "Editor" permissions

---

## ✅ Step 4: Backend Logs

Go to: **Railway → Backend Service → Deployments → Latest → View Logs**

Look for these messages:

### Good Signs ✅
- `✅ CORS configured for origins: https://victorious-gentleness-production.up.railway.app`
- `✅ Data store initialized: sheets`
- `✅ Server listening on port...`
- `✅ CORS allowed for origin: ...`

### Bad Signs ❌
- `⚠️ Falling back to memory backend` → Google Sheets credentials wrong
- `❌ Failed to initialize data store` → Check credentials
- `Invalid credentials` → Private key format wrong
- `Unable to parse range` → Sheet ID wrong or not shared
- `CORS blocked for origin` → CORS_ORIGIN doesn't match

---

## ✅ Step 5: Test Backend API

### Test 1: Health Check
```bash
curl https://parc-ton-gosse-backend-production.up.railway.app/api/health
```
**Expected:** `{"ok":true,"status":"healthy",...}`

### Test 2: CORS Headers
```bash
curl -i -H "Origin: https://victorious-gentleness-production.up.railway.app" \
  https://parc-ton-gosse-backend-production.up.railway.app/api/activities | grep -i "access-control"
```
**Expected:** `access-control-allow-origin: https://victorious-gentleness-production.up.railway.app`

### Test 3: Activities Endpoint
```bash
curl -m 10 https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```
**Expected:** JSON array (even if empty `[]`), NOT timeout

---

## ✅ Step 6: Test Frontend in Browser

1. Open: `https://victorious-gentleness-production.up.railway.app`
2. Open **DevTools** (F12 or Cmd+Option+I)
3. Go to **Network** tab
4. **Hard refresh** (Cmd+Shift+R / Ctrl+Shift+R)
5. Look for `/api/activities` request:
   - **Status:** Should be `200 OK` (not `CORS error` or timeout)
   - **Response:** Should contain activities array
   - **Headers:** Should include `Access-Control-Allow-Origin`

---

## ✅ Step 7: Verify Activities Load

1. On the frontend page, activities should be visible
2. Check browser console (DevTools → Console tab)
3. Should see NO errors related to:
   - CORS
   - Network errors
   - Fetch failures

---

## Troubleshooting

### If activities endpoint times out:
1. Check backend logs for Google Sheets errors
2. Verify `GS_PRIVATE_KEY` format (with `\n`, in quotes)
3. Verify Google Sheet is shared with service account
4. Verify `GS_SHEET_ID` is correct

### If CORS errors in browser:
1. Verify `CORS_ORIGIN` matches frontend URL exactly
2. Clear browser cache
3. Hard refresh
4. Check Network tab for actual error message

### If "0 activities" shown:
1. Check if Google Sheet has data in "Activities" tab
2. Check backend logs for data loading errors
3. Verify column names match expected format

---

## Success Criteria

✅ All checklist items completed  
✅ Backend health check returns `{"ok":true}`  
✅ Activities endpoint returns JSON (not timeout)  
✅ CORS headers are present  
✅ Frontend loads activities without errors  
✅ Browser Network tab shows `200 OK` for `/api/activities`

---

**Last Updated:** $(date)

