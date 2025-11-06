# QR Code Guide for Parc Ton Gosse

## 📱 Quick Setup

### Option 1: Generate QR Code Locally (Recommended)

1. **Install dependencies** (if not already installed):
   ```bash
   npm install qrcode
   ```

2. **Generate QR code** with your site URL:
   ```bash
   node generate-qr-code.js https://your-site-url.com
   ```
   
   Or edit the URL in `generate-qr-code.js` and run:
   ```bash
   node generate-qr-code.js
   ```

3. **Files generated**:
   - `qr-code.png` - High-quality PNG image (500x500px)
   - `qr-code.svg` - Scalable vector format (best for printing)
   - `qr-code.html` - Preview page with instructions

4. **Open the HTML file** to view and download:
   ```bash
   open qr-code.html  # macOS
   # or double-click qr-code.html in your file manager
   ```

### Option 2: Use Online QR Code Generator

1. Go to any QR code generator website:
   - https://www.qr-code-generator.com/
   - https://qrcode.tec-it.com/
   - https://www.the-qrcode-generator.com/

2. Enter your site URL

3. Download the QR code image

4. Use it in your materials!

## 🌐 Getting Your Site URL

### If Already Deployed:
- Use your production URL (e.g., `https://parctongosse.com`)

### If Not Yet Deployed:
You'll need to deploy your site first. Options:

1. **Vercel** (Recommended - Free & Easy):
   ```bash
   npm install -g vercel
   cd client
   vercel
   ```
   - Free tier available
   - Automatic HTTPS
   - Custom domain support

2. **Netlify** (Free & Easy):
   ```bash
   npm install -g netlify-cli
   cd client
   netlify deploy --prod
   ```
   - Free tier available
   - Automatic HTTPS
   - Easy deployment

3. **Railway** or **Render**:
   - Full-stack hosting
   - Both offer free tiers

## 📋 Where to Use Your QR Code

### Digital:
- ✅ **Email signatures** - Add QR code to email footer
- ✅ **Social media** - Post QR code on Instagram, Facebook, LinkedIn
- ✅ **Website** - Display QR code on landing page
- ✅ **Email newsletters** - Include in marketing emails
- ✅ **Digital ads** - Use in online advertisements

### Physical:
- ✅ **Flyers & brochures** - Print QR codes on marketing materials
- ✅ **Business cards** - Add QR code to contact info
- ✅ **Posters & banners** - Display at events, locations
- ✅ **Product packaging** - Include in product boxes
- ✅ **Store windows** - Display in physical locations
- ✅ **Event materials** - Use at conferences, markets, etc.

## 🎨 QR Code Best Practices

### Size:
- **Minimum size**: 2cm x 2cm (0.8" x 0.8") for scanning
- **Recommended**: 3cm x 3cm (1.2" x 1.2") or larger
- **For distance**: 1 meter = add 10cm to QR code size

### Placement:
- ✅ Place in corners or edges (easier to scan)
- ✅ Ensure good contrast (dark QR on light background)
- ✅ Leave "quiet zone" (white border) around QR code
- ✅ Test scanning before printing large quantities

### Design:
- ✅ High error correction (30% damage tolerance)
- ✅ Dark colors on light background
- ✅ Avoid gradients or patterns inside QR code
- ✅ Can add logo in center (but keep it small)

## 🔗 Creating a Short Link (Optional)

For cleaner QR codes, you can use a URL shortener:

1. **Bitly** (bit.ly):
   - Creates short links like `bit.ly/parctongosse`
   - QR codes are smaller and cleaner
   - Tracks click statistics

2. **TinyURL**:
   - Simple URL shortening
   - Free and easy

3. **Your own domain**:
   - Use a short domain like `ptg.com` or `parctongosse.fr`
   - More professional
   - Better branding

## 📱 Testing Your QR Code

Before printing or sharing:

1. **Test on multiple devices**:
   - iPhone (iOS)
   - Android phone
   - Different camera apps

2. **Test in different conditions**:
   - Good lighting
   - Poor lighting
   - Different angles
   - From different distances

3. **Test different sizes**:
   - Small (business card size)
   - Medium (flyer size)
   - Large (poster size)

## 🚀 Quick Start Commands

```bash
# Generate QR code (replace with your URL)
node generate-qr-code.js https://your-site-url.com

# View the QR code
open qr-code.html  # macOS
# or
xdg-open qr-code.html  # Linux
# or double-click qr-code.html  # Windows
```

## 📄 Files Generated

- **qr-code.png** - Use for digital sharing (websites, emails)
- **qr-code.svg** - Use for printing (scalable, better quality)
- **qr-code.html** - Preview page with download links

## 💡 Tips

1. **Update QR code** if your URL changes
2. **Keep QR code file** in a safe place
3. **Test before printing** large quantities
4. **Use high-quality images** for printing
5. **Consider branded QR codes** with your logo in the center (requires premium tools)

---

**Need help?** Check the generated `qr-code.html` file for visual instructions!

