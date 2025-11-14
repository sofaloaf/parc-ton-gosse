# Fix: Base64 Key Was Encoded With Quotes

## 🔴 The Problem

Your base64 key starts with `Ii0tLS0tQkVHSU4gUFJJ...`

When decoded, this becomes: `"-----BEGIN PRI...`

**This means:** The base64 was created by encoding a string that **already had quotes around it**.

The private key should start with `-----BEGIN PRIVATE KEY-----` (no quotes), but your base64 decodes to `"-----BEGIN PRIVATE KEY-----` (with a quote).

---

## The Solution

You need to **re-encode the private key WITHOUT quotes**.

### Step 1: Get the Private Key from JSON

1. **Open your service account JSON file**
2. **Find the `"private_key"` field**
3. **Copy the VALUE** (the part between the quotes, NOT including the quotes themselves)

**Example:**
```json
"private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

**Copy this part (WITHOUT the outer quotes):**
```
-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n
```

### Step 2: Encode It Correctly

**Option A: Using Terminal (Mac/Linux)**

```bash
# If you have the JSON file:
cat your-service-account-key.json | jq -r '.private_key' | base64

# Or if you copied the key value to a file:
cat key.txt | base64
```

**Option B: Using Online Tool**

1. Go to: https://www.base64encode.org/
2. Paste the private key value (WITHOUT quotes):
   ```
   -----BEGIN PRIVATE KEY-----
   MIIE...
   -----END PRIVATE KEY-----
   ```
3. Click "Encode"
4. Copy the base64 output

**Option C: Using Node.js**

```bash
node -e "const fs = require('fs'); const key = JSON.parse(fs.readFileSync('your-key.json')).private_key; console.log(Buffer.from(key).toString('base64'));"
```

### Step 3: Verify the New Base64

Before pasting into Railway, verify it decodes correctly:

```bash
echo "<new-base64-string>" | base64 -d | head -c 50
```

**Should show:**
```
-----BEGIN PRIVATE KEY-----
```

**NOT:**
```
"-----BEGIN PRIVATE KEY-----
```

### Step 4: Update Railway

1. **Go to:** Railway → Backend Service → Variables → `GS_PRIVATE_KEY_BASE64`
2. **Replace the value** with the new base64 string (no quotes)
3. **Save**

---

## Quick Fix: Extract Key from Current Base64

If you want to fix it quickly without re-encoding:

1. **Decode your current base64:**
   ```bash
   echo "<your-current-base64>" | base64 -d > decoded-key.txt
   ```

2. **Remove the quotes** from the decoded file:
   ```bash
   # Remove first and last character if they're quotes
   sed 's/^"//;s/"$//' decoded-key.txt > fixed-key.txt
   ```

3. **Re-encode:**
   ```bash
   cat fixed-key.txt | base64
   ```

4. **Use the new base64** in Railway

---

## What Went Wrong

You likely:
1. Copied the entire `"private_key": "..."` line from JSON (with quotes)
2. Or encoded a string that had quotes around it
3. Then base64-encoded that quoted string

**The fix:** Encode ONLY the key value itself (without the JSON quotes).

---

## After Fixing

1. **Save** in Railway
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

**The base64 needs to be created from the key value WITHOUT quotes!**

---

**Last Updated:** $(date)

