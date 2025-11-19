# Data Validator/Crawler Documentation

## Overview

The Data Validator/Crawler automatically validates and updates activity data by:
1. Reading all activities from the master Google Sheets "Activities" tab
2. Visiting each activity's website (from "lien du site" column)
3. Extracting and validating data from the website
4. Creating a new versioned sheet tab with updated data
5. Updating references in the master sheet to point to the new validated data

## Features

### Data Extraction Strategies

The crawler uses multiple strategies to extract data:

1. **Meta Tags**: Extracts title, description from Open Graph and Twitter Card meta tags
2. **Structured Data (JSON-LD)**: Parses Schema.org structured data for rich information
3. **HTML Patterns**: Uses common HTML patterns (h1, .title, .description, etc.)
4. **Regex Patterns**: Extracts prices, age ranges, addresses, phone numbers, emails using regex
5. **Image Extraction**: Finds and extracts relevant images from the page

### Data Fields Validated

- **Title**: Activity name/title
- **Description**: Activity description
- **Price**: Price in euros
- **Age Range**: Age range (e.g., "6-12 ans")
- **Address**: Physical address
- **Phone**: Contact phone number
- **Email**: Contact email
- **Images**: Activity images (up to 5)
- **Categories**: Activity categories (sport, musique, arts, etc.)

### Versioning System

- Each validation run creates a new sheet tab
- Format: `v{timestamp}_{date}`
- Example: `v1701234567890_2024-11-30`
- Old versions are preserved for history
- Master sheet is updated to reference the latest validated version

## API Endpoints

### POST `/api/crawler/validate`

Starts the validation/crawling process.

**Authentication**: Admin only

**Request Body**: None (reads from Google Sheets)

**Response**:
```json
{
  "success": true,
  "sheetName": "v1701234567890_2024-11-30",
  "summary": {
    "total": 50,
    "successful": 45,
    "errors": 3,
    "skipped": 2,
    "totalChanges": 120
  },
  "results": [
    {
      "row": 2,
      "url": "https://example.com/activity",
      "status": "success",
      "changes": 3,
      "changesList": [
        "Title: Old Title → New Title",
        "Price: 100 → 150",
        "Description: Updated"
      ]
    }
  ],
  "message": "Created new sheet \"v1701234567890_2024-11-30\" with 45 validated activities"
}
```

**Status Codes**:
- `200`: Success
- `400`: Bad request (missing configuration or no activities found)
- `401`: Unauthorized
- `403`: Forbidden (not admin)
- `500`: Server error

### GET `/api/crawler/status`

Gets the status and history of validation runs.

**Authentication**: Admin only

**Response**:
```json
{
  "versionedSheets": [
    {
      "name": "v1701234567890_2024-11-30",
      "sheetId": 1234567890,
      "index": 5
    },
    {
      "name": "v1701234500000_2024-11-29",
      "sheetId": 1234567889,
      "index": 4
    }
  ],
  "total": 2
}
```

## Usage

### Running the Crawler

1. **Via API** (Recommended):
   ```bash
   curl -X POST https://your-backend.com/api/crawler/validate \
     -H "Cookie: token=your-admin-token"
   ```

2. **Via Admin Panel** (Future):
   - Add a button in the admin panel to trigger validation
   - Show progress and results

### Configuration

The crawler uses the same Google Sheets configuration as the main app:

```env
GS_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GS_PRIVATE_KEY_BASE64=base64-encoded-private-key
GS_SHEET_ID=your-google-sheet-id
```

### Column Requirements

The master "Activities" sheet must have:
- A column containing website URLs (looks for: "lien", "site", "url", or "website" in column name)
- Other columns for activity data (title, description, price, etc.)

### Rate Limiting

- 1 second delay between website requests
- 10 second timeout per website
- Handles errors gracefully (continues with next activity)

## Data Merging Logic

The crawler compares existing data with crawled data:

1. **If crawled data exists and differs**: Updates the field
2. **If crawled data is missing**: Keeps existing data
3. **Tracks all changes**: Logs what was changed for audit trail

## Error Handling

- **Invalid URLs**: Skipped, original data preserved
- **HTTP Errors**: Logged, original data preserved
- **Timeout**: Logged, original data preserved
- **Parse Errors**: Logged, original data preserved

All errors are included in the response for review.

## Best Practices

1. **Run during off-peak hours**: Crawling can take time for many activities
2. **Review results**: Check the summary and sample results before using
3. **Keep old versions**: Don't delete old validated sheets (they're versioned)
4. **Manual review**: Some data may need manual correction
5. **Regular runs**: Run periodically to keep data up-to-date

## Limitations

1. **JavaScript-heavy sites**: May not extract data from SPAs (Single Page Applications)
2. **Login-required sites**: Cannot access content behind authentication
3. **Rate limiting**: Some sites may block rapid requests
4. **Data format variations**: Different sites structure data differently
5. **Language**: Currently optimized for French websites (can be extended)

## Future Enhancements

- [ ] Support for JavaScript rendering (Puppeteer/Playwright)
- [ ] Multi-language support
- [ ] Custom extraction rules per website
- [ ] Scheduled automatic runs
- [ ] Email notifications on completion
- [ ] Diff view showing changes
- [ ] Rollback to previous versions
- [ ] Batch processing with progress tracking

## Troubleshooting

### "Website link column not found"
- Ensure your Activities sheet has a column with "lien", "site", "url", or "website" in the name
- Check that the column contains actual URLs (starting with http:// or https://)

### "No activities found"
- Check that the Activities sheet has data
- Verify GS_SHEET_ID is correct

### "Crawler failed"
- Check Google Sheets API credentials
- Verify service account has access to the sheet
- Check server logs for detailed error messages

### "Many errors/timeouts"
- Some websites may be slow or blocking requests
- Consider increasing timeout (currently 10 seconds)
- Check if websites require specific headers or cookies

## Security

- **Admin-only access**: Only admins can run the crawler
- **No data modification**: Original data is never modified, only new sheets created
- **Rate limiting**: Built-in delays prevent abuse
- **Error handling**: Graceful error handling prevents crashes

