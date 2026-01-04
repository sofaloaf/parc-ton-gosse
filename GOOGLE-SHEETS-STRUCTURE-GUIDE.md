# Google Sheets Structure Guide

## 📋 Overview

This guide explains the standardized structure for Google Sheets data storage, including tab naming conventions, column organization, and data formatting.

---

## 🏷️ Tab Naming Convention

### Standard Format
```
{Type} - {Date} - {Source}
```

### Tab Types

#### 1. **Main Activities Sheet**
- **Name**: `Activities`
- **Purpose**: Primary sheet containing all approved activities
- **Format**: Always named "Activities" (no date/source)

#### 2. **Validated Sheets** (Data Validator Crawler)
- **Format**: `Validated - YYYY-MM-DD - Crawler`
- **Example**: `Validated - 2025-12-01 - Crawler`
- **Purpose**: Validated/updated activities from the data validator crawler
- **When Created**: After running "Run Data Validator"

#### 3. **Pending Sheets** (Arrondissement Crawler)
- **Format**: `Pending - YYYY-MM-DD - Arrondissement Crawler`
- **Example**: `Pending - 2025-12-01 - Arrondissement Crawler`
- **Purpose**: Activities found by arrondissement crawler awaiting approval
- **When Created**: After running "Search All Arrondissements"
- **Note**: If multiple crawls on same day, timestamp suffix added: `Pending - 2025-12-01 - Arrondissement Crawler (14-30-45)`

#### 4. **Archive Sheets** (Future Use)
- **Format**: `Archive - YYYY-MM-DD - {Source}`
- **Purpose**: Archived/old versions of data

---

## 📊 Column Structure

### Standard Column Order

All activity sheets use this standardized column order for consistency:

1. **Identification**
   - `ID` - Unique identifier

2. **Basic Info (Bilingual)**
   - `Title (English)` - English title
   - `Title (French)` - French title
   - `Description (English)` - English description
   - `Description (French)` - French description

3. **Classification**
   - `Categories` - Activity categories (comma-separated)
   - `Activity Type` - Type of activity
   - `Min Age` - Minimum age
   - `Max Age` - Maximum age

4. **Pricing**
   - `Price (€)` - Price amount
   - `Currency` - Currency code (EUR, USD, etc.)

5. **Location**
   - `Neighborhood` - Arrondissement/neighborhood
   - `Addresses` - Physical addresses

6. **Contact**
   - `Contact Email` - Contact email address
   - `Contact Phone` - Contact phone number

7. **Links**
   - `Website Link` - Organization website
   - `Registration Link` - Registration URL

8. **Availability**
   - `Available Days` - Days of week available
   - `Available Dates` - Specific dates available

9. **Media**
   - `Images` - Image URLs or count

10. **Additional**
    - `Adults Allowed` - Yes/No
    - `Additional Notes` - Extra information

11. **Approval & Tracking**
    - `Approval Status` - pending/approved/rejected
    - `Crawled At` - When activity was crawled
    - `Provider ID` - Provider identifier

12. **Timestamps**
    - `Created At` - Creation timestamp
    - `Updated At` - Last update timestamp

---

## 📝 Data Formatting

### Human-Readable Formats

Data is formatted for easy reading in Google Sheets:

#### Categories
- **Stored As**: `Sport, Music, Arts` (comma-separated, capitalized)
- **Not**: `["sport", "music", "arts"]` (JSON array)

#### Bilingual Fields
- **Stored As**: Separate columns
  - `Title (English)`: "Music Workshop"
  - `Title (French)`: "Atelier Musique"
- **Not**: `{"en":"Music Workshop","fr":"Atelier Musique"}` (JSON object)

#### Price
- **Stored As**: Two columns
  - `Price (€)`: `1500`
  - `Currency`: `EUR`
- **Not**: `{"amount":1500,"currency":"EUR"}` (JSON object)

#### Images
- **Stored As**: 
  - Single image: Full URL
  - Multiple images: `3 images (first: https://example.com/image1.jpg)`

#### Arrays/Lists
- **Stored As**: Comma-separated values
  - `Monday, Wednesday, Friday`
- **Not**: `["Monday", "Wednesday", "Friday"]` (JSON array)

#### Booleans
- **Stored As**: `Yes` or `No`
- **Not**: `true`/`false` or `1`/`0`

---

## 🔄 Data Flow

### 1. Main Activities Sheet
- **Location**: `Activities` tab
- **Content**: All approved activities
- **Format**: Standardized columns with human-readable data
- **Updates**: 
  - When activities are approved from pending sheets
  - When data validator updates existing activities

### 2. Data Validator Crawler
- **Process**:
  1. Reads from `Activities` sheet
  2. Crawls organization websites
  3. Updates/validates data
  4. Creates new `Validated - YYYY-MM-DD - Crawler` sheet
  5. Does NOT automatically update main `Activities` sheet (manual review required)

### 3. Arrondissement Crawler
- **Process**:
  1. Searches mairie websites for new activities
  2. Extracts organization data
  3. Creates `Pending - YYYY-MM-DD - Arrondissement Crawler` sheet
  4. Saves to datastore with `approvalStatus: 'pending'`
  5. Activities appear in admin panel for approval
  6. When approved, should be added to main `Activities` sheet

---

## ✅ Best Practices

### Tab Management
1. **Keep Main Sheet Clean**: Only approved activities in `Activities` tab
2. **Review Validated Sheets**: Check validated sheets before updating main sheet
3. **Archive Old Sheets**: Move old validated/pending sheets to archive after processing
4. **Clear Naming**: Use standardized naming for easy identification

### Data Entry
1. **Use Standard Columns**: Always use the standard column order
2. **Human-Readable**: Format data for human reading, not CSV optimization
3. **Bilingual**: Always fill both English and French columns
4. **Complete Data**: Fill as many fields as possible

### Version Control
1. **Date-Based**: All sheets include date for easy sorting
2. **Source Tracking**: Source identifier shows where data came from
3. **No Overwrites**: New sheets created instead of overwriting
4. **Clear History**: Easy to see data evolution over time

---

## 🔍 Finding the Right Sheet

### Which Sheet to Use?

- **Current Production Data**: `Activities` tab
- **Latest Validated Data**: Look for most recent `Validated - YYYY-MM-DD - Crawler` sheet
- **Pending Approvals**: Look for most recent `Pending - YYYY-MM-DD - Arrondissement Crawler` sheet
- **Historical Data**: Check archive sheets or older validated sheets

### Sorting Sheets
Sheets are automatically sorted by:
1. Type (Activities, Validated, Pending, Archive)
2. Date (newest first)
3. Source (if multiple on same date)

---

## 🛠️ Technical Details

### Column Mapping
The system automatically maps various column name variations to standard fields:
- `Title EN`, `Title (English)`, `title_en` → `Title (English)`
- `Categories`, `Category`, `Catégories` → `Categories`
- `Age Min`, `age_min`, `Âge Min` → `Min Age`

### Data Conversion
- **Reading**: Converts human-readable format back to app format
- **Writing**: Converts app format to human-readable format
- **Automatic**: No manual conversion needed

### Backward Compatibility
The system still supports:
- Old column names (auto-mapped)
- JSON objects in cells (auto-parsed)
- Mixed formats (auto-converted)

---

## 📚 Examples

### Example: Validated Sheet
```
Tab Name: Validated - 2025-12-01 - Crawler

Columns:
ID | Title (English) | Title (French) | Categories | Min Age | Max Age | Price (€) | Currency | ...
abc123 | Music Workshop | Atelier Musique | Music, Arts | 6 | 9 | 1500 | EUR | ...
```

### Example: Pending Sheet
```
Tab Name: Pending - 2025-12-01 - Arrondissement Crawler

Columns:
ID | Title (English) | Title (French) | Categories | Approval Status | Crawled At | ...
xyz789 | Soccer Club | Club de Football | Sport | pending | 2025-12-01T14:30:00Z | ...
```

---

## 🎯 Summary

- ✅ **Clear Tab Names**: `Type - Date - Source` format
- ✅ **Standardized Columns**: Consistent order across all sheets
- ✅ **Human-Readable**: No JSON, no CSV-optimized formats
- ✅ **Bilingual Support**: Separate EN/FR columns
- ✅ **Version Tracking**: Date-based naming for easy sorting
- ✅ **Source Tracking**: Know where data came from

This structure makes it easy to:
- Find the right data
- Understand what you're looking at
- Track data changes over time
- Maintain clean, organized sheets




