# Solution: Use Base64-Encoded Private Key

## The Problem

Railway is having trouble preserving the `\n` characters in `GS_PRIVATE_KEY`, causing `ERR_OSSL_UNSUPPORTED` errors.

## Solution: Use Base64 Encoding

Instead of trying to preserve `\n` characters, we can **base64 encode** the entire private key. This avoids all formatting issues!

---

## Step-by-Step Instructions

### Step 1: Get Your Private Key

1. **Google Cloud Console** → Your Project
2. **IAM & Admin** → **Service Accounts**
3. Click your service account → **Keys** tab
4. **Create new key** → **JSON** (or use existing)
5. **Download** the JSON file

### Step 2: Extract and Encode the Key

**Option A: Using Terminal (Mac/Linux)**

1. Open the JSON file in a text editor
2. Find the `"private_key"` field
3. Copy the ENTIRE value (including the quotes and `\n` characters)
4. Save it to a file (e.g., `key.txt`)

5. **Base64 encode it:**
   ```bash
   # If you saved just the key value (without quotes):
   cat key.txt | base64
   
   # Or if you have the full JSON, extract and encode:
   # (Replace with your actual JSON file path)
   cat your-service-account-key.json | jq -r '.private_key' | base64
   ```

6. **Copy the base64 output** (it will be a long string)

**Option B: Using Online Tool**

1. Open your JSON file
2. Copy the `"private_key"` value (the part between quotes)
3. Go to: https://www.base64encode.org/
4. Paste the key value
5. Click "Encode"
6. Copy the base64 output

**Option C: Using Node.js**

```bash
node -e "const fs = require('fs'); const key = JSON.parse(fs.readFileSync('your-key.json')).private_key; console.log(Buffer.from(key).toString('base64'));"
```

---

### Step 3: Set in Railway

**Go to:** Railway → Backend Service → Variables

**Add/Update this variable:**
```
GS_PRIVATE_KEY_BASE64=<paste-your-base64-encoded-key-here>
```

**Important:**
- ✅ NO quotes needed
- ✅ NO `\n` characters
- ✅ Just paste the base64 string directly
- ✅ Can be on multiple lines if needed (base64 handles it)

**Example:**
```
GS_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2QUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktZZ2dnU2lBZ0VBQW9JQkFRRElFZnQyRVc1ZGtwNm0KV3o4NCtqbUhKNXpoclljWktwNFZPejk0Vk5qV0g1MlpuZDZhSGQ4WkNM...
```

---

### Step 4: Remove Old Variable (Optional)

You can **remove** `GS_PRIVATE_KEY` if you're using `GS_PRIVATE_KEY_BASE64` instead. The code will automatically use the base64 version if it exists.

---

### Step 5: Verify

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

## Why This Works

- **Base64 encoding** converts the entire key (including newlines) into a single string
- **No special characters** to worry about (`\n`, quotes, etc.)
- **Railway handles it easily** - just a regular string
- **Code automatically decodes it** when needed

---

## Advantages

✅ **No formatting issues** - base64 is just a string  
✅ **Works reliably** in Railway environment variables  
✅ **Easy to copy/paste** - no special character handling  
✅ **Same security** - base64 is just encoding, not encryption  

---

## If You Still Have Issues

1. **Verify the base64 string** is correct:
   ```bash
   echo "<your-base64-string>" | base64 -d
   ```
   Should show your private key with proper formatting

2. **Check Railway logs** for any new errors

3. **Try regenerating the key** and encoding again

---

**This approach avoids all the `\n` character issues!**

---

**Last Updated:** $(date)

