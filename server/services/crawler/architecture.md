# Enhanced Data Crawler Architecture

## System Overview

A modular, scalable crawler system for discovering, extracting, validating, and enriching organization data from heterogeneous sources.

## Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Crawler Orchestrator                      │
│              (Coordinates all stages & workflows)             │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Discovery   │   │  Extraction  │   │  Validation  │
│   Module     │   │   Module     │   │   Module     │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Enrichment │   │   Storage    │   │  Monitoring  │
│   Module    │   │   Module     │   │   Module     │
└──────────────┘   └──────────────┘   └──────────────┘
```

## Module Responsibilities

### 1. Discovery Module
- **Hybrid Search**: Google Custom Search API + direct site lookups
- **Source Tracking**: Maintain visited URLs and discovered entities
- **Graph Expansion**: Use discovered names/domains for new searches
- **Source Types**: Government sites, city halls, PDFs, directories

### 2. Extraction Module
- **HTML Scraping**: Structured/semi-structured data extraction
- **PDF Processing**: Text extraction + named entity recognition
- **Structured Data**: JSON-LD, microdata, schema.org parsing
- **Multi-format Support**: HTML, PDF, CSV, JSON

### 3. Validation Module
- **Data Quality Checks**: Completeness, format validation
- **Deduplication**: Entity matching and merging
- **Confidence Scoring**: Extraction quality metrics
- **Error Handling**: Graceful degradation

### 4. Enrichment Module
- **Geocoding**: Address → coordinates
- **Categorization**: Activity type classification
- **Normalization**: Standardize formats, languages
- **Data Fusion**: Merge data from multiple sources

### 5. Storage Module
- **Entity Tracking**: Visited sources, discovered entities
- **Data Persistence**: Google Sheets or database
- **Provenance**: Source URL, timestamp, confidence
- **Versioning**: Track data changes over time

### 6. Monitoring Module
- **Progress Tracking**: Crawler status, metrics
- **Error Logging**: Comprehensive error tracking
- **Performance Metrics**: Speed, success rates
- **Dashboard Integration**: Real-time monitoring

## Data Flow

1. **Discovery** → Finds potential sources (URLs, PDFs)
2. **Extraction** → Extracts raw data from sources
3. **Validation** → Validates and scores data quality
4. **Enrichment** → Adds geocoding, categorization, etc.
5. **Storage** → Saves to database with provenance
6. **Monitoring** → Tracks progress and errors

## Compliance & Best Practices

- **robots.txt**: Respect crawl delays and disallowed paths
- **Rate Limiting**: Configurable delays between requests
- **User Agent Rotation**: Prevent blocking
- **GDPR Compliance**: Data provenance, consent tracking
- **Error Recovery**: Retry with exponential backoff
- **CAPTCHA Handling**: Graceful degradation

