# SendGrid DNS Troubleshooting Guide

## 🔍 Understanding the Errors

The errors mean SendGrid can't find your DNS records yet. This is usually because:
1. **DNS hasn't propagated** (most common - takes time)
2. **Records added incorrectly** (wrong format or values)
3. **DNS provider hasn't updated** (some are slower)

## ✅ Step-by-Step Fix

### Step 1: Verify Records Are Added Correctly

First, let's check if your DNS records are actually there:

1. **Go to your DNS provider** (where you manage parctongosse.com)
2. **Check each record** - make sure all 4 are present:
   - `em3006` (CNAME) → `u57400513.wl014.sendgrid.net`
   - `s1._domainkey` (CNAME) → `s1.domainkey.u57400513.wl014.sendgrid.net`
   - `s2._domainkey` (CNAME) → `s2.domainkey.u57400513.wl014.sendgrid.net`
   - `_dmarc` (TXT) → `v=DMARC1; p=none;`

### Step 2: Check DNS Propagation

Use these tools to check if records are visible globally:

**Tool 1: DNS Checker**
- Go to https://dnschecker.org
- For each record, check:
  - Search: `em3006.parctongosse.com` (should show `u57400513.wl014.sendgrid.net`)
  - Search: `s1._domainkey.parctongosse.com` (should show `s1.domainkey.u57400513.wl014.sendgrid.net`)
  - Search: `s2._domainkey.parctongosse.com` (should show `s2.domainkey.u57400513.wl014.sendgrid.net`)
  - Search: `_dmarc.parctongosse.com` (should show `v=DMARC1; p=none;`)

**Tool 2: Command Line (if you have access)**
```bash
# Check CNAME records
dig em3006.parctongosse.com CNAME
dig s1._domainkey.parctongosse.com CNAME
dig s2._domainkey.parctongosse.com CNAME

# Check TXT record
dig _dmarc.parctongosse.com TXT
```

### Step 3: Common Issues & Fixes

#### Issue 1: Records Not Showing Up Globally

**Problem:** You added records but they're not visible yet.

**Solution:**
- **Wait 15-30 minutes** (DNS propagation takes time)
- Some providers take **2-24 hours**
- Cloudflare is fastest (15-30 min)
- GoDaddy/Namecheap can take 1-2 hours

#### Issue 2: Wrong Host Format

**Problem:** Different DNS providers use different formats.

**Check your provider's format:**

**Namecheap:**
- ✅ Correct: Host = `em3006` (they auto-add domain)
- ❌ Wrong: Host = `em3006.parctongosse.com`

**GoDaddy:**
- ✅ Correct: Host = `em3006` (they auto-add domain)
- ❌ Wrong: Host = `em3006.parctongosse.com`

**Cloudflare:**
- ✅ Correct: Name = `em3006` (they auto-add domain)
- ❌ Wrong: Name = `em3006.parctongosse.com`

**Google Domains:**
- ✅ Correct: Name = `em3006` (they auto-add domain)
- ❌ Wrong: Name = `em3006.parctongosse.com`

**If unsure:** Check your provider's documentation or try both formats.

#### Issue 3: Wrong Value Format

**Problem:** Extra spaces or characters in the value.

**Solution:**
- Copy-paste **exactly** from SendGrid (use the copy buttons)
- No extra spaces before or after
- For TXT record: `v=DMARC1; p=none;` (exactly as shown, with semicolon and space)

#### Issue 4: Wrong Record Type

**Problem:** CNAME added as A record, or TXT added as CNAME.

**Solution:**
- First 3 records must be **CNAME**
- Last record must be **TXT**
- Double-check the type matches exactly

#### Issue 5: TTL Too High

**Problem:** TTL set to a very high value (like 86400).

**Solution:**
- Set TTL to **3600** (1 hour) or **1800** (30 minutes)
- Lower TTL = faster propagation

### Step 4: Re-Add Records (If Needed)

If records are wrong, delete and re-add:

1. **Delete** the incorrect records
2. **Wait 5 minutes**
3. **Add** them again with correct values
4. **Copy-paste** directly from SendGrid (use copy buttons)
5. **Save** and wait for propagation

### Step 5: Verify in SendGrid

After waiting 15-30 minutes:

1. Go to SendGrid → **Settings** → **Sender Authentication** → **Domain Authentication**
2. Click **"Verify"** button
3. Check status:
   - ✅ **Green checkmarks** = Verified
   - ⚠️ **Yellow warnings** = Still propagating (wait longer)
   - ❌ **Red X** = Wrong values (check again)

## 🔧 Provider-Specific Tips

### Namecheap
- Go to **Domain List** → **Manage** → **Advanced DNS**
- Make sure you're in **"Advanced DNS"** tab, not "Basic DNS"
- Host field: Just `em3006` (not `em3006.parctongosse.com`)

### GoDaddy
- Go to **My Products** → **DNS** → **Manage DNS**
- Host field: Just `em3006` (not `em3006.parctongosse.com`)
- Make sure you click **"Save"** after each record

### Cloudflare
- Select domain → **DNS** → **Records**
- Name field: Just `em3006` (not `em3006.parctongosse.com`)
- Proxy status: Should be **DNS only** (gray cloud), not **Proxied** (orange cloud)

### Google Domains
- Go to **DNS** → **Custom resource records**
- Name field: Just `em3006` (not `em3006.parctongosse.com`)

## ⏱️ Timeline

**Typical DNS Propagation:**
- **Fast providers (Cloudflare):** 15-30 minutes
- **Medium providers (Namecheap, GoDaddy):** 1-2 hours
- **Slow providers:** 2-24 hours
- **Maximum:** Up to 48 hours (rare)

**What to do:**
1. Add records correctly
2. Wait **at least 30 minutes**
3. Check DNS propagation tools
4. Try verifying in SendGrid
5. If still failing, wait another hour and try again

## 🆘 Still Not Working?

### Option 1: Use Single Sender Verification (Temporary)

While waiting for domain verification, you can use Single Sender Verification:

1. Go to **Settings** → **Sender Authentication** → **Single Sender Verification**
2. Click **"Create a Sender"**
3. Use: `noreply@parctongosse.com`
4. Verify via email (instant)
5. You can send emails immediately while domain verification propagates

### Option 2: Contact Your DNS Provider

If records still don't show after 24 hours:
1. Contact your DNS provider support
2. Ask them to verify the records are added correctly
3. They can check their DNS servers directly

### Option 3: Check SendGrid Documentation

- SendGrid DNS Setup: https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication
- Troubleshooting: https://docs.sendgrid.com/ui/account-and-settings/troubleshooting-domain-authentication

## ✅ Success Checklist

When it works, you'll see:
- [ ] All 4 records show green checkmarks ✅
- [ ] Domain status shows "Authenticated"
- [ ] No warning messages
- [ ] You can send emails from `@parctongosse.com`

---

**Most Common Solution:** Just wait! DNS propagation takes time. If you added records correctly, they'll verify within 1-2 hours.

