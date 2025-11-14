# Fix Google Sheets Private Key in Railway

## ⚠️ Important Security Note

**You've shared your private key in the conversation.** For security:
1. **Rotate this key** - Generate a new service account key in Google Cloud Console
2. **Delete the old key** from Google Cloud Console
3. **Update Railway** with the new key

---

## Current Issue

The activities endpoint is still timing out, which suggests the `GS_PRIVATE_KEY` might not be formatted correctly in Railway's environment variables.

---

## How to Set GS_PRIVATE_KEY in Railway

### Method 1: Single Line with \n (Recommended)

1. Go to **Railway → Backend Service → Variables**
2. Find or add `GS_PRIVATE_KEY`
3. **Copy your ENTIRE private key** (from `-----BEGIN` to `-----END`)
4. **Keep it as ONE line** with `\n` characters
5. **Wrap it in EITHER double quotes OR single quotes** (NOT both!)

**Example format in Railway (Option A - Double Quotes):**
```
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIEZt2EW5dkp6m\nWz84+jmHJ5zhrYcZKp4VOz94VNjWH52Znd6aHd8ZCLOYkV0FeGCJkkGfbIhdtXfi\n...rest of key...\n-----END PRIVATE KEY-----\n"
```

**Example format in Railway (Option B - Single Quotes):**
```
GS_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIEZt2EW5dkp6m\nWz84+jmHJ5zhrYcZKp4VOz94VNjWH52Znd6aHd8ZCLOYkV0FeGCJkkGfbIhdtXfi\n...rest of key...\n-----END PRIVATE KEY-----\n'
```

**⚠️ IMPORTANT:** Use EITHER `"..."` OR `'...'`, but NOT `'"..."'` (both quotes together will cause errors)

### Method 2: If Method 1 Doesn't Work

Sometimes Railway has issues with `\n` in environment variables. Try:

1. **Convert `\n` to actual newlines:**
   - Copy your key
   - In a text editor, replace `\n` with actual line breaks
   - Copy the multi-line version
   - Paste into Railway (it should preserve newlines)

2. **Or use single quotes:**
   ```
   GS_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n'
   ```

---

## Verification Checklist

After setting the key in Railway:

### Step 1: Check Backend Logs

Go to: **Railway → Backend Service → Deployments → Latest → View Logs**

Look for:
- ✅ `✅ Data store initialized: sheets` (GOOD!)
- ❌ `⚠️ Falling back to memory backend` (BAD - key format issue)
- ❌ `Invalid credentials` (BAD - key format or service account issue)
- ❌ `Unable to parse range` (BAD - sheet ID or sharing issue)

### Step 2: Verify All Variables

In Railway Backend Service Variables, ensure:

```
✅ DATA_BACKEND=sheets
✅ GS_SERVICE_ACCOUNT=your-service-account@project-id.iam.gserviceaccount.com
✅ GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
✅ GS_SHEET_ID=your-sheet-id-here
```

### Step 3: Verify Google Sheet Sharing

1. Open your Google Sheet
2. Click **"Share"** button (top right)
3. Add the service account email (from `GS_SERVICE_ACCOUNT`)
4. Give it **"Editor"** permissions
5. Click **"Send"** or **"Done"**

**Important:** The service account email must match exactly what's in `GS_SERVICE_ACCOUNT`.

### Step 4: Test the Endpoint

```bash
# Should return activities array (even if empty [])
curl -m 10 https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```

If it still times out:
- Check backend logs for specific error messages
- Verify sheet ID is correct
- Verify sheet has an "Activities" tab
- Try regenerating the service account key

---

## Common Issues

### Issue: "Invalid credentials" in logs
**Causes:**
- Private key format wrong (missing `\n` or has extra characters)
- Service account email doesn't match
- Key was corrupted when pasting into Railway

**Fix:**
- Regenerate the service account key
- Copy it carefully (entire key from BEGIN to END)
- Paste into Railway with quotes

### Issue: "Unable to parse range" in logs
**Causes:**
- Sheet ID is wrong
- Sheet doesn't have an "Activities" tab
- Sheet isn't shared with service account

**Fix:**
- Verify `GS_SHEET_ID` matches the ID in your Google Sheets URL
- Check that the sheet has an "Activities" tab (case-sensitive)
- Verify sharing permissions

### Issue: Still timing out after fixing
**Causes:**
- Google Sheets API quota exceeded
- Network issues
- Sheet is very large

**Fix:**
- Check Google Cloud Console for API quota limits
- Try with a smaller test sheet first
- Check Railway logs for specific error messages

---

## Quick Test Script

After setting variables, wait 1-2 minutes for redeploy, then:

```bash
# Test health (should work)
curl https://parc-ton-gosse-backend-production.up.railway.app/api/health

# Test activities (should return JSON, not timeout)
curl -m 10 https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```

---

## Security Reminder

**⚠️ IMPORTANT:** Since you've shared your private key:
1. Go to Google Cloud Console
2. Navigate to: IAM & Admin → Service Accounts
3. Find your service account
4. Go to "Keys" tab
5. Delete the key you shared
6. Create a new key
7. Update Railway with the new key

---

**Last Updated:** $(date)

