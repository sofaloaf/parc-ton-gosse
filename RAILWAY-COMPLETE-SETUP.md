# 🚀 Complete Railway Setup - Fix Backend & Deploy Frontend

## 🔧 Fix Backend Crash

The backend is crashing because required environment variables are missing. Follow these steps:

---

## Step 1: Set ALL Required Environment Variables

### In Railway → Backend Service → Variables Tab

**Add these variables (click "New Variable" for each):**

```
NODE_ENV=production
PORT=4000
JWT_SECRET=iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=
CORS_ORIGIN=https://your-frontend-url.railway.app
DATA_BACKEND=sheets
GS_SERVICE_ACCOUNT=parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQDeT4YfiMAvxuUl\naARt5PJrqIoyO4xujSMwng786v4KTkSsV9f9GjQzlk6Dq7R0eRvpKikeII5xff3n\nkP5V694R2/Qk0s43HtKbo/9dE2XJgjoHkFROlX9Zy0F3FzjCbglAhp7EorOJeMVL\n6Cng0GfZo+2vDmBxFhkMOoOlsUwLVcboWLZVhvzWYiSgWmWBG7IjYDFVhxnnWwS1\nV6sZ/XGk5fcYH181OtkmQ3eKlI4DfSlCwNvDatsJXzGj5sgUvGtjCFKh4pTQDeGv\n1scdjIltZ2EKbv5e/GBVGWxoEG9oUoJ6sbQSByliuURGeWLq2u/lKkdnXPIzxilF\nASuIApGdAgMBAAECgf8waaELvPwda3L7cmuEgxdH2qw9xDoQ2SuQqtsYuRQZqnHK\nFlczB0HW+iSfCAWEV9t8K3JI3U4n6QgiJbE9hOAXg47ndgDygAPdYRl7a33/JBz/\nCK9TbbsOEvVuud/id5QMOUTaDZSLm4FbxnNYQgpbmxdnx/m4ptdNknCY5MNqtBtE\n45Z5UItsYXlnf2+U3ughA9CHaV6NKxZPYJSgE8sKmS/96/WZlOSNy96IUCLb6XWQ\nX73gt+y/FBXADtnIRtcsqlDZ6wp3zUdhfjuqysXkx2vJPIUi+xZN/9d3ndpmXyLl\nTeTOn68o5GJFNEcATpQ+Oe1e1u6HZDyxVVALq/ECgYEA/Wku1DKs2m1JRraLpFPx\n5Vdxtr4F2pRCg+BCotpykRIK9n8d9LBpYUBf+J1HalWxlftAAjxStKKCbXhkILkx\nCkaM7D6Dw93qBn2cdRqrn7Pu7o1zvcGVchfMrseHal2/UuCPXmCh2tInWfRnUtzA\nHSTSIw1N2G1eXIrQ1LCPvS0CgYEA4JT+6s0zl49SvHX9aGrk+ZG+hd7KCYoGparF\nLPjKZAvkSIGLZdPXPeBtm0O1+rWcMc+7JCNnHob9ryUdKvXv1m32R1ETi3Ej3vL8\n9EnwHIfeUgvBmHHGVWUU9y3tuAz8olIVhotuh89bwosQsiAV3Np+ZDHNbQim3Y9j\n+UNuTDECgYEAyPuFQpM2eL64oTbipeBWN/kUnUU0y1lPL9zLvPHYb6qJu1qyXYEU\n8ybldv72xyVUBYoSCDPjvJQvMbeMYk++z1GJL02dn9j/ZUp2roIKoE1LMTRLGbLR\nXn31vqFNi1TzCz5DNy0Y8b4/q56l3Bhs3jB34YkJtp93eZo3apjmR7kCgYB05Dg2\ngC3NQfT/UK5f7dtWJsyyov4nrua8zcCpIqk9H49nSb4Ddxp+A1UpTjnmzyYIKyYt\nrhubIQnjYn7nAHEf+8YG4qU4m9/eyDxu7hkC0JkfvSy7quRfSCh8azRi6qeH2Q+J\nIwOZvoz1GirLe7XFaRgGEIHqsWkgwuR3Neiv0QKBgB4mI+gjDqhvWQ5B9IYUrR/S\nH8bcJmYrNbNItPWXE0GGQwE4qVpZdOM+RLmuIA+rDsgxESAMIBmVUpBQPDo5j4nm\naVxGXKmAuTyvLrJVFu/z9qiHc+KP0NPo41cR6xadBYo8Zot/JobXx/8DoGnrmVUt\n1vcD3y7wZkWj/+OY0W76\n-----END PRIVATE KEY-----\n"
GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0
```

**Important Notes:**
- **CORS_ORIGIN**: Leave this for now, update after frontend deploy
- **GS_PRIVATE_KEY**: Make sure to include the quotes and keep `\n` characters
- **JWT_SECRET**: Use the value above or generate your own

---

## Step 2: Push Updated Validation Code

I've made the validation less strict. Push the fix:

```bash
git add server/utils/validation.js server/index.js
git commit -m "Fix backend validation - allow missing CORS_ORIGIN initially"
git push
```

---

## Step 3: Deploy Frontend

### 3.1 Create Frontend Service

1. **In Railway, go to your project**
2. **Click "+ New"** (top right)
3. **Select "GitHub Repo"**
4. **Choose:** `parc-ton-gosse`

### 3.2 Configure Frontend

1. **Click on the new frontend service**
2. **Go to Settings tab**
3. **Set Root Directory:** `client` (if available)
4. **Go to Settings → Deploy:**
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npx serve -s dist -l $PORT`
   - **Port:** `3000` (or leave default)

### 3.3 Set Environment Variable

1. **Go to Variables tab**
2. **Add:**
   ```
   Name: VITE_API_URL
   Value: https://your-backend-url.railway.app/api
   ```
   
   **Replace `your-backend-url` with your actual backend URL!**

### 3.4 Generate Frontend Domain

1. **Go to Settings → Networking**
2. **Click "Generate Domain"**
3. **Copy the URL** - THIS IS YOUR WEBSITE URL! 🎉

---

## Step 4: Update Backend CORS

1. **Go back to backend service**
2. **Go to Variables tab**
3. **Update `CORS_ORIGIN`:**
   ```
   CORS_ORIGIN=https://your-frontend-url.railway.app
   ```
4. **Save**

Railway will automatically redeploy.

---

## Step 5: Test Everything

### Test Backend:
- Visit: `https://your-backend-url.railway.app/api/health`
- Should see: `{"status":"ok"}`

### Test Frontend:
- Visit: `https://your-frontend-url.railway.app`
- Should see your website!
- Test login functionality

---

## 📋 All Your URLs

After setup, you'll have:

1. **Backend API URL:**
   - `https://your-backend-url.railway.app`
   - Test: `https://your-backend-url.railway.app/api/health`

2. **Frontend Website URL:**
   - `https://your-frontend-url.railway.app`
   - **THIS IS WHERE USERS LOG IN!**

3. **API Endpoints:**
   - Health: `https://your-backend-url.railway.app/api/health`
   - Activities: `https://your-backend-url.railway.app/api/activities`
   - Auth: `https://your-backend-url.railway.app/api/auth/login`

---

## ✅ Checklist

- [ ] Set all backend environment variables
- [ ] Push validation fix
- [ ] Backend deploys successfully
- [ ] Get backend URL
- [ ] Create frontend service
- [ ] Set frontend environment variables
- [ ] Get frontend URL
- [ ] Update backend CORS_ORIGIN
- [ ] Test backend health endpoint
- [ ] Test frontend website
- [ ] Test login functionality

---

## 🆘 Troubleshooting

### Backend still crashing?
- Check all environment variables are set
- Check JWT_SECRET is at least 16 characters
- Check Railway logs for specific errors

### Frontend can't connect?
- Verify VITE_API_URL is correct (include `/api`)
- Check CORS_ORIGIN includes frontend URL
- Check browser console for errors

---

**After completing these steps, you'll have a fully working website!**

