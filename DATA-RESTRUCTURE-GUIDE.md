# Data Restructuring Guide for Google Sheets

## Current Problem

The `Addresse` column contains **mixed information**:
- Street addresses
- Different addresses for different days
- Neighborhood/arrondissement info
- Pricing information
- Schedule details

This makes it confusing for users viewing the table.

---

## Solution: Split into 3 Columns

### New Column Structure

Add **two new columns** to your Google Sheet while keeping the old one (for backward compatibility):

| Column Name | Purpose | Example | Shown on Site? |
|-------------|---------|---------|----------------|
| **`Addresses`** | Just addresses, comma-separated | `18 rue Roquépine, 75008 Paris, 25 rue de la Bidassoa, 75020 Paris` | ✅ Yes |
| **`Neighborhood`** | Main arrondissement | `8e, 20e` | ✅ Yes |
| **`Addresse`** (old) | Keep original detailed data | (All the mixed info) | ❌ No (hidden) |

---

## How to Restructure Your Data

### Step 1: Add New Columns

In your Google Sheet, add two columns **before** the `Addresse` column:

1. **Add `Addresses` column** - Clean street addresses only
2. **Add `Location Details`** column - Keep original detailed info

### Step 2: Fill in the Data

#### For `Addresses` column:
Extract **only street addresses** from your `Addresse` field:
- Remove: "Cours du Samedi:", "Autres locations:", etc.
- Remove: Schedule times and days
- Remove: Pricing info
- Keep: Street addresses
- Separate multiple addresses with **commas**

**Example transformation:**

**Old `Addresse`:**
```
Cours du Samedi: Gymnase ROQUEPINE, 8e - 18, rue Roquépine, métro SAINT AUGUSTIN - 75008
Cours du dimanche: JARDIN DU LUXEMBOURG, terrasse des Reines de France - 75005, 75006.
Autres locations: Gymnases Bretonneau, Louis Lumière et Roquepine
```

**New `Addresses`:**
```
18 rue Roquépine, 75008 Paris, Jardin du Luxembourg, 75006 Paris, Gymnase Bretonneau
```

#### For `Neighborhood` column:
Extract arrondissement numbers:
- Just the arrondissement: `8e`, `20e`, `5e`, etc.
- Multiple arrondissements: `8e, 20e, 5e`
- If only addresses but no explicit arrondissement, leave blank

**Example:**
```
8e, 6e
```

#### For `Location Details` (NEW):
Copy your **entire original `Addresse` field** here:
- Keep all the schedule info
- Keep all the details
- This column won't be shown on the site
- Kept for reference only

---

## Column Mapping Configuration

The application will automatically map these column names:

### Addresses Column
Will detect:
- `addresses`, `Addresses`, `Adresses`, `locations`

### Neighborhood Column  
Will detect:
- `neighborhood`, `Neighborhood`, `Quartier`, `Area`

### Location Details Column
Will detect:
- `locationDetails`, `location_details`, `Location Details`, `Détails Lieu`, `schedule_info`

---

## Example Restructured Row

| id | Title EN | ... | Addresses | Neighborhood | Location Details | Addresse (old) |
|----|----------|-----|-----------|--------------|------------------|----------------|
| activity-1 | Académie France Wu Tang | ... | `18 rue Roquépine, 75008 Paris, Jardin du Luxembourg, 75006 Paris` | `8e, 6e` | `Cours du Samedi: Gymnase ROQUEPINE, 8e...` | (original) |

---

## Backward Compatibility

**Important:** The old `Addresse` column will still work!

- If you have only `Addresse` - it will be used
- If you have `Addresses` - it takes priority
- Both columns can exist simultaneously

---

## Frontend Changes

### Table View
**Will show:**
- `Addresses` column (clean, comma-separated)
- `Neighborhood` column

**Will NOT show:**
- `Addresse` (old column)
- `Location Details` (backend only)

### Map View
**Will use:**
- `Addresses` for geocoding (splits by comma)
- Falls back to `Addresse` if `Addresses` is empty
- Uses `Neighborhood` as backup for geocoding

### Card View
**Will show:**
- `Addresses` (if available)
- `Neighborhood`

---

## Quick Start Migration

### Option 1: Gradual Migration
1. Add new `Addresses` column
2. Fill it row by row as you have time
3. Old data continues working
4. New data uses clean format

### Option 2: Full Migration
1. Export current `Addresse` column
2. Parse and clean it (can use a script)
3. Fill new columns
4. Hide old `Addresse` column in Google Sheets

---

## Testing

After restructuring:

1. **Restart backend server**
2. **Refresh browser**
3. **Check table view** - should show clean `Addresses` column
4. **Check map** - should geocode from `Addresses`
5. **Check filters** - neighborhood filter uses `Neighborhood` column

---

## Data Quality Tips

### For Addresses Column
✅ **DO:**
- Include street number and name
- Include postal code
- Separate with commas
- Be consistent

❌ **DON'T:**
- Include "Cours du...", "Autres locations:", etc.
- Include schedule times
- Include days of week
- Mix in other info

### For Neighborhood Column
✅ **DO:**
- Use format: `8e`, `20e`
- Separate multiple with: `8e, 20e`
- Be consistent

❌ **DON'T:**
- Mix formats (`8e` vs `75008`)
- Include extra text

---

## Current Backend Configuration

The application is **ready** to use the new structure:

```javascript
'addresses': ['addresses', 'Addresses', 'Adresses', 'locations'],
'neighborhood': ['neighborhood', 'Neighborhood', 'Quartier', 'Area'],
'locationDetails': ['locationDetails', 'location_details', 'Location Details', 'Détails Lieu', 'schedule_info']
```

---

**Questions?** Check `server/services/datastore/sheets-enhanced.js` for full mapping configuration.

**Ready to migrate?** Start by adding the new columns to your Google Sheet!

