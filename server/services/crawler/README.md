# Enhanced Data Crawler System

## Overview

A modular, scalable crawler system designed to discover, extract, validate, and enrich organization data from heterogeneous sources including government websites, city hall portals, PDFs, and third-party aggregators.

## Architecture

The system is organized into six core modules:

1. **Discovery Module** - Hybrid search (Google Custom Search + direct lookups)
2. **Extraction Module** - Multi-format data extraction (HTML, PDF, JSON)
3. **Validation Module** - Data quality checks and deduplication
4. **Enrichment Module** - Geocoding, categorization, normalization
5. **Storage Module** - Data persistence with provenance tracking
6. **Compliance Module** - robots.txt checking, rate limiting, GDPR compliance

## Usage

### Basic Usage

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

console.log(`Found ${results.entities.length} entities`);
console.log(`Stats:`, results.stats);
```

### Module-by-Module Usage

```javascript
import { 
  DiscoveryModule, 
  ExtractionModule, 
  ValidationModule,
  EnrichmentModule,
  StorageModule,
  ComplianceModule
} from './services/crawler/index.js';

// Discovery
const discovery = new DiscoveryModule();
const sources = await discovery.hybridSearch('query', { arrondissement: '20e' });

// Extraction
const extraction = new ExtractionModule();
const data = await extraction.extractFromUrl('https://example.com');

// Validation
const validation = new ValidationModule();
const result = validation.validate(data);
const unique = validation.deduplicate([data1, data2]);

// Enrichment
const enrichment = new EnrichmentModule();
const enriched = await enrichment.enrich(data);

// Storage
const storage = new StorageModule();
await storage.saveEntities([enriched]);

// Compliance
const compliance = new ComplianceModule();
if (await compliance.canCrawl('https://example.com')) {
  await compliance.applyRateLimit('https://example.com');
}
```

## Features

### Discovery
- ✅ Google Custom Search API integration
- ✅ Direct government/city hall site lookups
- ✅ Graph expansion from discovered entities
- ✅ Source tracking and visited URL management

### Extraction
- ✅ HTML scraping (structured and semi-structured)
- ✅ JSON-LD and Schema.org parsing
- ✅ Contact information extraction (email, phone, address)
- ✅ Image extraction
- ⚠️ PDF extraction (requires pdf-parse library)

### Validation
- ✅ Data quality scoring
- ✅ Email/phone/URL validation
- ✅ Deduplication using similarity matching
- ✅ Entity merging

### Enrichment
- ✅ Geocoding via Google Maps API
- ✅ Automatic categorization
- ✅ Age range detection
- ✅ Data normalization
- ✅ Multi-source data fusion

### Storage
- ✅ Google Sheets integration
- ✅ Provenance tracking (source URL, timestamp, confidence)
- ✅ Automatic tab creation
- ✅ Standardized data format

### Compliance
- ✅ robots.txt checking and caching
- ✅ Rate limiting per domain
- ✅ User agent rotation
- ✅ GDPR-ready provenance tracking

## Configuration

### Environment Variables

```bash
# Google Custom Search (optional)
GOOGLE_CUSTOM_SEARCH_API_KEY=your-api-key
GOOGLE_CUSTOM_SEARCH_CX=your-search-engine-id

# Google Maps (for geocoding)
GOOGLE_MAPS_API_KEY=your-api-key

# Google Sheets (for storage)
GS_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GS_PRIVATE_KEY_BASE64=your-base64-encoded-private-key
GS_SHEET_ID=your-sheet-id
```

## Roadmap

### MVP (Current)
- ✅ Basic discovery and extraction
- ✅ HTML scraping
- ✅ Validation and deduplication
- ✅ Google Sheets storage

### Beta (Next)
- [ ] PDF text extraction with pdf-parse
- [ ] Named entity recognition
- [ ] Enhanced categorization (ML-based)
- [ ] Dashboard integration
- [ ] Queue-based processing

### Production (Future)
- [ ] Microservice architecture
- [ ] Elasticsearch indexing
- [ ] Advanced ML models
- [ ] Real-time monitoring
- [ ] Automated testing
- [ ] CI/CD pipeline

## Best Practices

1. **Rate Limiting**: Always respect robots.txt and apply delays
2. **Error Handling**: Use try-catch and graceful degradation
3. **Logging**: Comprehensive logging for debugging
4. **Provenance**: Track data sources for compliance
5. **Validation**: Always validate before storing
6. **Deduplication**: Check for duplicates before saving

## License

Part of the Parc ton gosse project.

