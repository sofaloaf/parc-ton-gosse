# Google Analytics 4 (GA4) Setup Guide

## Step 1: Create Google Analytics Account

1. Go to https://analytics.google.com
2. Sign in with your Google account
3. Click **"Start measuring"** or **"Create Account"**

## Step 2: Create a Property

1. **Account Setup:**
   - **Account name:** `Parc Ton Gosse` (or your business name)
   - **Country/Region:** France (or your country)
   - **Currency:** EUR (or your currency)
   - Click **"Next"**

2. **Property Setup:**
   - **Property name:** `Parc Ton Gosse Website`
   - **Reporting time zone:** Europe/Paris (or your timezone)
   - **Currency:** EUR
   - Click **"Next"**

3. **Business Information:**
   - **Industry category:** Select "Travel & Tourism" or "Education" (closest match)
   - **Business size:** Select appropriate size
   - **How you intend to use Google Analytics:** Select options (e.g., "Measure customer engagement")
   - Click **"Create"**

4. **Accept Terms of Service:**
   - Read and accept Google Analytics Terms of Service
   - Click **"I Accept"**

## Step 3: Set Up Data Stream

1. **Choose Platform:**
   - Select **"Web"** (for website tracking)

2. **Configure Web Stream:**
   - **Website URL:** `https://victorious-gentleness-production.up.railway.app`
   - **Stream name:** `Parc Ton Gosse Production`
   - Click **"Create stream"**

3. **Get Measurement ID:**
   - After creating the stream, you'll see a **Measurement ID**
   - It looks like: `G-XXXXXXXXXX` (starts with "G-" followed by 10 characters)
   - **Copy this ID** - you'll need it!

## Step 4: Configure Environment Variable

### For Local Development:

Add to `client/.env`:
```env
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### For Railway Deployment:

1. Go to your Railway project
2. Select the **Frontend Service**
3. Go to **Variables** tab
4. Add variable:
   - `VITE_GA_MEASUREMENT_ID` = `G-XXXXXXXXXX`

5. **Important:** After adding the variable, you need to **redeploy** the frontend service for it to take effect!

## Step 5: Verify Analytics is Working

### Method 1: Real-Time Reports

1. Go to Google Analytics dashboard
2. Click **"Reports"** → **"Realtime"** (in left sidebar)
3. Visit your website
4. You should see yourself appear in the real-time report within 30 seconds!

### Method 2: Browser Console

1. Open your website
2. Open browser Developer Tools (F12)
3. Go to **Console** tab
4. You should see no errors related to Google Analytics
5. Check **Network** tab for requests to `google-analytics.com`

### Method 3: Google Analytics DebugView

1. In Google Analytics, go to **Admin** → **DebugView**
2. Enable debug mode in your browser:
   - Install "Google Analytics Debugger" Chrome extension
   - Or add `?debug_mode=true` to your URL
3. Visit your website
4. You should see events in DebugView

## Step 6: Set Up Goals/Events (Optional)

The app already tracks these events automatically:
- ✅ Page views
- ✅ User signup
- ✅ User login
- ✅ Email verification
- ✅ Activity registration
- ✅ Preorder/payment
- ✅ Search queries
- ✅ Filter usage
- ✅ View mode changes

To view events in Google Analytics:
1. Go to **Reports** → **Engagement** → **Events**
2. You'll see all tracked events

## Step 7: Enable Enhanced Measurement (Recommended)

1. Go to **Admin** → **Data Streams**
2. Click on your web stream
3. Scroll to **"Enhanced measurement"**
4. Enable:
   - ✅ Page views
   - ✅ Scrolls
   - ✅ Outbound clicks
   - ✅ Site search
   - ✅ Video engagement
   - ✅ File downloads

## Troubleshooting

### Analytics Not Working?

1. **Check Measurement ID:**
   - Make sure it starts with `G-`
   - Verify it's correct in environment variables
   - Check Railway variables are set correctly

2. **Check Build:**
   - After adding `VITE_GA_MEASUREMENT_ID`, you must **rebuild** the frontend
   - In Railway, trigger a new deployment

3. **Check Browser Console:**
   - Open Developer Tools → Console
   - Look for errors
   - Check if `react-ga4` is loading

4. **Check Network Tab:**
   - Open Developer Tools → Network
   - Filter by "google-analytics"
   - You should see requests to `google-analytics.com`

5. **Ad Blockers:**
   - Some ad blockers block Google Analytics
   - Test in incognito mode or disable ad blocker

### Common Issues:

- **"Measurement ID not found":** Check environment variable is set correctly
- **"No data in reports":** Wait 24-48 hours for data to appear (real-time works immediately)
- **"Events not showing":** Check that events are being triggered in code

## Privacy & GDPR Compliance

### Required Actions:

1. **Cookie Consent Banner:**
   - Add a cookie consent banner to your website
   - Only load GA4 after user consents
   - See `COOKIE-CONSENT-GUIDE.md` for implementation

2. **Privacy Policy:**
   - Update privacy policy to mention Google Analytics
   - Explain what data is collected
   - Provide opt-out instructions

3. **IP Anonymization:**
   - Google Analytics automatically anonymizes IPs in EU
   - No additional configuration needed

## Useful Reports

Once data starts flowing, check these reports:

1. **Audience Overview:**
   - Total users, sessions, page views
   - User demographics

2. **Acquisition:**
   - Where users come from (direct, search, social, etc.)

3. **Engagement:**
   - Events (signups, registrations, payments)
   - User engagement metrics

4. **Conversions:**
   - Track signup → preorder funnel
   - Conversion rates

## Next Steps

1. ✅ Set up SendGrid (see `SENDGRID-SETUP-GUIDE.md`)
2. ✅ Set up Google Analytics (this guide)
3. ⏳ Add cookie consent banner (for GDPR compliance)
4. ⏳ Set up conversion goals in GA4

---

**Your Measurement ID Format:** `G-XXXXXXXXXX` (10 characters after G-)

**Where to Find It:**
- Google Analytics → Admin → Data Streams → [Your Stream] → Measurement ID

