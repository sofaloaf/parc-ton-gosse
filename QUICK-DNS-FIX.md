# Quick DNS Fix Checklist

## ⚠️ The Errors Mean: Records Not Found Yet

This is **normal** - DNS takes time to propagate. Follow these steps:

## ✅ Immediate Actions

### 1. Double-Check Your DNS Records

Go to your DNS provider and verify all 4 records exist:

| Type | Host/Name | Value/Target |
|------|-----------|--------------|
| CNAME | `em3006` | `u57400513.wl014.sendgrid.net` |
| CNAME | `s1._domainkey` | `s1.domainkey.u57400513.wl014.sendgrid.net` |
| CNAME | `s2._domainkey` | `s2.domainkey.u57400513.wl014.sendgrid.net` |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

**Important:** 
- Host field should be just the subdomain (e.g., `em3006`), NOT `em3006.parctongosse.com`
- Some providers auto-add the domain, others don't - check your provider's format

### 2. Verify Values Are Exact

- Copy-paste directly from SendGrid (use copy buttons)
- No extra spaces
- No typos
- For TXT: Must include the semicolon and space: `v=DMARC1; p=none;`

### 3. Check DNS Propagation

Visit: https://dnschecker.org

Search for:
- `em3006.parctongosse.com` (should show CNAME to `u57400513.wl014.sendgrid.net`)
- `s1._domainkey.parctongosse.com` (should show CNAME)
- `s2._domainkey.parctongosse.com` (should show CNAME)
- `_dmarc.parctongosse.com` (should show TXT `v=DMARC1; p=none;`)

**If records show up globally** → Wait 15-30 min, then verify in SendGrid  
**If records DON'T show up** → Check your DNS provider settings

### 4. Wait for Propagation

**Timeline:**
- ⏱️ **15-30 minutes:** Fast providers (Cloudflare)
- ⏱️ **1-2 hours:** Most providers (Namecheap, GoDaddy)
- ⏱️ **Up to 24 hours:** Some slow providers

**What to do:**
1. Wait at least **30 minutes** after adding records
2. Check DNS propagation tools
3. Try "Verify" in SendGrid again
4. If still failing, wait another hour

### 5. Common Mistakes to Avoid

❌ **Wrong Host Format:**
- Wrong: `em3006.parctongosse.com` (if your provider auto-adds domain)
- Right: `em3006`

❌ **Wrong Value:**
- Wrong: Extra spaces, typos, missing parts
- Right: Exact copy from SendGrid

❌ **Wrong Record Type:**
- Wrong: CNAME as A record, TXT as CNAME
- Right: First 3 are CNAME, last is TXT

❌ **TTL Too High:**
- Wrong: TTL = 86400 (24 hours)
- Right: TTL = 3600 (1 hour) or 1800 (30 min)

## 🎯 Quick Test

**Test if records are working:**

Open terminal/command prompt and run:
```bash
# Windows
nslookup em3006.parctongosse.com

# Mac/Linux
dig em3006.parctongosse.com CNAME
```

**Expected output:** Should show `u57400513.wl014.sendgrid.net`

**If it shows:** "can't find" or "NXDOMAIN" → Records not propagated yet or added incorrectly

## 💡 Temporary Solution

While waiting for domain verification, you can use **Single Sender Verification**:

1. SendGrid → **Settings** → **Sender Authentication** → **Single Sender Verification**
2. Create sender: `noreply@parctongosse.com`
3. Verify via email (instant)
4. You can send emails immediately!

Then switch to domain authentication once DNS propagates.

## ✅ When It Works

You'll see:
- ✅ Green checkmarks next to all records
- ✅ "Authenticated" status
- ✅ No warning messages

---

**Bottom Line:** If you added records correctly, just wait! DNS propagation is the most common cause of these errors. Check again in 1-2 hours.

