# 🔴 URGENT: Fix Private Key Format Error

## The Error

```
Error: error:1E08010C:DECODER routines::unsupported
code: 'ERR_OSSL_UNSUPPORTED'
```

**This means your `GS_PRIVATE_KEY` format is wrong!** OpenSSL cannot decode it.

---

## Quick Fix (3 Steps)

### Step 1: Regenerate Service Account Key

1. Go to **Google Cloud Console** → Your Project
2. **IAM & Admin** → **Service Accounts**
3. Click your service account
4. **Keys** tab → **Delete** the old key
5. **Add Key** → **Create new key** → **JSON**
6. **Download** the JSON file

### Step 2: Extract Private Key from JSON

Open the downloaded JSON file and find:
```json
{
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
}
```

**Copy the ENTIRE `private_key` value** (including quotes and `\n`)

### Step 3: Set in Railway

**Go to:** Railway → Backend Service → Variables → `GS_PRIVATE_KEY`

**Paste exactly this format:**
```
"-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIEZt2EW5dkp6m\nWz84+jmHJ5zhrYcZKp4VOz94VNjWH52Znd6aHd8ZCLOYkV0FeGCJkkGfbIhdtXfi\njP36fBd89k4DaDtAyOegguMhGUSsv5HxJNQkBPymdky+YRU9nIfmVZ5kJntx9JsT\neSXYunAWlocb1sNrpgIeNXY5pcDY2PuiiIrPcQZnG4b0oInor9X0hcD32W2+QuRv\nHgV+oZfBydsE5eFTFP8PuhgjWhTYueXliPiAmWgQlh8BHPEjq09ySBzlwiWbpEay\nkr42U/56kt74HhpIpLvlqie0x8sRv+k68Viw78t9M5DuhvL/Gb7Zs7lhzX2TQeee\n11wjsRUHAgMBAAECggEAAktNZI+zm8gUIKU4Nt+LrFSUdHQIcg3ujSDGTAtxBxeK\nt5m7VToVdlSGtq+oCOmF9d3i+cCFWcm8a7EhMm+c11Z9s4VM9KO5IDqP/y+qfW6e\n7kx1UEpsWT5PB/nWBARY/JervstALCDZbGI9wFv28BNezj9qsz/Ok2kah3Oyn+nr\n3ApNtKbq3Z8nja02a29tWvdCui5emylj7OHmrcaPPgWbKMCNOi8WmT0DNeW99Sa+\n1dudLPVcaN9sLwLD2K79bp/3URcYgwuXQ87fXMQa8okT3irx7HxTUMKxdT4T6LnD\nmVD6yun1Cjt+zEfp4aT7RuNsFku0gyXqfbOYoVXynQKBgQDjiFTopa1kjk7avj10\nowYO42Pc/8FIKfj/BA3tEOV3WkBsiOG/SHRJQrs1txRAvDkVQlEFLqFVuLzAqsd+\no1oXYluLsnrJ1euXvD7SCeeraTtP07fe6OPfLSIswW5eCj9/YNZ9/nbkE7VSR4o1\nUXiGYMN6d2L3xVcLtuExO99HawKBgQDhGaKaLEbykW0PZlQPxXW6q2iCj/39M4tx\nKbeBSg43thvZqvRMtoyvjsnuNMM85e3/nMNvoi4cJHfAo1awLUD/pSoTI88S0yRk\n56ILS8YvFL1ycZ7rWCyTc4vSxoqZNfEPCnNi/oXdTFr6Fk7z/hIA0fN9hXvKfukb\nvQJ9Bp871QKBgEYbPpZEXi2qj29kyIjEplw2AhIZF5PFovvoYuYVm65vt4P5lR0c\nFQBxuD8vvuTHWgtL2KzxFjLUbgwrUraZXGvyGWTsxFqmOCYTkYOkG6a8ENNi17eu\nKHAedvY1T21YWQJFczF1E2rpC6hjdJlDFhDJhdGZMXxIaK6qVa6W1RArAoGAKL/T\nR8WsMk1RSPBlV1WPsnNFQB2BBU1HePzsU2Nsn3lAIW9pOlnxrfZTZ+P1VBjrtNJU\nLulVH5Maeq0XDF2k3qKvszdQTUAb3ohwNUtKXUuL4CPheQlFSIwqS8XVYVb6hJaH\nvOwGn8Eq1wsiz9i2uZ9ITPjVKBtBZ9wXjzqbqOECgYAydz3cduJ7tFzcE2Nfkvdp\nxOxYHGXAZ56Pmb3bGXbcONVWuvjJjC/cDwGppRpv43rjdl8iItTeONuKlwrtGK3O\nxc/F/Uo5CoAEPds6fG+UlPRE58wpFgoL4YJrsTE4Nt/ekEx/jPPOKctBlLo7rikp\n57GxHr5iLzjb/+o3UtMJYw==\n-----END PRIVATE KEY-----\n"
```

**CRITICAL:**
- ✅ Starts with `"`
- ✅ Contains `\n` between each line (NOT actual newlines)
- ✅ Ends with `"`
- ✅ All on ONE line in Railway
- ✅ Replace the example key above with YOUR actual key from the JSON file

---

## How to Get the Correct Format

### Method 1: Copy from JSON (Easiest)

1. Open the downloaded JSON file
2. Find the `"private_key"` field
3. Copy the ENTIRE value (including the quotes)
4. In Railway, paste it as the value for `GS_PRIVATE_KEY`
5. **Remove the outer quotes** from the JSON (Railway adds its own)

**Example:**
- JSON has: `"private_key": "-----BEGIN...\n-----END-----\n"`
- In Railway, use: `"-----BEGIN...\n-----END-----\n"` (without the `private_key:` part)

### Method 2: Manual Formatting

If the JSON has actual newlines:

1. Copy the key from JSON
2. In a text editor, replace each newline with `\n`
3. Wrap the entire thing in double quotes
4. Paste into Railway

---

## After Fixing

1. **Save** the variable in Railway
2. **Wait 1-2 minutes** for redeploy
3. **Check backend logs** - should see:
   - ✅ `✅ Data store initialized: sheets`
   - ❌ NOT `ERR_OSSL_UNSUPPORTED`

4. **Test:**
   ```bash
   curl -m 10 https://parc-ton-gosse-backend-production.up.railway.app/api/activities
   ```

---

## What I've Fixed in Code

I've improved the code to:
- Better handle different key formats
- Provide clearer error messages
- Try to auto-fix common formatting issues

But you still need to **fix the key format in Railway** for it to work!

---

**The key must have `\n` characters (not actual newlines) for OpenSSL to decode it correctly.**

---

**Last Updated:** $(date)

