# Debugging Email and User Display Issues

## Issue 1: Email Not Being Received

### Check Server Logs

After signing up, check your server logs for these messages:

**Success:**
```
✅ Email sent via SendGrid to user@example.com
```

**Stubbed (SendGrid not configured):**
```
[Email stub] { to: 'user@example.com', subject: '...' }
```

**Error:**
```
❌ Failed to send email: [error message]
```

### Common Causes:

1. **SendGrid API Key Not Set**
   - Check environment variable: `SENDGRID_API_KEY`
   - Should start with `SG.`
   - Check in Railway Variables or `server/.env`

2. **Email in Spam Folder**
   - Check spam/junk folder
   - Check promotions tab (Gmail)

3. **SendGrid Sender Not Verified**
   - Go to SendGrid → Settings → Sender Authentication
   - Make sure sender email is verified ✅

4. **SendGrid Activity Dashboard**
   - Go to https://app.sendgrid.com/activity
   - Check if email appears
   - Check status (Delivered, Bounced, Blocked)

### Test Email Sending

Use the test endpoint:
```bash
curl -X POST http://localhost:4000/api/test-email/send-test \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_ADMIN_TOKEN" \
  -d '{"to": "your-email@example.com", "type": "welcome"}'
```

---

## Issue 2: User Name Not Showing in Header

### What Was Fixed:

1. **Header now shows name if available:**
   - Changed from: `user.email`
   - Changed to: `user.profile?.name || user.email`

2. **User state refreshes after login/signup:**
   - Added refresh call to `/me` endpoint after login/signup
   - Ensures complete user profile is loaded

3. **User state refreshes on route changes:**
   - Added effect to check user on route changes
   - Ensures user info stays up to date

### How to Verify:

1. **Sign up with a name:**
   - Enter name in signup form
   - After signup, header should show name

2. **Login:**
   - After login, header should show name or email
   - If name was set during signup, it should appear

3. **Check browser console:**
   - Should see user object logged
   - Check if `user.profile.name` exists

### If Name Still Not Showing:

1. **Check user data:**
   ```javascript
   // In browser console after login:
   fetch('/api/me', { credentials: 'include' })
     .then(r => r.json())
     .then(console.log)
   ```

2. **Verify name was saved:**
   - Check Google Sheets "Users" sheet
   - Look for the user's email
   - Check if "profile" column has name

3. **Check Profile page:**
   - Go to `/profile`
   - Should show name if it exists
   - If not, you can update it there

---

## Quick Fixes

### Fix 1: Check SendGrid Configuration

```bash
# Check if SendGrid is configured
curl http://localhost:4000/api/test-email/status \
  -H "Cookie: token=YOUR_ADMIN_TOKEN"
```

Should show:
```json
{
  "sendGrid": {
    "configured": true,
    "apiKeySet": true
  }
}
```

### Fix 2: Test Email Sending

```bash
# Send test email
curl -X POST http://localhost:4000/api/test-email/send-test \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_ADMIN_TOKEN" \
  -d '{"to": "your-email@example.com", "type": "welcome"}'
```

### Fix 3: Check User Data

After login, check:
```javascript
// In browser console
fetch('/api/me', { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    console.log('User:', data.user);
    console.log('Profile:', data.user.profile);
    console.log('Name:', data.user.profile?.name);
  })
```

---

## Expected Behavior

### After Signup:
1. ✅ Welcome email sent (check inbox/spam)
2. ✅ User logged in automatically
3. ✅ Header shows: "Welcome, [Name]" or "Welcome, [Email]"
4. ✅ User redirected to onboarding (if parent role)

### After Login:
1. ✅ User logged in
2. ✅ Header shows: "Welcome, [Name]" or "Welcome, [Email]"
3. ✅ User can access protected pages

---

## Still Having Issues?

1. **Check server logs** for email errors
2. **Check SendGrid Activity** dashboard
3. **Check browser console** for JavaScript errors
4. **Verify environment variables** are set correctly
5. **Test with curl** commands above

---

## Next Steps

1. **For Email:**
   - Verify SendGrid API key is set
   - Check SendGrid Activity dashboard
   - Test with test email endpoint

2. **For User Name:**
   - Sign up again with a name
   - Check if name appears in header
   - If not, check user data in Google Sheets

