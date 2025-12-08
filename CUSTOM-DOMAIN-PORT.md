# Custom Domain Port Configuration

## Answer: Use Port 8080

Based on your Railway configuration and the screenshot showing your existing domain uses **Port 8080**, you should enter:

**Target Port: `8080`**

## Why Port 8080?

1. **Your existing Railway domain shows**: `→ Port 8080 · Metal Edge`
2. **Railway automatically assigns ports** - Your service is already listening on port 8080
3. **Your start command uses `$PORT`**: Railway sets this environment variable automatically

## How to Verify

If you want to double-check:

1. **Check Railway Service Logs**:
   - Go to your Frontend Service → Deployments → Latest deployment
   - Look for logs showing the port (e.g., "Listening on port 8080")

2. **Check Environment Variables**:
   - Go to Frontend Service → Settings → Variables
   - Look for `PORT` variable (if set manually)

3. **Check the existing domain**:
   - Your screenshot shows the existing domain uses port 8080
   - This confirms your service is listening on 8080

## Steps to Add Domain

1. **Domain**: `parctongosse.com` (already filled in)
2. **Target Port**: `8080` (enter this)
3. Click **"Add Domain"**

## After Adding Domain

Railway will:
- ✅ Verify the domain
- ✅ Show you DNS records to add
- ✅ Automatically provision SSL certificate
- ✅ Route traffic from `parctongosse.com` to your service on port 8080

## Important Notes

- **Port 8080 is correct** - This matches your existing Railway domain
- **Railway handles routing** - You don't need to change your app code
- **SSL is automatic** - Railway will provision HTTPS certificate
- **Both domains work** - Both Railway URL and custom domain will work

## Next Steps After Adding Domain

1. Railway will show DNS records to add at your domain registrar
2. Add those DNS records (CNAME or A record)
3. Wait for DNS propagation (5-30 minutes)
4. Railway will automatically provision SSL
5. Your site will be accessible at `https://parctongosse.com`

