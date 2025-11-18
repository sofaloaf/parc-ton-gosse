# How to Open and Test the Website

## Step 1: Start the Backend Server

**Open Terminal 1:**
```bash
cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse/server"
npm run dev
```

**Wait for these success messages:**
```
✅ Server listening on port 4000
✅ Data store initialized: sheets
✅ Successfully obtained access token - credentials are valid
```

**Keep this terminal open!** (Don't close it)

---

## Step 2: Start the Frontend

**Open Terminal 2 (new terminal window):**
```bash
cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse/client"
npm run dev
```

**Wait for this message:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Keep this terminal open too!**

---

## Step 3: Open the Website

**Open your web browser and go to:**
```
http://localhost:5173
```

---

## Step 4: What to Check

### ✅ Backend is Working
1. **Check browser console** (Press F12, then click "Console" tab)
2. Look for: `🔍 API URL resolved (localhost): http://localhost:4000/api`
3. **No red errors** should appear

### ✅ Activities are Loading
1. You should see activities displayed on the page
2. Either in **Cards view** or **Table view**
3. Look for activity count at the top (e.g., "131 Activities")

### ✅ Test the Data Store
**In Terminal 1, test the API:**
```bash
curl http://localhost:4000/api/health/datastore
```

**Should return:**
```json
{
  "status": "healthy",
  "activityCount": 131,
  "backend": "sheets"
}
```

### ✅ Test Activities Endpoint
```bash
curl http://localhost:4000/api/activities | head -c 500
```

**Should return JSON with activities array**

---

## Step 5: Troubleshooting

### If activities don't load:

1. **Check backend terminal** for errors
2. **Check frontend terminal** for errors
3. **Check browser console** (F12) for errors
4. **Check Network tab** (F12 → Network):
   - Look for `/api/activities` request
   - Status should be `200 OK`
   - Response should be JSON array

### Common Issues:

**"Failed to fetch" error:**
- Backend not running? Check Terminal 1
- Wrong API URL? Check browser console logs

**"No activities found":**
- Check backend logs for Google Sheets errors
- Verify sheet is shared with service account

**Blank page:**
- Check browser console for JavaScript errors
- Check frontend terminal for build errors

---

## Quick Test Commands

**Test backend health:**
```bash
curl http://localhost:4000/api/health
```

**Test data store:**
```bash
curl http://localhost:4000/api/health/datastore
```

**Test activities (first 500 chars):**
```bash
curl http://localhost:4000/api/activities | head -c 500
```

**Count activities:**
```bash
curl -s http://localhost:4000/api/activities | grep -o '"id"' | wc -l
```

---

## Expected Result

✅ **Backend running** on port 4000  
✅ **Frontend running** on port 5173  
✅ **Website opens** at http://localhost:5173  
✅ **Activities display** (cards or table view)  
✅ **No errors** in console or terminals  

---

## Next Steps

Once everything is working:
1. Test filtering and search
2. Test language toggle (FR/EN)
3. Test switching between Cards/Table view
4. Click on an activity to see details

**Enjoy your working website!** 🎉

