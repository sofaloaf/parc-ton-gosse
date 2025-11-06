# Map View Troubleshooting

## Current Status

✅ **Map component created**  
✅ **Multi-line address support** - Handles addresses separated by newlines  
✅ **Multi-marker support** - One marker per address line  
✅ **Geocoding** - Neighborhood-based coordinates  
✅ **Debug logging** - Console logs for debugging  

## Quick Debug Steps

### 1. Check Browser Console

Open browser console (F12) and look for:

```
MapViewSimple: Received activities: X activities
MapViewSimple: Initializing map
MapViewSimple: Adding markers for X activities
MapViewSimple: Processing activity: activity-X <address>
MapViewSimple: Split into X addresses
MapViewSimple: Geocoded address to: [lat, lng]
MapViewSimple: Created X markers
```

### 2. Check Map Container

- Is the map container visible? (should be 600px tall)
- Is Leaflet CSS loading? (check Network tab)
- Is Leaflet JS loading? (check Network tab)

### 3. Check Address Data

Your data has 131 activities. How many have addresses?

```bash
curl http://localhost:4000/api/activities | python3 -c "
import sys, json
data = json.load(sys.stdin)
with_addresse = [a for a in data if a.get('addresse')]
print(f'Activities with addresses: {len(with_addresse)}/{len(data)}')
for i, a in enumerate(with_addresse[:5]):
    print(f'{i+1}. {a.get(\"id\")}: {a.get(\"addresse\", \"\")[:100]}')
"
```

### 4. Check Neighborhood Geocoding

Your addresses include neighborhoods like "8e", "75008", "5e" - these should be detected.

## Current Implementation

### Address Splitting
```javascript
function splitAddresses(addressStr) {
  return addressStr.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}
```

### Example Address
```
Cours du Samedi: Gymnase ROQUEPINE, 8e - 18, rue Roquépine, métro SAINT AUGUSTIN - 75008
Cours du dimanche: JARDIN DU LUXEMBOURG, terrasse des Reines de France, à l'angle sud ouest du Sénat - 75005, 75006.
```

Should create 2 markers:
1. Near 8e arrondissement
2. Near 5e arrondissement

## Common Issues

### Map Doesn't Load
- **Issue:** Leaflet CDN not loading
- **Fix:** Check internet connection, try different CDN

### Map Loads But No Markers
- **Issue:** Addresses not detected or geocoding failing
- **Debug:** Check console logs for "Processing activity" messages

### Markers in Wrong Location
- **Issue:** Approximate geocoding (by arrondissement)
- **Note:** This is expected - exact geocoding requires Google Geocoding API

## Testing

Run this to see which activities will get markers:

```bash
curl http://localhost:4000/api/activities | python3 -c "
import sys, json
data = json.load(sys.stdin)

neighborhoods = {
    '1er': [48.8606, 2.3376], '8e': [48.8708, 2.3188],
    '5e': [48.8449, 2.3437], '7e': [48.8566, 2.3192],
    '11e': [48.8630, 2.3706], '12e': [48.8449, 2.3706]
}

for activity in data:
    address = activity.get('addresse', '')
    if address:
        addrs = [line.strip() for line in address.split('\n') if line.strip()]
        print(f'{activity.get(\"id\")}: {len(addrs)} locations')
        for addr in addrs:
            found = None
            for key, coords in neighborhoods.items():
                if key in addr:
                    found = key
                    break
            print(f'  - {addr[:60]}... -> {found or \"Paris center\"}')
"
```

## What to Report

If map still doesn't work, please share:

1. **Browser console output** (F12 console tab)
2. **Network errors** (if any in F12 Network tab)
3. **Number of activities** showing on the page
4. **Any error messages** in red

This will help pinpoint the exact issue!

