# 🚨 URGENT: Fix Google Credentials Exposure

## What Happened

Your Google Cloud service account credentials were exposed in a public GitHub repository. Google has **disabled the key** for security reasons.

**This is why you're getting "Invalid JWT Signature" errors!**

---

## ✅ Immediate Actions Required

### Step 1: Create a New Service Account Key

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com
   - Select your project: `parc-ton-gosse`

2. **Navigate to Service Accounts:**
   - Go to "IAM & Admin" → "Service Accounts"
   - Find: `parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com`

3. **Create a New Key:**
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON" format
   - Click "Create"
   - **A JSON file will download** - **KEEP THIS SECRET!**

4. **Extract the Credentials:**
   - Open the downloaded JSON file
   - You'll need:
     - `client_email` (service account email)
     - `private_key` (the private key)

---

### Step 2: Update Railway Environment Variables

1. **Go to Railway → Backend Service → Variables tab**

2. **Update `GS_SERVICE_ACCOUNT`:**
   - Value: The `client_email` from the JSON file
   - Example: `parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com`

3. **Update `GS_PRIVATE_KEY`:**
   - Value: The `private_key` from the JSON file
   - **Important:** Include quotes and `\n` characters
   - Format: `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`
   - Copy the ENTIRE private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

4. **Verify `GS_SHEET_ID`:**
   - Should be: `1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0`
   - Update if different

5. **Set `DATA_BACKEND`:**
   - Value: `sheets`

6. **Save all variables**

---

### Step 3: Delete the Exposed File from GitHub

**⚠️ IMPORTANT:** Even if you delete the file, it's still in Git history. You need to:

1. **Delete the file from GitHub:**
   - Go to: https://github.com/sofaloaf/parc-ton-gosse
   - Find: `parc-ton-gosse-b0cae53f2459.json` (or any `.json` file with credentials)
   - Delete it

2. **Add to .gitignore:**
   - Make sure `.gitignore` includes:
     ```
     *.json
     !package.json
     !package-lock.json
     !tsconfig.json
     *-credentials.json
     *-key.json
     service-account*.json
     ```

3. **Remove from Git history (optional but recommended):**
   - The file is still in Git history
   - Consider using `git filter-branch` or BFG Repo-Cleaner to remove it
   - Or create a new repository (if this is early in development)

---

### Step 4: Secure Your Credentials

**NEVER commit credentials to GitHub!**

**Best Practices:**
- ✅ Store credentials in environment variables (Railway, etc.)
- ✅ Use `.gitignore` to exclude credential files
- ✅ Use secret management services
- ❌ Never commit `.json` files with credentials
- ❌ Never hardcode credentials in code
- ❌ Never share credentials in public repositories

---

## 🔧 Alternative: Use Memory Backend (Temporary)

**If you want to get the site working immediately without Google Sheets:**

1. **In Railway → Backend → Variables:**
   - Set `DATA_BACKEND=memory`
   - Remove or ignore `GS_*` variables

2. **This will work immediately!**
   - You can switch to Google Sheets later
   - Data will be stored in memory (lost on restart)
   - Good for testing and development

---

## ✅ After Fixing

1. **Wait 1-2 minutes** for Railway to redeploy
2. **Test the backend:**
   ```
   https://parc-ton-gosse-production.up.railway.app/api/health
   ```
3. **Test activities endpoint:**
   ```
   https://parc-ton-gosse-production.up.railway.app/api/activities
   ```
4. **Should work now!**

---

## 🆘 If Still Having Issues

**Check Railway logs:**
- Should NOT see "Invalid JWT Signature" anymore
- Should see "✅ Data store initialized: sheets"

**If you see errors:**
- Double-check the `GS_PRIVATE_KEY` format (include quotes and `\n`)
- Make sure `GS_SERVICE_ACCOUNT` matches the email from JSON
- Verify the service account has access to the Google Sheet

---

## 📋 Quick Checklist

- [ ] Created new service account key in Google Cloud
- [ ] Downloaded JSON file (keep it secret!)
- [ ] Updated `GS_SERVICE_ACCOUNT` in Railway
- [ ] Updated `GS_PRIVATE_KEY` in Railway (with quotes and `\n`)
- [ ] Verified `GS_SHEET_ID` is correct
- [ ] Set `DATA_BACKEND=sheets`
- [ ] Deleted exposed file from GitHub
- [ ] Added credential files to `.gitignore`
- [ ] Tested backend health endpoint
- [ ] Backend is working!

---

**This should fix your backend! The "Invalid JWT Signature" error was because Google disabled the exposed key.**

