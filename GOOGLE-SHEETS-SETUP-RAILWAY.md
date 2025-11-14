# Google Sheets Backend Setup for Railway

## Your Google Sheet
- **URL:** https://docs.google.com/spreadsheets/d/1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0/edit
- **Sheet ID:** `1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0`

## Step 1: Create Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google Sheets API**:
   - APIs & Services → Library → Search "Google Sheets API" → Enable
4. Create Service Account:
   - APIs & Services → Credentials → Create Credentials → Service Account
   - Name it (e.g., "parc-ton-gosse-api")
   - Click "Create and Continue" → "Done"
5. Generate JSON Key:
   - Click on the service account you created
   - Go to "Keys" tab → "Add Key" → "Create new key"
   - Choose "JSON" format
   - Download the JSON file

## Step 2: Extract Credentials from JSON

Open the downloaded JSON file. You'll need:
- `client_email` → This is your `GS_SERVICE_ACCOUNT`
- `private_key` → This is your `GS_PRIVATE_KEY`

## Step 3: Share Google Sheet with Service Account

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0/edit
2. Click "Share" button (top right)
3. Add the service account email (from JSON file's `client_email`)
4. Give it "Editor" permissions
5. Click "Send"

## Step 4: Configure Railway Backend

1. Go to Railway → Backend service (`parc-ton-gosse-backend-production`)
2. Settings → Variables
3. Add/Update these variables:

```
DATA_BACKEND=sheets
GS_SERVICE_ACCOUNT=<paste client_email from JSON>
GS_PRIVATE_KEY="<paste private_key from JSON>"
GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0
```

**Important for GS_PRIVATE_KEY:**
- Keep the quotes around the value
- The private key should look like: `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`
- If copying from JSON, it might have `\n` already - keep them
- Railway will handle the escaping

## Step 5: Redeploy Backend

1. After setting all variables, go to Deployments tab
2. Click "Redeploy"
3. Wait for deployment to complete
4. Check logs to ensure it connects to Google Sheets

## Step 6: Verify

```bash
curl https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```

Should return all 130+ activities from your Google Sheet!

## Troubleshooting

**If backend fails to start:**
- Check Railway logs for errors
- Verify `GS_PRIVATE_KEY` has quotes and `\n` characters
- Verify service account email has Editor access to the sheet
- Verify Sheet ID is correct

**If no activities returned:**
- Check that your Google Sheet has an "Activities" tab
- Verify column names match expected format
- Check Railway logs for any parsing errors

