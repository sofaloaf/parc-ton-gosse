# 🔧 Fix JWT_SECRET and Google Sheets Issues

## ✅ Good News: Server is Running!

Your server is listening on port 8080, so it's actually working! The issues are:

1. **JWT_SECRET** - Not set or too short
2. **Google Sheets** - Invalid credentials

---

## 🔧 Fix 1: Set JWT_SECRET

### In Railway → Backend Service → Variables Tab:

**Add or update:**
```
JWT_SECRET=iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=
```

**Important:** 
- Must be at least 16 characters
- Use the value above (it's 44 characters, so it's safe)
- Save the variable

---

## 🔧 Fix 2: Fix Google Sheets OR Use Memory Backend

You have 2 options:

### Option A: Use Memory Backend (Quick Fix - Recommended)

**In Railway → Backend Service → Variables Tab:**

**Set:**
```
DATA_BACKEND=memory
```

**Remove or ignore these variables:**
- `GS_SERVICE_ACCOUNT`
- `GS_PRIVATE_KEY`
- `GS_SHEET_ID`

**This will make the backend work immediately!** You can switch to Google Sheets later.

---

### Option B: Fix Google Sheets Credentials

If you want to use Google Sheets, you need to fix the `GS_PRIVATE_KEY`.

**The error "Invalid JWT Signature" means:**
- The private key is incorrect
- The private key format is wrong
- The service account email doesn't match

**To fix:**

1. **Go to Google Cloud Console**
2. **Create a new service account** (or use existing)
3. **Download the JSON key file**
4. **Copy the `private_key` value** (it should start with `-----BEGIN PRIVATE KEY-----`)
5. **In Railway, set `GS_PRIVATE_KEY` to the entire key, including quotes:**
   ```
   GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
   ```
6. **Make sure `GS_SERVICE_ACCOUNT` matches the service account email**
7. **Make sure `GS_SHEET_ID` is correct**

**This is more complex - I recommend Option A for now!**

---

## 📋 Quick Fix Checklist

- [ ] Set `JWT_SECRET=iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=`
- [ ] Set `DATA_BACKEND=memory` (quick fix)
- [ ] Set `NODE_ENV=production`
- [ ] Save variables
- [ ] Wait for Railway to redeploy (1-2 minutes)
- [ ] Test: `https://parc-ton-gosse-production.up.railway.app/api/health`

---

## ✅ After Fixes

1. **Test health endpoint:**
   ```
   https://parc-ton-gosse-production.up.railway.app/api/health
   ```
   Should see: `{"ok":true,"status":"healthy",...}`

2. **Test activities endpoint:**
   ```
   https://parc-ton-gosse-production.up.railway.app/api/activities
   ```
   Should see: `[]` (empty array with memory backend)

3. **Backend is working!** You can now deploy the frontend.

---

## 🆘 Still Having Issues?

**Share:**
1. What you see when you test the health endpoint
2. Any new error messages from Railway logs
3. Whether you chose Option A (memory) or Option B (fix sheets)

---

## 💡 Why Memory Backend?

- **Works immediately** - No Google Sheets setup needed
- **Good for testing** - Perfect for getting the site working
- **Easy to switch later** - You can switch to Google Sheets anytime
- **No credentials needed** - No risk of credential errors

**You can always switch to Google Sheets later once everything else is working!**

