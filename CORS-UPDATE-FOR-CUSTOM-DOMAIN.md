# Update CORS_ORIGIN for Custom Domain

## Answer: ADD the new domain (comma-separated)

**Do NOT replace** - Add the new domain alongside the existing one.

## Current Configuration

Your backend currently has:
```
CORS_ORIGIN=https://victorious-gentleness-production.up.railway.app
```

## Updated Configuration

Update it to:
```
CORS_ORIGIN=https://victorious-gentleness-production.up.railway.app,https://parctongosse.com,https://www.parctongosse.com
```

## Why Add (Not Replace)?

1. **Both domains need to work**:
   - Railway URL: `https://victorious-gentleness-production.up.railway.app` (keep for now)
   - Custom domain: `https://parctongosse.com` (new)
   - WWW subdomain: `https://www.parctongosse.com` (if you set it up)

2. **Backend supports multiple origins**:
   - The code splits by comma: `.split(',')`
   - Each origin is trimmed and validated
   - All listed origins are allowed

3. **Smooth transition**:
   - Keep Railway URL working during setup
   - Both domains work simultaneously
   - You can remove Railway URL later if desired

## How to Update in Railway

1. **Go to Railway Dashboard**
   - Select your **Backend Service** (not frontend)
   - Go to **Settings** → **Variables**

2. **Find `CORS_ORIGIN` variable**
   - Click to edit

3. **Update the value**:
   ```
   https://victorious-gentleness-production.up.railway.app,https://parctongosse.com,https://www.parctongosse.com
   ```

4. **Save**
   - Railway will automatically redeploy the backend
   - Wait for deployment to complete

## Format

- **Separate with commas**: `origin1,origin2,origin3`
- **No spaces needed** (but spaces are trimmed automatically)
- **Include protocol**: `https://` (required)
- **No trailing slashes**: Backend removes them automatically

## Example Values

### Minimal (just custom domain):
```
https://parctongosse.com
```

### Recommended (both domains):
```
https://victorious-gentleness-production.up.railway.app,https://parctongosse.com,https://www.parctongosse.com
```

### With localhost for development:
```
http://localhost:5173,https://victorious-gentleness-production.up.railway.app,https://parctongosse.com,https://www.parctongosse.com
```

## Verification

After updating, check backend logs:
- Should see: `✅ CORS configured for origins: https://victorious-gentleness-production.up.railway.app, https://parctongosse.com, https://www.parctongosse.com`
- Test both domains - API calls should work from both

## Important Notes

- ✅ **Add comma-separated values** - Backend supports multiple origins
- ✅ **Keep Railway URL** - Both domains will work
- ✅ **Include www if configured** - Add `https://www.parctongosse.com` if you set up www subdomain
- ⚠️ **No trailing slashes** - Backend removes them automatically
- ⚠️ **Include https://** - Required for production

## After Custom Domain is Working

Once `parctongosse.com` is fully working and you've tested everything:
- You can optionally remove the Railway URL from CORS_ORIGIN
- But keeping it doesn't hurt - both will continue to work

