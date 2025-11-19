# 🚀 Quick Guide: Run the Crawler Now

## ✅ Server is Running!

The server is now running on `http://localhost:4000`

## 🔐 Step 1: Authenticate as Admin

You need to log in as admin first. Choose one method:

### Method A: Via Web Interface (Easiest)

1. **Open your browser:**
   - Go to: `http://localhost:5173/admin` (if frontend is running)
   - OR go to: `http://localhost:4000` and navigate to admin panel

2. **Log in with Google:**
   - Click "Sign in with Google"
   - Use admin email: `sofiane.boukhalfa@gmail.com`

3. **Get your token:**
   - Open DevTools (F12)
   - Go to: Application → Cookies → `http://localhost:4000`
   - Copy the `token` cookie value

### Method B: Create Admin User (If needed)

If you don't have an admin account yet, you can create one via the API or database.

## 🎯 Step 2: Run the Crawler

Once you have your admin token, run:

```bash
curl -X POST http://localhost:4000/api/crawler/validate \
  -H "Cookie: token=YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Replace `YOUR_TOKEN_HERE` with the token you copied in Step 1.**

## 📊 What to Expect

The crawler will:
- ✅ Read all activities from Google Sheets
- ✅ Visit each website (from "lien du site" column)
- ✅ Extract and validate data
- ✅ Create a new sheet tab: `v{timestamp}_{date}`
- ✅ Show you a summary of results

**This may take several minutes** depending on how many activities you have (1 second delay between each website).

## 🔍 Check Results

After it completes, check your Google Sheets:
- Look for a new tab with name like: `v1701234567890_2024-11-30`
- Check the "Activities" sheet - it should have a new "Validated Sheet" column

## ⚠️ Troubleshooting

- **"Unauthorized"**: Make sure you're logged in as admin and using the correct token
- **"GS_SHEET_ID not configured"**: Check your `server/.env` file
- **"Website link column not found"**: Your sheet needs a column with "lien", "site", "url", or "website" in the name

---

**Need help?** Check `CRAWLER-DOCUMENTATION.md` for detailed information.

