# 🌐 Get Your Website URL - Check Your Site!

## ✅ Next Steps to Get Your Site URL

### Step 1: Wait for Deployment to Complete

1. **Go to "Deployments" tab** in your frontend service
2. **Watch for the deployment to finish:**
   - Status will change: "Building..." → "Deploying..." → "Active" ✅
   - This usually takes 2-5 minutes
3. **Once it shows "Active"**, you're ready for the next step!

### Step 2: Generate Public Domain

1. **Go to "Settings" tab**
2. **Scroll down to "Networking" section** (or click "Networking" in the sidebar)
3. **Click "Generate Domain"** button
4. **Railway will create a URL** like:
   ```
   https://victorious-gentleness-production.up.railway.app
   ```
5. **Copy this URL** - This is your website URL! 🎉

### Step 3: Update Backend CORS

**Important:** Your backend needs to allow requests from your frontend URL.

1. **Click on your backend service** ("parc-ton-gosse" card)
2. **Go to "Variables" tab**
3. **Find or add `CORS_ORIGIN` variable:**
   - If it exists, click to edit it
   - If not, click "New Variable"
4. **Set the value to your frontend URL:**
   ```
   CORS_ORIGIN=https://victorious-gentleness-production.up.railway.app
   ```
   (Replace with your actual frontend URL from Step 2)
5. **Save** - Railway will automatically redeploy the backend

### Step 4: Test Your Site!

1. **Open your frontend URL** in a browser:
   ```
   https://your-frontend-url.railway.app
   ```

2. **You should see:**
   - Your website homepage
   - Search bar
   - Filter options
   - Activities list
   - Language toggle (FR/EN)

3. **Test features:**
   - Browse activities
   - Try search
   - Test language toggle
   - Try sign up/login

---

## 🔍 Where to Find Your URL

**After generating domain:**
- **Settings → Networking** section
- Shows your public domain URL
- You can copy it from there

**Or:**
- The service card on the left will show the URL
- Click on it to copy

---

## ✅ Quick Checklist

- [ ] Deployment shows "Active" status
- [ ] Generated public domain (Settings → Networking)
- [ ] Copied frontend URL
- [ ] Updated backend CORS_ORIGIN variable
- [ ] Waited for backend to redeploy (2-3 minutes)
- [ ] Opened frontend URL in browser
- [ ] Site loads correctly!

---

## 🎯 Your URLs

After completing these steps:

- **Backend API:** `https://parc-ton-gosse-production.up.railway.app`
- **Frontend Website:** `https://victorious-gentleness-production.up.railway.app` ← **This is where users visit!**

---

## 🆘 Troubleshooting

### Can't generate domain?
- Make sure deployment is "Active" first
- If you see "Deploy the service to see networking settings", wait a bit longer

### Site shows errors?
- Check browser console (F12 → Console tab)
- Verify `CORS_ORIGIN` is set correctly in backend
- Make sure both services are "Active"

### Frontend can't connect to backend?
- Check `VITE_API_URL` is set correctly in frontend variables
- Check `CORS_ORIGIN` includes your frontend URL
- Wait a few minutes after updating CORS for backend to redeploy

---

**Start by checking if deployment is "Active", then generate your domain!**

