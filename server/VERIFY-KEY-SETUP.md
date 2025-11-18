# Verify Your Google Sheets Key Setup

## Current Status
❌ **Still getting "Invalid JWT Signature" error**

This means the private key doesn't match the service account.

---

## Step-by-Step Verification

### 1. Verify Service Account Email

**In your `.env` file, you should have:**
```env
GS_SERVICE_ACCOUNT=parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com
```

**Check in Google Cloud Console:**
1. Go to: https://console.cloud.google.com/
2. Select project: `parc-ton-gosse`
3. Navigate to: **IAM & Admin** → **Service Accounts**
4. Find the service account
5. **Verify the email matches exactly:** `parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com`

---

### 2. Generate New Key (IMPORTANT)

**You MUST generate a NEW key from the correct service account:**

1. In Google Cloud Console, click on the service account: `parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com`
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Choose **JSON** format
5. **Download the file**

---

### 3. Extract Private Key from JSON

**Open the downloaded JSON file.** It looks like:
```json
{
  "type": "service_account",
  "project_id": "parc-ton-gosse",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com",
  ...
}
```

**IMPORTANT:** 
- Copy the ENTIRE `private_key` value (the part between the quotes)
- Include the `\n` characters
- Include the BEGIN and END markers

---

### 4. Base64 Encode the Key

**Method 1: Using Terminal (Mac/Linux)**
```bash
# Save the private_key value to a file (including quotes and \n)
echo '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n' > key.txt

# Encode to base64
base64 -i key.txt

# Copy the output
```

**Method 2: Using Online Tool**
1. Go to: https://www.base64encode.org/
2. Paste the private_key value (including `\n` characters)
3. Click "Encode"
4. Copy the result

**Method 3: Using Node.js**
```bash
node -e "console.log(require('fs').readFileSync('key.txt').toString('base64'))"
```

---

### 5. Update .env File

**Open:** `server/.env`

**Update:**
```env
GS_PRIVATE_KEY_BASE64=<paste_the_base64_output_here>
```

**Make sure:**
- No quotes around the base64 value
- No spaces
- Just paste directly after the `=`

---

### 6. Verify Sheet Sharing

**The Google Sheet MUST be shared with the service account:**

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0
2. Click **Share** button (top right)
3. Add this email: `parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com`
4. Give it **Editor** permissions
5. Click **Send**

---

### 7. Test Again

```bash
cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse/server"
node test-google-auth.js
```

**You should see:**
```
✅ Successfully obtained access token!
✅ Successfully accessed sheet!
✅ All tests passed!
```

---

## Common Mistakes

### ❌ Wrong: Using old key
- You regenerated the key but didn't update `.env`
- **Fix:** Update `GS_PRIVATE_KEY_BASE64` with the new key

### ❌ Wrong: Key from different service account
- The key belongs to a different service account
- **Fix:** Generate key from the correct service account

### ❌ Wrong: Key not base64 encoded
- You pasted the raw key instead of base64
- **Fix:** Base64 encode the key first

### ❌ Wrong: Sheet not shared
- Service account doesn't have access to the sheet
- **Fix:** Share the sheet with the service account email

### ❌ Wrong: Wrong project
- Service account is in a different Google Cloud project
- **Fix:** Make sure you're using the correct project

---

## Quick Checklist

- [ ] Service account email matches: `parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com`
- [ ] Generated NEW key from this service account
- [ ] Extracted `private_key` from JSON file
- [ ] Base64 encoded the key
- [ ] Updated `GS_PRIVATE_KEY_BASE64` in `.env`
- [ ] Sheet is shared with service account email
- [ ] Test script passes

---

## Still Not Working?

If you've done all the above and it still doesn't work:

1. **Double-check the service account email** - it must match exactly
2. **Try deleting all keys** from the service account and creating a fresh one
3. **Verify the Google Cloud project** is correct
4. **Check the sheet ID** is correct: `1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0`

Share the test output if you need more help!

