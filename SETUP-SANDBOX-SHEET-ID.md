# Setup GS_SANDBOX_SHEET_ID in Railway

## Quick Setup Guide

The sandbox cleanup feature requires the `GS_SANDBOX_SHEET_ID` environment variable to be set in Railway.

### Step 1: Get Your Sandbox Sheet ID

Your sandbox Google Sheet URL:
```
https://docs.google.com/spreadsheets/d/1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A/edit
```

**Sheet ID:** `1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A`

### Step 2: Set Environment Variable in Railway

1. **Go to Railway Dashboard:**
   - Visit: https://railway.app
   - Log in to your account

2. **Navigate to Backend Service:**
   - Click on your project
   - Click on the **Backend** service (not Frontend)

3. **Go to Variables:**
   - Click on the **Variables** tab (or Settings → Variables)
   - You should see existing variables like:
     - `GS_SHEET_ID` (production sheet)
     - `GS_SERVICE_ACCOUNT`
     - `GS_PRIVATE_KEY`
     - etc.

4. **Add New Variable:**
   - Click **+ New Variable** or **Add Variable**
   - **Name:** `GS_SANDBOX_SHEET_ID`
   - **Value:** `1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A`
   - Click **Add** or **Save**

5. **Verify:**
   - You should now see `GS_SANDBOX_SHEET_ID` in your variables list
   - Railway will automatically redeploy the backend service

### Step 3: Grant Service Account Access

**Important:** The service account needs Editor access to the sandbox sheet.

1. **Open your sandbox Google Sheet:**
   - https://docs.google.com/spreadsheets/d/1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A/edit

2. **Click Share** (top right)

3. **Add Service Account:**
   - Find your service account email in Railway:
     - Go to Backend Service → Variables
     - Look for `GS_SERVICE_ACCOUNT`
     - It should be something like: `parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com`
   - Add that email address
   - Set permission to **Editor**
   - Click **Send**

### Step 4: Wait for Redeploy

- Railway will automatically redeploy the backend when you add the variable
- Wait 1-2 minutes for the deployment to complete
- Check the deployment logs to confirm it started successfully

### Step 5: Test

1. Go to admin panel: `https://parctongosse.com/admin`
2. Scroll to "Sandbox Cleanup & Formatting" section
3. Click "🧹 Create Cleaned Tab"
4. It should work now!

## Troubleshooting

### Still getting "Sandbox not available" error?

1. **Check variable is set:**
   - Railway → Backend Service → Variables
   - Verify `GS_SANDBOX_SHEET_ID` exists and has the correct value

2. **Check service account access:**
   - Open the sandbox sheet
   - Click Share
   - Verify the service account email is listed with Editor permission

3. **Check backend logs:**
   - Railway → Backend Service → Deployments → Latest → Logs
   - Look for: "✅ Sandbox Google Sheets connected"
   - Or: "⚠️ GS_SANDBOX_SHEET_ID not set - sandbox features disabled"

4. **Force redeploy:**
   - Railway → Backend Service → Settings
   - Click "Redeploy" or trigger a new deployment

## Summary

**Required Environment Variable:**
- **Name:** `GS_SANDBOX_SHEET_ID`
- **Value:** `1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A`

**Required Access:**
- Service account must have **Editor** permission on the sandbox sheet

---

**Once you set the variable and grant access, the sandbox cleanup will work!**

