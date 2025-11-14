# Fix CORS and Build Issues

## Current Problems

1. **Frontend shows CORS errors** - "CORS Missing allow origin"
2. **Backend failing to build on Railway**
3. **Activities not loading**

---

## Step 1: Check Frontend API URL

**The frontend might be connecting to the wrong backend URL.**

**Check:**
1. **Go to:** Railway → Frontend service → Variables
2. **Look for:** `VITE_API_URL`
3. **Should be:** `https://parc-ton-gosse-backend-production.up.railway.app/api`
4. **If wrong or missing**, add it

---

## Step 2: Check Backend CORS_ORIGIN

**The backend needs the frontend URL in CORS_ORIGIN.**

**Go to:** Railway → `parc-ton-gosse-backend` → Variables

**Check:**
- **Variable:** `CORS_ORIGIN`
- **Value should be:** `https://victorious-gentleness-production.up.railway.app`
- **If missing or wrong**, set it

---

## Step 3: Check Backend Build Status

**Go to:** Railway → `parc-ton-gosse-backend` → Deployments

**Check:**
- **Is the latest deployment successful?** (green checkmark)
- **Or is it failing?** (red X)
- **What error does it show?**

**If it's failing:**
- Click on the failed deployment
- Check the logs
- Share the error message

---

## Step 4: Verify Both Services Are Running

**Backend Health:**
```bash
curl https://parc-ton-gosse-backend-production.up.railway.app/api/health
```

**Frontend:**
- Visit: `https://victorious-gentleness-production.up.railway.app`
- Open DevTools (F12) → Network tab
- Look for requests to `/api/activities`
- Check the request URL

---

## Common Issues

### Issue 1: Frontend Using Wrong API URL
**Symptom:** CORS errors, activities not loading
**Fix:** Set `VITE_API_URL` in frontend variables

### Issue 2: Backend CORS_ORIGIN Not Set
**Symptom:** CORS errors
**Fix:** Set `CORS_ORIGIN` in backend variables

### Issue 3: Backend Build Failing
**Symptom:** Backend not responding
**Fix:** Check deployment logs for error

---

## Quick Checklist

- [ ] `VITE_API_URL` set in frontend: `https://parc-ton-gosse-backend-production.up.railway.app/api`
- [ ] `CORS_ORIGIN` set in backend: `https://victorious-gentleness-production.up.railway.app`
- [ ] Backend deployment successful (green checkmark)
- [ ] Frontend deployment successful (green checkmark)
- [ ] Both services running

---

**Please check:**
1. **What error shows in the backend deployment logs?**
2. **What is the `VITE_API_URL` value in frontend variables?**
3. **What is the `CORS_ORIGIN` value in backend variables?**

---

**Last Updated:** $(date)

