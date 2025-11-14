# 🌐 Deploy Frontend - Get Your Website URL!

## Current Status

✅ **Backend deployed** - API is running  
❌ **Frontend not deployed** - No website yet!

**You need the frontend to have a website where users can log in.**

---

## 🚀 Deploy Frontend on Railway

### Step 1: Create Frontend Service

1. **In Railway, go to your project** (same project as backend)
2. **Click "+ New"** (top right)
3. **Select "GitHub Repo"**
4. **Choose the same repository:** `parc-ton-gosse`

### Step 2: Configure Frontend

1. **Click on the new frontend service**
2. **Go to Settings tab**
3. **Set Root Directory:**
   - Find "Source" section
   - Set "Root Directory" to: `client`
   - (If you can't find this, Railway might auto-detect it)

4. **Go to Settings → Deploy:**
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npx serve -s dist -l $PORT`
   - (If these fields don't exist, Railway might auto-detect)

### Step 3: Set Environment Variable

1. **Go to "Variables" tab**
2. **Click "New Variable"**
3. **Add:**
   ```
   Name: VITE_API_URL
   Value: https://your-backend-url.railway.app/api
   ```
   
   **Replace `your-backend-url` with your actual backend URL from Railway!**
   
   **To find your backend URL:**
   - Go to your backend service
   - Settings → Networking
   - Copy the domain URL
   - Add `/api` at the end

### Step 4: Generate Domain

1. **Go to Settings → Networking**
2. **Click "Generate Domain"**
3. **Copy the URL** (e.g., `https://parc-ton-gosse-frontend-production.up.railway.app`)

**🎉 THIS IS YOUR WEBSITE URL!**

### Step 5: Update Backend CORS

1. **Go back to your backend service**
2. **Go to Variables tab**
3. **Find `CORS_ORIGIN` variable**
4. **Update it to your frontend URL:**
   ```
   CORS_ORIGIN=https://your-frontend-url.railway.app
   ```
5. **Save**

Railway will automatically redeploy the backend.

---

## ✅ Test Your Website

1. **Visit your frontend URL** in a browser
2. **You should see:**
   - Your website homepage
   - Search and filter bars
   - Activities list
   - Language toggle

3. **Test login:**
   - Click "Sign In" (or "Connexion" in French)
   - Create an account or log in
   - Should work!

---

## 📋 Quick Checklist

- [ ] Create frontend service in Railway
- [ ] Set Root Directory to `client`
- [ ] Set Build Command: `npm install && npm run build`
- [ ] Set Start Command: `npx serve -s dist -l $PORT`
- [ ] Set `VITE_API_URL` to backend URL + `/api`
- [ ] Generate frontend domain
- [ ] Update backend `CORS_ORIGIN` to frontend URL
- [ ] Test website in browser
- [ ] Test login functionality

---

## 🎯 Your URLs

After deploying:

- **Backend API:** `https://your-backend-url.railway.app`
- **Frontend Website:** `https://your-frontend-url.railway.app` ← **THIS IS WHERE USERS LOG IN!**

---

## 🆘 Troubleshooting

### Frontend can't connect to backend?
- Check `VITE_API_URL` is correct (include `/api` at end)
- Check `CORS_ORIGIN` in backend includes frontend URL
- Check browser console for errors

### 404 errors on frontend?
- Make sure Build Command ran successfully
- Check that `dist` folder was created
- Verify Start Command is correct

### Login not working?
- Check backend is running (visit `/api/health`)
- Check `CORS_ORIGIN` is set correctly
- Check browser console for errors

---

## 🎉 After Frontend is Deployed

1. **You'll have a working website!**
2. **Users can visit and log in**
3. **Generate QR code with your frontend URL:**
   ```bash
   npm run qr https://your-frontend-url.railway.app
   ```

---

**Ready? Start with Step 1 above!**

