# Railway Root Directory Fix

## Critical Issue
Railway frontend service is serving an old build. The HTML references `index-DJ_AMrr4.js` but the actual file is `index-cXAyp2ch.js`.

## Solution: Set Root Directory in Railway

Railway needs to know that the frontend code is in the `client/` directory.

### Steps to Fix:

1. **Go to Railway Dashboard**
   - Open your Railway project
   - Select the **Frontend Service** (not backend)

2. **Open Settings**
   - Click on the service
   - Go to **Settings** tab
   - Scroll to **"Root Directory"** or **"Working Directory"**

3. **Set Root Directory**
   - Set Root Directory to: `client`
   - This tells Railway to run all commands from the `client/` directory

4. **Save and Redeploy**
   - Save the settings
   - Railway will automatically trigger a new deployment
   - Wait for deployment to complete

### Alternative: Update railway.json

If Railway doesn't have a Root Directory setting, we can update the railway.json to specify the working directory in the build command.
