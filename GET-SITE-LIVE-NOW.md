# 🚀 Get Your Site Live - Step by Step

## Current Status

✅ **Backend:** Running on Railway (but needs environment variables)  
❌ **Frontend:** Not deployed yet  
❌ **Google Sheets:** Credentials disabled (use memory backend for now)

---

## 🎯 Goal: Get Site Working on External URL

**Estimated Time: 15 minutes**

---

## Step 1: Fix Backend (5 minutes)

### In Railway → Backend Service → Variables Tab:

**Add/Update these 3 variables:**

1. **JWT_SECRET:**
   ```
   Name: JWT_SECRET
   Value: iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=
   ```

2. **DATA_BACKEND:**
   ```
   Name: DATA_BACKEND
   Value: memory
   ```

3. **NODE_ENV:**
   ```
   Name: NODE_ENV
   Value: production
   ```

**Save and wait 2 minutes for Railway to redeploy.**

### Test Backend:

Visit: `https://parc-ton-gosse-production.up.railway.app/api/health`

**Should see:**
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "...",
  "dataStore": true
}
```

**✅ If you see this, backend is working!**

---

## Step 2: Deploy Frontend (5 minutes)

### 2.1 Create Frontend Service

1. **In Railway Dashboard:**
   - Click **"+ New"** button (top right)
   - Select **"GitHub Repo"**
   - Choose: **`parc-ton-gosse`**
   - Click **"Deploy"**

### 2.2 Configure Frontend

1. **Click on the new service** (might be named `parc-ton-gosse`)

2. **Set Root Directory:**
   - Go to **Settings** tab
   - Find **"Root Directory"** field
   - Set to: **`client`**
   - Save

3. **Set Environment Variable:**
   - Go to **Variables** tab
   - Click **"New Variable"**
   - Name: `VITE_API_URL`
   - Value: `https://parc-ton-gosse-production.up.railway.app/api`
   - Save

### 2.3 Generate Domain

1. **Go to Settings → Networking**
2. **Click "Generate Domain"**
3. **Copy the URL** - This is your website URL!

**Example:** `https://parc-ton-gosse-frontend-production.up.railway.app`

### 2.4 Update Backend CORS

1. **Go back to Backend Service**
2. **Variables tab**
3. **Add/Update `CORS_ORIGIN`:**
   ```
   Name: CORS_ORIGIN
   Value: https://your-frontend-url.railway.app
   ```
   (Replace with your actual frontend URL)

4. **Save**

5. **Wait 2 minutes for both to redeploy**

---

## Step 3: Test Your Website (2 minutes)

### 3.1 Visit Your Frontend URL

**Open in browser:**
```
https://your-frontend-url.railway.app
```

### 3.2 Test Features

- [ ] Homepage loads
- [ ] Browse activities (should show empty list with memory backend)
- [ ] Search works
- [ ] Language toggle (FR/EN) works
- [ ] Sign up / Login works
- [ ] Navigation works

**✅ If all works, your site is live!**

---

## 📋 Quick Checklist

### Backend:
- [ ] Set `JWT_SECRET` in Railway
- [ ] Set `DATA_BACKEND=memory`
- [ ] Set `NODE_ENV=production`
- [ ] Test `/api/health` - Works ✅
- [ ] Test `/api/activities` - Works ✅

### Frontend:
- [ ] Created new service in Railway
- [ ] Set Root Directory to `client`
- [ ] Set `VITE_API_URL` variable
- [ ] Generated domain
- [ ] Updated backend `CORS_ORIGIN`
- [ ] Test website - Works ✅

### Security:
- [ ] Deleted exposed JSON file (done ✅)
- [ ] Updated `.gitignore` (done ✅)
- [ ] Never commit credentials again

---

## 🆘 Troubleshooting

### Backend Not Working?

**Check Railway logs:**
- Backend Service → Deployments → Latest → Logs
- Look for error messages
- Share the error with me

### Frontend Not Working?

**Check:**
1. Is `VITE_API_URL` set correctly?
2. Is `CORS_ORIGIN` set in backend?
3. Check frontend deployment logs
4. Check browser console for errors

### Can't Find "+ New" Button?

- Look for "Add Service" or "New Service"
- Try refreshing the page
- Make sure you're in your project, not the main dashboard

---

## 🎉 Success!

**Once everything works, you'll have:**

- ✅ Backend URL: `https://parc-ton-gosse-production.up.railway.app`
- ✅ Frontend URL: `https://your-frontend-url.railway.app`
- ✅ Website accessible from anywhere
- ✅ All features working

**Your site is live! 🚀**

---

## 📝 Next Steps (After Site is Live)

1. **Switch to Google Sheets** (if you need real data):
   - Create new service account key
   - Update Railway variables
   - Set `DATA_BACKEND=sheets`

2. **Add Your Data:**
   - Import activities to Google Sheets
   - Or use the CSV import feature

3. **Customize:**
   - Update branding
   - Add more features
   - Configure payments (Stripe)

---

**Let's get your site live! Start with Step 1. 🚀**

