# Update GS_SHEET_ID in Railway

## Current Issue
The Google Sheets URL shown in the admin panel is incorrect because `GS_SHEET_ID` environment variable in Railway is set to the wrong value.

## Correct Sheet Information
- **Sheet ID**: `1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A`
- **Sheet URL**: https://docs.google.com/spreadsheets/d/1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A/edit

## How to Fix

### Step 1: Go to Railway Dashboard
1. Open https://railway.app
2. Log in to your account
3. Select your project (the one hosting the backend)

### Step 2: Find Environment Variables
1. Click on your **backend service** (not the project, the actual service)
2. Go to the **Variables** tab (or **Settings** → **Variables**)
3. Look for `GS_SHEET_ID` in the list

### Step 3: Update the Value
1. Click on `GS_SHEET_ID` to edit it
2. Change the value to: `1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A`
3. Save the changes

### Step 4: Redeploy (if needed)
- Railway should automatically redeploy when you change environment variables
- If not, you can manually trigger a redeploy from the **Deployments** tab

### Step 5: Verify
1. Wait 2-3 minutes for Railway to redeploy
2. Go to https://parctongosse.com/admin
3. Run the crawler again
4. Check that the Google Sheets URL now shows the correct sheet ID

## What This Fixes
- ✅ Google Sheets URL in crawler results will be correct
- ✅ Pending activities will be saved to the correct sheet
- ✅ All sheet operations will use the correct sheet

## Important Notes
- **Do NOT** change `GS_SANDBOX_SHEET_ID` - that's for testing
- The sheet ID is the long string between `/d/` and `/edit` in the Google Sheets URL
- Make sure there are no extra spaces or quotes around the value

