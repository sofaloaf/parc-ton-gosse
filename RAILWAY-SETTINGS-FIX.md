# Fix Railway Backend Settings

## Current Settings (WRONG)
- Root Directory: `server` ✅ (correct)
- Build Command: `npm run build` ❌ (wrong - backend doesn't build)
- Start Command: `npm start` ✅ (correct)

## ✅ Correct Settings

### Backend Service Settings:

**Root Directory:**
```
server
```

**Build Command:**
```
npm install
```
OR leave it **empty** (Railway will auto-detect)

**Start Command:**
```
npm start
```
OR leave it **empty** (will use `server/railway.json`)

---

## Why `npm run build` Fails

The backend `package.json` has:
```json
"build": "echo 'No build step needed'"
```

But Railway might be trying to actually build something, or it's detecting the wrong service type.

**Solution:** Change Build Command to `npm install` or leave it empty.

---

## How to Fix in Railway

1. **Go to Railway Dashboard**
2. **Backend Service** → **Settings** tab
3. **Find "Build Command" field**
4. **Change from:** `npm run build`
5. **Change to:** `npm install` (or leave empty)
6. **Save**
7. **Redeploy**

---

## Alternative: Use railway.json

If you leave Build Command and Start Command **empty**, Railway will use `server/railway.json` which I just created with the correct commands.

---

## Expected Result

After fix:
- ✅ Build completes successfully
- ✅ Server starts with: `npm start`
- ✅ Logs show: `Server listening on port...`
- ✅ No `serve -s dist` errors

---

**Change Build Command from `npm run build` to `npm install` (or empty) and redeploy!**

