# Fix: ERR_OSSL_UNSUPPORTED Private Key Error

## 🔴 The Problem

Your backend logs show:
```
Error: error:1E08010C:DECODER routines::unsupported
code: 'ERR_OSSL_UNSUPPORTED'
```

This means **OpenSSL cannot decode your private key**. The key format is incorrect or corrupted.

---

## Root Cause

The `GS_PRIVATE_KEY` in Railway is not being parsed correctly. The `\n` (newline) characters are likely:
- Not being interpreted as actual newlines
- Or the key format is corrupted when pasted into Railway

---

## Solution: Fix the Private Key Format

### Step 1: Get a Fresh Private Key

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/
   - Select your project
   - Navigate to: **IAM & Admin → Service Accounts**

2. **Find your service account** and click it

3. **Go to "Keys" tab**

4. **Delete the old key** (the one that's causing errors)

5. **Create a new key:**
   - Click "Add Key" → "Create new key"
   - Choose **JSON** format
   - Download the JSON file

6. **Extract the private key:**
   - Open the downloaded JSON file
   - Find the `private_key` field
   - Copy the ENTIRE value (from `-----BEGIN` to `-----END`)

---

### Step 2: Format for Railway

**Option A: Single Line with `\n` (Recommended)**

In Railway → Backend Service → Variables → `GS_PRIVATE_KEY`:

1. **Start with a double quote:** `"`
2. **Paste the entire key** (it will be on multiple lines in the JSON)
3. **Manually replace each actual newline with:** `\n`
4. **End with a double quote:** `"`

**Example:**
```
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIEZt2EW5dkp6m\nWz84+jmHJ5zhrYcZKp4VOz94VNjWH52Znd6aHd8ZCLOYkV0FeGCJkkGfbIhdtXfi\n...rest of key...\n-----END PRIVATE KEY-----\n"
```

**Important:** 
- Each line break in the original key becomes `\n`
- The entire thing is on ONE line in Railway
- Wrapped in double quotes

---

### Step 3: Alternative - Use Base64 Encoding (If Option A Doesn't Work)

If the `\n` approach doesn't work, try encoding the key:

1. **Take your private key** (with actual newlines)
2. **Base64 encode it:**
   ```bash
   # On Mac/Linux:
   cat private-key.txt | base64
   
   # Or use an online tool: https://www.base64encode.org/
   ```

3. **In Railway, set:**
   ```
   GS_PRIVATE_KEY_BASE64=<base64-encoded-key>
   ```

4. **Then update the code to decode it** (I can help with this if needed)

---

### Step 4: Verify the Format

After setting the key in Railway:

1. **Save the variable**
2. **Wait for redeploy** (1-2 minutes)
3. **Check backend logs** - should see:
   - ✅ `✅ Data store initialized: sheets`
   - ❌ NOT `ERR_OSSL_UNSUPPORTED`

---

## Quick Test

After fixing, test:

```bash
curl -m 10 https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```

Should return JSON (even if empty `[]`), not timeout.

---

## Common Mistakes

### ❌ Wrong: Actual newlines in Railway
```
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIE...
-----END PRIVATE KEY-----"
```
Railway might not preserve these correctly.

### ❌ Wrong: Missing quotes
```
GS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
```
Special characters won't be handled.

### ❌ Wrong: Double quotes inside
```
GS_PRIVATE_KEY='"-----BEGIN..."'
```
Using both single and double quotes.

### ✅ Correct: Single line with `\n`
```
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

---

## If Still Not Working

1. **Regenerate the service account key** (get a fresh one)
2. **Copy it carefully** - ensure no extra spaces or characters
3. **Try the base64 encoding method** (Option B above)
4. **Check Railway logs** for the exact error after redeploy

---

**The key is: The private key MUST have proper newlines (`\n` characters) for OpenSSL to decode it correctly.**

---

**Last Updated:** $(date)

