# ⚡ Quick Fix & Deploy - All URLs

## 🔧 Fix Backend (5 minutes)

### 1. Set Environment Variables in Railway

**Go to: Railway → Backend Service → Variables Tab**

**Add these (click "New Variable" for each):**

```
NODE_ENV=production
JWT_SECRET=iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=
DATA_BACKEND=sheets
GS_SERVICE_ACCOUNT=parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQDeT4YfiMAvxuUl\naARt5PJrqIoyO4xujSMwng786v4KTkSsV9f9GjQzlk6Dq7R0eRvpKikeII5xff3n\nkP5V694R2/Qk0s43HtKbo/9dE2XJgjoHkFROlX9Zy0F3FzjCbglAhp7EorOJeMVL\n6Cng0GfZo+2vDmBxFhkMOoOlsUwLVcboWLZVhvzWYiSgWmWBG7IjYDFVhxnnWwS1\nV6sZ/XGk5fcYH181OtkmQ3eKlI4DfSlCwNvDatsJXzGj5sgUvGtjCFKh4pTQDeGv\n1scdjIltZ2EKbv5e/GBVGWxoEG9oUoJ6sbQSByliuURGeWLq2u/lKkdnXPIzxilF\nASuIApGdAgMBAAECgf8waaELvPwda3L7cmuEgxdH2qw9xDoQ2SuQqtsYuRQZqnHK\nFlczB0HW+iSfCAWEV9t8K3JI3U4n6QgiJbE9hOAXg47ndgDygAPdYRl7a33/JBz/\nCK9TbbsOEvVuud/id5QMOUTaDZSLm4FbxnNYQgpbmxdnx/m4ptdNknCY5MNqtBtE\n45Z5UItsYXlnf2+U3ughA9CHaV6NKxZPYJSgE8sKmS/96/WZlOSNy96IUCLb6XWQ\nX73gt+y/FBXADtnIRtcsqlDZ6wp3zUdhfjuqysXkx2vJPIUi+xZN/9d3ndpmXyLl\nTeTOn68o5GJFNEcATpQ+Oe1e1u6HZDyxVVALq/ECgYEA/Wku1DKs2m1JRraLpFPx\n5Vdxtr4F2pRCg+BCotpykRIK9n8d9LBpYUBf+J1HalWxlftAAjxStKKCbXhkILkx\nCkaM7D6Dw93qBn2cdRqrn7Pu7o1zvcGVchfMrseHal2/UuCPXmCh2tInWfRnUtzA\nHSTSIw1N2G1eXIrQ1LCPvS0CgYEA4JT+6s0zl49SvHX9aGrk+ZG+hd7KCYoGparF\nLPjKZAvkSIGLZdPXPeBtm0O1+rWcMc+7JCNnHob9ryUdKvXv1m32R1ETi3Ej3vL8\n9EnwHIfeUgvBmHHGVWUU9y3tuAz8olIVhotuh89bwosQsiAV3Np+ZDHNbQim3Y9j\n+UNuTDECgYEAyPuFQpM2eL64oTbipeBWN/kUnUU0y1lPL9zLvPHYb6qJu1qyXYEU\n8ybldv72xyVUBYoSCDPjvJQvMbeMYk++z1GJL02dn9j/ZUp2roIKoE1LMTRLGbLR\nXn31vqFNi1TzCz5DNy0Y8b4/q56l3Bhs3jB34YkJtp93eZo3apjmR7kCgYB05Dg2\ngC3NQfT/UK5f7dtWJsyyov4nrua8zcCpIqk9H49nSb4Ddxp+A1UpTjnmzyYIKyYt\nrhubIQnjYn7nAHEf+8YG4qU4m9/eyDxu7hkC0JkfvSy7quRfSCh8azRi6qeH2Q+J\nIwOZvoz1GirLe7XFaRgGEIHqsWkgwuR3Neiv0QKBgB4mI+gjDqhvWQ5B9IYUrR/S\nH8bcJmYrNbNItPWXE0GGQwE4qVpZdOM+RLmuIA+rDsgxESAMIBmVUpBQPDo5j4nm\naVxGXKmAuTyvLrJVFu/z9qiHc+KP0NPo41cR6xadBYo8Zot/JobXx/8DoGnrmVUt\n1vcD3y7wZkWj/+OY0W76\n-----END PRIVATE KEY-----\n"
GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0
```

**Note:** Leave `CORS_ORIGIN` empty for now - we'll set it after frontend deploy.

### 2. Get Backend URL

1. **Go to: Settings → Networking**
2. **Click "Generate Domain"** (if not done)
3. **Copy the URL** (e.g., `https://parc-ton-gosse-backend-production.up.railway.app`)

**Save this URL - you'll need it for the frontend!**

### 3. Test Backend

Visit: `https://your-backend-url.railway.app/api/health`

Should see: `{"status":"ok"}`

---

## 🌐 Deploy Frontend (5 minutes)

### 1. Create Frontend Service

1. **In Railway, click "+ New" → "GitHub Repo"**
2. **Select:** `parc-ton-gosse`
3. **Railway will create a new service**

### 2. Configure Frontend

1. **Click on the new service**
2. **Settings → Source → Root Directory:** `client`
3. **Settings → Deploy:**
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npx serve -s dist -l $PORT`

### 3. Set Environment Variable

**Variables tab → New Variable:**
```
Name: VITE_API_URL
Value: https://your-backend-url.railway.app/api
```

**Replace `your-backend-url` with your actual backend URL!**

### 4. Generate Frontend Domain

1. **Settings → Networking**
2. **Click "Generate Domain"**
3. **Copy the URL** - **THIS IS YOUR WEBSITE URL!** 🎉

---

## 🔄 Update Backend CORS

1. **Go back to backend service**
2. **Variables tab**
3. **Update `CORS_ORIGIN`:**
   ```
   https://your-frontend-url.railway.app
   ```
4. **Save**

---

## 📋 All Your URLs

After setup:

### Backend API:
- **URL:** `https://your-backend-url.railway.app`
- **Health Check:** `https://your-backend-url.railway.app/api/health`
- **API Base:** `https://your-backend-url.railway.app/api`

### Frontend Website:
- **URL:** `https://your-frontend-url.railway.app`
- **Login Page:** `https://your-frontend-url.railway.app/profile`
- **Browse Activities:** `https://your-frontend-url.railway.app/`

---

## ✅ Final Checklist

- [ ] Backend environment variables set
- [ ] Backend URL obtained
- [ ] Backend health check works
- [ ] Frontend service created
- [ ] Frontend environment variable set
- [ ] Frontend URL obtained
- [ ] Backend CORS updated
- [ ] Website loads correctly
- [ ] Login works

---

## 🎉 You're Done!

Your website is now live! Share the frontend URL with users.

**Generate QR code:**
```bash
npm run qr https://your-frontend-url.railway.app
```

