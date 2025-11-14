# 🔧 Fix Backend Port Issue

## Issue

Backend is showing port 5173, which is wrong. Port 5173 is the Vite dev server port, not the backend port.

## Your Backend URL

**Correct Backend URL:** `https://parc-ton-gosse-production.up.railway.app`

**Note:** Always use `https://` in front!

## Backend Port Configuration

The backend should use Railway's `PORT` environment variable (Railway sets this automatically).

**Current code:** `const PORT = process.env.PORT || 4000;`

This is correct! Railway will set `PORT` automatically.

## Why You See Port 5173

Port 5173 might be showing because:
1. Railway is reading the wrong service
2. The logs are from a different service
3. There's a configuration issue

## Fix: Check Railway Configuration

1. **In Railway, go to your backend service**
2. **Check Settings → Deploy:**
   - Start Command should be: `cd server && NODE_ENV=production node index.js`
   - Port should be auto-set by Railway (don't manually set it)

3. **Check Variables:**
   - `PORT` should NOT be set manually (Railway sets it)
   - If `PORT=5173` is set, DELETE it

4. **Check Deployments:**
   - Look at the latest deployment logs
   - Should see: `Server running on port XXXX` (Railway's port)
   - Should NOT see port 5173

## Test Backend

Visit: `https://parc-ton-gosse-production.up.railway.app/api/health`

Should see: `{"status":"ok"}`

If this works, your backend is fine! The port number doesn't matter - Railway handles it.

---

## Next: Deploy Frontend

See `DEPLOY-FRONTEND-STEP-BY-STEP.md` for detailed instructions.

