# 🔧 Fix OAuth Origin Mismatch - Step by Step

## The Problem
**Error 400: origin_mismatch** means Google doesn't recognize your app's domain as authorized.

## ✅ Quick Fix (5 minutes)

### Step 1: Open Google Cloud Console
1. Go to: **https://console.cloud.google.com/**
2. Select your project (or the project where you created the OAuth credentials)

### Step 2: Navigate to OAuth Credentials
1. Click **"APIs & Services"** in the left menu
2. Click **"Credentials"**
3. Find your **OAuth 2.0 Client ID** (the one matching your `VITE_GOOGLE_CLIENT_ID`)
4. Click on it to **Edit**

### Step 3: Add Authorized JavaScript Origins

In the **"Authorized JavaScript origins"** section, click **"+ ADD URI"** and add:

**For Local Development:**
```
http://localhost:5173
```

**For Production (Railway):**
```
https://victorious-gentleness-production.up.railway.app
```

**If you have a custom domain:**
```
https://parctongosse.com
https://www.parctongosse.com
```

### Step 4: Add Authorized Redirect URIs

In the **"Authorized redirect URIs"** section, click **"+ ADD URI"** and add the same URLs:

**For Local Development:**
```
http://localhost:5173
```

**For Production:**
```
https://victorious-gentleness-production.up.railway.app
```

**If you have a custom domain:**
```
https://parctongosse.com
https://www.parctongosse.com
```

### Step 5: Save
1. Click **"SAVE"** at the bottom
2. Wait **1-2 minutes** for changes to propagate
3. **Clear your browser cache** (or use incognito mode)
4. Try logging in again

## 📸 Visual Guide

Your OAuth credentials page should look like this:

```
┌─────────────────────────────────────────┐
│ OAuth 2.0 Client ID                     │
├─────────────────────────────────────────┤
│ Name: Web client                        │
│                                         │
│ Authorized JavaScript origins           │
│ [+] Add URI                             │
│   http://localhost:5173                 │
│   https://victorious-gentleness...      │
│                                         │
│ Authorized redirect URIs                 │
│ [+] Add URI                             │
│   http://localhost:5173                 │
│   https://victorious-gentleness...      │
│                                         │
│ [SAVE]                                  │
└─────────────────────────────────────────┘
```

## 🔍 How to Find Your Current Domain

**Check your browser URL bar:**
- If you see `http://localhost:5173` → Add that
- If you see `https://victorious-gentleness-production.up.railway.app` → Add that
- If you see `https://parctongosse.com` → Add that

## ⚠️ Important Rules

1. **No trailing slashes** - Don't add `/` at the end
2. **Exact match** - Must match exactly (http vs https matters!)
3. **Wait 1-2 minutes** - Changes need time to propagate
4. **Clear cache** - Browser may cache old OAuth settings

## 🆘 Still Not Working?

1. **Double-check the domain:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Check what URL you're actually on
   - Make sure that EXACT URL is in Google Cloud Console

2. **Verify Client ID matches:**
   - Check your `client/.env` file for `VITE_GOOGLE_CLIENT_ID`
   - Make sure it matches the Client ID in Google Cloud Console

3. **Try incognito mode:**
   - Sometimes browsers cache OAuth settings
   - Try in a private/incognito window

4. **Check for typos:**
   - No extra spaces
   - Correct http vs https
   - Correct port number (5173 for Vite)

## ✅ After Fixing

Once you've added the origins:
1. ✅ Wait 1-2 minutes
2. ✅ Clear browser cache (or use incognito)
3. ✅ Try logging in again
4. ✅ Should work! 🎉

---

**Need the direct link?**
- OAuth Credentials: https://console.cloud.google.com/apis/credentials

