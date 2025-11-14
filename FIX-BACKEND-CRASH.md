# 🔧 Fix Backend Crash - Step by Step

## Error: "Application failed to respond"

This means the backend is crashing on startup. Let's fix it.

---

## Step 1: Check Railway Logs

1. **In Railway, go to your backend service**
2. **Click "Deployments" tab**
3. **Click on the latest deployment**
4. **Click "View Logs"** or scroll down to see logs
5. **Look for error messages** (usually in red)

**Common errors you might see:**
- `JWT_SECRET must be set`
- `Cannot find module`
- `Database connection failed`
- `Environment validation error`

**Copy the error message** - this will tell us what's wrong!

---

## Step 2: Set Required Environment Variables

The most common cause is missing environment variables.

### In Railway → Backend Service → Variables Tab

**Add these variables (click "New Variable" for each):**

```
NODE_ENV=production
JWT_SECRET=iQcB+vD3BibPFJ4NPzlGLNvZQzlWwatqOvSAqqR+ul4=
DATA_BACKEND=sheets
GS_SERVICE_ACCOUNT=parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQDeT4YfiMAvxuUl\naARt5PJrqIoyO4xujSMwng786v4KTkSsV9f9GjQzlk6Dq7R0eRvpKikeII5xff3n\nkP5V694R2/Qk0s43HtKbo/9dE2XJgjoHkFROlX9Zy0F3FzjCbglAhp7EorOJeMVL\n6Cng0GfZo+2vDmBxFhkMOoOlsUwLVcboWLZVhvzWYiSgWmWBG7IjYDFVhxnnWwS1\nV6sZ/XGk5fcYH181OtkmQ3eKlI4DfSlCwNvDatsJXzGj5sgUvGtjCFKh4pTQDeGv\n1scdjIltZ2EKbv5e/GBVGWxoEG9oUoJ6sbQSByliuURGeWLq2u/lKkdnXPIzxilF\nASuIApGdAgMBAAECgf8waaELvPwda3L7cmuEgxdH2qw9xDoQ2SuQqtsYuRQZqnHK\nFlczB0HW+iSfCAWEV9t8K3JI3U4n6QgiJbE9hOAXg47ndgDygAPdYRl7a33/JBz/\nCK9TbbsOEvVuud/id5QMOUTaDZSLm4FbxnNYQgpbmxdnx/m4ptdNknCY5MNqtBtE\n45Z5UItsYXlnf2+U3ughA9CHaV6NKxZPYJSgE8sKmS/96/WZlOSNy96IUCLb6XWQ\nX73gt+y/FBXADtnIRtcsqlDZ6wp3zUdhfjuqysXkx2vJPIUi+xZN/9d3ndpmXyLl\nTeTOn68o5GJFNEcATpQ+Oe1e1u6HZDyxVVALq/ECgYEA/Wku1DKs2m1JRraLpFPx\n5Vdxtr4F2pRCg+BCotpykRIK9n8d9LBpYUBf+J1HalWxlftAAjxStKKCbXhkILkx\nCkaM7D6Dw93qBn2cdRqrn7Pu7o1zvcGVchfMrseHal2/UuCPXmCh2tInWfRnUtzA\nHSTSIw1N2G1eXIrQ1LCPvS0CgYEA4JT+6s0zl49SvHX9aGrk+ZG+hd7KCYoGparF\nLPjKZAvkSIGLZdPXPeBtm0O1+rWcMc+7JCNnHob9ryUdKvXv1m32R1ETi3Ej3vL8\n9EnwHIfeUgvBmHHGVWUU9y3tuAz8olIVhotuh89bwosQsiAV3Np+ZDHNbQim3Y9j\n+UNuTDECgYEAyPuFQpM2eL64oTbipeBWN/kUnUU0y1lPL9zLvPHYb6qJu1qyXYEU\n8ybldv72xyVUBYoSCDPjvJQvMbeMYk++z1GJL02dn9j/ZUp2roIKoE1LMTRLGbLR\nXn31vqFNi1TzCz5DNy0Y8b4/q56l3Bhs3jB34YkJtp93eZo3apjmR7kCgYB05Dg2\ngC3NQfT/UK5f7dtWJsyyov4nrua8zcCpIqk9H49nSb4Ddxp+A1UpTjnmzyYIKyYt\nrhubIQnjYn7nAHEf+8YG4qU4m9/eyDxu7hkC0JkfvSy7quRfSCh8azRi6qeH2Q+J\nIwOZvoz1GirLe7XFaRgGEIHqsWkgwuR3Neiv0QKBgB4mI+gjDqhvWQ5B9IYUrR/S\nH8bcJmYrNbNItPWXE0GGQwE4qVpZdOM+RLmuIA+rDsgxESAMIBmVUpBQPDo5j4nm\naVxGXKmAuTyvLrJVFu/z9qiHc+KP0NPo41cR6xadBYo8Zot/JobXx/8DoGnrmVUt\n1vcD3y7wZkWj/+OY0W76\n-----END PRIVATE KEY-----\n"
GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0
```

**Important:**
- Make sure `JWT_SECRET` is set (this is critical!)
- `GS_PRIVATE_KEY` must include quotes and `\n` characters
- `DATA_BACKEND` should be `sheets` (or `memory` for testing)

---

## Step 3: Check for Port Variable

**DO NOT set PORT manually!** Railway sets this automatically.

1. **Go to Variables tab**
2. **If you see `PORT=5173` or any PORT variable, DELETE it**
3. **Railway will set PORT automatically**

---

## Step 4: Use Memory Backend for Testing (Temporary)

If Google Sheets is causing issues, use memory backend temporarily:

1. **Variables tab**
2. **Set `DATA_BACKEND=memory`** (instead of `sheets`)
3. **Remove GS_* variables** (temporarily)
4. **Save**

This will let the backend start. You can switch back to sheets later.

---

## Step 5: Check Build Logs

1. **Go to Deployments tab**
2. **Click on latest deployment**
3. **Check build logs** (before runtime logs)
4. **Look for:**
   - `npm install` errors
   - Missing dependencies
   - Build failures

---

## Step 6: Common Fixes

### Fix 1: Missing JWT_SECRET
**Error:** `JWT_SECRET must be set`
**Fix:** Add `JWT_SECRET` variable (see Step 2)

### Fix 2: Google Sheets Connection
**Error:** `Cannot connect to Google Sheets`
**Fix:** 
- Check `GS_SERVICE_ACCOUNT` is correct
- Check `GS_PRIVATE_KEY` includes quotes and `\n`
- Try `DATA_BACKEND=memory` temporarily

### Fix 3: Missing Dependencies
**Error:** `Cannot find module`
**Fix:** 
- Check build logs
- Make sure `npm install` completed successfully
- Railway should handle this automatically

### Fix 4: Port Already in Use
**Error:** `Port already in use`
**Fix:**
- Don't set PORT manually
- Railway sets it automatically
- Remove any PORT variable

---

## Step 7: Test After Fixes

1. **Save all environment variables**
2. **Railway will automatically redeploy**
3. **Wait 1-2 minutes**
4. **Check Deployments tab for new deployment**
5. **Test:** `https://parc-ton-gosse-production.up.railway.app/api/health`

---

## 🆘 Still Crashing?

**Share the error from Railway logs:**
1. Go to Deployments → Latest deployment → Logs
2. Copy the error message (the red text)
3. Share it with me

**Common log locations:**
- Build logs (during `npm install`)
- Runtime logs (when server starts)
- Error logs (when server crashes)

---

## ✅ Quick Fix Checklist

- [ ] Check Railway logs for error message
- [ ] Set `JWT_SECRET` variable
- [ ] Set `NODE_ENV=production`
- [ ] Set `DATA_BACKEND=memory` (for testing)
- [ ] Remove any `PORT` variable
- [ ] Check build completed successfully
- [ ] Wait for redeploy
- [ ] Test `/api/health` endpoint

---

**Most likely issue:** Missing `JWT_SECRET` variable. Set it first!

