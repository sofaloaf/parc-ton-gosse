# Map View Troubleshooting

## Current Status

The map should now work with **local geocoding only** (fast and reliable).

## Quick Fix

**Refresh your browser** - The changes should take effect automatically!

## If Map Still Doesn't Load

### Check Browser Console (F12)

Look for errors in:
1. Console tab
2. Network tab

### Expected Console Messages

You should see:
```
MapViewSimple: Received activities: 131 activities
MapViewSimple: Initializing map
MapViewSimple: Adding markers for 131 activities
MapViewSimple: Processing activity: activity-X ...
MapViewSimple: Split into X addresses
MapViewSimple: Geocoded: ...
MapViewSimple: Created X markers
MapViewSimple: Fitted bounds to markers
```

### Common Issues

**"Cannot read property 'addTo' of undefined"**
- Leaflet not loading
- Check Network tab for Leaflet CSS/JS

**No markers showing**
- Check address data
- Look for "Geocoded" messages in console

**Map shows but no pins**
- Many addresses may not have postal codes
- Try filtering for activities with addresses

## Test Data

Your data has:
- **131 activities** total
- **~115 with addresses**
- **Multiple addresses per activity** (2-6 locations each)

## Current Geocoding

Using **local geocoding** which detects:
✅ Postal codes (75001-75020)
✅ Neighborhoods (8e, 20e, etc.)
✅ Known locations (Jussieu, Luxembourg, etc.)
⚠️ Falls back to Paris center if not found

## Switching to Google Geocoding

If you want exact locations:
1. Add `GOOGLE_MAPS_API_KEY` to `server/.env`
2. Uncomment the Google API code in MapViewSimple.jsx
3. Restart server

See `GOOGLE-GEOCODING-SETUP.md` for details.

---

**Please try refreshing the browser and let me know what you see!**

