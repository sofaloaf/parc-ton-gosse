# Google Sheets Automatic Editing Setup

## Overview

This guide explains how to set up automatic editing capabilities for your new Google Sheet, allowing you to send instructions here that will automatically update the sheet data.

## New Google Sheet

**Sheet ID:** `1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A`  
**URL:** https://docs.google.com/spreadsheets/d/1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A/edit

## What Needs to Be Done

### 1. Update Environment Variable

**Current Sheet ID:** `1XefqX56FXtm-HVXfl9euHazaAapJDDZ4HS2EKxRV6u0`  
**New Sheet ID:** `1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A`

**Action Required:**
- Update `GS_SHEET_ID` in Railway backend environment variables
- Or update `server/.env` for local development

### 2. Grant Service Account Access

The Google Sheets service account needs **Editor** access to the new sheet.

**Steps:**
1. Open your new Google Sheet
2. Click **Share** (top right)
3. Add the service account email: `parc-ton-gosse-api@parc-ton-gosse.iam.gserviceaccount.com`
   - (Or check your Railway `GS_SERVICE_ACCOUNT` variable for the exact email)
4. Set permission to **Editor**
5. Click **Send**

### 3. Verify Sheet Structure

The system expects an **"Activities"** tab with these columns (flexible naming):

**Required Columns:**
- `id` - Unique identifier
- `title` or `title_en`/`title_fr` - Activity name
- `description` or `description_en`/`description_fr` - Activity description

**Common Columns:**
- `categories` - Activity categories (comma-separated)
- `ageMin` / `ageMax` - Age range
- `price` - Price
- `neighborhood` - Neighborhood/arrondissement
- `addresses` - Address information
- `contactEmail` / `contactPhone` - Contact info
- `websiteLink` / `registrationLink` - Links

**Note:** The system supports flexible column naming (see `COLUMN_MAPPINGS` in `sheets-enhanced.js`)

### 4. Create API Endpoint for Instructions

We need to create an endpoint that accepts natural language instructions and updates the sheet.

**Proposed Endpoint:** `POST /api/admin/sheets/update`

**Example Instructions:**
- "Update activity with id 'abc123' to set price to 50"
- "Add new activity: Soccer Training in 16e arrondissement"
- "Delete activity with id 'xyz789'"
- "Update all activities in category 'sports' to set ageMin to 5"

## Current Capabilities

### ✅ Already Working

1. **Read Operations:**
   - Read all activities from Google Sheets
   - Read specific activity by ID
   - Flexible column mapping

2. **Write Operations (via existing API):**
   - Create new activities
   - Update existing activities
   - Delete activities

3. **Data Formatting:**
   - Handles bilingual fields (title_en/title_fr)
   - Converts JSON fields
   - Handles arrays and objects

### ⚠️ Needs Implementation

1. **Natural Language Processing:**
   - Parse instructions like "update activity X to set Y to Z"
   - Handle bulk operations
   - Handle complex queries

2. **Admin Interface:**
   - Web interface for sending instructions
   - Preview changes before applying
   - Batch operations

3. **Validation:**
   - Validate data before writing
   - Check for duplicates
   - Verify required fields

## Next Steps

1. **Verify Sheet Access:**
   - Check if service account can access the new sheet
   - Test reading data from the new sheet

2. **Update Configuration:**
   - Change `GS_SHEET_ID` to the new sheet ID
   - Test that the app can read from the new sheet

3. **Create Instruction Parser:**
   - Build endpoint to accept natural language instructions
   - Parse instructions into CRUD operations
   - Execute operations on Google Sheets

4. **Add Validation:**
   - Validate instructions before executing
   - Preview changes
   - Rollback on errors

## Testing

After setup, test with:

```bash
# Test reading from new sheet
curl https://parc-ton-gosse-backend-production.up.railway.app/api/activities

# Test updating an activity (if endpoint exists)
curl -X POST https://parc-ton-gosse-backend-production.up.railway.app/api/admin/sheets/update \
  -H "Content-Type: application/json" \
  -d '{"instruction": "Update activity with id X to set price to 50"}'
```

## Questions to Answer

1. **What format do you want for instructions?**
   - Natural language? ("Update activity X...")
   - Structured JSON? (`{"action": "update", "id": "X", "field": "price", "value": 50}`)
   - Both?

2. **What operations do you need?**
   - Update existing activities?
   - Add new activities?
   - Delete activities?
   - Bulk operations?

3. **What validation do you need?**
   - Check required fields?
   - Validate data types?
   - Prevent duplicates?

4. **Do you want a preview before applying changes?**
   - Show what will change?
   - Require confirmation?

---

**Once you answer these questions, I can implement the automatic editing system!**

