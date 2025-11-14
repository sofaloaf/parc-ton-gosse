# Fix: Base64 Key Has Quotes

## 🔴 Problem Found!

Your base64 key starts with `"Ii0tLS0tQkVHSU4gUFJJ........."`

**The problem:** The base64 string has **quotes around it** (`"`), which shouldn't be there!

When base64-decoded, `Ii0tLS0tQkVHSU4gUFJJ` becomes: `"--BEGIN PRI...` (with quotes!)

This means your private key has quotes in it, which will cause OpenSSL to fail.

---

## The Fix

### Step 1: Remove Quotes from Railway Variable

**Go to:** Railway → Backend Service → Variables → `GS_PRIVATE_KEY_BASE64`

**Current (WRONG):**
```
"Ii0tLS0tQkVHSU4gUFJJ........."
```

**Should be (CORRECT):**
```
Ii0tLS0tQkVHSU4gUFJJ.........
```

**Remove the quotes!** Just paste the base64 string directly, no quotes needed.

---

### Step 2: Verify the Base64 Key

After removing quotes, verify it decodes correctly:

```bash
echo "Ii0tLS0tQkVHSU4gUFJJ<rest-of-your-key>" | base64 -d | head -c 100
```

**Should show:**
```
-----BEGIN PRIVATE KEY-----
```

**NOT:**
```
"--BEGIN PRIVATE KEY-----
```

---

### Step 3: How to Get the Correct Base64 Key

If you need to regenerate the base64 key:

1. **Get your private key from JSON:**
   - Open your service account JSON file
   - Find the `"private_key"` field
   - Copy the value (the part between quotes, including `\n`)

2. **Encode it correctly:**
   ```bash
   # On Mac/Linux:
   echo '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n' | base64
   
   # Or if you have the JSON file:
   cat your-key.json | jq -r '.private_key' | base64
   ```

3. **Copy the output** (it will be one long string, NO quotes)

4. **Paste into Railway** (NO quotes around it)

---

## Railway Variable Format

**In Railway, the value should be:**
```
Ii0tLS0tQkVHSU4gUFJJ<rest-of-base64-string>
```

**NOT:**
```
"Ii0tLS0tQkVHSU4gUFJJ<rest-of-base64-string>"
```

Railway doesn't need quotes for environment variables - just paste the value directly.

---

## After Fixing

1. **Save** in Railway (remove the quotes)
2. **Wait 1-2 minutes** for redeploy
3. **Check logs** - should see:
   - ✅ `✅ Detected base64-encoded key, decoded successfully`
   - ✅ `✅ Data store initialized: sheets`
   - ✅ NO `ERR_OSSL_UNSUPPORTED` errors

4. **Test:**
   ```bash
   curl -m 10 https://parc-ton-gosse-backend-production.up.railway.app/api/activities
   ```

---

## Quick Check

To verify your current base64 key (with quotes removed):

```bash
# Replace with your full base64 string (no quotes):
echo "<your-full-base64-string>" | base64 -d | head -c 50
```

**Should output:**
```
-----BEGIN PRIVATE KEY-----
```

If it shows quotes or other characters, the key is wrong.

---

**The issue is the quotes around the base64 string in Railway! Remove them and it should work.**

---

**Last Updated:** $(date)

