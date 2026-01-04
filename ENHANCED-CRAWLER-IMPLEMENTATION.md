# Enhanced Data Crawler Implementation

## Overview

A comprehensive, modular crawler system has been implemented following senior developer, systems architect, and product designer best practices. The system is designed to discover, extract, validate, and enrich organization data from heterogeneous sources.

## Architecture

### Modular Design

The crawler is organized into 6 core modules:

1. **Discovery Module** (`server/services/crawler/discovery.js`)
   - Hybrid search: Google Custom Search API + direct government site lookups
   - Graph expansion from discovered entities
   - Source tracking and visited URL management

2. **Extraction Module** (`server/services/crawler/extraction.js`)
   - HTML scraping (structured and semi-structured)
   - JSON-LD and Schema.org parsing
   - Contact information extraction (email, phone, address)
   - PDF extraction (placeholder - requires pdf-parse library)

3. **Validation Module** (`server/services/crawler/validation.js`)
   - Data quality scoring
   - Email/phone/URL validation
   - Deduplication using similarity matching (Levenshtein distance)
   - Entity merging

4. **Enrichment Module** (`server/services/crawler/enrichment.js`)
   - Geocoding via Google Maps API
   - Automatic categorization
   - Age range detection
   - Data normalization and format standardization

5. **Storage Module** (`server/services/crawler/storage.js`)
   - Google Sheets integration
   - Provenance tracking (source URL, timestamp, confidence)
   - Automatic tab creation

6. **Compliance Module** (`server/services/crawler/compliance.js`)
   - robots.txt checking and caching
   - Rate limiting per domain
   - User agent rotation
   - GDPR-ready provenance tracking

### Orchestrator

The `CrawlerOrchestrator` (`server/services/crawler/orchestrator.js`) coordinates all modules through a 5-stage workflow:

1. **Discovery** → Finds potential sources
2. **Extraction** → Extracts raw data
3. **Validation** → Validates and deduplicates
4. **Enrichment** → Adds geocoding, categorization, etc.
5. **Storage** → Saves with provenance

## Usage

### Enhanced Endpoint

A new endpoint `/api/arrondissement-crawler/search-enhanced` has been added that uses the enhanced architecture:

```javascript
POST /api/arrondissement-crawler/search-enhanced
{
  "arrondissements": ["20e"],
  "useEnhanced": true
}
```

### Programmatic Usage

```javascript
import { CrawlerOrchestrator } from './services/crawler/index.js';

const orchestrator = new CrawlerOrchestrator({
  discovery: {
    googleApiKey: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
    googleCx: process.env.GOOGLE_CUSTOM_SEARCH_CX
  },
  enrichment: {
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
  }
});

const results = await orchestrator.crawl('associations enfants Paris 20e', {
  arrondissement: '20e',
  postalCode: '75020',
  maxSources: 50
});
```

## Features Implemented

### ✅ Completed

- [x] Modular architecture with separation of concerns
- [x] Hybrid search (Google Custom Search + direct lookups)
- [x] HTML scraping with multiple extraction strategies
- [x] Structured data parsing (JSON-LD, Schema.org)
- [x] Contact information extraction
- [x] Data validation and quality scoring
- [x] Deduplication with similarity matching
- [x] Geocoding integration
- [x] Automatic categorization
- [x] Data normalization
- [x] robots.txt compliance
- [x] Rate limiting
- [x] User agent rotation
- [x] Provenance tracking
- [x] Google Sheets storage
- [x] Comprehensive logging
- [x] Error handling

### ⚠️ Pending (Requires Additional Libraries)

- [ ] PDF text extraction (requires `pdf-parse` library)
- [ ] Named entity recognition (requires NLP library like `compromise` or `natural`)

## Configuration

### Environment Variables

```bash
# Google Custom Search (optional, for enhanced discovery)
GOOGLE_CUSTOM_SEARCH_API_KEY=your-api-key
GOOGLE_CUSTOM_SEARCH_CX=your-search-engine-id

# Google Maps (for geocoding)
GOOGLE_MAPS_API_KEY=your-api-key

# Google Sheets (required)
GS_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GS_PRIVATE_KEY_BASE64=your-base64-encoded-private-key
GS_SHEET_ID=your-sheet-id
```

## Best Practices Implemented

1. **Responsible Scraping**
   - ✅ robots.txt checking and caching
   - ✅ Rate limiting with configurable delays
   - ✅ User agent rotation
   - ✅ Respectful crawl delays

2. **Data Quality**
   - ✅ Multi-stage validation
   - ✅ Confidence scoring
   - ✅ Deduplication
   - ✅ Format normalization

3. **Compliance**
   - ✅ Data provenance tracking
   - ✅ Source URL and timestamp recording
   - ✅ GDPR-ready metadata

4. **Scalability**
   - ✅ Modular design for easy extension
   - ✅ Configurable rate limits
   - ✅ Efficient caching
   - ✅ Error recovery

5. **Monitoring**
   - ✅ Comprehensive statistics
   - ✅ Error tracking
   - ✅ Performance metrics

## Roadmap

### MVP (Current Status) ✅
- Basic discovery and extraction
- HTML scraping
- Validation and deduplication
- Google Sheets storage
- Compliance features

### Beta (Next Phase)
- PDF text extraction with pdf-parse
- Named entity recognition
- Enhanced categorization (ML-based)
- Dashboard integration
- Queue-based processing

### Production (Future)
- Microservice architecture
- Elasticsearch indexing
- Advanced ML models
- Real-time monitoring
- Automated testing
- CI/CD pipeline

## Testing

The enhanced crawler can be tested via:

1. **Admin Panel**: Use the "Crawler & Data Tools" tab
2. **API Endpoint**: `POST /api/arrondissement-crawler/search-enhanced`
3. **Direct Import**: Use the orchestrator programmatically

## Documentation

- Architecture: `server/services/crawler/architecture.md`
- README: `server/services/crawler/README.md`
- Code: All modules in `server/services/crawler/`

## Notes

- The existing `/api/arrondissement-crawler/search` endpoint remains unchanged for backward compatibility
- The enhanced crawler is opt-in via the new endpoint
- PDF extraction requires installing `pdf-parse`: `npm install pdf-parse`
- Google Custom Search API is optional but recommended for better discovery

