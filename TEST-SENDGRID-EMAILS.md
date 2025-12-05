# Testing SendGrid Email Functionality

This guide will help you verify that SendGrid emails are working correctly in your application.

## ✅ Quick Status Check

### Option 1: Check Configuration Status (Admin Only)

**Endpoint:** `GET /api/test-email/status`

**Using curl:**
```bash
curl -X GET http://localhost:4000/api/test-email/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Cookie: token=YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "sendGrid": {
    "configured": true,
    "apiKeySet": true,
    "apiKeyPreview": "SG.xxxxx..."
  },
  "smtp": {
    "configured": false,
    "host": "Not set",
    "user": "Not set"
  },
  "emailSettings": {
    "fromEmail": "noreply@parctongosse.com",
    "fromName": "Parc Ton Gosse",
    "frontendUrl": "https://your-frontend-url.com"
  },
  "status": "configured",
  "provider": "sendgrid"
}
```

**What to check:**
- ✅ `sendGrid.configured` should be `true`
- ✅ `status` should be `"configured"`
- ✅ `provider` should be `"sendgrid"`

---

## 🧪 Test Email Sending

### Option 1: Send Test Email (Admin Only)

**Endpoint:** `POST /api/test-email/send-test`

**Using curl:**
```bash
curl -X POST http://localhost:4000/api/test-email/send-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{
    "to": "your-email@example.com",
    "type": "welcome"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "result": {
    "ok": true,
    "provider": "sendgrid"
  },
  "sentTo": "your-email@example.com",
  "type": "welcome"
}
```

**What to check:**
- ✅ Check your email inbox (and spam folder)
- ✅ You should receive a welcome email
- ✅ Check server logs for: `✅ Email sent via SendGrid to your-email@example.com`

---

### Option 2: Test by Signing Up a New User

The easiest way to test is to sign up a new user:

1. **Go to your frontend:**
   - Local: `http://localhost:5173`
   - Production: Your production URL

2. **Sign up a new user:**
   - Click "Sign In" → "Sign Up"
   - Enter a test email address
   - Enter a password
   - Submit

3. **Check for email:**
   - Check the email inbox you used
   - Check spam folder
   - You should receive a welcome email with verification link

4. **Check server logs:**
   - Look for: `✅ Email sent via SendGrid to [email]`
   - If you see errors, check the troubleshooting section

---

### Option 3: Test Password Reset Email

1. **Go to login page**
2. **Click "Forgot Password"**
3. **Enter your email address**
4. **Submit**
5. **Check email inbox** for password reset email

---

## 📊 Check SendGrid Dashboard

1. **Log in to SendGrid:** https://app.sendgrid.com
2. **Go to Activity:**
   - Click **"Activity"** in the left sidebar
   - Or visit: https://app.sendgrid.com/activity
3. **Look for your emails:**
   - Should see emails you sent
   - Status should show **"Delivered"** ✅
   - Check timestamps match when you sent them

**What to check:**
- ✅ Emails appear in Activity feed
- ✅ Status is "Delivered" (not "Bounced" or "Blocked")
- ✅ No errors or warnings

---

## 🔍 Verify Email Configuration

### Check Environment Variables

**For Local Development (`server/.env`):**
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@parctongosse.com
FROM_NAME=Parc Ton Gosse
FRONTEND_URL=http://localhost:5173
```

**For Railway Production:**
- Go to Railway → Your Backend Service → Variables
- Check these variables are set:
  - `SENDGRID_API_KEY`
  - `FROM_EMAIL`
  - `FROM_NAME`
  - `FRONTEND_URL`

### Check Server Logs

When the server starts, you should see:
```
✅ Email service initialized
```

When sending emails, you should see:
```
✅ Email sent via SendGrid to user@example.com
```

**If you see:**
```
[Email stub] { to: 'user@example.com', subject: '...' }
```
This means SendGrid is NOT configured - check your `SENDGRID_API_KEY` environment variable.

---

## ✅ Email Features Currently Active

Your application automatically sends these emails:

1. **Welcome Email** ✅
   - Sent on: User signup
   - Includes: Email verification link
   - Template: `welcomeEmail()`

2. **Password Reset Email** ✅
   - Sent on: Password reset request
   - Includes: Password reset link
   - Template: `passwordResetEmail()`

3. **Email Verification Resend** ✅
   - Sent on: Request to resend verification email
   - Includes: Email verification link
   - Template: `welcomeEmail()`

---

## 🐛 Troubleshooting

### Problem: Emails Not Sending

#### Check 1: API Key
```bash
# Check if API key is set
echo $SENDGRID_API_KEY
# Should show: SG.xxxxx...

# Or check in Railway Variables
```

#### Check 2: Server Logs
Look for these messages:

**Success:**
```
✅ Email sent via SendGrid to user@example.com
```

**Error:**
```
❌ Failed to send email: [error message]
```

#### Check 3: SendGrid Activity
- Go to SendGrid → Activity
- Check if emails appear
- Check status (Delivered, Bounced, Blocked, etc.)

### Problem: "Email stub" in Logs

**Cause:** SendGrid API key not configured

**Fix:**
1. Check `SENDGRID_API_KEY` is set in environment variables
2. Restart server after adding API key
3. Verify API key is correct (starts with `SG.`)

### Problem: "Forbidden" or "Unauthorized" Error

**Cause:** Invalid API key or wrong permissions

**Fix:**
1. Verify API key is correct
2. Check API key has "Mail Send" permissions in SendGrid
3. Create new API key if needed

### Problem: Emails Going to Spam

**Causes:**
- Domain not authenticated (use domain authentication)
- Sender reputation issues
- Spam trigger words in subject

**Fix:**
1. Complete domain authentication in SendGrid
2. Use professional email addresses (noreply@, hello@)
3. Avoid spam trigger words
4. Warm up your domain gradually

### Problem: "Sender not verified" Error

**Cause:** Sender email not verified in SendGrid

**Fix:**
1. Go to SendGrid → Settings → Sender Authentication
2. Verify sender email or domain
3. Make sure `FROM_EMAIL` matches verified sender

---

## 📝 Testing Checklist

- [ ] Check configuration status: `GET /api/test-email/status`
- [ ] Send test email: `POST /api/test-email/send-test`
- [ ] Check email inbox for test email
- [ ] Sign up new user and check for welcome email
- [ ] Request password reset and check for reset email
- [ ] Check SendGrid Activity dashboard
- [ ] Verify emails show as "Delivered" in SendGrid
- [ ] Check server logs for success messages
- [ ] Verify no errors in logs

---

## 🚀 Production Testing

### Before Going Live:

1. **Test all email types:**
   - Welcome email
   - Password reset
   - Email verification

2. **Check SendGrid Activity:**
   - All emails delivered
   - No bounces or blocks
   - Good delivery rates

3. **Monitor for 24-48 hours:**
   - Check delivery rates
   - Monitor bounce rates
   - Check spam reports

4. **Set up alerts:**
   - SendGrid can send alerts for high bounce rates
   - Monitor email activity regularly

---

## 📞 Need Help?

- **SendGrid Support:** Available in dashboard
- **SendGrid Documentation:** https://docs.sendgrid.com
- **Check Server Logs:** Look for error messages
- **Check SendGrid Activity:** See delivery status

---

## ✅ Success Indicators

Your SendGrid is working correctly if:

- ✅ Configuration status shows `"configured": true`
- ✅ Test emails are received
- ✅ Emails appear in SendGrid Activity as "Delivered"
- ✅ Server logs show `✅ Email sent via SendGrid`
- ✅ No errors in server logs
- ✅ Users receive welcome emails on signup

---

**Once all checks pass, your SendGrid email functionality is working!** 🎉

