# Verify Base64 Key Setup

## Current Status

✅ You've set `GS_PRIVATE_KEY_BASE64` in Railway  
✅ You've kept `GS_PRIVATE_KEY` as well (that's fine - code will use base64 first)  
❌ Activities endpoint still timing out

---

## How the Code Works

The code prioritizes `GS_PRIVATE_KEY_BASE64` if it exists:

```javascript
privateKey: process.env.GS_PRIVATE_KEY_BASE64 
    ? Buffer.from(process.env.GS_PRIVATE_KEY_BASE64, 'base64').toString('utf-8')
    : process.env.GS_PRIVATE_KEY
```

**So if `GS_PRIVATE_KEY_BASE64` is set, it will use that and ignore `GS_PRIVATE_KEY`.**

---

## Verification Steps

### Step 1: Check Backend Logs

**Go to:** Railway → Backend Service → Deployments → Latest → View Logs

**Look for:**
- ✅ `✅ Detected base64-encoded key, decoded successfully` (if key is detected as base64)
- ✅ `✅ Data store initialized: sheets`
- ❌ `ERR_OSSL_UNSUPPORTED` (should NOT appear if base64 key works)
- ❌ `Sheet may not exist: error:1E08010C` (should NOT appear)

### Step 2: Verify Base64 Key Format

The base64 key should:
- ✅ Be a long string of letters, numbers, `+`, `/`, and `=` characters
- ✅ NO spaces or line breaks
- ✅ NO quotes around it in Railway
- ✅ Start with something like: `LS0tLS1CRUdJTi...` (which decodes to `-----BEGIN...`)

**To verify your base64 key is correct:**

1. **Copy the base64 string** from Railway
2. **Decode it** to check:
   ```bash
   echo "<your-base64-string>" | base64 -d
   ```
   Should show your private key with proper formatting (BEGIN/END markers, newlines)

3. **Or use online tool:**
   - Go to: https://www.base64decode.org/
   - Paste your base64 string
   - Click "Decode"
   - Should show your private key

### Step 3: Check Railway Variables

**Go to:** Railway → Backend Service → Variables

**Verify:**
- ✅ `GS_PRIVATE_KEY_BASE64` is set (long base64 string)
- ✅ `GS_SERVICE_ACCOUNT` is set (email address)
- ✅ `GS_SHEET_ID` is set (sheet ID)
- ✅ `DATA_BACKEND=sheets`

**You can keep `GS_PRIVATE_KEY`** - it won't hurt, but it won't be used if `GS_PRIVATE_KEY_BASE64` exists.

---

## Common Issues

### Issue: Base64 key is wrong format

**Symptoms:**
- Still getting `ERR_OSSL_UNSUPPORTED`
- Logs show key decoding errors

**Fix:**
1. Get your private key from JSON file
2. Encode it again:
   ```bash
   # Extract and encode:
   cat your-key.json | jq -r '.private_key' | base64
   ```
3. Copy the ENTIRE output (it's one long line)
4. Paste into Railway `GS_PRIVATE_KEY_BASE64` (no quotes)

### Issue: Base64 key has extra characters

**Symptoms:**
- Decoding fails
- Key doesn't start with `-----BEGIN`

**Fix:**
- Make sure you copied ONLY the base64 string
- No quotes, no spaces, no line breaks
- Should be one continuous string

### Issue: Service hasn't redeployed

**Symptoms:**
- Old errors still in logs
- No new deployment visible

**Fix:**
1. **Trigger a redeploy:**
   - Railway → Backend Service → Deployments
   - Click "Redeploy" or make a small change to trigger deploy
2. **Wait 2-3 minutes** for redeploy to complete
3. **Check logs again**

---

## Quick Test

After verifying everything:

```bash
# Should return JSON array (even if empty [])
curl -m 10 https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```

**If it still times out:**
1. Check backend logs for the exact error
2. Verify base64 key decodes correctly
3. Make sure service has redeployed

---

## Next Steps

1. **Check backend logs** - look for base64 detection message
2. **Verify base64 key** - decode it to ensure it's correct
3. **Wait for redeploy** - if you just set the variable, wait 1-2 minutes
4. **Test endpoint** - use curl command above

---

**If base64 key is set correctly and service has redeployed, the `ERR_OSSL_UNSUPPORTED` error should be gone!**

---

**Last Updated:** $(date)

