# 🔧 Fix Railway Build Errors

## Issues Found

1. ❌ **JWT_SECRET not set** - Backend can't start without this
2. ❌ **Wrong start command** - Railway is running root `start.js` instead of backend only
3. ❌ **Frontend trying to start** - Backend service shouldn't start frontend

## ✅ Fix 1: Set JWT_SECRET Environment Variable

**This is URGENT - do this first!**

1. **In Railway, go to your backend service**
2. **Click "Variables" tab**
3. **Click "New Variable"**
4. **Add:**
   ```
   Name: JWT_SECRET
   Value: [generate a strong secret - see below]
   ```

**Generate a strong JWT_SECRET:**
```bash
openssl rand -base64 32
```

Or use this one (copy it):
```
iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=
```

**Add this variable NOW** - the backend can't start without it!

---

## ✅ Fix 2: Update Railway Configuration

I've updated the configuration files to:
- ✅ Only run the backend (not the full app)
- ✅ Use the correct start command
- ✅ Install only production dependencies

**Push the updated files:**
```bash
git add railway.json nixpacks.toml
git commit -m "Fix Railway configuration for backend only"
git push
```

Railway will automatically redeploy with the new configuration.

---

## ✅ Fix 3: Set All Required Environment Variables

While you're in the Variables tab, add ALL these variables:

### Required Variables:
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

**Note:** 
- Update `CORS_ORIGIN` after you deploy the frontend
- Make sure `GS_PRIVATE_KEY` includes the quotes and `\n` characters

---

## 📋 Step-by-Step Fix

### Step 1: Set JWT_SECRET (DO THIS FIRST!)
1. Go to Variables tab
2. Add `JWT_SECRET` with a strong value
3. Save

### Step 2: Push Updated Configuration
```bash
git add railway.json nixpacks.toml
git commit -m "Fix Railway config - backend only"
git push
```

### Step 3: Set All Other Environment Variables
1. Go to Variables tab
2. Add all variables from the list above
3. Save

### Step 4: Wait for Redeploy
- Railway will automatically redeploy
- Check Deployments tab
- Look for successful build

### Step 5: Test Backend
- Visit: `https://your-backend-url.railway.app/api/health`
- Should see: `{"status":"ok"}`

---

## ✅ Expected Result

After fixing, the build logs should show:
```
Starting Container
Installing dependencies...
Building...
Starting...
Server running on port 4000
```

**No errors about:**
- ❌ JWT_SECRET
- ❌ Frontend/rollup
- ❌ start.js

---

## 🆘 If Still Not Working

1. **Check Variables tab** - Make sure all variables are set
2. **Check Deployments tab** - Look for new deployment after push
3. **Check build logs** - Should see `cd server && npm install`
4. **Verify start command** - Should be `cd server && NODE_ENV=production node index.js`

---

## 🎯 Priority Order

1. **URGENT:** Set JWT_SECRET variable
2. **IMPORTANT:** Push updated railway.json and nixpacks.toml
3. **REQUIRED:** Set all other environment variables
4. **TEST:** Check backend health endpoint

---

**Do Step 1 (JWT_SECRET) RIGHT NOW** - the backend can't start without it!

