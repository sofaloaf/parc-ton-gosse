# Deployment Guide for Parc Ton Gosse

## 🚀 Quick Deployment Options

### Option 1: Vercel (Recommended - Easiest)

**Deploy Frontend:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy client
cd client
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name? parc-ton-gosse
# - Directory? ./
# - Override settings? No
```

**Deploy Backend:**
```bash
# Deploy server
cd server
vercel

# Or use Vercel dashboard to deploy server
```

**Configure Environment Variables:**
- Go to Vercel dashboard → Your project → Settings → Environment Variables
- Add all variables from `server/.env` and `client/.env`

**Get Your URL:**
- Frontend: `https://parc-ton-gosse.vercel.app` (or your custom domain)
- Backend: `https://parc-ton-gosse-api.vercel.app`

**Update Client Environment:**
- Update `client/.env` with backend URL:
  ```
  VITE_API_URL=https://parc-ton-gosse-api.vercel.app/api
  ```

---

### Option 2: Netlify (Free & Easy)

**Deploy Frontend:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy client
cd client
npm run build
netlify deploy --prod --dir dist
```

**Deploy Backend:**
- Netlify Functions (limited)
- Or use Railway/Render for backend

**Get Your URL:**
- Frontend: `https://parc-ton-gosse.netlify.app`

---

### Option 3: Railway (Full-Stack - Recommended)

**Deploy Both:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway init
railway up
```

**Configure Environment:**
- Railway dashboard → Variables
- Add all environment variables

**Get Your URL:**
- Railway provides URLs automatically
- Example: `https://parc-ton-gosse-production.up.railway.app`

---

### Option 4: Render (Full-Stack)

**Via Dashboard:**
1. Go to https://render.com
2. Create new Web Service
3. Connect your GitHub repo
4. Configure build/start commands
5. Add environment variables

**Get Your URL:**
- Render provides URLs automatically
- Example: `https://parc-ton-gosse.onrender.com`

---

## 🔗 Getting Your Production URL

Once deployed, you'll get a URL like:
- `https://parc-ton-gosse.vercel.app`
- `https://parc-ton-gosse.netlify.app`
- `https://your-custom-domain.com`

**Use this URL for your QR code!**

---

## 📱 Generate QR Code with Your URL

```bash
# Generate QR code with your production URL
npm run qr https://your-production-url.com

# Or manually:
node generate-qr-code.js https://your-production-url.com
```

---

## 🌐 Custom Domain Setup

### Vercel:
1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

### Netlify:
1. Go to Site Settings → Domain Management
2. Add custom domain
3. Configure DNS

### Railway/Render:
- Use your domain registrar
- Point DNS to provided URL
- Configure in dashboard

---

## 🔐 Environment Variables Checklist

Make sure these are set in your deployment platform:

### Backend:
- `PORT` (usually auto-set)
- `JWT_SECRET` (generate strong secret)
- `CORS_ORIGIN` (your frontend URL)
- `DATA_BACKEND` (sheets/airtable/memory)
- `GS_SERVICE_ACCOUNT` (if using Google Sheets)
- `GS_PRIVATE_KEY` (if using Google Sheets)
- `GS_SHEET_ID` (if using Google Sheets)
- `STRIPE_SECRET_KEY` (if using Stripe)
- `STRIPE_WEBHOOK_SECRET` (if using Stripe)

### Frontend:
- `VITE_API_URL` (your backend API URL)

---

## ✅ Post-Deployment Checklist

- [ ] Test site is accessible
- [ ] Test API endpoints work
- [ ] Test authentication/login
- [ ] Test Google Sheets connection (if using)
- [ ] Generate QR code with production URL
- [ ] Test QR code scanning
- [ ] Set up custom domain (optional)
- [ ] Configure SSL/HTTPS (usually automatic)

---

## 📱 Next Steps After Deployment

1. **Generate QR Code:**
   ```bash
   npm run qr https://your-production-url.com
   ```

2. **Download QR Code Files:**
   - `qr-code.png` - For digital use
   - `qr-code.svg` - For printing

3. **Share Your QR Code:**
   - Print on flyers
   - Add to social media
   - Include in emails
   - Display at events

---

## 🆘 Troubleshooting

**Site not loading?**
- Check environment variables are set
- Verify backend URL in frontend config
- Check deployment logs

**API errors?**
- Verify CORS_ORIGIN includes frontend URL
- Check backend is running
- Verify environment variables

**QR code not working?**
- Ensure URL is correct (include https://)
- Test URL in browser first
- Regenerate QR code with correct URL

---

## 📚 Resources

- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com)
- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)

---

**Need help?** Check the deployment platform's documentation or support!

