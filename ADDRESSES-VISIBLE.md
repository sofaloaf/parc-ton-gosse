# ✅ Addresses Now Visible in Table and Cards!

## What Was Fixed

1. **Table View** - Removed limit on columns, addresses now show
2. **Card View** - Added address display with location icon

---

## Table View Changes

### Before
- Columns stopped after `registrationLink`
- Address field hidden
- Only first few columns visible

### After
- ✅ All columns from Google Sheets displayed
- ✅ Address field shows in table
- ✅ Still horizontally scrollable

---

## Card View Changes

### Added
- 📍 Address display with icon
- First line of address shown
- Truncated to 100 characters if long

### Display Format
```
Title
Description...
📍 123 Rue Example, Paris 75001
1500€
View →
```

---

## Address Handling

### Both Views Support:
- `addresses` field (new format, comma-separated)
- `addresse` field (old format, newline-separated)
- Backward compatible

### Table View:
- Shows full address column
- Sorts by address
- Truncated if long (100 chars)

### Card View:
- Shows first address line
- Location icon 📍
- Truncated to 100 chars

---

**Status:** ✅ Addresses visible in both table and cards!

**Refresh browser to see addresses!** 📍📊

