# ✅ Sandbox Google Sheets System - Ready for Setup

## What Has Been Created

### 1. **Sandbox Connection** (`server/services/sandbox-sheets.js`)
- Separate Google Sheets connection for sandbox/testing
- Uses `GS_SANDBOX_SHEET_ID` environment variable
- Completely independent from production sheet

### 2. **Instruction Parser** (`server/utils/instructionParser.js`)
- **Natural Language Support:**
  - "Update activity with id 'abc123' to set price to 50"
  - "Add new activity: Soccer Training in 16e arrondissement"
  - "Delete activity with id 'xyz789'"
  - "Update all activities in category 'sports' to set ageMin to 5"
- **Structured JSON Support:**
  ```json
  {
    "action": "update",
    "target": { "type": "id", "value": "abc123" },
    "updates": { "price": 50 }
  }
  ```

### 3. **Data Validator** (`server/utils/activityValidator.js`)
- Validates all activity data before writing
- Checks required fields, data types, formats
- Normalizes data (handles bilingual fields, arrays, etc.)
- Returns errors and warnings

### 4. **API Routes** (`server/routes/sandbox.js`)
- `POST /api/sandbox/execute` - Execute instructions (natural language or JSON)
- `GET /api/sandbox/activities` - List all activities in sandbox
- `GET /api/sandbox/activities/:id` - Get single activity
- `POST /api/sandbox/activities` - Create activity
- `PUT /api/sandbox/activities/:id` - Update activity
- `DELETE /api/sandbox/activities/:id` - Delete activity

### 5. **Operations Supported**
- ✅ Create single activity
- ✅ Update single activity (by ID)
- ✅ Update multiple activities (by filter)
- ✅ Delete single activity
- ✅ Delete multiple activities (by filter)
- ✅ Bulk create
- ✅ Bulk update
- ✅ Bulk delete
- ✅ Preview mode (see changes before applying)

## What You Need to Do

### Step 1: Set Environment Variable

**In Railway Backend Service → Settings → Variables:**

Add new variable:
- **Name:** `GS_SANDBOX_SHEET_ID`
- **Value:** `1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A`

**Important:** Do NOT change `GS_SHEET_ID` - that's for production!

### Step 2: Grant Service Account Access

1. Open your new Google Sheet: https://docs.google.com/spreadsheets/d/1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A/edit
2. Click **Share** (top right)
3. Add your service account email (check Railway `GS_SERVICE_ACCOUNT` variable)
4. Set permission to **Editor**
5. Click **Send**

### Step 3: Verify Sheet Structure

The sandbox sheet should have an **"Activities"** tab with columns. The system will:
- Auto-detect column names
- Support flexible naming (see `COLUMN_MAPPINGS` in `sheets-enhanced.js`)
- Create the tab if it doesn't exist

## How to Use

### Via API (Natural Language)

```bash
curl -X POST https://parc-ton-gosse-backend-production.up.railway.app/api/sandbox/execute \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_ADMIN_TOKEN" \
  -d '{
    "instruction": "Update activity with id abc123 to set price to 50",
    "preview": false
  }'
```

### Via API (Structured JSON)

```bash
curl -X POST https://parc-ton-gosse-backend-production.up.railway.app/api/sandbox/execute \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_ADMIN_TOKEN" \
  -d '{
    "instruction": {
      "action": "update",
      "target": { "type": "id", "value": "abc123" },
      "updates": { "price": 50 }
    },
    "preview": true
  }'
```

### Preview Mode

Set `"preview": true` to see what will change without actually applying it:

```json
{
  "instruction": "Update all activities in category sports to set ageMin to 5",
  "preview": true
}
```

## Example Instructions

### Natural Language Examples

1. **Update by ID:**
   - "Update activity with id 'abc123' to set price to 50, ageMin to 5"

2. **Update by Filter:**
   - "Update all activities in category 'sports' to set ageMin to 5"
   - "Update all activities in neighborhood '16e' to set price to 100"

3. **Create:**
   - "Add new activity: Soccer Training in 16e arrondissement"

4. **Delete:**
   - "Delete activity with id 'xyz789'"
   - "Delete all activities in category 'test'"

5. **Bulk:**
   - "Bulk create [activity1, activity2, activity3]"

### JSON Examples

```json
{
  "action": "update",
  "target": { "type": "filter", "condition": { "categories": "sports" } },
  "updates": { "ageMin": 5, "price": { "amount": 50, "currency": "EUR" } }
}
```

```json
{
  "action": "create",
  "data": {
    "title": { "en": "Soccer Training", "fr": "Entraînement Football" },
    "categories": ["sports"],
    "neighborhood": "16e",
    "ageMin": 5,
    "ageMax": 12
  }
}
```

```json
{
  "action": "bulk_update",
  "data": [
    { "id": "abc123", "price": 50 },
    { "id": "def456", "ageMin": 6 }
  ]
}
```

## Validation

All operations are validated:
- ✅ Required fields checked
- ✅ Data types validated
- ✅ Format validation (emails, URLs, etc.)
- ✅ Age range validation
- ✅ Price validation
- ⚠️ Warnings for missing optional fields

## Next Steps

1. **Set `GS_SANDBOX_SHEET_ID` in Railway**
2. **Grant service account access to the new sheet**
3. **Test with a simple instruction**
4. **Admin panel interface** (to be created next)

## Status

- ✅ Backend API ready
- ✅ Instruction parser ready
- ✅ Validator ready
- ⏳ Environment variable setup (you need to do)
- ⏳ Service account access (you need to do)
- ⏳ Admin panel interface (to be created)

---

**Once you set the environment variable and grant access, the system will be fully operational!**

