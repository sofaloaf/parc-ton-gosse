# Custom Domain Setup: parctongosse.com → Railway

## Overview
Connect your custom domain `parctongosse.com` to your Railway deployment so visitors can access your site at `https://parctongosse.com` instead of the Railway-generated URL.

## Prerequisites
- ✅ You own `parctongosse.com`
- ✅ Your domain is registered with a DNS provider (GoDaddy, Namecheap, Cloudflare, etc.)
- ✅ You have access to your domain's DNS management

---

## Step 1: Add Domain in Railway

1. **Go to Railway Dashboard**
   - Visit https://railway.app
   - Log in to your account

2. **Select Your Frontend Service**
   - Open your project
   - Click on the **Frontend Service** (not backend)

3. **Add Custom Domain**
   - Go to **Settings** tab
   - Scroll to **"Domains"** section
   - Click **"Add Domain"** or **"Custom Domain"**
   - Enter: `parctongosse.com`
   - Click **"Add"**

4. **Railway Will Show DNS Instructions**
   - Railway will display the DNS records you need to add
   - **Note down the CNAME value** (something like `cname.railway.app` or your Railway subdomain)
   - Railway may also show an IP address for A record

---

## Step 2: Configure DNS Records

You need to add DNS records at your domain registrar (where you manage `parctongosse.com`).

### Option A: Using CNAME (Recommended if supported)

**For Root Domain (`parctongosse.com`):**

If your DNS provider supports CNAME flattening (Cloudflare does):
- **Type**: `CNAME`
- **Name**: `@` or `parctongosse.com` (depends on your provider)
- **Value**: Railway's CNAME value (from Step 1)
- **TTL**: `3600` (or default)

**For WWW Subdomain (`www.parctongosse.com`):**
- **Type**: `CNAME`
- **Name**: `www`
- **Value**: Railway's CNAME value (same as above)
- **TTL**: `3600` (or default)

### Option B: Using A Record (If CNAME not supported for root)

**For Root Domain (`parctongosse.com`):**
- **Type**: `A`
- **Name**: `@` or `parctongosse.com`
- **Value**: Railway's IP address (from Step 1)
- **TTL**: `3600` (or default)

**For WWW Subdomain:**
- **Type**: `CNAME`
- **Name**: `www`
- **Value**: Railway's CNAME value
- **TTL**: `3600` (or default)

### DNS Provider Specific Instructions

#### Cloudflare (Recommended - Supports CNAME Flattening)
1. Log in to Cloudflare
2. Select `parctongosse.com`
3. Go to **DNS** section
4. Add records:
   - **Type**: `CNAME`, **Name**: `@`, **Value**: Railway CNAME, **Proxy**: Off (DNS only)
   - **Type**: `CNAME`, **Name**: `www`, **Value**: Railway CNAME, **Proxy**: Off (DNS only)

#### GoDaddy
1. Log in to GoDaddy
2. Go to **My Products** → **Domains**
3. Click **DNS** next to `parctongosse.com`
4. Add records:
   - **Type**: `A` or `CNAME`, **Name**: `@`, **Value**: Railway IP or CNAME
   - **Type**: `CNAME`, **Name**: `www`, **Value**: Railway CNAME

#### Namecheap
1. Log in to Namecheap
2. Go to **Domain List**
3. Click **Manage** next to `parctongosse.com`
4. Go to **Advanced DNS** tab
5. Add records:
   - **Type**: `A Record`, **Host**: `@`, **Value**: Railway IP
   - **Type**: `CNAME Record`, **Host**: `www`, **Value**: Railway CNAME

#### Google Domains
1. Log in to Google Domains
2. Click on `parctongosse.com`
3. Go to **DNS** section
4. Add custom resource records:
   - **Type**: `A` or `CNAME`, **Name**: `@`, **Value**: Railway IP or CNAME
   - **Type**: `CNAME`, **Name**: `www`, **Value**: Railway CNAME

---

## Step 3: Wait for DNS Propagation

1. **DNS changes take time to propagate**
   - Usually: 5-30 minutes
   - Maximum: Up to 48 hours
   - Cloudflare: Usually fastest (5-15 minutes)

2. **Verify DNS is working:**
   ```bash
   # Check if DNS is resolving
   nslookup parctongosse.com
   dig parctongosse.com
   
   # Or use online tools:
   # - https://www.whatsmydns.net
   # - https://dnschecker.org
   ```

3. **Check Railway Dashboard**
   - Go back to Railway → Your Service → Settings → Domains
   - Railway will show domain status:
     - ⏳ "Pending" - DNS not yet propagated
     - ✅ "Active" - Domain is connected and SSL is provisioned

---

## Step 4: SSL Certificate (Automatic)

Railway automatically provisions SSL certificates via Let's Encrypt:
- ✅ Happens automatically after DNS is verified
- ✅ Usually takes 5-10 minutes after DNS propagation
- ✅ Both `parctongosse.com` and `www.parctongosse.com` will get SSL

**You'll know it's ready when:**
- Railway shows domain as "Active" (green checkmark)
- You can access `https://parctongosse.com` (not just HTTP)

---

## Step 5: Update Environment Variables

After your domain is working, update these if needed:

### Backend Service (Railway)
1. Go to **Backend Service** → **Settings** → **Variables**
2. Update `CORS_ORIGIN` to include your custom domain:
   ```
   CORS_ORIGIN=https://parctongosse.com,https://www.parctongosse.com,https://victorious-gentleness-production.up.railway.app
   ```
   (Keep the Railway URL for now, you can remove it later)

### Frontend Service (Railway)
1. Go to **Frontend Service** → **Settings** → **Variables**
2. Check `VITE_API_URL` - should already point to backend
3. No changes needed if backend URL is correct

---

## Step 6: Update API URL Detection (Optional)

The frontend code automatically detects Railway domains. Since `parctongosse.com` is not a Railway domain, you may want to update the API URL detection logic.

**File**: `client/src/shared/api.js`

The current code checks for Railway domains. For your custom domain, it will use:
1. `window.__PTG_API_URL__` (from api-url-override.js)
2. `VITE_API_URL` environment variable
3. Fallback to same-origin `/api`

Since your backend is on Railway, make sure `VITE_API_URL` is set correctly in Railway frontend variables.

---

## Step 7: Test Your Domain

1. **Test HTTP (should redirect to HTTPS):**
   ```bash
   curl -I http://parctongosse.com
   ```

2. **Test HTTPS:**
   ```bash
   curl -I https://parctongosse.com
   ```
   Should return `200 OK` with SSL certificate

3. **Test in Browser:**
   - Open https://parctongosse.com
   - Should load your site
   - Check browser console for errors
   - Verify API calls are working

4. **Test WWW:**
   - Open https://www.parctongosse.com
   - Should also work (if you set up www subdomain)

---

## Troubleshooting

### Domain Not Resolving
- **Wait longer**: DNS can take up to 48 hours
- **Check DNS records**: Verify they're correct in your registrar
- **Use DNS checker**: https://dnschecker.org to see global DNS status

### SSL Certificate Not Provisioned
- **Wait 10-15 minutes** after DNS propagation
- **Check Railway dashboard**: Domain should show "Active"
- **Try accessing HTTPS**: Railway will provision SSL automatically

### Site Not Loading
- **Check Railway service is running**: Go to Railway dashboard
- **Check service logs**: Look for errors
- **Verify DNS points to correct service**: Make sure you added domain to Frontend service, not Backend

### CORS Errors
- **Update CORS_ORIGIN**: Add your custom domain to backend CORS settings
- **Check backend logs**: Look for CORS errors

### API Calls Failing
- **Check VITE_API_URL**: Should point to backend Railway URL
- **Check browser console**: Look for API errors
- **Verify backend is accessible**: Test backend URL directly

---

## Quick Checklist

- [ ] Added domain in Railway (Frontend Service → Settings → Domains)
- [ ] Added DNS records at domain registrar
- [ ] Waited for DNS propagation (5-30 minutes)
- [ ] Railway shows domain as "Active"
- [ ] SSL certificate is working (HTTPS loads)
- [ ] Updated CORS_ORIGIN in backend (if needed)
- [ ] Tested site at https://parctongosse.com
- [ ] Tested www subdomain (if configured)
- [ ] Verified API calls work
- [ ] Updated any hardcoded URLs in code

---

## Important Notes

1. **Keep Railway URL Working**: Don't remove the Railway URL until custom domain is fully working
2. **DNS Propagation**: Can take time - be patient
3. **SSL is Automatic**: Railway handles SSL certificates automatically
4. **Both Domains Work**: Both `parctongosse.com` and Railway URL will work
5. **Email DNS**: Your existing SendGrid DNS records won't be affected

---

## After Setup

Once your domain is working:

1. **Update QR Code**:
   ```bash
   node generate-qr-code.js https://parctongosse.com
   ```

2. **Update Any Hardcoded URLs**:
   - Check for any references to Railway URL in code
   - Update documentation

3. **Test Everything**:
   - Site loads correctly
   - API calls work
   - Authentication works
   - All features functional

---

## Support

If you encounter issues:
1. Check Railway deployment logs
2. Check DNS propagation status
3. Verify DNS records are correct
4. Contact Railway support if domain verification fails

---

## Status

⏳ **Ready to configure** - Follow steps above to connect your domain!

