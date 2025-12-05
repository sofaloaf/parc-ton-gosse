# SendGrid Setup - Quick Checklist

## ✅ Step-by-Step Checklist

### 1. Create SendGrid Account
- [ ] Go to https://sendgrid.com
- [ ] Click "Start for Free"
- [ ] Sign up and verify email
- [ ] Complete account setup

### 2. Create API Key
- [ ] Go to Settings → API Keys
- [ ] Click "Create API Key"
- [ ] Name it (e.g., "Parc Ton Gosse Production")
- [ ] Select "Full Access" or "Restricted Access" with Mail Send
- [ ] Copy API key immediately (starts with `SG.`)
- [ ] Save it securely

### 3. Verify Sender Identity

**Option A: Single Sender (Easiest)**
- [ ] Go to Settings → Sender Authentication → Single Sender
- [ ] Click "Create a Sender"
- [ ] Fill in form (email, name, address, etc.)
- [ ] Check email and click verification link
- [ ] Verify status shows "Verified" ✅

**Option B: Domain Authentication (Recommended)**
- [ ] Go to Settings → Sender Authentication → Domain Authentication
- [ ] Enter your domain
- [ ] Add DNS records to your domain
- [ ] Wait for DNS propagation (15-30 min)
- [ ] Click "Verify" in SendGrid
- [ ] Verify status shows "Verified" ✅

### 4. Configure Environment Variables

**Local Development (`server/.env`):**
- [ ] Add `SENDGRID_API_KEY=SG.xxxxx...`
- [ ] Add `FROM_EMAIL=noreply@parctongosse.com`
- [ ] Add `FROM_NAME=Parc Ton Gosse`
- [ ] Add `FRONTEND_URL=http://localhost:5173`

**Railway Production:**
- [ ] Go to Railway project → Backend Service → Variables
- [ ] Add `SENDGRID_API_KEY`
- [ ] Add `FROM_EMAIL`
- [ ] Add `FROM_NAME`
- [ ] Add `FRONTEND_URL`
- [ ] Service redeploys automatically

### 5. Test Email Sending
- [ ] Start server locally
- [ ] Sign up a new user
- [ ] Check email inbox (and spam folder)
- [ ] Check server logs for `✅ Email sent via SendGrid`
- [ ] Check SendGrid Activity dashboard

### 6. Verify Everything Works
- [ ] Welcome email received on signup ✅
- [ ] Password reset email works ✅
- [ ] Emails appear in SendGrid Activity ✅
- [ ] No errors in server logs ✅

---

## 🔍 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Emails not sending | Check API key is correct and has permissions |
| "Forbidden" error | API key needs "Mail Send" permission |
| "Unauthorized" error | API key is invalid - check it's correct |
| "Sender not verified" | Verify sender email in SendGrid dashboard |
| Rate limit exceeded | Free tier limit (100/day) - wait or upgrade |
| Emails in spam | Use domain authentication, avoid spam words |

---

## 📝 Environment Variables Template

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@parctongosse.com
FROM_NAME=Parc Ton Gosse
FRONTEND_URL=https://your-frontend-url.com
```

---

## 🔗 Quick Links

- **SendGrid Dashboard:** https://app.sendgrid.com
- **API Keys:** https://app.sendgrid.com/settings/api_keys
- **Sender Auth:** https://app.sendgrid.com/settings/sender_auth
- **Activity:** https://app.sendgrid.com/activity

---

## 📚 Full Documentation

For detailed instructions, see: **`SENDGRID-ENABLE-GUIDE.md`**

---

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

