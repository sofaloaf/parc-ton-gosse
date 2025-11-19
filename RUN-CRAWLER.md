# How to Run the Data Validator/Crawler

## Quick Start

### Option 1: Via Admin Panel (Recommended)

1. **Start the server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Open the admin panel:**
   - Go to: `http://localhost:5173/admin` (or your deployed URL)
   - Log in as admin using Google OAuth

3. **Run the crawler:**
   - Add a button in the admin panel (or use the API directly)
   - Or use curl (see Option 2)

### Option 2: Via API (curl)

1. **Start the server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Get your admin token:**
   - Log in via the web interface
   - Open browser DevTools → Application → Cookies
   - Copy the `token` cookie value

3. **Run the crawler:**
   ```bash
   curl -X POST http://localhost:4000/api/crawler/validate \
     -H "Cookie: token=YOUR_TOKEN_HERE" \
     -H "Content-Type: application/json"
   ```

### Option 3: Direct Node Script

I've created a helper script, but it still requires authentication:

```bash
# First, get your admin token (see Option 2, step 2)
node run-crawler.js YOUR_TOKEN_HERE
```

## What Happens

1. ✅ Reads all activities from Google Sheets "Activities" tab
2. ✅ Finds the "lien du site" column (or similar)
3. ✅ Visits each website
4. ✅ Extracts and validates data
5. ✅ Creates new sheet tab: `v{timestamp}_{date}`
6. ✅ Updates master sheet with reference to new tab

## Expected Output

```json
{
  "success": true,
  "sheetName": "v1701234567890_2024-11-30",
  "summary": {
    "total": 50,
    "successful": 45,
    "errors": 3,
    "skipped": 2,
    "totalChanges": 120
  },
  "results": [...],
  "message": "Created new sheet \"v1701234567890_2024-11-30\" with 45 validated activities"
}
```

## Troubleshooting

- **"Server not running"**: Start with `cd server && npm run dev`
- **"Unauthorized"**: Make sure you're logged in as admin
- **"GS_SHEET_ID not configured"**: Check your `.env` file
- **"Website link column not found"**: Ensure your sheet has a column with "lien", "site", "url", or "website" in the name

