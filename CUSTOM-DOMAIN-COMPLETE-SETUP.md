# Complete Custom Domain Setup Guide

## ✅ What's Already Done (Automatic)

The code has been updated to automatically support both domains:

1. **API URL Resolution** - Automatically detects `parctongosse.com` and uses the backend API
2. **CORS Configuration** - Backend `CORS_ORIGIN` includes both domains
3. **Frontend Routing** - Works on both Railway and custom domain

## ⚠️ What You Need to Do (Manual)

### 1. Update Google Cloud Console OAuth Origins

**This is REQUIRED to fix the admin panel login error.**

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID (Web application)
3. Click to edit
4. Add to **Authorized JavaScript origins**:
   ```
   https://parctongosse.com
   https://www.parctongosse.com
   https://victorious-gentleness-production.up.railway.app
   http://localhost:5173
   ```
5. Add to **Authorized redirect URIs**:
   ```
   https://parctongosse.com
   https://www.parctongosse.com
   https://victorious-gentleness-production.up.railway.app
   http://localhost:5173
   ```
6. Click **Save**
7. Wait 1-2 minutes for changes to propagate

**See detailed guide:** `CUSTOM-DOMAIN-OAUTH-FIX.md`

### 2. Verify Railway Environment Variables

#### Backend Service
- **`CORS_ORIGIN`** should be:
  ```
  https://victorious-gentleness-production.up.railway.app,https://parctongosse.com,https://www.parctongosse.com
  ```

#### Frontend Service
- **`VITE_GOOGLE_CLIENT_ID`** should match backend `GOOGLE_CLIENT_ID`
- **`VITE_API_URL`** is optional (auto-detected, but can be set to backend URL)

## 📋 Complete Checklist

### Google Cloud Console
- [ ] Added `https://parctongosse.com` to OAuth JavaScript origins
- [ ] Added `https://www.parctongosse.com` to OAuth JavaScript origins
- [ ] Added `https://victorious-gentleness-production.up.railway.app` (keep for compatibility)
- [ ] Added `http://localhost:5173` (for local dev)
- [ ] Added all corresponding redirect URIs
- [ ] Saved changes and waited 1-2 minutes

### Railway Backend
- [ ] `CORS_ORIGIN` includes all three domains (comma-separated)
- [ ] `GOOGLE_CLIENT_ID` matches Google Cloud Console

### Railway Frontend
- [ ] `VITE_GOOGLE_CLIENT_ID` matches backend `GOOGLE_CLIENT_ID`
- [ ] Custom domain is connected in Railway settings

### Testing
- [ ] Admin panel works at `https://parctongosse.com/admin`
- [ ] Admin panel works at `https://www.parctongosse.com/admin`
- [ ] Admin panel still works at `https://victorious-gentleness-production.up.railway.app/admin`
- [ ] Regular site works on all domains
- [ ] OAuth login works on all domains

## 🔍 How It Works

### API URL Resolution
The frontend automatically detects the domain and routes API calls correctly:

- **Railway domain** → Uses `https://parc-ton-gosse-backend-production.up.railway.app/api`
- **Custom domain** → Uses `https://parc-ton-gosse-backend-production.up.railway.app/api`
- **Localhost** → Uses `http://localhost:4000/api`

### CORS Configuration
The backend accepts requests from:
- `https://victorious-gentleness-production.up.railway.app`
- `https://parctongosse.com`
- `https://www.parctongosse.com`

### OAuth Flow
Google OAuth requires the origin to be registered in Google Cloud Console. That's why you need to manually add the custom domain there.

## 🆘 Troubleshooting

### OAuth Still Not Working?

1. **Check Google Cloud Console:**
   - Verify both `parctongosse.com` and `www.parctongosse.com` are added
   - Make sure there are no trailing slashes
   - Wait 2-5 minutes after saving

2. **Clear Browser Cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or use incognito/private window

3. **Verify Client ID:**
   - Check `VITE_GOOGLE_CLIENT_ID` in Railway frontend
   - Check `GOOGLE_CLIENT_ID` in Railway backend
   - Both should match Google Cloud Console

### API Calls Not Working?

1. **Check Browser Console:**
   - Open DevTools → Network tab
   - Look for failed API requests
   - Check if CORS errors appear

2. **Verify CORS_ORIGIN:**
   - Check Railway backend variables
   - Should include all three domains (comma-separated)

3. **Check API URL Resolution:**
   - Open DevTools → Console
   - Look for "API URL resolved" messages
   - Should show backend URL for custom domain

## 📝 Summary

**Automatic (Code):**
- ✅ API URL detection
- ✅ CORS handling
- ✅ Frontend routing

**Manual (You Need to Do):**
- ⚠️ Google Cloud Console OAuth origins
- ⚠️ Verify Railway environment variables

**Both Domains Work:**
- ✅ `https://parctongosse.com` (custom domain)
- ✅ `https://victorious-gentleness-production.up.railway.app` (Railway domain)

---

**After updating Google Cloud Console, the admin panel should work on both domains!**

