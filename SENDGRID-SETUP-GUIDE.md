# SendGrid Email Service Setup Guide

## Step 1: Create SendGrid Account

1. Go to https://sendgrid.com
2. Click "Start for Free" or "Sign Up"
3. Create an account (free tier includes 100 emails/day)
4. Verify your email address

## Step 2: Create API Key

1. Log in to SendGrid dashboard
2. Go to **Settings** → **API Keys** (or visit https://app.sendgrid.com/settings/api_keys)
3. Click **"Create API Key"**
4. Give it a name (e.g., "Parc Ton Gosse Production")
5. Select **"Full Access"** or **"Restricted Access"** with:
   - ✅ Mail Send permissions
6. Click **"Create & View"**
7. **IMPORTANT:** Copy the API key immediately (you won't be able to see it again!)
   - It will look like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 3: Verify Sender Identity (Required for Production)

SendGrid requires you to verify your sender email address:

### Option A: Single Sender Verification (Easiest - for testing)

1. Go to **Settings** → **Sender Authentication** → **Single Sender Verification**
2. Click **"Create a Sender"**
3. Fill in the form:
   - **From Email Address:** `noreply@parctongosse.com` (or your domain email)
   - **From Name:** `Parc Ton Gosse`
   - **Reply To:** (same as from email)
   - **Company Address:** Your business address
   - **City:** Your city
   - **State:** Your state
   - **Country:** Your country
   - **Zip Code:** Your zip code
4. Click **"Create"**
5. Check your email and click the verification link
6. **Status will show "Verified"** when complete

### Option B: Domain Authentication (Recommended for Production)

1. Go to **Settings** → **Sender Authentication** → **Domain Authentication**
2. Click **"Authenticate Your Domain"**
3. Enter your domain (e.g., `parctongosse.com`)
4. Choose your DNS host (or "Other")
5. SendGrid will provide DNS records to add:
   - CNAME records (usually 3-4 records)
6. Add these records to your domain's DNS settings
7. Click **"Verify"** in SendGrid
8. Wait for verification (can take up to 48 hours, usually faster)

## Step 4: Configure Environment Variables

Add to your `server/.env` file:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@parctongosse.com
FROM_NAME=Parc Ton Gosse

# Frontend URL (for email links)
FRONTEND_URL=https://victorious-gentleness-production.up.railway.app
```

**For Railway Deployment:**

1. Go to your Railway project
2. Select the **Backend Service**
3. Go to **Variables** tab
4. Add these variables:
   - `SENDGRID_API_KEY` = `SG.xxxxxxxxxxxxx...`
   - `FROM_EMAIL` = `noreply@parctongosse.com`
   - `FROM_NAME` = `Parc Ton Gosse`
   - `FRONTEND_URL` = `https://victorious-gentleness-production.up.railway.app`

## Step 5: Test Email Sending

### Test Locally:

1. Start your server:
   ```bash
   cd server
   npm run dev
   ```

2. Sign up a new user - you should receive a welcome email!

3. Check SendGrid dashboard → **Activity** to see sent emails

### Test on Railway:

1. Deploy with the environment variables set
2. Sign up a new user
3. Check email inbox and SendGrid Activity dashboard

## Troubleshooting

### Emails Not Sending?

1. **Check API Key:**
   - Make sure it's correct (starts with `SG.`)
   - Check it has "Mail Send" permissions

2. **Check Sender Verification:**
   - Go to **Settings** → **Sender Authentication**
   - Make sure your sender is "Verified" (green checkmark)

3. **Check SendGrid Activity:**
   - Go to **Activity** in SendGrid dashboard
   - Look for errors or blocked emails
   - Check "Suppressions" for blocked addresses

4. **Check Server Logs:**
   - Look for `✅ Email sent via SendGrid` in server logs
   - Or error messages if sending fails

### Common Errors:

- **"Forbidden" (403):** API key doesn't have correct permissions
- **"Unauthorized" (401):** API key is invalid
- **"Sender not verified":** Need to verify sender email/domain
- **"Rate limit exceeded":** Free tier limit (100/day) reached

## SendGrid Free Tier Limits

- **100 emails/day** (free tier)
- **40,000 emails/month** (free tier)
- Upgrade to paid plans for more capacity

## Upgrade Path

If you need more emails:
1. Go to **Settings** → **Billing**
2. Choose a plan (Essentials starts at $19.95/month for 50,000 emails)
3. Or use SMTP as fallback (see SMTP setup guide)

---

**Next:** Set up Google Analytics (see `GOOGLE-ANALYTICS-SETUP-GUIDE.md`)

