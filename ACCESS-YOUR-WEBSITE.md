# How to Access Your Deployed Website

## 🌐 Your Public Website URLs

Based on your Railway deployment configuration:

### Frontend (Your Website):
```
https://victorious-gentleness-production.up.railway.app
```

### Backend API:
```
https://parc-ton-gosse-backend-production.up.railway.app
```

---

## 🚀 Quick Access

**Simply open this URL in your browser:**
```
https://victorious-gentleness-production.up.railway.app
```

**That's your public website!** Anyone can access it from anywhere.

---

## ✅ Verification Steps

### 1. Test Backend Health
```bash
curl https://parc-ton-gosse-backend-production.up.railway.app/api/health
```

**Should return:**
```json
{"ok": true, "status": "healthy", "dataStore": true}
```

### 2. Test Data Store
```bash
curl https://parc-ton-gosse-backend-production.up.railway.app/api/health/datastore
```

**Should return:**
```json
{
  "status": "healthy",
  "activityCount": 131,
  "backend": "sheets"
}
```

### 3. Test Activities Endpoint
```bash
curl https://parc-ton-gosse-backend-production.up.railway.app/api/activities | head -c 500
```

**Should return JSON array with activities**

### 4. Open Website in Browser
1. Go to: `https://victorious-gentleness-production.up.railway.app`
2. Check browser console (F12) for any errors
3. Verify activities are loading

---

## 🔍 What to Check

### If Website Loads:
✅ **Success!** Your site is live and accessible.

### If Activities Don't Load:
1. **Check browser console** (F12 → Console tab)
   - Look for API errors
   - Check if API URL is correct

2. **Check Network tab** (F12 → Network tab)
   - Look for `/api/activities` request
   - Check status code (should be 200)
   - Check response

3. **Verify Railway Configuration:**
   - Backend service: `parc-ton-gosse-backend-production`
   - Frontend service: `victorious-gentleness-production`
   - Environment variables are set correctly

---

## 🔧 Current Configuration

### Backend Service:
- **URL:** `https://parc-ton-gosse-backend-production.up.railway.app`
- **Health:** `/api/health`
- **Activities:** `/api/activities`

### Frontend Service:
- **URL:** `https://victorious-gentleness-production.up.railway.app`
- **Auto-detects backend** when on Railway domain

### Environment Variables (Should be set in Railway):

**Backend:**
- `DATA_BACKEND=sheets`
- `GS_SERVICE_ACCOUNT=parc-ton-gosse-data@parc-ton-gosse.iam.gserviceaccount.com`
- `GS_PRIVATE_KEY_BASE64=<your_base64_key>`
- `GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0`
- `CORS_ORIGIN=https://victorious-gentleness-production.up.railway.app`

**Frontend:**
- `VITE_API_URL=https://parc-ton-gosse-backend-production.up.railway.app/api`

---

## 🐛 Troubleshooting

### Website Shows Blank Page:
1. Check Railway logs:
   - Go to Railway Dashboard
   - Click on frontend service
   - Check "Deployments" → Latest → "View Logs"

2. Check browser console for errors

### Activities Not Loading:
1. Test backend directly:
   ```bash
   curl https://parc-ton-gosse-backend-production.up.railway.app/api/activities
   ```

2. Check CORS configuration:
   - Backend `CORS_ORIGIN` should include frontend URL
   - Should be: `https://victorious-gentleness-production.up.railway.app`

3. Check Railway backend logs for errors

### "Failed to fetch" Error:
- Backend might be down
- Check Railway dashboard for backend service status
- Verify backend is deployed and running

---

## 📱 Share Your Website

**Your public URL:**
```
https://victorious-gentleness-production.up.railway.app
```

**Share this link with anyone!** They can access your website from:
- Desktop browsers
- Mobile browsers
- Anywhere with internet

---

## 🎯 Next Steps

1. **Test the website:**
   - Open: `https://victorious-gentleness-production.up.railway.app`
   - Verify activities load
   - Test search and filters
   - Test language toggle

2. **Generate QR Code:**
   ```bash
   cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"
   npm run qr https://victorious-gentleness-production.up.railway.app
   ```

3. **Optional: Custom Domain:**
   - In Railway Dashboard → Frontend Service → Settings
   - Add custom domain
   - Configure DNS

---

## ✅ Quick Test Commands

```bash
# Test backend health
curl https://parc-ton-gosse-backend-production.up.railway.app/api/health

# Test data store
curl https://parc-ton-gosse-backend-production.up.railway.app/api/health/datastore

# Test activities (first 500 chars)
curl https://parc-ton-gosse-backend-production.up.railway.app/api/activities | head -c 500

# Count activities
curl -s https://parc-ton-gosse-backend-production.up.railway.app/api/activities | grep -o '"id"' | wc -l
```

---

**Your website is live at: `https://victorious-gentleness-production.up.railway.app`** 🎉

