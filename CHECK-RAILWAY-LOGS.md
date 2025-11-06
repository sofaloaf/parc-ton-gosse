# 🔍 How to Check Railway Logs - Step by Step

## Your Backend is Crashing - We Need to See the Error!

The backend URL shows "Application failed to respond" which means the server is crashing on startup.

**We need to see the actual error message from Railway logs to fix it.**

---

## Step 1: Open Railway Dashboard

1. Go to: https://railway.app
2. Login to your account
3. Click on your project (should be named something like "parc-ton-gosse")

---

## Step 2: Find Your Backend Service

1. You should see a list of services
2. Find the service that's your backend (might be named "parc-ton-gosse" or "backend")
3. **Click on it**

---

## Step 3: Open Deployments Tab

1. Look for tabs at the top: **Settings**, **Variables**, **Deployments**, **Metrics**, etc.
2. **Click "Deployments" tab**

---

## Step 4: Find Latest Deployment

1. You'll see a list of deployments (most recent at the top)
2. **Click on the most recent deployment** (the one at the top)

---

## Step 5: View Logs

1. Scroll down on the deployment page
2. You'll see **"Logs"** section
3. Look for **RED error messages** or text that says "Error" or "Failed"

---

## Step 6: Copy the Error

1. **Find the error message** (usually at the end of the logs)
2. **Copy the entire error message**
3. **Share it with me**

---

## What to Look For

Common errors you might see:

### Error 1: "JWT_SECRET must be set"
```
Error: JWT_SECRET must be set in production environment
```
**Fix:** Set `JWT_SECRET` variable in Railway

### Error 2: "Cannot find module"
```
Error: Cannot find module 'express'
```
**Fix:** Build failed - check build logs

### Error 3: "Google Sheets credentials required"
```
Error: Google Sheets credentials required but missing: GS_SERVICE_ACCOUNT, GS_PRIVATE_KEY
```
**Fix:** Set `DATA_BACKEND=memory` or add Google Sheets variables

### Error 4: "SyntaxError" or "Unexpected token"
```
SyntaxError: Unexpected token
```
**Fix:** Code error - need to fix the code

### Error 5: "Port already in use"
```
Error: Port 4000 already in use
```
**Fix:** Don't set PORT manually - Railway sets it

---

## Alternative: View Logs in Real-Time

1. In your backend service, look for **"Logs"** tab (not Deployments)
2. Click it to see real-time logs
3. Look for error messages

---

## Screenshot Locations

If you can't find the logs, here's where they are:

```
Railway Dashboard
└── Your Project
    └── Backend Service
        ├── Deployments Tab
        │   └── Latest Deployment
        │       └── Scroll Down → Logs Section
        └── Logs Tab (alternative)
            └── Real-time logs
```

---

## Quick Checklist

- [ ] Opened Railway dashboard
- [ ] Found backend service
- [ ] Clicked "Deployments" tab
- [ ] Clicked latest deployment
- [ ] Scrolled to "Logs" section
- [ ] Found error message (red text)
- [ ] Copied error message
- [ ] Ready to share with me!

---

## 🆘 Can't Find Logs?

**Try this:**
1. Go to your backend service
2. Look for any tab that says "Logs" or "View Logs"
3. Or check the "Metrics" tab - sometimes errors show there
4. Or check the deployment status - it might show "Failed" with an error

---

**Once you share the error message, I can fix it immediately!**

