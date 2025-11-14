# 🔴 FINAL FIX: Private Key Format Error

## Current Status

✅ Data store says "initialized: sheets"  
❌ But API calls fail with `ERR_OSSL_UNSUPPORTED`

**This means:** The key format is still wrong. The store initializes, but when it tries to actually use Google Sheets API, the private key can't be decoded.

---

## The Problem

The error happens when trying to **sign a JWT token** for Google authentication. OpenSSL cannot decode your private key because:

1. The `\n` characters are not being converted to actual newlines
2. Or the key is corrupted when stored in Railway
3. Or there are extra characters/spaces

---

## Solution: Use the EXACT Format from JSON

### Step 1: Get Fresh Key from Google Cloud

1. **Google Cloud Console** → Your Project
2. **IAM & Admin** → **Service Accounts**
3. Click your service account → **Keys** tab
4. **Delete old key** → **Create new key** → **JSON**
5. **Download** the JSON file

### Step 2: Extract the Key Correctly

Open the JSON file. You'll see something like:

```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIEZt2EW5dkp6m\nWz84+jmHJ5zhrYcZKp4VOz94VNjWH52Znd6aHd8ZCLOYkV0FeGCJkkGfbIhdtXfi\n...many more lines...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  ...
}
```

**Copy the ENTIRE value of `"private_key"`** - from the opening quote after `"private_key":` to the closing quote before the comma.

### Step 3: Set in Railway (CRITICAL FORMAT)

**Go to:** Railway → Backend Service → Variables → `GS_PRIVATE_KEY`

**Paste it EXACTLY like this:**

1. **Start with a double quote:** `"`
2. **Paste the key value** (the part between the quotes in JSON)
3. **Keep all the `\n` characters** (they should be literal backslash-n, not actual newlines)
4. **End with a double quote:** `"`

**Example:**
```
"-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIEZt2EW5dkp6m\nWz84+jmHJ5zhrYcZKp4VOz94VNjWH52Znd6aHd8ZCLOYkV0FeGCJkkGfbIhdtXfi\njP36fBd89k4DaDtAyOegguMhGUSsv5HxJNQkBPymdky+YRU9nIfmVZ5kJntx9JsT\neSXYunAWlocb1sNrpgIeNXY5pcDY2PuiiIrPcQZnG4b0oInor9X0hcD32W2+QuRv\n...rest of your key...\n-----END PRIVATE KEY-----\n"
```

**IMPORTANT:**
- ✅ The entire thing is on **ONE line** in Railway
- ✅ Contains `\n` (backslash + n), NOT actual line breaks
- ✅ Wrapped in double quotes
- ✅ Replace the example above with YOUR actual key

---

## Alternative: If `\n` Doesn't Work

If Railway is still having issues with `\n`, try this:

### Option A: Use Single Quotes
```
'-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n'
```

### Option B: Base64 Encode the Key

1. **Take your private key** (with actual newlines from JSON)
2. **Base64 encode it:**
   ```bash
   # On Mac/Linux:
   echo "-----BEGIN PRIVATE KEY-----
   MIIE...
   -----END PRIVATE KEY-----" | base64
   ```

3. **In Railway, set:**
   ```
   GS_PRIVATE_KEY_BASE64=<base64-encoded-value>
   ```

4. **I'll need to update the code** to decode it (let me know if you want this approach)

---

## Verification

After setting the key:

1. **Save** in Railway
2. **Wait 1-2 minutes** for redeploy
3. **Check logs** - should see:
   - ✅ `✅ Data store initialized: sheets`
   - ✅ NO `ERR_OSSL_UNSUPPORTED` errors
   - ✅ NO "Sheet may not exist" warnings

4. **Test:**
   ```bash
   curl -m 10 https://parc-ton-gosse-backend-production.up.railway.app/api/activities
   ```
   Should return JSON array (even if empty `[]`)

---

## What I've Fixed in Code

I've improved the key parsing to:
- Remove surrounding quotes automatically
- Handle `\n` characters better
- Add proper newline at end
- Provide clearer error messages

**But you still need to fix the key format in Railway!**

---

## If Still Not Working

The issue might be that Railway is corrupting the key when you paste it. Try:

1. **Use Railway CLI** to set the variable:
   ```bash
   railway variables set GS_PRIVATE_KEY="$(cat key.txt)"
   ```
   (where `key.txt` contains your key with `\n`)

2. **Or use the JSON file directly** - some users have success pasting the entire JSON and extracting the key in code

3. **Contact Railway support** - they might have specific requirements for multi-line environment variables

---

**The key MUST have `\n` characters (literal backslash-n) for OpenSSL to decode it correctly.**

---

**Last Updated:** $(date)

