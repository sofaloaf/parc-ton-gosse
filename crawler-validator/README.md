# Data Crawler & Validator

This is a **separate, isolated environment** for developing and testing the data crawler and validator system.

## 🎯 Purpose

- Crawl and collect activity data from various sources
- Validate and normalize activity data
- Test data processing without affecting the main website
- Prepare data for import into Google Sheets

## 🚀 Getting Started

### Install Dependencies

```bash
cd crawler-validator
npm install
```

### Configuration

Create a `.env` file:

```env
# Google Sheets (for testing/validation output)
GS_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GS_PRIVATE_KEY_BASE64=your-base64-encoded-private-key
GS_SANDBOX_SHEET_ID=1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A

# Optional: API keys for external services
GOOGLE_MAPS_API_KEY=your-api-key
```

### Run

```bash
# Development mode (with watch)
npm run dev

# Run crawler
npm run crawl

# Run validator
npm run validate

# Run both
npm start
```

## 📁 Structure

```
crawler-validator/
├── src/
│   ├── crawler/          # Web scraping and data collection
│   ├── validator/        # Data validation and normalization
│   ├── utils/            # Shared utilities
│   └── index.js          # Main entry point
├── tests/                # Test files
├── output/               # Generated data files (gitignored)
├── .env                  # Environment variables (gitignored)
├── package.json
└── README.md
```

## 🔒 Isolation

- **No dependencies on website code** - Completely independent
- **Separate package.json** - Own dependencies
- **Separate .env** - Own configuration
- **Output directory** - All generated files stay here
- **Gitignored** - Won't affect main repo until integrated

## 📝 Notes

- This directory is completely isolated from the main website
- Changes here will NOT affect the production website
- When ready, we can integrate the crawler/validator into the main system
- All output files are in `output/` directory (gitignored)

