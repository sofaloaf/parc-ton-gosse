# Load 130+ Activities - Guide

## Current Status
- Backend is working: ✅
- Backend URL: `https://parc-ton-gosse-backend-production.up.railway.app`
- Current activities: 3 (from memory backend)
- Needed: 130+ activities

## Option 1: Switch to Google Sheets Backend (Recommended)

If you have your 130+ activities in a Google Sheet:

### Step 1: Configure Google Sheets in Railway
1. Go to Railway → Backend service → Variables
2. Add/Update these variables:
   ```
   DATA_BACKEND=sheets
   GS_SERVICE_ACCOUNT=your-service-account@project-id.iam.gserviceaccount.com
   GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
   GS_SHEET_ID=your-sheet-id
   ```
3. Redeploy backend service

### Step 2: Verify
```bash
curl https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```
Should return all activities from your Google Sheet.

## Option 2: Import CSV via API

If you have a CSV file with all 130+ activities:

### Step 1: Get Admin Token
1. Login to your site as admin
2. Get JWT token from browser DevTools → Application → Cookies
3. Or use the login endpoint:
   ```bash
   curl -X POST https://parc-ton-gosse-backend-production.up.railway.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"admin123"}' \
     -c cookies.txt
   ```

### Step 2: Import CSV
```bash
curl -X POST https://parc-ton-gosse-backend-production.up.railway.app/api/import/csv/activities \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@your-activities.csv"
```

### Step 3: Verify
```bash
curl https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```

## Option 3: Fix Frontend Connection First

The "NetworkError" banner suggests the frontend might not be connecting. Check:

1. **Frontend Environment Variable:**
   - Railway → Frontend service → Variables
   - Ensure `VITE_API_URL=https://parc-ton-gosse-backend-production.up.railway.app/api`
   - Redeploy frontend after setting

2. **Test in Browser Console:**
   - Open site → DevTools → Console
   - Look for API errors
   - Check Network tab for failed requests

## Quick Fix: Verify Frontend is Calling Backend

The frontend code should automatically detect Railway and use the correct backend URL. But if `VITE_API_URL` is set incorrectly, it might override this.

**Action:** Check Railway frontend service variables and ensure `VITE_API_URL` matches the backend URL exactly.

