# Activities Limit Fix

## Issue
Only 20 activities were showing on the frontend instead of all 131 from Google Sheets.

## Root Cause
The activities API endpoint had a default limit of 20 activities per request:
```javascript
const limitNum = limit ? Math.min(parseInt(limit, 10) || 20, 100) : 20;
```

When the frontend called `/api/activities` without a `limit` parameter, it only received 20 activities.

## Solution
Increased the default limit from 20 to 200 activities:
```javascript
const limitNum = limit ? Math.min(parseInt(limit, 10) || 200, 500) : 200;
```

This ensures:
- ✅ All 131 activities will be returned by default
- ✅ Room for growth (up to 200 activities)
- ✅ Maximum limit increased to 500 if needed
- ✅ Can still be overridden with `?limit=X` query parameter

## Changes Made

**File**: `server/routes/activities.js`
- Changed default limit from `20` to `200`
- Changed max limit from `100` to `500`

## Testing

After Railway deploys the backend changes:

1. **Check API response**:
   ```bash
   curl https://parc-ton-gosse-backend-production.up.railway.app/api/activities | jq '.pagination.total'
   ```
   Should show: `131` (or actual count)

2. **Check frontend**:
   - Open https://victorious-gentleness-production.up.railway.app/
   - Should see all 131 activities
   - Check browser console for: `✅ Loaded 131 activities`

## Status

✅ **Fix committed and pushed**
⏳ **Waiting for Railway backend deployment**
✅ **Should show all 131 activities after deployment**

## Notes

- The frontend already handles paginated responses correctly
- If you need more than 200 activities in the future, you can:
  - Increase the default limit further
  - Use pagination: `?limit=200&offset=200`
  - Or implement infinite scroll in the frontend

