# Data Table Feature

## 📊 Overview

The Browse page now includes a **powerful data table** that displays all activities from your Google Sheet in a sortable, filterable, and navigable format!

## ✨ Features

### 1. **Dual View Modes**
- **Cards View** (🔲): Traditional card-based grid layout
- **Table View** (📊): Comprehensive data table with all fields

### 2. **Sorting**
- Click any column header to sort by that field
- Click again to reverse sort direction (↑ ↓)
- Works with:
  - Text fields (alphabetical)
  - Numbers (numerical)
  - Nested objects (title, description)

### 3. **Pagination**
- **Items per page**: Choose 5, 10, 25, 50, or 100 rows
- **Previous/Next**: Navigate between pages
- **Page numbers**: Click specific page numbers
- **Page indicator**: Shows "Showing X-Y of Z"

### 4. **Smart Data Display**
- **Bilingual fields**: Automatically shows content in selected language
- **Arrays**: Comma-separated display (e.g., "music, arts")
- **Objects**: Formatted display (e.g., "1500 eur")
- **Long text**: Truncated with "..." for descriptions
- **Empty fields**: Display "-" for missing data

### 5. **Actions**
- **View button**: Click to see full activity details
- **Hover effect**: Rows highlight on hover
- **Responsive**: Works on mobile and desktop

## 🎯 Dynamic Column Detection

The table **automatically detects all columns** from your Google Sheet!

### Supported Columns
- ✅ All fields from your Google Sheet
- ✅ Automatically mapped via enhanced Sheets integration
- ✅ Bilingual fields (title_en, title_fr, etc.)
- ✅ Nested objects (price, schedule, etc.)
- ✅ Arrays (categories, images, etc.)

### Custom Column Names
Works with any column name variations:
- `Title EN`, `Title (English)`, `Titre Anglais`
- `Description FR`, `Description (French)`, `Description Français`
- `Price`, `Prix`, `Amount`, `Montant`
- And many more! (See GOOGLE-SHEETS-COLUMN-GUIDE.md)

## 📱 Usage

### Switching Views
1. Open the Browse page (homepage)
2. Click **"🔲 Cards"** for card view
3. Click **"📊 Table"** for table view

### Sorting Data
1. Click any column header
2. First click: Sort ascending (↑)
3. Second click: Sort descending (↓)
4. Third click: Remove sort

### Pagination
1. Use dropdown to select items per page
2. Click page numbers to navigate
3. Use Previous/Next buttons

### Viewing Details
1. Click "View" button on any row
2. Opens full activity detail page
3. Can register/book from there

## 🔍 Integration with Filters

The table works seamlessly with existing filters:
- **Search bar**: Filters table rows
- **Category filter**: Shows only selected category
- **Age range**: Filters by min/max age
- **Price range**: Filters by price
- **Neighborhood**: Filters by location
- **All filters**: Combine multiple filters

## 🌐 Bilingual Support

- **Column headers**: Translated (French/English)
- **Data content**: Shows in selected language
- **Buttons**: Previous/Next translated
- **Status messages**: All localized

## 📋 Table Structure

### Displayed Columns
Depends on your Google Sheet, but typically shows:
- ID
- Title (EN/FR)
- Description (EN/FR)
- Categories
- Age Range (Min/Max)
- Price
- Neighborhood
- Provider ID
- Created Date
- Actions

### Hidden by Default
Some fields may not display:
- Very long arrays (images, schedule)
- Internal IDs
- Technical fields

### Customization
You can customize which columns appear by editing your Google Sheet headers.

## 🎨 Styling

- **Clean borders**: Professional table appearance
- **Responsive**: Horizontal scroll on mobile
- **Hover effects**: Visual feedback
- **Color coding**: Active filters highlighted
- **Mobile-friendly**: Touch-optimized

## 🔧 Technical Details

### Component: `DataTable.jsx`
- File: `client/src/components/DataTable.jsx`
- Props: `activities` (array), `locale` (string)
- Features: Sorting, pagination, column detection

### Integration: `Browse.jsx`
- File: `client/src/pages/Browse.jsx`
- Two view modes with toggle
- Shared filter/search logic

### Data Source
- Reads from `/api/activities` endpoint
- Supports all filters from search/filters
- Real-time updates from Google Sheets

## 🚀 Benefits

✅ **Better browsing**: See all data at once  
✅ **Faster sorting**: Find activities quickly  
✅ **Professional look**: Enterprise-grade table  
✅ **Mobile responsive**: Works on all devices  
✅ **SEO friendly**: Search engines can index data  
✅ **Export ready**: Easy to export to CSV/Excel  

## 📊 Example Use Cases

1. **Administrators**: Quickly review all activities
2. **Providers**: Track multiple listings
3. **Parents**: Compare activities side-by-side
4. **Analysts**: Export data for reporting

## 🎯 Next Steps

Possible enhancements:
- Export to CSV button
- Column visibility toggle
- Advanced filters
- Bulk actions
- Print view

---

**The table automatically adapts to your Google Sheet structure!**

