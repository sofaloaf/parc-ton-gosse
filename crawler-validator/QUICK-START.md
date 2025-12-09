# Quick Start Guide

## ✅ Setup Complete!

The crawler/validator environment is ready to use. All dependencies are installed and the system is working.

## 🚀 Available Commands

```bash
# Run the full pipeline (crawl + validate)
npm start

# Run crawler only
npm run crawl

# Run validator only
npm run validate

# Development mode (with auto-reload on file changes)
npm run dev
```

## 📝 Next Steps for Implementation

### 1. Implement the Crawler (`src/crawler/index.js`)

The crawler needs to:
- Collect activity data from various sources
- Extract relevant information (title, description, categories, etc.)
- Return an array of raw activity objects

Example structure for crawled activities:
```javascript
{
  title: 'Activity Name',
  description: 'Description text',
  categories: ['sports', 'music'],
  ageMin: 5,
  ageMax: 12,
  price: { amount: 100, currency: 'EUR' },
  addresses: ['123 Main St, Paris'],
  websiteLink: 'https://...',
  registrationLink: 'https://...',
  source: 'website-url',
  rawData: { ... } // Original crawled data
}
```

### 2. Configure Data Sources

Add your data sources to the crawler:
- Website URLs to scrape
- API endpoints
- CSV/JSON files to import
- Google Sheets to read from

### 3. Test Validation

The validator is already implemented and will:
- ✅ Validate required fields (title, description)
- ✅ Check data types and formats
- ✅ Validate age ranges
- ✅ Validate prices
- ✅ Validate URLs
- ✅ Normalize data to standard format

### 4. Output Files

Results are saved to `output/` directory:
- `crawled-activities.json` - Raw crawled data
- `validated-activities.json` - Validated data with errors/warnings

## 🔧 Configuration (Optional)

Create a `.env` file for Google Sheets integration:

```env
GS_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GS_PRIVATE_KEY_BASE64=your-base64-encoded-private-key
GS_SANDBOX_SHEET_ID=1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A
```

## 🎯 Current Status

- ✅ Dependencies installed
- ✅ Project structure created
- ✅ Validator implemented and working
- ✅ Crawler structure ready (needs implementation)
- ✅ Output system working
- ✅ Isolated from main website

## 📚 Files to Edit

1. **`src/crawler/index.js`** - Implement crawling logic
2. **`src/validator/index.js`** - Already implemented, can extend if needed
3. **`src/index.js`** - Main pipeline, can customize workflow

## 🚫 What Won't Affect the Website

- All changes in `crawler-validator/` directory
- All output files in `output/` directory
- Any `.env` files in this directory
- Any test data or development files

The website will continue to work normally until we explicitly integrate the crawler/validator.

