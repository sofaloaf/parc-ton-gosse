# Complete Guide: Enabling SendGrid for Email Management

This guide will walk you through setting up SendGrid to send emails from your Parc Ton Gosse application.

## 📋 Overview

Your application already has SendGrid integrated! You just need to:
1. Create a SendGrid account
2. Get an API key
3. Verify your sender email/domain
4. Add the API key to your environment variables

**Current Email Features:**
- ✅ Welcome emails (with email verification)
- ✅ Password reset emails
- ✅ Trial expiration reminders
- ✅ Activity recommendations (ready to use)

---

## Step 1: Create SendGrid Account

### 1.1 Sign Up
1. Go to **https://sendgrid.com**
2. Click **"Start for Free"** or **"Sign Up"**
3. Fill in your information:
   - Email address
   - Password
   - Company name (optional)
4. Click **"Create Account"**
5. Verify your email address (check your inbox)

### 1.2 Complete Account Setup
1. After verification, you'll be asked to:
   - Choose your use case (select **"Marketing Emails"** or **"Transactional Emails"**)
   - Answer a few questions about your business
2. Complete the setup wizard

**Free Tier Includes:**
- ✅ 100 emails/day
- ✅ 40,000 emails/month
- ✅ Full API access
- ✅ Email analytics

---

## Step 2: Create API Key

### 2.1 Navigate to API Keys
1. Log in to SendGrid dashboard: **https://app.sendgrid.com**
2. Go to **Settings** → **API Keys**
   - Or visit directly: **https://app.sendgrid.com/settings/api_keys**

### 2.2 Create New API Key
1. Click **"Create API Key"** button (top right)
2. **Name your key:**
   - Example: `Parc Ton Gosse Production`
   - Or: `Parc Ton Gosse Development`
3. **Select permissions:**
   - **Option A (Recommended):** Select **"Full Access"**
   - **Option B (More Secure):** Select **"Restricted Access"** and check:
     - ✅ **Mail Send** (under Mail Send category)
4. Click **"Create & View"**

### 2.3 Copy Your API Key
⚠️ **IMPORTANT:** Copy the API key **immediately** - you won't be able to see it again!

The API key looks like:
```
SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Save it securely** - you'll need it in the next step.

---

## Step 3: Verify Sender Identity

SendGrid requires you to verify who you are sending emails from. Choose one option:

### Option A: Single Sender Verification (Easiest - for Testing)

**Best for:** Development, testing, or if you don't own a domain yet.

1. Go to **Settings** → **Sender Authentication** → **Single Sender Verification**
2. Click **"Create a Sender"**
3. Fill in the form:
   - **From Email Address:** `noreply@parctongosse.com` (or your preferred email)
   - **From Name:** `Parc Ton Gosse`
   - **Reply To:** (same as from email)
   - **Company Address:** Your business address
   - **City:** Your city
   - **State:** Your state/province
   - **Country:** Your country
   - **Zip Code:** Your zip code
4. Click **"Create"**
5. **Check your email** - SendGrid will send a verification email
6. **Click the verification link** in the email
7. Status will show **"Verified"** ✅ when complete

**Note:** You can only send from verified email addresses.

### Option B: Domain Authentication (Recommended for Production)

**Best for:** Production, better deliverability, professional setup.

1. Go to **Settings** → **Sender Authentication** → **Domain Authentication**
2. Click **"Authenticate Your Domain"**
3. Enter your domain:
   - Example: `parctongosse.com`
   - Or: `yourdomain.com`
4. Choose your DNS host:
   - Select from dropdown (e.g., GoDaddy, Namecheap, Cloudflare)
   - Or select **"Other"** if not listed
5. SendGrid will provide **DNS records** to add:
   - Usually 3-4 CNAME records
   - Example:
     ```
     CNAME: em1234.yourdomain.com → u1234567.wl123.sendgrid.net
     CNAME: s1._domainkey.yourdomain.com → s1.domainkey.u1234567.wl123.sendgrid.net
     CNAME: s2._domainkey.yourdomain.com → s2.domainkey.u1234567.wl123.sendgrid.net
     ```
6. **Add these records** to your domain's DNS settings:
   - Log in to your domain registrar (GoDaddy, Namecheap, etc.)
   - Go to DNS Management
   - Add each CNAME record exactly as shown
7. **Wait for DNS propagation** (5 minutes to 48 hours, usually 15-30 minutes)
8. Go back to SendGrid and click **"Verify"**
9. Status will show **"Verified"** ✅ when complete

**Benefits of Domain Authentication:**
- ✅ Send from any email on your domain (noreply@, hello@, etc.)
- ✅ Better email deliverability
- ✅ Professional appearance
- ✅ No per-email verification needed

---

## Step 4: Configure Environment Variables

### 4.1 For Local Development

Edit `server/.env` file:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Email Settings
FROM_EMAIL=noreply@parctongosse.com
FROM_NAME=Parc Ton Gosse

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173
```

**Important Notes:**
- Replace `SG.xxxxx...` with your actual API key
- Use the email address you verified in Step 3
- `FROM_NAME` is what appears as the sender name

### 4.2 For Railway Deployment

1. Go to your Railway project: **https://railway.app**
2. Select your **Backend Service**
3. Click on the **Variables** tab
4. Click **"New Variable"** and add each:

   **Variable 1:**
   - **Name:** `SENDGRID_API_KEY`
   - **Value:** `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Click **"Add"**

   **Variable 2:**
   - **Name:** `FROM_EMAIL`
   - **Value:** `noreply@parctongosse.com` (use your verified email)
   - Click **"Add"**

   **Variable 3:**
   - **Name:** `FROM_NAME`
   - **Value:** `Parc Ton Gosse`
   - Click **"Add"**

   **Variable 4:**
   - **Name:** `FRONTEND_URL`
   - **Value:** `https://victorious-gentleness-production.up.railway.app` (your frontend URL)
   - Click **"Add"**

5. **Redeploy** your service (Railway will automatically redeploy when you add variables)

---

## Step 5: Test Email Sending

### 5.1 Test Locally

1. **Start your server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Sign up a new user:**
   - Go to your frontend: `http://localhost:5173`
   - Click "Sign In" → "Sign Up"
   - Enter email and password
   - Submit

3. **Check for email:**
   - Check the email inbox you used for signup
   - You should receive a welcome email with verification link
   - Check spam folder if not in inbox

4. **Check server logs:**
   - Look for: `✅ Email sent via SendGrid to [email]`
   - If you see errors, check the troubleshooting section

### 5.2 Test on Railway (Production)

1. **Deploy with environment variables set** (from Step 4.2)
2. **Sign up a new user** on your production site
3. **Check email inbox**
4. **Check SendGrid Activity Dashboard:**
   - Go to **Activity** in SendGrid
   - You should see the email in the activity feed
   - Status should show "Delivered" ✅

---

## Step 6: Verify Everything Works

### 6.1 Check SendGrid Activity

1. Go to SendGrid dashboard → **Activity**
2. You should see:
   - ✅ Emails being sent
   - ✅ Delivery status
   - ✅ Open rates (if recipients open emails)
   - ✅ Click rates (if recipients click links)

### 6.2 Test Different Email Types

Your app sends these emails automatically:

1. **Welcome Email** - Sent on user signup
   - Test: Sign up a new user
   - Should include verification link

2. **Password Reset Email** - Sent when user requests password reset
   - Test: Click "Forgot Password" on login page
   - Should include reset link

3. **Trial Expiration Email** - Sent when trial is about to expire
   - Test: Wait for trial to expire (or manually trigger)
   - Should include preorder link

---

## Troubleshooting

### ❌ Emails Not Sending?

#### Check 1: API Key
- ✅ Make sure API key is correct (starts with `SG.`)
- ✅ Check it has "Mail Send" permissions
- ✅ Verify it's set in environment variables

#### Check 2: Sender Verification
- ✅ Go to **Settings** → **Sender Authentication**
- ✅ Make sure sender shows **"Verified"** ✅
- ✅ If not verified, check your email and click verification link

#### Check 3: Server Logs
Look for these messages in your server logs:

**Success:**
```
✅ Email sent via SendGrid to user@example.com
```

**Error:**
```
❌ Failed to send email: [error message]
```

#### Check 4: SendGrid Activity Dashboard
- Go to **Activity** in SendGrid
- Look for your emails
- Check status:
  - **Delivered** ✅ = Success
  - **Bounced** ❌ = Email address invalid
  - **Blocked** ⚠️ = Email in suppression list
  - **Dropped** ⚠️ = SendGrid rejected (check reason)

### Common Error Messages

#### "Forbidden" (403)
- **Cause:** API key doesn't have correct permissions
- **Fix:** Create new API key with "Mail Send" permissions

#### "Unauthorized" (401)
- **Cause:** API key is invalid or incorrect
- **Fix:** Check API key is correct in environment variables

#### "Sender not verified"
- **Cause:** Email address not verified in SendGrid
- **Fix:** Verify sender email in SendGrid dashboard

#### "Rate limit exceeded"
- **Cause:** Free tier limit reached (100 emails/day)
- **Fix:** 
  - Wait 24 hours, or
  - Upgrade to paid plan, or
  - Use SMTP as fallback

#### "Email in suppression list"
- **Cause:** Email address previously unsubscribed or marked as spam
- **Fix:** Go to **Suppressions** in SendGrid and remove the email

### Emails Going to Spam?

1. **Use Domain Authentication** (Option B in Step 3)
2. **Set up SPF/DKIM records** (usually automatic with domain auth)
3. **Warm up your domain** - Start with small volumes
4. **Use professional email addresses** (noreply@, hello@, etc.)
5. **Avoid spam trigger words** in subject lines
6. **Include unsubscribe link** (already included in templates)

---

## Monitoring & Analytics

### SendGrid Dashboard Features

1. **Activity Feed:**
   - See all sent emails in real-time
   - View delivery status
   - Check bounces and blocks

2. **Statistics:**
   - Emails sent today/week/month
   - Delivery rates
   - Open rates
   - Click rates

3. **Suppressions:**
   - Bounced emails
   - Unsubscribed emails
   - Spam reports

### Email Templates in Your App

Your app includes these email templates (in `server/services/notifications/templates.js`):

1. **Welcome Email** (`welcomeEmail`)
   - Sent on signup
   - Includes verification link
   - Bilingual (French/English)

2. **Password Reset** (`passwordResetEmail`)
   - Sent on password reset request
   - Includes reset link
   - Bilingual (French/English)

3. **Trial Expiration** (`trialExpirationEmail`)
   - Sent when trial is ending
   - Includes preorder link
   - Bilingual (French/English)

4. **Activity Recommendations** (`activityRecommendationEmail`)
   - Ready to use for activity recommendations
   - Bilingual (French/English)

---

## Advanced Configuration

### Custom Email Templates

To customize email templates, edit:
```
server/services/notifications/templates.js
```

Each template function returns:
```javascript
{
  subject: "Email Subject",
  html: "<html>...</html>"
}
```

### Adding New Email Types

1. **Create template function** in `templates.js`
2. **Import and use** in your route:
   ```javascript
   import { sendEmail } from '../services/notifications/index.js';
   import { yourNewTemplate } from '../services/notifications/templates.js';
   
   const emailContent = yourNewTemplate({ ...data });
   await sendEmail({
     to: user.email,
     subject: emailContent.subject,
     html: emailContent.html
   });
   ```

### SMTP Fallback

If SendGrid is not configured, the app will:
- Log emails to console (development)
- Return stub response (doesn't fail)
- You can also configure SMTP as fallback (see `server/services/notifications/index.js`)

---

## Production Checklist

Before going live, make sure:

- ✅ SendGrid API key is set in production environment
- ✅ Sender email/domain is verified
- ✅ `FROM_EMAIL` matches verified sender
- ✅ `FRONTEND_URL` is set to production URL
- ✅ Test emails are being delivered
- ✅ Check SendGrid Activity dashboard regularly
- ✅ Monitor bounce rates and spam reports
- ✅ Set up domain authentication (recommended)

---

## Support & Resources

### SendGrid Resources
- **Documentation:** https://docs.sendgrid.com
- **API Reference:** https://docs.sendgrid.com/api-reference
- **Status Page:** https://status.sendgrid.com
- **Support:** Available in SendGrid dashboard

### Your App's Email Code
- **Email Service:** `server/services/notifications/index.js`
- **Email Templates:** `server/services/notifications/templates.js`
- **Email Usage:** Check `server/routes/auth.js` for examples

---

## Quick Reference

### Environment Variables Needed:
```env
SENDGRID_API_KEY=SG.xxxxx...
FROM_EMAIL=noreply@parctongosse.com
FROM_NAME=Parc Ton Gosse
FRONTEND_URL=https://your-frontend-url.com
```

### SendGrid Dashboard:
- **API Keys:** https://app.sendgrid.com/settings/api_keys
- **Sender Auth:** https://app.sendgrid.com/settings/sender_auth
- **Activity:** https://app.sendgrid.com/activity

### Test Email Sending:
1. Sign up a new user
2. Check email inbox
3. Check SendGrid Activity dashboard
4. Check server logs for confirmation

---

**✅ You're all set!** SendGrid is now enabled and ready to send emails from your application.

If you encounter any issues, check the troubleshooting section above or refer to SendGrid's documentation.

