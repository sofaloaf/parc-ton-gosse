# Detailed Google Sheets Setup Guide - Step 6

## Your Sheet Information
- **Sheet ID**: `1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0`
- **Sheet URL**: https://docs.google.com/spreadsheets/d/1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0/edit

---

## Step 6A: Extract Credentials from JSON File

1. **Open the JSON file you downloaded** in step 3 (the service account key file)
   - It should be named something like: `your-project-name-xxxxx.json`

2. **The JSON file looks like this:**
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...very long string...==\n-----END PRIVATE KEY-----\n",
     "client_email": "parc-ton-gosse-api@your-project-id.iam.gserviceaccount.com",
     "client_id": "...",
     ...
   }
   ```

3. **Copy these two values:**
   - `client_email` → This will be your `GS_SERVICE_ACCOUNT`
   - `private_key` → This will be your `GS_PRIVATE_KEY` (the ENTIRE value including the BEGIN/END lines)

---

## Step 6B: Create/Update .env File

1. **Navigate to the server directory:**
   ```bash
   cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse/server"
   ```

2. **Create or edit the `.env` file:**
   ```bash
   # On Mac/Linux, you can use:
   nano .env
   # OR
   code .env  # if you have VS Code
   # OR just create it in your text editor
   ```

3. **Add/Update these lines in your `.env` file:**
   ```env
   PORT=4000
   CORS_ORIGIN=http://localhost:5173
   DATA_BACKEND=sheets
   JWT_SECRET=change-me-to-a-random-string

   # Google Sheets Configuration
   GS_SERVICE_ACCOUNT=your-service-account-email@project-id.iam.gserviceaccount.com
   GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nPASTE_THE_ENTIRE_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
   GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0

   # Optional: Stripe (leave empty for now if not using)
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=

   # Optional: Airtable Detailed (leave empty if not using)
   AIRTABLE_API_KEY=
   AIRTABLE_BASE_ID=

   # Optional: Email/SMS (leave empty if not using)
   SENDGRID_API_KEY=
   SMTP_HOST=
   SMTP_USER=
   SMTP_PASS=
   TWILIO_SID=
   TWILIO_TOKEN=
   ```

4. **IMPORTANT - How to format GS_PRIVATE_KEY:**
   
   **Method 1: Single line with \n (Recommended)**
   - Copy the ENTIRE `private_key` value from the JSON file
   - It should look like: `"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`
   - Put it in quotes and make sure the `\n` characters are preserved
   - Example:
     ```env
     GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
     ```
   
   **Method 2: If you get errors, try escaping quotes:**
   ```env
   GS_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n'
   ```

---

## Step 6C: Verify Your .env File

Your final `.env` file should look like this (with YOUR actual values):

```env
PORT=4000
CORS_ORIGIN=http://localhost:5173
DATA_BACKEND=sheets
JWT_SECRET=my-secret-key-12345

GS_SERVICE_ACCOUNT=parc-ton-gosse-api@my-project-123456.iam.gserviceaccount.com
GS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7vJQ...very long...\n-----END PRIVATE KEY-----\n"
GS_SHEET_ID=1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0
```

**Key points:**
- ✅ `DATA_BACKEND=sheets` (not `memory`)
- ✅ `GS_SERVICE_ACCOUNT` = the `client_email` from ★JSON file
- ✅ `GS_PRIVATE_KEY` = the `private_key` from JSON file (entire value, in quotes, with `\n`)
- ✅ `GS_SHEET_ID` = `1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0` (from your URL)

---

## Step 6D: Common Issues & Solutions

### Issue 1: "Invalid credentials" or "Authentication failed"
- **Check:** Did you share the Google Sheet with the service account email?
- **Fix:** Go to your Google Sheet → Click "Share" → Add the `client_email` address → Give it "Editor" permissions

### Issue 2: "The private_key format is wrong"
- **Check:** Make sure the `\n` characters are preserved (they represent newlines)
- **Check:** Make sure the entire key is in quotes
- **Try:** Use single quotes instead: `GS_PRIVATE_KEY='...'`

### Issue 3: "Unable to parse range" or "Sheet not found"
- **Check:** Verify `GS_SHEET_ID` is correct (no extra spaces)
- **Check:** Make sure the sheet is shared with the service account
- **Note:** The app will auto-create sheet tabs if they don't exist

---

## Step 6E: Test the Connection

After saving your `.env` file:

1. **Install dependencies** (if you haven't already):
   ```bash
   cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse/server"
   npm install
   ```

2. **Restart your server:**
   ```bash
   npm run dev
   ```

3. **Check the console output:**
   - You should see: `Server listening on http://localhost:4000`
   - If there are authentication errors, they'll appear in the console

4. **Test with a simple API call:**
   ```bash
   curl http://localhost:4000/api/health
   ```
   Should return: `{"ok":true}`

5. **Try listing activities:**
   ```bash
   curl http://localhost:4000/api/activities
   ```
   This should return an empty array `[]` if the Sheets are empty, or your data if it's already there.

---

## Need Help?

If you encounter errors:
1. Check the server console output for error messages
2. Verify the `.env` file has no syntax errors
3. Make sure the service account email has access to the Google Sheet
4. Try testing the connection with a simple curl command first

