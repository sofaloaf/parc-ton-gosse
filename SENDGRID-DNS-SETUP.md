# SendGrid DNS Records Setup Guide

## ✅ Your Domain is Correct!

**Domain:** `parctongosse.com` ✅

This is perfect! You'll be able to send emails from `noreply@parctongosse.com` or any email address on your domain.

## 📋 DNS Records to Add

You need to add these **4 DNS records** to your domain's DNS settings:

### Record 1: Email Authentication (CNAME)
- **Type:** `CNAME`
- **Host/Name:** `em3006.parctongosse.com`
- **Value/Target:** `u57400513.wl014.sendgrid.net`
- **TTL:** 3600 (or default)

### Record 2: Domain Key 1 (CNAME)
- **Type:** `CNAME`
- **Host/Name:** `s1._domainkey.parctongosse.com`
- **Value/Target:** `s1.domainkey.u57400513.wl014.sendgrid.net`
- **TTL:** 3600 (or default)

### Record 3: Domain Key 2 (CNAME)
- **Type:** `CNAME`
- **Host/Name:** `s2._domainkey.parctongosse.com`
- **Value/Target:** `s2.domainkey.u57400513.wl014.sendgrid.net`
- **TTL:** 3600 (or default)

### Record 4: DMARC Policy (TXT)
- **Type:** `TXT`
- **Host/Name:** `_dmarc.parctongosse.com`
- **Value:** `v=DMARC1; p=none;`
- **TTL:** 3600 (or default)

## 🔧 How to Add DNS Records

### Step 1: Find Your DNS Provider

Your DNS provider is where you bought your domain or where it's hosted. Common providers:
- **Namecheap**
- **GoDaddy**
- **Google Domains / Google Workspace**
- **Cloudflare**
- **AWS Route 53**
- **OVH**
- **Gandi**

### Step 2: Access DNS Management

1. Log in to your domain registrar/DNS provider
2. Find **"DNS Management"**, **"DNS Settings"**, or **"Manage DNS"**
3. Look for a section called **"DNS Records"**, **"Advanced DNS"**, or **"Zone File"**

### Step 3: Add Each Record

For each of the 4 records above:

1. Click **"Add Record"** or **"Create Record"**
2. Select the **Type** (CNAME or TXT)
3. Enter the **Host/Name** (exactly as shown, including the subdomain)
4. Enter the **Value/Target** (exactly as shown)
5. Set **TTL** to 3600 (or leave default)
6. Click **"Save"** or **"Add"**

### Step 4: Important Notes

⚠️ **Important:**
- **Don't include** `parctongosse.com` in the Host field - just the subdomain part
  - ✅ Correct: `em3006` (for em3006.parctongosse.com)
  - ❌ Wrong: `em3006.parctongosse.com`
- Some DNS providers automatically append the domain, others require the full subdomain
- Check your provider's documentation if unsure

## 📍 Where to Add Records (Common Providers)

### Namecheap
1. Go to **Domain List** → Click **"Manage"** next to your domain
2. Go to **"Advanced DNS"** tab
3. Click **"Add New Record"**
4. Select type, enter host and value

### GoDaddy
1. Go to **My Products** → **DNS** → **Manage DNS**
2. Scroll to **"Records"** section
3. Click **"Add"** button
4. Select type, enter name and value

### Cloudflare
1. Select your domain
2. Go to **DNS** → **Records**
3. Click **"Add record"**
4. Select type, enter name and target

### Google Domains
1. Go to **DNS** section
2. Scroll to **"Custom resource records"**
3. Click **"Add"**
4. Enter type, name, and data

## ⏱️ After Adding Records

1. **Wait for DNS Propagation:**
   - DNS changes can take **15 minutes to 48 hours** to propagate
   - Usually takes **1-2 hours** for most providers
   - Cloudflare is usually fastest (15-30 minutes)

2. **Verify in SendGrid:**
   - Go back to SendGrid dashboard
   - Go to **Settings** → **Sender Authentication** → **Domain Authentication**
   - Click **"Verify"** button
   - SendGrid will check if all DNS records are correct
   - Status will change to **"Verified"** ✅ when complete

3. **Check Status:**
   - SendGrid will show which records are verified
   - If some fail, double-check the values match exactly
   - Make sure there are no extra spaces or typos

## ✅ Verification Checklist

After adding records, verify:
- [ ] All 4 records added to DNS
- [ ] Waited at least 15-30 minutes
- [ ] Clicked "Verify" in SendGrid
- [ ] All records show as "Verified" ✅
- [ ] Domain status shows "Authenticated"

## 🔄 After Verification

Once your domain is verified:

1. **Update Environment Variables:**
   - In Railway (Backend Service), update:
     ```
     FROM_EMAIL = noreply@parctongosse.com
     ```
   - (You can use any email on your domain, e.g., `hello@parctongosse.com`)

2. **Test Email Sending:**
   - Sign up a new user
   - Check that email arrives
   - Check SendGrid Activity dashboard

## 🆘 Troubleshooting

### Records Not Verifying?

1. **Check DNS Propagation:**
   - Use https://dnschecker.org
   - Search for each record (e.g., `em3006.parctongosse.com`)
   - Make sure it shows the correct value globally

2. **Double-Check Values:**
   - Copy-paste directly from SendGrid (use copy buttons)
   - No extra spaces before/after
   - Exact match required

3. **Wait Longer:**
   - Some DNS providers take 24-48 hours
   - Be patient and check again later

4. **Check Record Type:**
   - CNAME records must be type CNAME
   - DMARC must be type TXT
   - Don't mix them up

### Still Having Issues?

1. **Contact Your DNS Provider:**
   - They can help verify records are added correctly
   - Some providers have specific formats

2. **Use SendGrid Support:**
   - SendGrid has excellent documentation
   - Check their DNS troubleshooting guide

## 📧 Next Steps After Verification

1. ✅ Domain verified in SendGrid
2. ✅ Update `FROM_EMAIL` to use your domain
3. ✅ Test email sending
4. ✅ Monitor SendGrid Activity dashboard
5. ✅ Set up email templates (already done!)

---

**Your Domain:** `parctongosse.com` ✅  
**From Email:** `noreply@parctongosse.com` (or any email on your domain)

Once verified, you'll have professional email delivery with your own domain! 🎉

