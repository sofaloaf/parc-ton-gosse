# Verify Base64 Key is Working

## Current Status

✅ You created a new base64 key using `jq -r`  
✅ Base64 ends with `==` (normal padding)  
❌ Still getting `ERR_OSSL_UNSUPPORTED` errors

---

## The Problem

The error is still happening, which means either:
1. Railway isn't using the base64 key (maybe still using old `GS_PRIVATE_KEY`)
2. The base64 key isn't being decoded correctly
3. There's still a format issue

---

## Step 1: Verify Base64 Key in Railway

**Go to:** Railway → Backend Service → Variables

**Check:**
- ✅ `GS_PRIVATE_KEY_BASE64` is set (long string ending with `==`)
- ✅ `GS_SERVICE_ACCOUNT` is set
- ✅ `GS_SHEET_ID` is set
- ✅ `DATA_BACKEND=sheets`

**Optional but recommended:**
- ❌ **DELETE `GS_PRIVATE_KEY`** (the old one) to ensure Railway uses base64
- This prevents any confusion about which key is being used

---

## Step 2: Verify Your Base64 Decodes Correctly

**In Terminal, run:**

```bash
echo "<paste-your-base64-from-railway>" | base64 -d | head -c 100
```

**Replace `<paste-your-base64-from-railway>` with the actual value from Railway**

**Should show:**
```
-----BEGIN PRIVATE KEY-----
MIIE...
```

**Should NOT show:**
- Quotes at the start (`"-----BEGIN`)
- Literal `\n` text
- Should have actual line breaks

---

## Step 3: Check Backend Logs After Redeploy

**After the code changes I just made, the logs will show:**

**Look for these messages:**
- ✅ `✅ Using GS_PRIVATE_KEY_BASE64 (base64-encoded)`
- ✅ `✅ Base64 key decoded successfully`
- ✅ `Key preview (first 50 chars): -----BEGIN PRIVATE KEY-----`
- ✅ `Key has newlines: true`

**If you see:**
- ⚠️ `⚠️ Using GS_PRIVATE_KEY (not base64-encoded)` - Railway isn't using the base64 key!
- ❌ `❌ Failed to decode GS_PRIVATE_KEY_BASE64` - Base64 format is wrong

---

## Step 4: Remove Old GS_PRIVATE_KEY (Important!)

**To ensure Railway uses the base64 key:**

1. **Go to:** Railway → Backend Service → Variables
2. **Find** `GS_PRIVATE_KEY`
3. **Click the delete/trash icon** to remove it
4. **Save**

**This ensures Railway ONLY uses `GS_PRIVATE_KEY_BASE64`**

---

## Step 5: Test After Changes

**After removing old key and redeploy:**

1. **Wait 1-2 minutes** for redeploy
2. **Check logs** - should see the new messages above
3. **Test:**
   ```bash
   curl -m 10 https://parc-ton-gosse-backend-production.up.railway.app/api/activities
   ```

---

## What I Just Fixed

1. **Added logging** to show which key is being used
2. **Added verification** that base64 decodes correctly
3. **Fixed rate limit warning** (trust proxy setting)
4. **Better error messages** if base64 is invalid

---

## If Still Not Working

**Check the logs for:**

1. **Which key is being used:**
   - If you see `⚠️ Using GS_PRIVATE_KEY` - Railway isn't reading the base64 key
   - If you see `✅ Using GS_PRIVATE_KEY_BASE64` - Good, it's using base64

2. **Key preview:**
   - Should start with `-----BEGIN PRIVATE KEY-----`
   - Should NOT start with `"-----BEGIN`

3. **Newlines:**
   - Should say `Key has newlines: true`
   - If it says `false`, the key format is still wrong

---

## Quick Test Command

**To test your base64 locally before putting in Railway:**

```bash
# Replace with your base64 from Railway:
echo "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2QUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktZZ2dnU2lBZ0VBQW9JQkFRRElFZnQyRVc1ZGtwNm0KV3o4NCtqbUhKNXpoclljWktwNFZPejk0Vk5qV0g1MlpuZDZhSGQ4WkNM..." | base64 -d | head -c 100
```

**Should output:**
```
-----BEGIN PRIVATE KEY-----
MIIE...
```

---

**The `==` at the end is normal - that's base64 padding. The important thing is that it decodes correctly!**

---

**After removing `GS_PRIVATE_KEY` and redeploying, check the logs to see which key is being used!**

---

**Last Updated:** $(date)

