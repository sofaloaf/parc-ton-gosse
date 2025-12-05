# SendGrid DNS Records Setup for parctongosse.com

## 📍 Where to Add DNS Records

**NOT in Railway** - Add these in your **domain registrar** (where you bought/manage `parctongosse.com`).

Common registrars:
- GoDaddy
- Namecheap
- Cloudflare
- Google Domains
- AWS Route 53
- Other domain registrars

---

## 📋 DNS Records to Add

Based on your SendGrid setup, add these **4 DNS records** to your domain:

### Record 1: CNAME Record
- **Type:** `CNAME`
- **Host/Name:** `em9557.parctongosse.com`
- **Value/Target:** `u57400513.wl014.sendgrid.net`
- **TTL:** Default (or 3600)

### Record 2: CNAME Record
- **Type:** `CNAME`
- **Host/Name:** `s1._domainkey.parctongosse.com`
- **Value/Target:** `s1.domainkey.u57400513.wl014.sendgrid.net`
- **TTL:** Default (or 3600)

### Record 3: CNAME Record
- **Type:** `CNAME`
- **Host/Name:** `s2._domainkey.parctongosse.com`
- **Value/Target:** `s2.domainkey.u57400513.wl014.sendgrid.net`
- **TTL:** Default (or 3600)

### Record 4: TXT Record
- **Type:** `TXT`
- **Host/Name:** `_dmarc.parctongosse.com`
- **Value:** `v=DMARC1; p=none;`
- **TTL:** Default (or 3600)

---

## 🔧 Step-by-Step Instructions by Registrar

### GoDaddy

1. Log in to GoDaddy: https://www.godaddy.com
2. Go to **My Products** → **Domains**
3. Click on **parctongosse.com**
4. Click **DNS** tab
5. Scroll down to **Records** section
6. Click **Add** for each record:
   - Select **Type** (CNAME or TXT)
   - Enter **Host** (e.g., `em9557`)
   - Enter **Points to** or **Value** (the full value from SendGrid)
   - Click **Save**
7. Repeat for all 4 records

**Note:** In GoDaddy, you might only need to enter the subdomain part (e.g., `em9557` instead of `em9557.parctongosse.com`)

### Namecheap

1. Log in to Namecheap: https://www.namecheap.com
2. Go to **Domain List**
3. Click **Manage** next to `parctongosse.com`
4. Go to **Advanced DNS** tab
5. Click **Add New Record**
6. For each record:
   - Select **Type** (CNAME or TXT)
   - Enter **Host** (e.g., `em9557`)
   - Enter **Value** (the full value from SendGrid)
   - Click **Save** (checkmark icon)
7. Repeat for all 4 records

### Cloudflare

1. Log in to Cloudflare: https://dash.cloudflare.com
2. Select your domain `parctongosse.com`
3. Go to **DNS** section
4. Click **Add record**
5. For each record:
   - Select **Type** (CNAME or TXT)
   - Enter **Name** (e.g., `em9557` or `s1._domainkey`)
   - Enter **Target** or **Content** (the full value from SendGrid)
   - Click **Save**
6. Repeat for all 4 records

**Note:** Cloudflare may auto-proxy some records - that's OK for SendGrid

### Google Domains

1. Log in to Google Domains: https://domains.google.com
2. Click on **parctongosse.com**
3. Go to **DNS** section
4. Scroll to **Custom resource records**
5. Click **Add** for each record:
   - Select **Type** (CNAME or TXT)
   - Enter **Name** (e.g., `em9557`)
   - Enter **Data** (the full value from SendGrid)
   - Click **Save**
6. Repeat for all 4 records

---

## ⏱️ After Adding Records

1. **Wait for DNS propagation:**
   - Usually takes 15-30 minutes
   - Can take up to 48 hours (rare)
   - You can check status using DNS lookup tools

2. **Go back to SendGrid:**
   - Return to the SendGrid setup page
   - Click **"Next"** or **"Verify"** button
   - SendGrid will check if records are added correctly

3. **Verification:**
   - SendGrid will show "Verified" ✅ when complete
   - If it fails, wait a bit longer and try again

---

## 🔍 How to Check if Records Are Added

### Option 1: Use Online DNS Checker
1. Go to https://mxtoolbox.com/SuperTool.aspx
2. Select **CNAME Lookup** or **TXT Lookup**
3. Enter the host (e.g., `em9557.parctongosse.com`)
4. Click **Lookup**
5. Should show the SendGrid value

### Option 2: Command Line
```bash
# Check CNAME record
nslookup -type=CNAME em9557.parctongosse.com

# Check TXT record
nslookup -type=TXT _dmarc.parctongosse.com
```

### Option 3: Online Tools
- https://www.whatsmydns.net
- https://dnschecker.org

---

## ⚠️ Common Issues

### Issue: "Records not found" after adding
**Solution:**
- Wait 15-30 minutes for DNS propagation
- Double-check you entered the exact values (copy-paste from SendGrid)
- Make sure you're adding to the correct domain

### Issue: "Host already exists"
**Solution:**
- You might have an existing record with that name
- Delete the old record first, then add the new one
- Or update the existing record with the SendGrid value

### Issue: "Invalid format"
**Solution:**
- Make sure you're using the correct record type (CNAME vs TXT)
- Check for typos in the values
- Some registrars require just the subdomain (e.g., `em9557`) not the full domain

### Issue: Records added but SendGrid still shows "Not verified"
**Solution:**
- Wait longer (up to 48 hours in rare cases)
- Use DNS checker tools to verify records are live
- Make sure all 4 records are added correctly
- Try clicking "Verify" again in SendGrid

---

## ✅ Verification Checklist

After adding records, verify:

- [ ] All 4 records added to domain registrar
- [ ] Waited at least 15-30 minutes
- [ ] DNS records show up in DNS checker tools
- [ ] Clicked "Verify" in SendGrid
- [ ] Status shows "Verified" ✅ in SendGrid

---

## 🚀 Next Steps

Once verified:
1. SendGrid will show "Domain Authenticated" ✅
2. You can send emails from any address on `parctongosse.com`
3. Better email deliverability
4. Professional email setup complete

---

## 📞 Need Help?

- **SendGrid Support:** Available in dashboard
- **DNS Issues:** Contact your domain registrar support
- **Your App:** Already configured - just needs the DNS records!

---

**Remember:** These DNS records are for your **domain** (`parctongosse.com`), not for Railway. Railway is just where your app runs - DNS is managed at your domain registrar!

