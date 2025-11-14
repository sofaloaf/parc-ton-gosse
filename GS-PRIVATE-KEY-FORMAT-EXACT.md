# GS_PRIVATE_KEY Format for Railway - Exact Instructions

## ✅ Correct Format Options

### Option 1: Double Quotes (Recommended)
```
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIEZt2EW5dkp6m\nWz84+jmHJ5zhrYcZKp4VOz94VNjWH52Znd6aHd8ZCLOYkV0FeGCJkkGfbIhdtXfi\n...rest of key...\n-----END PRIVATE KEY-----\n"
```

**Key points:**
- Starts with `"` (double quote)
- Ends with `"` (double quote)
- Contains `\n` characters (backslash followed by n)
- NO single quotes

### Option 2: Single Quotes (Alternative)
```
GS_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIEZt2EW5dkp6m\nWz84+jmHJ5zhrYcZKp4VOz94VNjWH52Znd6aHd8ZCLOYkV0FeGCJkkGfbIhdtXfi\n...rest of key...\n-----END PRIVATE KEY-----\n'
```

**Key points:**
- Starts with `'` (single quote)
- Ends with `'` (single quote)
- Contains `\n` characters
- NO double quotes

---

## ❌ WRONG Formats

### ❌ Don't Use Both Quotes
```
GS_PRIVATE_KEY='"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"'
```
**Problem:** Using both single and double quotes will cause parsing errors.

### ❌ Don't Use No Quotes
```
GS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```
**Problem:** Special characters and newlines won't be handled correctly.

### ❌ Don't Use Actual Newlines (Usually)
```
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIEZt2EW5dkp6m
Wz84+jmHJ5zhrYcZKp4VOz94VNjWH52Znd6aHd8ZCLOYkV0FeGCJkkGfbIhdtXfi
-----END PRIVATE KEY-----"
```
**Problem:** Railway's UI might not preserve actual newlines correctly. Use `\n` instead.

---

## Step-by-Step: How to Set in Railway

### Method 1: Using Railway Web UI

1. Go to **Railway → Your Project → Backend Service → Variables Tab**
2. Find `GS_PRIVATE_KEY` (or click "New Variable" to create it)
3. In the **Value** field, paste your key like this:

   **Start with:** `"`
   
   **Then paste your entire key:**
   ```
   -----BEGIN PRIVATE KEY-----
   MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIEZt2EW5dkp6m
   Wz84+jmHJ5zhrYcZKp4VOz94VNjWH52Znd6aHd8ZCLOYkV0FeGCJkkGfbIhdtXfi
   ... (rest of your key)
   -----END PRIVATE KEY-----
   ```
   
   **Then manually replace all actual newlines with `\n`:**
   - Find: `-----BEGIN PRIVATE KEY-----\n` (if it shows as newline, replace with `\n`)
   - Find: Each line break, replace with `\n`
   - End with: `\n-----END PRIVATE KEY-----\n"`
   
4. **Final result should look like:**
   ```
   "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIEZt2EW5dkp6m\nWz84+jmHJ5zhrYcZKp4VOz94VNjWH52Znd6aHd8ZCLOYkV0FeGCJkkGfbIhdtXfi\n...rest...\n-----END PRIVATE KEY-----\n"
   ```

5. Click **Save**

### Method 2: Using Railway CLI (Easier)

If you have Railway CLI installed:

```bash
railway variables set GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

---

## Quick Format Check

Your key should:
- ✅ Start with `"` or `'` (but not both)
- ✅ Contain `-----BEGIN PRIVATE KEY-----`
- ✅ Have `\n` between each line (not actual newlines)
- ✅ End with `-----END PRIVATE KEY-----\n"`
- ✅ Be on ONE line in Railway's UI

**Example of correct single-line format:**
```
"-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIEZt2EW5dkp6m\nWz84+jmHJ5zhrYcZKp4VOz94VNjWH52Znd6aHd8ZCLOYkV0FeGCJkkGfbIhdtXfi\njP36fBd89k4DaDtAyOegguMhGUSsv5HxJNQkBPymdky+YRU9nIfmVZ5kJntx9JsT\neSXYunAWlocb1sNrpgIeNXY5pcDY2PuiiIrPcQZnG4b0oInor9X0hcD32W2+QuRv\nHgV+oZfBydsE5eFTFP8PuhgjWhTYueXliPiAmWgQlh8BHPEjq09ySBzlwiWbpEay\nkr42U/56kt74HhpIpLvlqie0x8sRv+k68Viw78t9M5DuhvL/Gb7Zs7lhzX2TQeee\n11wjsRUHAgMBAAECggEAAktNZI+zm8gUIKU4Nt+LrFSUdHQIcg3ujSDGTAtxBxeK\nt5m7VToVdlSGtq+oCOmF9d3i+cCFWcm8a7EhMm+c11Z9s4VM9KO5IDqP/y+qfW6e\n7kx1UEpsWT5PB/nWBARY/JervstALCDZbGI9wFv28BNezj9qsz/Ok2kah3Oyn+nr\n3ApNtKbq3Z8nja02a29tWvdCui5emylj7OHmrcaPPgWbKMCNOi8WmT0DNeW99Sa+\n1dudLPVcaN9sLwLD2K79bp/3URcYgwuXQ87fXMQa8okT3irx7HxTUMKxdT4T6LnD\nmVD6yun1Cjt+zEfp4aT7RuNsFku0gyXqfbOYoVXynQKBgQDjiFTopa1kjk7avj10\nowYO42Pc/8FIKfj/BA3tEOV3WkBsiOG/SHRJQrs1txRAvDkVQlEFLqFVuLzAqsd+\no1oXYluLsnrJ1euXvD7SCeeraTtP07fe6OPfLSIswW5eCj9/YNZ9/nbkE7VSR4o1\nUXiGYMN6d2L3xVcLtuExO99HawKBgQDhGaKaLEbykW0PZlQPxXW6q2iCj/39M4tx\nKbeBSg43thvZqvRMtoyvjsnuNMM85e3/nMNvoi4cJHfAo1awLUD/pSoTI88S0yRk\n56ILS8YvFL1ycZ7rWCyTc4vSxoqZNfEPCnNi/oXdTFr6Fk7z/hIA0fN9hXvKfukb\nvQJ9Bp871QKBgEYbPpZEXi2qj29kyIjEplw2AhIZF5PFovvoYuYVm65vt4P5lR0c\nFQBxuD8vvuTHWgtL2KzxFjLUbgwrUraZXGvyGWTsxFqmOCYTkYOkG6a8ENNi17eu\nKHAedvY1T21YWQJFczF1E2rpC6hjdJlDFhDJhdGZMXxIaK6qVa6W1RArAoGAKL/T\nR8WsMk1RSPBlV1WPsnNFQB2BBU1HePzsU2Nsn3lAIW9pOlnxrfZTZ+P1VBjrtNJU\nLulVH5Maeq0XDF2k3qKvszdQTUAb3ohwNUtKXUuL4CPheQlFSIwqS8XVYVb6hJaH\nvOwGn8Eq1wsiz9i2uZ9ITPjVKBtBZ9wXjzqbqOECgYAydz3cduJ7tFzcE2Nfkvdp\nxOxYHGXAZ56Pmb3bGXbcONVWuvjJjC/cDwGppRpv43rjdl8iItTeONuKlwrtGK3O\nxc/F/Uo5CoAEPds6fG+UlPRE58wpFgoL4YJrsTE4Nt/ekEx/jPPOKctBlLo7rikp\n57GxHr5iLzjb/+o3UtMJYw==\n-----END PRIVATE KEY-----\n"
```

---

## Verification

After setting the variable:

1. **Save** in Railway
2. Wait 1-2 minutes for redeploy
3. Check **Backend Logs** for:
   - ✅ `✅ Data store initialized: sheets` (GOOD!)
   - ❌ `Invalid credentials` (BAD - format issue)
   - ❌ `⚠️ Falling back to memory backend` (BAD - credentials issue)

4. Test endpoint:
   ```bash
   curl -m 10 https://parc-ton-gosse-backend-production.up.railway.app/api/activities
   ```

---

## Summary

**Use EITHER:**
- `"..."` (double quotes) ✅
- `'...'` (single quotes) ✅

**NOT BOTH:**
- `'"..."'` ❌

**Your key should be ONE line with `\n` characters, wrapped in quotes.**

---

**Last Updated:** $(date)

