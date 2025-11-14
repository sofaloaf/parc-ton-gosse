# Diagnosing Activities Endpoint Timeout

## Current Problem

The `/api/activities` endpoint is **timing out** (15+ seconds), which means:
- Backend server is running ✅
- CORS is configured correctly ✅
- But Google Sheets connection is failing or hanging ❌

---

## Root Cause Analysis

### Possible Causes:

1. **Google Sheets API Timeout**
   - Google Sheets API request is hanging
   - No timeout configured in the code
   - Network issues between Railway and Google

2. **Missing or Incorrect Credentials**
   - `GS_SERVICE_ACCOUNT` doesn't match
   - `GS_PRIVATE_KEY` format issue (even if looks correct)
   - `GS_SHEET_ID` is wrong

3. **Google Sheet Not Shared**
   - Service account email doesn't have access
   - Permissions are wrong

4. **Sheet Structure Issues**
   - "Activities" tab doesn't exist
   - Sheet is empty or corrupted
   - Column names don't match

5. **Google API Quota/Error**
   - API quota exceeded
   - Service account disabled
   - Project billing issues

---

## Diagnostic Steps

### Step 1: Check Backend Logs

**Go to:** Railway → Backend Service → Deployments → Latest → View Logs

**Look for these messages:**

#### ✅ Good Signs:
```
✅ Data store initialized: sheets
✅ CORS configured for origins: ...
✅ Server listening on port...
```

#### ❌ Bad Signs:
```
⚠️ Falling back to memory backend
❌ Failed to initialize data store
Invalid credentials
Unable to parse range
Request timeout
```

**If you see "Falling back to memory backend":**
- Google Sheets connection failed during startup
- Check credentials format
- Check sheet sharing

**If you see NO errors but endpoint times out:**
- Connection might be hanging during request
- Google Sheets API might be slow
- Need to add timeout handling

---

### Step 2: Test Google Sheets Connection Directly

Create a test script to verify credentials work:

```javascript
// test-sheets.js
import { google } from 'googleapis';

const auth = new google.auth.JWT(
  process.env.GS_SERVICE_ACCOUNT,
  null,
  process.env.GS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

async function test() {
  try {
    console.log('Testing Google Sheets connection...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GS_SHEET_ID,
      range: 'Activities!A1:Z1', // Just get first row
    });
    console.log('✅ Connection successful!');
    console.log('Headers:', response.data.values?.[0]);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
  }
}

test();
```

**Run this locally:**
```bash
cd server
node test-sheets.js
```

---

### Step 3: Verify Railway Variables

**Go to:** Railway → Backend Service → Variables

**Check each variable carefully:**

1. **DATA_BACKEND**
   - Value: `sheets` (exactly, no quotes, no spaces)
   - NOT: `"sheets"` or `'sheets'` or `memory`

2. **GS_SERVICE_ACCOUNT**
   - Format: `your-service@project-id.iam.gserviceaccount.com`
   - No quotes needed
   - Must match the email in Google Cloud Console

3. **GS_PRIVATE_KEY**
   - Must start with `"-----BEGIN PRIVATE KEY-----\n`
   - Must end with `\n-----END PRIVATE KEY-----\n"`
   - All on ONE line
   - Contains `\n` characters (not actual newlines)

4. **GS_SHEET_ID**
   - Get from Google Sheets URL: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`
   - No quotes needed
   - No spaces

---

### Step 4: Verify Google Sheet Sharing

1. **Open your Google Sheet**
2. **Click "Share" button** (top right)
3. **Check if service account email is listed:**
   - Should see: `your-service@project-id.iam.gserviceaccount.com`
   - Should have **"Editor"** permissions
4. **If not shared:**
   - Click "Add people"
   - Paste the service account email
   - Select "Editor"
   - Click "Send"

---

### Step 5: Check Google Cloud Console

1. **Go to:** https://console.cloud.google.com/
2. **Select your project**
3. **Navigate to:** IAM & Admin → Service Accounts
4. **Find your service account**
5. **Check:**
   - ✅ Service account is enabled
   - ✅ Has "Editor" or "Viewer" role for the project
   - ✅ Keys tab shows active keys

6. **Check API Status:**
   - Go to: APIs & Services → Enabled APIs
   - Verify: **Google Sheets API** is enabled
   - Check for any quota/error messages

---

### Step 6: Test with Minimal Data

If your sheet is very large, try:

1. **Create a test sheet** with just a few rows
2. **Update `GS_SHEET_ID`** to point to test sheet
3. **Redeploy backend**
4. **Test endpoint again**

If test sheet works, the issue is with the main sheet (size, structure, or data).

---

## Quick Fixes to Try

### Fix 1: Regenerate Service Account Key

1. Go to Google Cloud Console
2. IAM & Admin → Service Accounts
3. Click your service account
4. Go to "Keys" tab
5. Delete old key
6. Create new key (JSON)
7. Extract new `GS_SERVICE_ACCOUNT` and `GS_PRIVATE_KEY`
8. Update Railway variables
9. Redeploy

### Fix 2: Verify Sheet Structure

Your Google Sheet should have:
- A tab named **"Activities"** (exact match, case-sensitive)
- At least one row of data (even if just headers)
- Column headers in the first row

### Fix 3: Check for Timeout in Code

The Google Sheets code might need a timeout. Check if there's a way to add timeout to the API calls.

### Fix 4: Use Memory Backend Temporarily

To test if the issue is Google Sheets:

1. Set `DATA_BACKEND=memory` in Railway
2. Redeploy
3. Test endpoint (should return empty array `[]` quickly)
4. If memory works, issue is definitely Google Sheets

---

## What to Check in Backend Logs

When you make a request to `/api/activities`, check logs for:

1. **Request received:**
   ```
   📥 GET /api/activities
   ```

2. **Data store access:**
   - Should see Google Sheets API calls
   - Should see data being read

3. **Errors:**
   - Any error messages
   - Stack traces
   - Timeout messages

---

## Next Steps

1. **Check backend logs** for specific error messages
2. **Verify all Railway variables** are set correctly
3. **Verify Google Sheet is shared** with service account
4. **Test with memory backend** to isolate the issue
5. **Check Google Cloud Console** for API issues

---

**Most Likely Issue:** Google Sheets connection is hanging because:
- Credentials are wrong (even if format looks correct)
- Sheet is not shared with service account
- Google Sheets API is timing out (need to add timeout handling)

---

**Last Updated:** $(date)

