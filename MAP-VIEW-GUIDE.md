# 🗺️ Map View Quick Guide

## How to Use

1. **Install dependencies** (one-time setup):
   ```bash
   cd client
   npm install
   ```

2. **Open the app**: http://localhost:5173

3. **Click "🗺️ Map" button** (or "🗺️ Carte" in French)

4. **See activities on the map**:
   - Blue markers show activity locations
   - Markers cluster when close together
   - Click any marker to see details

---

## Features

✅ **Interactive map** - Zoom, pan, explore  
✅ **Address-based** - Uses addresses from Google Sheets  
✅ **Neighborhood geocoding** - Maps Paris arrondissements  
✅ **Clickable markers** - Opens activity details  
✅ **Info popups** - Shows title, description, address  
✅ **Auto-zoom** - Fits all activities on screen  
✅ **Bilingual** - "Map" / "Carte"  

---

## Address Data

The map reads addresses from your `addresse` column in Google Sheets.

**Example addresses:**
- "Gymnase ROQUEPINE, 8e - 18, rue Roquépine"
- "JARDIN DU LUXEMBOURG, terrasse des Reines de France"

**Neighborhoods detected:**
- Paris 1er - 20e arrondissements
- Recognizes: "8e", "16e", "5e", etc.
- Falls back to Paris center if not found

---

## Three Ways to Browse

| View | Description | Best For |
|------|-------------|----------|
| 🔲 Cards | Grid with images | Visual browsing |
| 📊 Table | Sortable data | Data comparison |
| 🗺️ Map | Geographic view | Location-based search |

---

## Troubleshooting

### Map not loading?
- Check browser console (F12) for errors
- Verify Leaflet CSS/JS loaded
- Check CDN connectivity

### No markers showing?
- Verify activities have `addresse` field filled
- Check address format matches expected patterns
- Look for "No addresses found" message

### Markers in wrong location?
- Currently uses approximate neighborhood coordinates
- Full address geocoding can be added later

---

**Ready to explore your activities on the map!** 🎉

