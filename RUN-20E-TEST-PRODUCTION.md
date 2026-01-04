# Run 20e Crawler Test on Production (parctongosse.com)

Since the admin panel button hasn't been deployed yet, you can run the test directly via API.

## Quick Method: Use Browser Console

1. **Go to:** https://parctongosse.com/admin
2. **Log in** as admin
3. **Open Browser Console** (F12 → Console tab)
4. **Paste and run this code:**

```javascript
// Get your token
const token = localStorage.getItem('token') || document.cookie.match(/token=([^;]+)/)?.[1];

if (!token) {
  console.error('❌ No token found. Make sure you are logged in.');
} else {
  console.log('✅ Token found, running crawler...');
  
  fetch('https://parc-ton-gosse-backend-production.up.railway.app/api/arrondissement-crawler/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      arrondissements: ['20e'],
      useTemplate: true
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ Crawler completed!');
    console.log('📊 Summary:', data.summary);
    console.log('📋 Sheet:', data.pendingSheet);
    if (data.pendingSheet) {
      const sheetId = '1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0';
      console.log('🔗 Sheet URL:', `https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
    }
  })
  .catch(err => {
    console.error('❌ Error:', err);
  });
}
```

5. **Wait for completion** (may take several minutes)
6. **Check the console** for results and sheet name

## Alternative: Use Command Line Script

1. **Get your admin token:**
   - Go to https://parctongosse.com/admin
   - Log in as admin
   - Open browser DevTools (F12)
   - Go to Console tab
   - Type: `localStorage.getItem('token')`
   - Copy the token value

2. **Run the script:**
   ```bash
   ADMIN_TOKEN=your_token_here node run-20e-test-production.js
   ```

## What Happens

1. The crawler searches `mairie20.paris.fr` for activities
2. Extracts organization data
3. Visits organization websites
4. Saves results to Google Sheets tab: `Pending - YYYY-MM-DD - Arrondissement Crawler`

## After Completion

1. **Open your Google Sheet**
2. **Find the new tab:** `Pending - YYYY-MM-DD - Arrondissement Crawler`
3. **Compare with existing "Activities" tab** (filter by `Neighborhood = "20e"`)
4. **Identify gaps:**
   - Missing organizations
   - Data quality issues
   - Incorrect extractions
   - New organizations found

## Deploy Updated Admin Panel (Future)

To get the yellow button in production, you'll need to:
1. Commit the changes to git
2. Push to your repository
3. Railway will auto-deploy the frontend
4. The yellow button will appear in the admin panel

For now, use the browser console method above - it's the quickest way to test!

