# Test Guide: Crawl 20th Arrondissement (20e)

This guide explains how to test the arrondissement crawler specifically for the 20th arrondissement of Paris and compare the results with existing manually extracted activities.

## Prerequisites

1. **Server must be running:**
   ```bash
   cd server
   npm run dev
   ```

2. **Environment variables set:**
   - `GS_SERVICE_ACCOUNT` - Google Sheets service account
   - `GS_PRIVATE_KEY_BASE64` or `GS_PRIVATE_KEY` - Private key
   - `GS_SHEET_ID` - Google Sheet ID
   - `ADMIN_PASSWORD` - Admin password (for script method)

## Method 1: Using Admin Panel (Recommended - Easiest)

1. **Start the server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Start the frontend:**
   ```bash
   cd client
   npm run dev
   ```

3. **Open admin panel:**
   - Go to: http://localhost:5173/admin
   - Log in as admin

4. **Run the crawler:**
   - Scroll to "Arrondissement Crawler" section
   - Click "Run Crawler for 20e" button
   - Wait for completion (may take several minutes)

5. **View results:**
   - Results will be saved to a new tab: `Pending - YYYY-MM-DD - Arrondissement Crawler`
   - Check the summary displayed in the admin panel

## Method 2: Using Test Script

1. **Set admin password:**
   ```bash
   export ADMIN_PASSWORD=your_admin_password
   ```
   
   Or add to `server/.env`:
   ```
   ADMIN_PASSWORD=your_admin_password
   ```

2. **Make sure server is running:**
   ```bash
   cd server
   npm run dev
   ```

3. **Run the test script:**
   ```bash
   node test-20e-direct.js
   ```

## What the Crawler Does

1. **Searches mairie website:**
   - Visits: `https://mairie20.paris.fr/recherche/activites?arrondissements=75020`
   - Extracts activity links and organization information

2. **Extracts organization data:**
   - Organization name
   - Website URL
   - Email address
   - Phone number
   - Physical address

3. **Visits organization websites:**
   - Extracts activity details (title, description, price, age range, etc.)
   - Uses multiple extraction strategies (meta tags, JSON-LD, HTML patterns, regex)

4. **Saves to Google Sheets:**
   - Creates new tab: `Pending - YYYY-MM-DD - Arrondissement Crawler`
   - Saves all discovered activities with `approvalStatus: 'pending'`
   - Activities do NOT appear on website until approved

## Comparing Results

After the crawler completes:

1. **Open your Google Sheet:**
   - Find the new tab: `Pending - YYYY-MM-DD - Arrondissement Crawler`
   - This contains scraper results

2. **Open existing Activities tab:**
   - Filter by `Neighborhood = "20e"` or `Quartier = "20e"`
   - This contains manually extracted activities (1300+ total, subset for 20e)

3. **Compare and identify gaps:**
   
   **A. Missing Organizations:**
   - Check if manually extracted activities appear in scraper results
   - Note organizations found manually but not by scraper
   - Identify why (website not found, extraction failed, etc.)

   **B. Data Quality:**
   - Compare field completeness:
     - Title (EN/FR)
     - Description (EN/FR)
     - Price
     - Age range
     - Address
     - Contact info (email, phone)
     - Images
     - Categories
   - Note which fields are missing or incorrect in scraper output

   **C. Incorrect Extractions:**
   - Check for wrong data extracted
   - Note patterns (e.g., always extracting wrong price, missing descriptions)

   **D. Additional Organizations:**
   - Check if scraper found organizations not in manual list
   - These might be new or missed during manual extraction

## Creating Comparison Report

After comparison, document:

1. **Missing Organizations:**
   - List of organizations in manual list but not in scraper results
   - Reason (if known): no website, extraction failed, etc.

2. **Data Quality Issues:**
   - Fields frequently missing
   - Fields frequently incorrect
   - Patterns in extraction failures

3. **Scraper Improvements Needed:**
   - Extraction strategies to add
   - Selectors to update
   - Data validation to improve

4. **New Organizations Found:**
   - Organizations found by scraper but not in manual list
   - Verify if these are valid and should be added

## Next Steps

After identifying gaps:

1. **Update extraction strategies:**
   - Add new selectors for missing data
   - Improve regex patterns
   - Add fallback strategies

2. **Improve data validation:**
   - Add validation for extracted data
   - Flag suspicious values for review

3. **Enhance error handling:**
   - Better logging for failed extractions
   - Retry logic for transient failures

4. **Re-run test:**
   - Run crawler again after improvements
   - Compare new results with previous run
   - Measure improvement

## Troubleshooting

**Script fails with "ADMIN_PASSWORD required":**
- Set `ADMIN_PASSWORD` in environment or `server/.env`
- Or use Method 1 (Admin Panel) instead

**Script fails with "ECONNREFUSED":**
- Make sure server is running: `cd server && npm run dev`

**Crawler finds no organizations:**
- Check mairie website is accessible
- Verify postal code mapping (should be 75020 for 20e)
- Check network connectivity

**Results not saved to sheet:**
- Verify Google Sheets credentials are correct
- Check service account has access to sheet
- Check sheet ID is correct

## Files Modified

- `server/routes/arrondissementCrawler.js` - Added '20e' to ARRONDISSEMENT_TO_POSTAL mapping
- `test-20e-direct.js` - Test script for running crawler

