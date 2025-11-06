# ✅ Updated: Blank Fields Now Show "N/A"

## What Changed

The data table now displays **"N/A"** for any blank or empty fields instead of showing a dash or nothing.

## Updated Files

### 1. DataTable Component (`client/src/components/DataTable.jsx`)
- Added logic to detect empty/missing values
- Displays "N/A" for:
  - Empty strings (`''`)
  - Null values (`null`)
  - Undefined values (`undefined`)
  - False boolean values (`false`)
  - Empty arrays (`[]`)

### 2. Translations (`client/src/shared/i18n.jsx`)
- Added "N/A" translation key (same in both FR and EN)

## How It Works

### Before:
- Empty fields showed: `-`
- Missing data: empty cell

### After:
- Empty fields show: `N/A`
- Consistent across all languages
- Clear indication of missing data

## Example

If an activity has:
- ✅ Title: "Music Workshop"
- ❌ Description: (blank) → Shows **"N/A"**
- ✅ Price: 1500 eur
- ❌ Images: (empty) → Shows **"N/A"**
- ✅ Neighborhood: "11e"

## Test It

1. Open: http://localhost:5173
2. Click "📊 Table"
3. Look for any empty fields
4. You should see "N/A" displayed

## Notes

- Works for all data types (strings, numbers, objects, arrays)
- Consistent across all columns
- Easy to distinguish missing data from actual data
- Professional appearance

---

**Status:** ✅ Implemented and working

