# Check Railway Variables - Debug Guide

## Current Issue

The logs show:
```
❌ Failed to initialize data store: Google Sheets credentials required but missing: GS_PRIVATE_KEY
```

**This means:** The code isn't finding `GS_PRIVATE_KEY_BASE64` in Railway!

---

## Step 1: Verify Variables in Railway

**Go to:** Railway → Backend Service → Variables Tab

**Check these variables exist:**

1. ✅ `GS_PRIVATE_KEY_BASE64` 
   - Should be a LONG string (hundreds of characters)
   - Should end with `==` or `=` (base64 padding)
   - Should contain letters, numbers, `+`, `/`, `=`

2. ✅ `GS_SERVICE_ACCOUNT`
   - Should be an email address
   - Format: `something@project-id.iam.gserviceaccount.com`

3. ✅ `GS_SHEET_ID`
   - Should be a string of letters, numbers, and dashes
   - No spaces

4. ✅ `DATA_BACKEND`
   - Should be exactly: `sheets`
   - NOT `"sheets"` or `'sheets'`

---

## Step 2: Check Variable Names

**Common mistakes:**

- ❌ `GS_PRIVATE_KEY_BASE_64` (wrong - has underscore)
- ❌ `GS_PRIVATE_KEY_BASE64 ` (wrong - has trailing space)
- ❌ `GS_PRIVATE_KEY_BASE64:` (wrong - has colon)
- ✅ `GS_PRIVATE_KEY_BASE64` (correct - exact match)

**The variable name must be EXACTLY:** `GS_PRIVATE_KEY_BASE64`

---

## Step 3: Check Variable Value

**For `GS_PRIVATE_KEY_BASE64`:**

1. **Click on the variable** to see its value
2. **Check:**
   - Is it a long string? (should be 500+ characters)
   - Does it start with letters/numbers? (like `LS0tLS1CRUdJTi...`)
   - Does it end with `==` or `=`?
   - Are there any spaces or line breaks in it?

3. **If it looks wrong:**
   - Delete the variable
   - Create it again
   - Paste the base64 string (no quotes, no spaces)

---

## Step 4: After Code Update

I've added detailed logging. After the next deploy, check logs for:

**Should see:**
```
🔍 Checking for private key...
GS_PRIVATE_KEY_BASE64 exists: true
GS_PRIVATE_KEY_BASE64 length: <some number>
✅ Using GS_PRIVATE_KEY_BASE64 (base64-encoded)
✅ Base64 key decoded successfully
```

**If you see:**
```
GS_PRIVATE_KEY_BASE64 exists: false
GS_PRIVATE_KEY_BASE64 length: 0
❌ Neither GS_PRIVATE_KEY_BASE64 nor GS_PRIVATE_KEY is set
```

**This means:** Railway doesn't have the variable set, or it's named wrong.

---

## Step 5: Recreate the Variable

If the variable doesn't exist or is wrong:

1. **Delete** `GS_PRIVATE_KEY_BASE64` (if it exists)
2. **Click "New Variable"**
3. **Name:** `GS_PRIVATE_KEY_BASE64` (exact, no spaces)
4. **Value:** Paste your base64 string (no quotes)
5. **Save**

---

## Step 6: Verify Base64 Locally First

Before putting in Railway, verify it works:

**In Terminal:**
```bash
# Replace with your actual base64:
echo "<your-base64-string>" | base64 -d | head -c 50
```

**Should show:**
```
-----BEGIN PRIVATE KEY-----
```

**If it shows something else**, the base64 is wrong - regenerate it using:
```bash
cat your-key.json | jq -r '.private_key' | base64
```

---

## Common Issues

### Issue: Variable name has typo
**Fix:** Check it's exactly `GS_PRIVATE_KEY_BASE64` (case-sensitive)

### Issue: Variable value is empty
**Fix:** Delete and recreate it, paste the full base64 string

### Issue: Variable has quotes around value
**Fix:** Remove quotes - just paste the base64 string directly

### Issue: Variable has spaces or line breaks
**Fix:** Base64 should be one continuous string, no spaces/breaks

---

## After Fixing

1. **Save** in Railway
2. **Wait 1-2 minutes** for redeploy
3. **Check logs** - should see the new debug messages
4. **Look for:** `GS_PRIVATE_KEY_BASE64 exists: true`

---

**The new logging will tell us exactly what Railway has!**

---

**Last Updated:** $(date)

