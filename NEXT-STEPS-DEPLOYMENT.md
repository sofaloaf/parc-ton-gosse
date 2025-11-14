# 🚀 Next Steps: Deploy Your Website

## ✅ Step 1: Verify GitHub Push (COMPLETED)

Your code should now be on GitHub at:
**https://github.com/sofaloaf/parc-ton-gosse**

---

## 🎯 Step 2: Deploy Backend on Railway

### 2.1 Sign Up for Railway
1. Go to **https://railway.app**
2. Click **"Start a New Project"**
3. Sign up with **GitHub** (click "Login with GitHub")
4. Authorize Railway to access your GitHub account

### 2.2 Create Backend Service
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: **`parc-ton-gosse`**
4. Railway will auto-detect it's a Node.js project

### 2.3 Configure Backend
1. Railway should detect the `server/` folder automatically
2. If not, go to **Settings** → **Source** → **Root Directory**: `server`
3. Go to **Settings** → **Deploy** → **Start Command**: `npm start`

### 2.4 Set Environment Variables
Go to the **Variables** tab and click **"New Variable"** for each:

```
NODE_ENV=production
PORT=4000
JWT_SECRET=your-super-secret-jwt-key-change-this
CORS_ORIGIN=https://your-frontend-url.railway.app
DATA_BACKEND=sheets
GS_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0
```

**Important Notes:**
- **JWT_SECRET**: Generate a strong secret:
  ```bash
  openssl rand -base64 32
  ```
- **CORS_ORIGIN**: Leave this for now, you'll update it after deploying frontend
- **GS_SERVICE_ACCOUNT, GS_PRIVATE_KEY, GS_SHEET_ID**: Copy from your `server/.env` file (if you have one)

### 2.5 Get Backend URL
1. Railway will automatically deploy your backend
2. Once deployed, go to **Settings** → **Networking**
3. Click **"Generate Domain"** (or use the auto-generated one)
4. Copy the URL (e.g., `https://parc-ton-gosse-backend-production.up.railway.app`)
5. **Save this URL** - you'll need it for the frontend!

### 2.6 Test Backend
Visit: `https://your-backend-url.railway.app/api/health`

You should see: `{"status":"ok"}`

---

## 🎨 Step 3: Deploy Frontend on Railway

### 3.1 Create Frontend Service
1. In the **same Railway project**, click **"+ New"**
2. Select **"GitHub Repo"**
3. Choose the **same repository**: `parc-ton-gosse`

### 3.2 Configure Frontend
1. Go to **Settings** → **Source** → **Root Directory**: `client`
2. Go to **Settings** → **Deploy**:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s dist -l $PORT`
3. Go to **Settings** → **Networking** → **Port**: `3000` (or leave default)

### 3.3 Set Environment Variables
Go to the **Variables** tab and add:

```
VITE_API_URL=https://your-backend-url.railway.app/api
```

**Replace `your-backend-url` with the actual backend URL from Step 2.5**

### 3.4 Get Frontend URL
1. Railway will automatically deploy your frontend
2. Go to **Settings** → **Networking**
3. Click **"Generate Domain"** (or use the auto-generated one)
4. Copy the URL (e.g., `https://parc-ton-gosse-frontend-production.up.railway.app`)
5. **🎉 THIS IS YOUR WEBSITE URL!**

### 3.5 Update Backend CORS
1. Go back to your **Backend service** in Railway
2. Go to **Variables** tab
3. Update `CORS_ORIGIN` to your frontend URL:
   ```
   CORS_ORIGIN=https://your-frontend-url.railway.app
   ```
4. Railway will automatically redeploy

---

## ✅ Step 4: Test Your Website

1. **Visit your frontend URL** in a browser
2. **Test these features:**
   - ✅ Browse activities
   - ✅ Search and filter
   - ✅ Sign up / Login
   - ✅ View activity details
   - ✅ Switch between cards/table view

---

## 📱 Step 5: Generate QR Code

Once your website is live:

```bash
cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"
npm run qr https://your-frontend-url.railway.app
```

This will generate:
- `qr-code.png` - For digital use
- `qr-code.svg` - For printing
- `qr-code.html` - Preview page

---

## 🔐 Security Reminder

**⚠️ IMPORTANT:** If you accidentally committed your GitHub token to the repository:

1. **Revoke the token immediately:**
   - Go to: https://github.com/settings/tokens
   - Find the token and click "Revoke"

2. **Create a new token** (if needed)

3. **Remove token from Git history** (if it was committed):
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch GIT-AUTHENTICATION-FIX.md" \
     --prune-empty --tag-name-filter cat -- --all
   git push origin --force --all
   ```

---

## 🆘 Troubleshooting

### Backend not starting?
- Check Railway logs (click on your backend service → "View Logs")
- Verify all environment variables are set
- Check `JWT_SECRET` is set
- Verify `PORT` is correct

### Frontend can't connect to backend?
- Check `VITE_API_URL` is correct (include `/api` at end)
- Verify `CORS_ORIGIN` in backend includes frontend URL
- Check browser console for CORS errors
- Redeploy frontend after changing `VITE_API_URL`

### 404 errors on frontend?
- Make sure routing is configured (Railway should handle this automatically)
- Check that `index.html` is in the build output

### Google Sheets not working?
- Verify service account credentials are correct
- Check that private key includes `\n` for newlines
- Verify sheet ID is correct
- Check Railway logs for errors

---

## 📋 Quick Checklist

- [ ] Code pushed to GitHub ✅
- [ ] Railway account created
- [ ] Backend deployed on Railway
- [ ] Backend URL obtained
- [ ] Frontend deployed on Railway
- [ ] Frontend URL obtained (YOUR WEBSITE!)
- [ ] Backend CORS updated
- [ ] Website tested
- [ ] QR code generated

---

## 🎉 You're Almost There!

Once you complete these steps, your website will be live and accessible to everyone!

**Next:** Start with Step 2.1 above (Sign up for Railway)

---

**Need help?** Check Railway's documentation or ask for help with any specific step!

