# Fix OAuth 2.0 Origin Mismatch Error

## 🔴 Error: "Access blocked: Authorization Error - Error 400: origin_mismatch"

This error occurs when your app's domain is not registered in Google Cloud Console OAuth 2.0 credentials.

## ✅ Solution: Add Authorized JavaScript Origins

### Step 1: Go to Google Cloud Console

1. **Open Google Cloud Console:**
   - Go to: https://console.cloud.google.com/
   - Select your project (or create one if needed)

2. **Navigate to OAuth Credentials:**
   - Go to: **APIs & Services** → **Credentials**
   - OR direct link: https://console.cloud.google.com/apis/credentials

3. **Find Your OAuth 2.0 Client ID:**
   - Look for the OAuth 2.0 Client ID that matches `VITE_GOOGLE_CLIENT_ID` in your `.env` file
   - Click on it to edit

### Step 2: Add Authorized JavaScript Origins

In the OAuth client configuration, you need to add **Authorized JavaScript origins**:

**For Local Development:**
```
http://localhost:5173
http://localhost:3000
http://127.0.0.1:5173
```

**For Production (Railway):**
```
https://victorious-gentleness-production.up.railway.app
https://parc-ton-gosse-production.up.railway.app
```

**For Custom Domain (REQUIRED for parctongosse.com):**
```
https://parctongosse.com
https://www.parctongosse.com
```

**⚠️ IMPORTANT:** You MUST add both `parctongosse.com` and `www.parctongosse.com` if you're using the custom domain!

### Step 3: Add Authorized Redirect URIs

Also add **Authorized redirect URIs**:

**For Local Development:**
```
http://localhost:5173
http://localhost:3000
```

**For Production:**
```
https://victorious-gentleness-production.up.railway.app
https://parc-ton-gosse-production.up.railway.app
```

**For Custom Domain (REQUIRED for parctongosse.com):**
```
https://parctongosse.com
https://www.parctongosse.com
```

**⚠️ IMPORTANT:** You MUST add both `parctongosse.com` and `www.parctongosse.com` if you're using the custom domain!

### Step 4: Save Changes

1. Click **Save** at the bottom
2. Wait 1-2 minutes for changes to propagate
3. Try logging in again

## 📋 Quick Checklist

- [ ] Added `http://localhost:5173` to JavaScript origins
- [ ] Added your production domain to JavaScript origins
- [ ] Added corresponding redirect URIs
- [ ] Saved changes in Google Cloud Console
- [ ] Waited 1-2 minutes for propagation
- [ ] Cleared browser cache (optional but recommended)
- [ ] Tried logging in again

## 🔍 How to Find Your Current Domain

**Local Development:**
- Check your browser URL when running the app
- Usually: `http://localhost:5173` (Vite default)

**Production:**
- Check your Railway deployment URL
- Usually: `https://victorious-gentleness-production.up.railway.app`

## ⚠️ Important Notes

1. **No trailing slashes:** Don't add `/` at the end of origins
2. **Exact match required:** The origin must match exactly (including http vs https)
3. **Propagation delay:** Changes can take 1-2 minutes to take effect
4. **Multiple origins:** You can add multiple origins (one per line)

## 🆘 Still Not Working?

1. **Check your `.env` file:**
   - Make sure `VITE_GOOGLE_CLIENT_ID` matches the Client ID in Google Cloud Console
   - Make sure `GOOGLE_CLIENT_ID` (backend) matches too

2. **Verify the domain:**
   - Open browser DevTools → Console
   - Check what domain the app is actually running on
   - Make sure that exact domain is in Google Cloud Console

3. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or clear cookies for the domain

4. **Check for typos:**
   - Make sure there are no extra spaces
   - Make sure http vs https is correct
   - Make sure port numbers match

## 📸 Screenshot Guide

When editing OAuth credentials in Google Cloud Console, you should see:

```
Authorized JavaScript origins
[+] Add URI
  http://localhost:5173
  https://victorious-gentleness-production.up.railway.app

Authorized redirect URIs
[+] Add URI
  http://localhost:5173
  https://victorious-gentleness-production.up.railway.app
```

---

**After adding the origins, wait 1-2 minutes and try logging in again!**

