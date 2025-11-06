# Google Maps Geocoding API Setup

## What You Need

To use Google Maps Geocoding (which looks up places by name), you need:

1. **Google Cloud Project**
2. **API Key** with Geocoding enabled
3. **API Key** added to your `.env` file

---

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Create a new project (or use existing)
3. Name it "Parc Ton Gosse" or similar

### Step 2: Enable Geocoding API

1. Go to "APIs & Services" > "Library"
2. Search for "Geocoding API"
3. Click "Enable"

### Step 3: Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key

### Step 4: Restrict API Key (Optional but Recommended)

1. Click on the newly created API key
2. Under "API restrictions", select "Restrict key"
3. Choose "Geocoding API"
4. Click "Save"

### Step 5: Add to Environment

Edit `server/.env`:

```env
GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

### Step 6: Restart Server

```bash
cd server
npm install  # Installs @googlemaps/google-maps-services-js
npm run dev
```

---

## How It Works

### Without API Key (Current Behavior)
- Uses local geocoding (postal codes, neighborhoods, known locations)
- Approximate locations only
- Falls back to Paris center

### With API Key ✅
- Looks up places by name using Google Maps
- Returns exact coordinates
- Handles ambiguous addresses
- Works for locations like "Jardin du Luxembourg", "Gymnase Nakache"

---

## Example Addresses That Will Benefit

**Before (approximate):**
- "Jardin du Luxembourg" → Paris center ❌
- "Gymnase Nakache" → Paris center ❌

**After (exact):**
- "Jardin du Luxembourg, Paris" → Exact location ✅
- "Gymnase Nakache, 4-12 rue Denoyez, 75020 Paris" → Exact location ✅

---

## Cost

**Free Tier:**
- $200 credit per month
- 100,000 geocoding requests free
- More than enough for your use case!

**After Free Tier:**
- $5 per 1,000 requests
- Very affordable for small projects

---

## Testing

Once API key is added, test the geocoding:

```bash
curl -X POST http://localhost:4000/api/geocode \
  -H "Content-Type: application/json" \
  -d '{"address": "Jardin du Luxembourg", "city": "Paris, France"}'
```

Should return:
```json
{
  "lat": 48.8462,
  "lng": 2.3372,
  "formattedAddress": "Jardin du Luxembourg, 75006 Paris, France",
  "address": "Jardin du Luxembourg"
}
```

---

## Current Status

✅ **Backend API** - Ready  
✅ **Frontend integration** - Ready  
⏳ **API Key** - Needs to be added to `.env`  
⏳ **Server restart** - After adding key  

Once you add the API key, the map will show **many more accurate pins**!

---

## Troubleshooting

**"Google Maps API not configured"**
- Add `GOOGLE_MAPS_API_KEY` to `server/.env`
- Restart server

**"Geocoding failed"**
- Check API key is valid
- Verify Geocoding API is enabled
- Check API key restrictions allow Geocoding API

**Fallback still used**
- Look at console logs for errors
- API might be rate limited
- Check network requests in browser (F12)

---

**Next:** Add your Google Maps API key to see all addresses geocoded accurately!

