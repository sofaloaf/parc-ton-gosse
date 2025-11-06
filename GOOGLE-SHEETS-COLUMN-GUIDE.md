# Google Sheets Column Mapping Guide

## 🎯 Dynamic Column Mapping

The application now **automatically reads column names from your Google Sheet** and maps them to the correct fields, regardless of how you name them!

## ✅ Supported Column Name Variations

### Activities Sheet

Your "Activities" sheet can use **any of these column names** for each field:

#### **Title (Title_EN, Title_FR)**
- `title`, `Title`, `Titre` → Single bilingual title object
- `title_en`, `Title EN`, `Title (English)`, `Titre Anglais` → English title
- `title_fr`, `Title FR`, `Title (French)`, `Titre Français` → French title

#### **Description**
- `description`, `Description`, `Desc` → Single bilingual description object
- `description_en`, `Description EN`, `Description (English)` → English description
- `description_fr`, `Description FR`, `Description (French)` → French description

#### **Categories**
- `categories`, `Category`, `Categories`, `Catégories`

#### **Age Range**
- `ageMin`, `age_min`, `Age Min`, `Age Minimum`, `Âge Min` → Minimum age
- `ageMax`, `age_max`, `Age Max`, `Age Maximum`, `Âge Max` → Maximum age

#### **Price**
- `price`, `Price`, `Prix` → Single price object
- `price_amount`, `price amount`, `Amount` → Just the amount
- `currency`, `Currency`, `Devise` → Currency code (default: eur)

#### **Schedule**
- `schedule`, `Schedule`, `Dates`, `Horaires` → Array of schedule objects

#### **Location**
- `neighborhood`, `Neighborhood`, `Quartier`, `Area`

#### **Images**
- `images`, `Images`, `Photos`

#### **Provider**
- `providerId`, `provider_id`, `Provider`, `Prestataire`

#### **Dates**
- `createdAt`, `created_at`, `Created At`, `Date de création`
- `updatedAt`, `updated_at`, `Updated At`, `Date de mise à jour`

---

## 📝 Example Google Sheet Layout

### Option 1: Separate EN/FR Columns (Recommended)

| id | Title EN | Title FR | Description EN | Description FR | categories | ageMin | ageMax | price | neighborhood | providerId |
|----|----------|----------|----------------|----------------|------------|--------|--------|-------|--------------|------------|
| abc123 | Music Workshop | Atelier Musique | Intro to music | Intro à la musique | music,arts | 6 | 9 | 1500 | 11e | provider-1 |
| xyz789 | Soccer Training | Entraînement Football | Weekly training | Entraînement hebdo | sports | 8 | 12 | 2000 | 16e | provider-2 |

### Option 2: JSON Objects in Single Columns

| id | title | description | categories | ageMin | ageMax | price | neighborhood |
|----|-------|-------------|------------|--------|--------|-------|--------------|
| abc123 | {"en":"Music","fr":"Musique"} | {"en":"Intro","fr":"Intro"} | music,arts | 6 | 9 | 1500 | 11e |

### Option 3: Mixed (Your Choice!)

You can use:
- French column names: `Titre`, `Description`, `Quartier`
- English column names: `Title`, `Description`, `Neighborhood`
- Short names: `Title EN`, `Desc FR`, `Neighbor`
- **ANY** combination that makes sense to you!

---

## 🔧 How It Works

1. **App reads your headers** → First row of each sheet
2. **Auto-detects field type** → Based on column name patterns
3. **Maps to internal fields** → Converts to standard names
4. **Handles data conversion** → JSON objects, arrays, numbers, booleans

### Automatic Data Type Conversion

- **JSON Objects**: If a cell starts with `{` or `[`, it's parsed as JSON
  - Example: `{"en":"Music","fr":"Musique"}` → Converts to object
- **Arrays**: Comma-separated values automatically converted
  - Example: `music,arts,sports` → `["music", "arts", "sports"]`
- **Numbers**: Automatically converted for age, price, rating fields
- **Booleans**: For waitlist, status fields
  - `true`, `1`, `yes`, `oui` → `true`
  - Everything else → `false`

---

## 🎨 Customizing Column Names

If you want to add your own column name variations, edit:
`server/services/datastore/sheets-enhanced.js`

Find the `COLUMN_MAPPINGS` object and add your variations:

```javascript
const COLUMN_MAPPINGS = {
	activities: {
		'neighborhood': [
			'neighborhood',        // English
			'Neighborhood',        // Capitalized
			'Quartier',            // French
			'Area',                // Alternative
			'Locatie'              // Dutch (add yours!)
		],
		// ... add more as needed
	}
};
```

---

## 📊 Recommended Sheet Structure

### For Bilingual Content:

**Activities Sheet:**
```
| id | Title EN | Title FR | Description EN | Description FR | Categories | Age Min | Age Max | Price | Neighborhood | Images | Provider ID | Created At |
```

**Users Sheet:**
```
| id | email | password | role | profile | createdAt |
```

**Registrations Sheet:**
```
| id | activityId | parentId | status | waitlist | form | createdAt | updatedAt |
```

**Reviews Sheet:**
```
| id | activityId | parentId | rating | comment | status | createdAt | updatedAt |
```

**i18n Sheet:**
```
| locale | key | value |
```

---

## ✅ Checklist

- [ ] First row contains headers (column names)
- [ ] Use recognizable names (Title, Description, Categories, etc.)
- [ ] Complex data (arrays/objects) stored as JSON strings
- [ ] Each row has a unique `id` column
- [ ] Currency in `eur` format for prices
- [ ] Ages as numbers (not text)
- [ ] Categories comma-separated or as JSON array

---

## 🚀 Benefits

✅ **No code changes** when you rename columns  
✅ **Flexible naming** - use French, English, or mixed  
✅ **Auto-detection** of data types  
✅ **Backward compatible** with existing data  
✅ **Easy to maintain** your Google Sheet  

The app will automatically adapt to your column names!


