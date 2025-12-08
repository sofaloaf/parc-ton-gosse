# Fix OAuth Error for Custom Domain (parctongosse.com)

## 🔴 Error: "Error 400: origin_mismatch"

When accessing the admin panel at `https://parctongosse.com`, you're getting:
```
Error 400: origin_mismatch
Request details: origin=https://parctongosse.com
```

This means `parctongosse.com` is not registered as an authorized JavaScript origin in Google Cloud Console.

## ✅ Solution: Update Google Cloud Console OAuth Settings

### Step 1: Access Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. Select your project (the one with your OAuth credentials)
3. Navigate to: **APIs & Services** → **Credentials**
   - Direct link: https://console.cloud.google.com/apis/credentials

### Step 2: Find Your OAuth 2.0 Client ID

1. Look for the OAuth 2.0 Client ID that matches your `VITE_GOOGLE_CLIENT_ID` environment variable
2. It should be a **Web application** type (not Desktop)
3. Click on it to edit

### Step 3: Add Authorized JavaScript Origins

In the **Authorized JavaScript origins** section, add these URLs (one per line):

```
https://parctongosse.com
https://www.parctongosse.com
https://victorious-gentleness-production.up.railway.app
http://localhost:5173
```

**Important:**
- No trailing slashes (`/`)
- Must include `https://` or `http://`
- One URL per line

### Step 4: Add Authorized Redirect URIs

In the **Authorized redirect URIs** section, add:

```
https://parctongosse.com
https://www.parctongosse.com
https://victorious-gentleness-production.up.railway.app
http://localhost:5173
```

### Step 5: Save and Wait

1. Click **Save** at the bottom
2. Wait 1-2 minutes for changes to propagate
3. Clear your browser cache (optional but recommended)
4. Try accessing the admin panel again

## 📋 Complete Checklist

### Google Cloud Console
- [ ] Added `https://parctongosse.com` to JavaScript origins
- [ ] Added `https://www.parctongosse.com` to JavaScript origins
- [ ] Added `https://victorious-gentleness-production.up.railway.app` (keep for backward compatibility)
- [ ] Added `http://localhost:5173` (for local development)
- [ ] Added all corresponding redirect URIs
- [ ] Saved changes

### Railway Environment Variables (Backend)
- [ ] `CORS_ORIGIN` includes both domains:
  ```
  https://victorious-gentleness-production.up.railway.app,https://parctongosse.com,https://www.parctongosse.com
  ```

### Railway Environment Variables (Frontend)
- [ ] `VITE_GOOGLE_CLIENT_ID` is set (same as backend `GOOGLE_CLIENT_ID`)
- [ ] `VITE_API_URL` points to backend (optional, auto-detected)

## 🔍 Verify Current Settings

### Check CORS_ORIGIN in Railway

1. Go to Railway → Backend Service → Settings → Variables
2. Find `CORS_ORIGIN`
3. Should contain:
   ```
   https://victorious-gentleness-production.up.railway.app,https://parctongosse.com,https://www.parctongosse.com
   ```

### Check OAuth Client ID

1. In Google Cloud Console, note your OAuth Client ID
2. Verify it matches:
   - Backend: `GOOGLE_CLIENT_ID` in Railway
   - Frontend: `VITE_GOOGLE_CLIENT_ID` in Railway

## 🆘 Still Not Working?

### 1. Verify Domain in Browser
- Open DevTools → Console
- Check what domain the app is actually using
- Make sure that exact domain is in Google Cloud Console

### 2. Check for Typos
- No trailing slashes
- Correct protocol (https vs http)
- No extra spaces

### 3. Propagation Delay
- Changes can take 1-5 minutes to propagate
- Try clearing browser cache
- Try incognito/private window

### 4. Verify Both Domains Work
- Test: `https://parctongosse.com/admin`
- Test: `https://www.parctongosse.com/admin`
- Test: `https://victorious-gentleness-production.up.railway.app/admin` (should still work)

## 📝 Summary

**What needs to be updated:**
1. ✅ **Google Cloud Console** - Add `parctongosse.com` and `www.parctongosse.com` to OAuth origins
2. ✅ **Railway Backend CORS_ORIGIN** - Already includes both domains (verify)
3. ✅ **Code** - Already supports both domains automatically (no changes needed)

**What works automatically:**
- API URL detection works for both domains
- CORS is configured for both domains
- Frontend routing works for both domains

**Manual action required:**
- ⚠️ **Google Cloud Console OAuth origins** - Must be updated manually

---

**After updating Google Cloud Console, wait 1-2 minutes and try again!**

