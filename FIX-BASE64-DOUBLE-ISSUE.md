# Fix: Base64 Has Quotes AND Literal \n

## 🔴 The Problem

Your base64 key:
- **Starts with:** `Ii0tLS0tQkVHSU4gUFJJVkFURSBLR`
- **Ends with:** `WlFZTA9XG4tLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tXG4i`

When decoded, this shows **TWO problems**:

1. **Has quotes** - decodes to `"-----BEGIN PRIVATE KEY...` (quote at start)
2. **Has literal `\n`** - the end shows `\n` as text, not actual newlines

**This means:** The base64 was created by encoding a JSON string value that had:
- Quotes around it: `"..."`
- Literal `\n` characters (backslash + n), not actual newlines

---

## The Solution

You need to create a NEW base64 from the **actual private key** (not the JSON string representation).

### Step 1: Get the Private Key from JSON

1. **Open your service account JSON file**
2. **Find the `"private_key"` field**
3. **The value will look like:**
   ```json
   "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
   ```

### Step 2: Extract and Process the Key

**Option A: Using jq (Recommended)**

```bash
# This extracts the key and converts \n to actual newlines:
cat your-service-account-key.json | jq -r '.private_key' | base64
```

The `jq -r` flag:
- Removes the JSON quotes
- Converts `\n` to actual newlines
- Outputs the proper PEM format

**Option B: Manual Method**

1. Copy the `private_key` value from JSON (between quotes)
2. In a text editor, replace all `\n` with actual newlines
3. Remove the quotes
4. Save to a file (e.g., `key.txt`)
5. Encode: `cat key.txt | base64`

**Option C: Using Node.js**

```bash
node -e "
const fs = require('fs');
const json = JSON.parse(fs.readFileSync('your-key.json'));
const key = json.private_key; // jq -r equivalent
console.log(Buffer.from(key).toString('base64'));
"
```

### Step 3: Verify the New Base64

Before using in Railway, verify:

```bash
echo "<new-base64>" | base64 -d | head -c 100
```

**Should show:**
```
-----BEGIN PRIVATE KEY-----
MIIE...
```

**Should NOT show:**
- Quotes at the start
- Literal `\n` text
- Should have actual line breaks

### Step 4: Update Railway

1. **Go to:** Railway → Backend Service → Variables → `GS_PRIVATE_KEY_BASE64`
2. **Replace** with the new base64 string
3. **Save**

---

## Quick Test

To verify your current base64 (to see the problems):

```bash
# Decode and show first 100 chars:
echo "Ii0tLS0tQkVHSU4gUFJJVkFURSBLR<rest>" | base64 -d | head -c 100

# Should show: "-----BEGIN PRIVATE KEY-----\n (with quote and \n as text)
```

After fixing, the new base64 should decode to:
```
-----BEGIN PRIVATE KEY-----
MIIE... (actual newlines, no quotes)
```

---

## What Went Wrong

You likely:
1. Copied the JSON string value directly (with quotes and `\n` as text)
2. Base64-encoded that string representation
3. Instead of encoding the actual key value

**The fix:** Use `jq -r` or manually convert `\n` to newlines before encoding.

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

**Use `jq -r` to extract the key properly - it handles both quotes and `\n` conversion!**

---

**Last Updated:** $(date)

