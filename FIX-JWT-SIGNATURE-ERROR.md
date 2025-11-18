# Fix: Invalid JWT Signature Error

## Problem

You're seeing this error:
```
invalid_grant: Invalid JWT Signature.
```

This means your Google Sheets private key is not formatted correctly.

---

## Quick Fix

### Option 1: Use Base64-Encoded Key (Recommended)

1. **Get your private key from Google Cloud Console:**
   - Download the JSON key file
   - Open it and copy the `private_key` value (the entire thing, including quotes)

2. **Encode it to base64:**
   ```bash
   # On Mac/Linux
   echo -n 'YOUR_PRIVATE_KEY_HERE' | base64
   
   # Or use an online tool: https://www.base64encode.org/
   ```

3. **Set in your `.env` file:**
   ```env
   GS_PRIVATE_KEY_BASE64=<paste_base64_encoded_key_here>
   ```

4. **Remove or comment out `GS_PRIVATE_KEY`:**
   ```env
   # GS_PRIVATE_KEY=...
   ```

### Option 2: Fix Private Key Format

Your `GS_PRIVATE_KEY` must have actual newlines, not `\n` characters.

**In your `.env` file, the key should look like this:**
```env
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(many lines of base64 characters)
...
-----END PRIVATE KEY-----"
```

**NOT like this:**
```env
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

---

## Step-by-Step Fix

### 1. Get Your Service Account Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **IAM & Admin** → **Service Accounts**
3. Find your service account
4. Click **Keys** → **Add Key** → **Create new key**
5. Choose **JSON** format
6. Download the file

### 2. Extract the Private Key

Open the downloaded JSON file. You'll see something like:
```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  ...
}
```

### 3. Copy the Private Key

**Method A: Use Base64 (Easiest)**

1. Copy the entire `private_key` value (including the quotes and `\n` characters)
2. Encode it to base64:
   ```bash
   # Save the key to a file first
   echo '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n' > key.txt
   
   # Encode to base64
   base64 -i key.txt
   ```
3. Copy the base64 output
4. Set in `.env`:
   ```env
   GS_PRIVATE_KEY_BASE64=<paste_base64_here>
   ```

**Method B: Fix Format Manually**

1. Copy the `private_key` value from JSON
2. Replace all `\n` with actual newlines
3. In your `.env` file, write it like this:
   ```env
   GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
   MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
   (paste all the base64 lines here, each on a new line)
   ...
   -----END PRIVATE KEY-----"
   ```

---

## Verify Your Fix

After updating your `.env` file:

1. **Restart the server:**
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart
   cd server && npm run dev
   ```

2. **Check the logs:**
   You should see:
   ```
   ✅ Private key format validated
   ✅ Google Sheets auth client created successfully
   ✅ Successfully obtained access token - credentials are valid
   ```

3. **Test the endpoint:**
   ```bash
   curl http://localhost:4000/api/health/datastore
   ```
   
   Should return:
   ```json
   {
     "status": "healthy",
     "activityCount": 131,
     "backend": "sheets"
   }
   ```

---

## Common Issues

### Issue: "Key has no newlines"
**Fix:** The key needs actual newlines, not `\n` characters. Use base64 encoding instead.

### Issue: "Key is too short"
**Fix:** Make sure you copied the entire key, including BEGIN and END markers.

### Issue: "Invalid JWT Signature" persists
**Fix:** 
1. Regenerate the service account key in Google Cloud Console
2. Make sure the service account email matches `GS_SERVICE_ACCOUNT`
3. Verify the sheet is shared with the service account email

---

## Alternative: Use Memory Backend (Temporary)

If you need to test the app while fixing the Google Sheets issue:

1. **Set in `.env`:**
   ```env
   DATA_BACKEND=memory
   ```

2. **Restart server:**
   ```bash
   cd server && npm run dev
   ```

This will use the in-memory backend with 3 sample activities.

---

## Need Help?

Check the server logs for detailed error messages. The new code will show:
- Key length
- Whether key has newlines
- Key preview
- Specific error messages

Share these logs if you need more help!

