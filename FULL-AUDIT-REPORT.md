# Full Code Audit Report - Activities Loading

**Date:** 2025-01-27  
**Goal:** Ensure website loads with all activities successfully

---

## Executive Summary

This audit examines the entire codebase to identify issues preventing activities from loading on the website. The system uses:
- **Frontend:** React (Vite) on port 5173
- **Backend:** Express.js API on port 4000
- **Data Backend:** Memory (default) or Google Sheets

---

## 1. API URL Resolution (Frontend)

### Current Implementation
**File:** `client/src/shared/api.js`

The API URL resolution logic has multiple fallback mechanisms:
1. Checks `VITE_API_URL` environment variable (build-time)
2. Checks `window.__PTG_API_URL__` runtime override
3. Detects localhost
4. Detects Railway production hostname
5. Falls back to same-origin `/api`

### ✅ Strengths
- Multiple fallback mechanisms
- Handles both development and production
- Supports runtime overrides

### ⚠️ Potential Issues

**Issue 1.1: VITE_API_URL Build-Time Dependency**
- `VITE_API_URL` is baked into the build at build time
- If changed after deployment, frontend must be rebuilt
- **Impact:** High - Activities won't load if URL is wrong

**Issue 1.2: Railway Hostname Detection**
```javascript
if (hostname.includes('victorious-gentleness') || hostname.includes('railway')) {
    cachedBaseUrl = PRODUCTION_API_URL;
}
```
- Hardcoded hostname `victorious-gentleness`
- If Railway URL changes, this breaks
- **Impact:** Medium - May not detect production correctly

**Issue 1.3: API URL Formatting**
```javascript
cachedBaseUrl = envApiUrl.trim().replace(/\/$/, '') + (envApiUrl.endsWith('/api') ? '' : '/api');
```
- Logic may add `/api` twice if already present
- **Impact:** Low - Should work but could be cleaner

### 🔧 Recommendations

1. **Add better error logging:**
   ```javascript
   console.log('🔍 API URL resolved to:', cachedBaseUrl);
   ```

2. **Improve Railway detection:**
   - Use environment variable instead of hardcoded hostname
   - Or check for Railway-specific headers

3. **Add runtime API URL validation:**
   - Test connection on app startup
   - Show error if API is unreachable

---

## 2. Activities Fetching (Frontend)

### Current Implementation
**File:** `client/src/pages/Browse.jsx`

```javascript
api(`/activities${qs ? `?${qs}` : ''}`).then((data) => {
    setActivities(data);
    setError(null);
}).catch((err) => {
    setActivities([]);
    setError(err.message || 'Failed to load activities');
});
```

### ✅ Strengths
- Proper error handling
- Loading states
- Query parameter support

### ⚠️ Potential Issues

**Issue 2.1: Error Message Not User-Friendly**
- Shows raw error message to users
- Network errors may expose technical details
- **Impact:** Low - UX issue

**Issue 2.2: No Retry Logic**
- If network fails, no automatic retry
- **Impact:** Medium - Temporary network issues cause failures

**Issue 2.3: Error Logging Only in Development**
```javascript
if (process.env.NODE_ENV === 'development') {
    console.error('Error fetching activities:', err);
}
```
- Production errors are silent
- Hard to debug production issues
- **Impact:** Medium - Debugging difficulty

### 🔧 Recommendations

1. **Add retry logic:**
   ```javascript
   const fetchWithRetry = async (url, retries = 3) => {
       for (let i = 0; i < retries; i++) {
           try {
               return await api(url);
           } catch (err) {
               if (i === retries - 1) throw err;
               await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
           }
       }
   };
   ```

2. **Better error messages:**
   ```javascript
   const getErrorMessage = (err) => {
       if (err.message.includes('Failed to fetch')) {
           return 'Unable to connect to server. Please check your internet connection.';
       }
       return 'Failed to load activities. Please try again.';
   };
   ```

3. **Always log errors (with sanitization):**
   ```javascript
   console.error('Error fetching activities:', {
       message: err.message,
       url: err.url,
       timestamp: new Date().toISOString()
   });
   ```

---

## 3. Backend Activities Route

### Current Implementation
**File:** `server/routes/activities.js`

```javascript
activitiesRouter.get('/', async (req, res) => {
    const store = req.app.get('dataStore');
    if (!store) {
        return res.status(503).json({ error: 'Data store not available' });
    }
    const all = await store.activities.list();
    // ... filtering logic
    res.json(results);
});
```

### ✅ Strengths
- Proper error handling
- Data store validation
- Comprehensive filtering
- Good logging

### ⚠️ Potential Issues

**Issue 3.1: Data Store May Not Be Initialized**
- Data store initializes asynchronously
- Route may be hit before initialization completes
- **Impact:** High - Returns 503 error

**Issue 3.2: No Timeout on Data Store Operations**
- Google Sheets API calls can hang
- No timeout protection
- **Impact:** Medium - Requests may hang indefinitely

**Issue 3.3: Error Response Format**
```javascript
res.status(500).json({ 
    error: 'Failed to fetch activities',
    message: error.message 
});
```
- Exposes error message in production
- May leak sensitive information
- **Impact:** Low - Security concern

### 🔧 Recommendations

1. **Add data store readiness check:**
   ```javascript
   // In server/index.js
   app.get('/api/ready', (req, res) => {
       const store = req.app.get('dataStore');
       res.json({ ready: !!store });
   });
   ```

2. **Add timeout to data store operations:**
   ```javascript
   const timeoutPromise = new Promise((_, reject) => 
       setTimeout(() => reject(new Error('Operation timeout')), 10000)
   );
   const dataPromise = store.activities.list();
   const all = await Promise.race([dataPromise, timeoutPromise]);
   ```

3. **Sanitize error messages:**
   ```javascript
   const sanitizeError = (error, isProduction) => {
       if (isProduction) {
           return 'Failed to fetch activities';
       }
       return error.message;
   };
   ```

---

## 4. Data Store Initialization

### Current Implementation
**File:** `server/index.js`

The data store initializes asynchronously:
```javascript
(async () => {
    try {
        dataStore = await createDataStore({...});
        app.set('dataStore', dataStore);
    } catch (error) {
        // Falls back to memory backend
    }
})();
```

### ✅ Strengths
- Graceful fallback to memory backend
- Comprehensive error handling
- Private key processing logic

### ⚠️ Potential Issues

**Issue 4.1: Race Condition**
- Server starts before data store is ready
- Routes may be hit during initialization
- **Impact:** High - 503 errors possible

**Issue 4.2: Google Sheets Private Key Processing**
- Complex key processing logic
- Multiple format handling
- **Impact:** Medium - May fail silently

**Issue 4.3: No Health Check for Data Store**
- No way to verify data store is working
- **Impact:** Medium - Hard to diagnose issues

### 🔧 Recommendations

1. **Add initialization status:**
   ```javascript
   let dataStoreStatus = 'initializing';
   (async () => {
       try {
           dataStoreStatus = 'initializing';
           dataStore = await createDataStore({...});
           app.set('dataStore', dataStore);
           dataStoreStatus = 'ready';
       } catch (error) {
           dataStoreStatus = 'error';
       }
   })();
   ```

2. **Add health check endpoint:**
   ```javascript
   app.get('/api/health/datastore', async (req, res) => {
       const store = req.app.get('dataStore');
       if (!store) {
           return res.json({ status: 'not_initialized' });
       }
       try {
           const count = await store.activities.list();
           res.json({ status: 'healthy', activityCount: count.length });
       } catch (error) {
           res.json({ status: 'error', error: error.message });
       }
   });
   ```

3. **Add initialization wait:**
   ```javascript
   // Wait for data store before starting server
   await new Promise((resolve) => {
       const checkInterval = setInterval(() => {
           if (app.get('dataStore')) {
               clearInterval(checkInterval);
               resolve();
           }
       }, 100);
       // Timeout after 10 seconds
       setTimeout(() => {
           clearInterval(checkInterval);
           resolve(); // Continue anyway
       }, 10000);
   });
   ```

---

## 5. CORS Configuration

### Current Implementation
**File:** `server/index.js`

```javascript
app.use(cors({ 
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.length > 0) {
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        }
        return callback(null, true);
    },
    credentials: true
}));
```

### ✅ Strengths
- Configurable origins
- Credentials support
- Detailed logging

### ⚠️ Potential Issues

**Issue 5.1: CORS_ORIGIN May Be Empty**
- If `CORS_ORIGIN` is not set, allows all origins
- **Impact:** Medium - Security risk in production

**Issue 5.2: No Wildcard Support**
- Cannot use wildcards like `*.railway.app`
- Must list all origins explicitly
- **Impact:** Low - Flexibility issue

### 🔧 Recommendations

1. **Require CORS_ORIGIN in production:**
   ```javascript
   if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
       console.error('❌ CORS_ORIGIN must be set in production');
       process.exit(1);
   }
   ```

2. **Add wildcard support:**
   ```javascript
   const isOriginAllowed = (origin) => {
       return allowedOrigins.some(allowed => {
           if (allowed.includes('*')) {
               const pattern = allowed.replace('*', '.*');
               return new RegExp(pattern).test(origin);
           }
           return allowed === origin;
       });
   };
   ```

---

## 6. Google Sheets Integration

### Current Implementation
**File:** `server/services/datastore/sheets-enhanced.js`

### ✅ Strengths
- Flexible column mapping
- Auto-neighborhood detection
- Bilingual field support
- Timeout protection

### ⚠️ Potential Issues

**Issue 6.1: Timeout May Be Too Short**
- 10 second timeout may be too short for large sheets
- **Impact:** Medium - May timeout on large datasets

**Issue 6.2: No Caching**
- Every request reads from Google Sheets
- No caching mechanism
- **Impact:** Medium - Slow response times

**Issue 6.3: Error Handling in readSheet**
- Errors may not be properly propagated
- **Impact:** Low - Debugging difficulty

### 🔧 Recommendations

1. **Add caching:**
   ```javascript
   let cache = { data: null, timestamp: 0 };
   const CACHE_TTL = 60000; // 1 minute
   
   const getCachedData = async () => {
       const now = Date.now();
       if (cache.data && (now - cache.timestamp) < CACHE_TTL) {
           return cache.data;
       }
       cache.data = await readSheet(...);
       cache.timestamp = now;
       return cache.data;
   };
   ```

2. **Increase timeout for large sheets:**
   ```javascript
   const timeoutMs = process.env.SHEETS_TIMEOUT || 30000; // 30 seconds default
   ```

3. **Add retry logic:**
   ```javascript
   const readSheetWithRetry = async (sheets, sheetId, sheetName, retries = 3) => {
       for (let i = 0; i < retries; i++) {
           try {
               return await readSheet(sheets, sheetId, sheetName);
           } catch (error) {
               if (i === retries - 1) throw error;
               await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
           }
       }
   };
   ```

---

## 7. Environment Variables

### Current Configuration

**Backend Required:**
- `PORT` (default: 4000)
- `DATA_BACKEND` (default: memory)
- `CORS_ORIGIN` (optional in dev, required in prod)
- `GS_SERVICE_ACCOUNT` (if using sheets)
- `GS_PRIVATE_KEY` or `GS_PRIVATE_KEY_BASE64` (if using sheets)
- `GS_SHEET_ID` (if using sheets)

**Frontend Required:**
- `VITE_API_URL` (optional, has fallbacks)

### ⚠️ Potential Issues

**Issue 7.1: Missing Validation**
- No validation that required vars are set
- **Impact:** High - Silent failures

**Issue 7.2: Private Key Format Issues**
- Complex key processing
- May fail with incorrect format
- **Impact:** High - Activities won't load

### 🔧 Recommendations

1. **Add startup validation:**
   ```javascript
   const validateEnv = () => {
       const required = ['PORT'];
       if (process.env.DATA_BACKEND === 'sheets') {
           required.push('GS_SERVICE_ACCOUNT', 'GS_SHEET_ID');
           if (!process.env.GS_PRIVATE_KEY && !process.env.GS_PRIVATE_KEY_BASE64) {
               throw new Error('GS_PRIVATE_KEY or GS_PRIVATE_KEY_BASE64 required');
           }
       }
       required.forEach(key => {
           if (!process.env[key]) {
               throw new Error(`Missing required environment variable: ${key}`);
           }
       });
   };
   ```

2. **Add environment variable documentation:**
   - Create `.env.example` files
   - Document all variables

---

## 8. Error Handling & Logging

### Current State

**Frontend:**
- Errors logged only in development
- User sees raw error messages

**Backend:**
- Comprehensive logging
- Error sanitization in production

### ⚠️ Potential Issues

**Issue 8.1: Inconsistent Error Handling**
- Frontend and backend handle errors differently
- **Impact:** Medium - Inconsistent UX

**Issue 8.2: No Error Tracking**
- No error tracking service (Sentry, etc.)
- **Impact:** Low - Hard to track production errors

### 🔧 Recommendations

1. **Add error tracking:**
   ```javascript
   // Optional: Add Sentry or similar
   if (process.env.SENTRY_DSN) {
       Sentry.init({ dsn: process.env.SENTRY_DSN });
   }
   ```

2. **Standardize error responses:**
   ```javascript
   // Backend
   res.status(500).json({ 
       error: 'Failed to fetch activities',
       code: 'ACTIVITIES_FETCH_ERROR',
       timestamp: new Date().toISOString()
   });
   ```

---

## 9. Testing & Validation

### Current State
- No automated tests found
- Manual testing only

### ⚠️ Potential Issues

**Issue 9.1: No Automated Tests**
- Changes may break functionality
- **Impact:** High - Risk of regressions

### 🔧 Recommendations

1. **Add basic API tests:**
   ```javascript
   // tests/api.test.js
   describe('Activities API', () => {
       it('should return activities', async () => {
           const res = await request(app).get('/api/activities');
           expect(res.status).toBe(200);
           expect(Array.isArray(res.body)).toBe(true);
       });
   });
   ```

2. **Add integration tests:**
   - Test full flow: frontend → backend → data store
   - Test error scenarios

---

## 10. Critical Issues Summary

### 🔴 High Priority

1. **Data Store Race Condition**
   - Server may start before data store is ready
   - **Fix:** Add readiness check and wait logic

2. **API URL Build-Time Dependency**
   - `VITE_API_URL` must be set before build
   - **Fix:** Add runtime API URL validation

3. **Missing Environment Variable Validation**
   - No validation of required vars
   - **Fix:** Add startup validation

### 🟡 Medium Priority

1. **No Retry Logic**
   - Network failures cause immediate errors
   - **Fix:** Add retry logic with exponential backoff

2. **No Caching**
   - Every request hits Google Sheets
   - **Fix:** Add in-memory caching

3. **Error Logging in Production**
   - Errors are silent in production
   - **Fix:** Add sanitized error logging

### 🟢 Low Priority

1. **User-Friendly Error Messages**
   - Technical errors shown to users
   - **Fix:** Add error message mapping

2. **CORS Wildcard Support**
   - Cannot use wildcards
   - **Fix:** Add pattern matching

---

## 11. Recommended Action Plan

### Phase 1: Critical Fixes (Immediate)

1. ✅ Add data store readiness check
2. ✅ Add environment variable validation
3. ✅ Add API URL validation on frontend
4. ✅ Improve error handling and logging

### Phase 2: Reliability Improvements (Short-term)

1. ✅ Add retry logic for API calls
2. ✅ Add caching for Google Sheets
3. ✅ Add timeout protection
4. ✅ Improve error messages

### Phase 3: Monitoring & Testing (Long-term)

1. ✅ Add error tracking (Sentry)
2. ✅ Add automated tests
3. ✅ Add health check endpoints
4. ✅ Add performance monitoring

---

## 12. Quick Diagnostic Checklist

Use this checklist to diagnose why activities aren't loading:

- [ ] **Backend is running?**
  - Check: `curl http://localhost:4000/api/health`
  - Should return: `{"ok": true, "status": "healthy"}`

- [ ] **Data store is initialized?**
  - Check: Backend logs for "✅ Data store initialized"
  - Or: `curl http://localhost:4000/api/health/datastore`

- [ ] **Activities endpoint works?**
  - Check: `curl http://localhost:4000/api/activities`
  - Should return: Array of activities

- [ ] **Frontend API URL is correct?**
  - Check: Browser console → Network tab → `/api/activities` request
  - Should show: Correct backend URL

- [ ] **CORS is configured?**
  - Check: Network tab → Response headers
  - Should include: `access-control-allow-origin`

- [ ] **No JavaScript errors?**
  - Check: Browser console
  - Should be: No red errors

- [ ] **Environment variables set?**
  - Backend: `DATA_BACKEND`, `GS_*` (if using sheets)
  - Frontend: `VITE_API_URL` (optional, has fallbacks)

---

## 13. Code Quality Observations

### ✅ Good Practices Found

1. **Separation of Concerns**
   - Clear separation between frontend and backend
   - Data store abstraction layer

2. **Error Handling**
   - Try-catch blocks in critical paths
   - Graceful fallbacks

3. **Security**
   - CORS configuration
   - CSRF protection
   - Rate limiting
   - Helmet security headers

4. **Logging**
   - Comprehensive logging in backend
   - Debug information available

### ⚠️ Areas for Improvement

1. **Testing**
   - No automated tests
   - Manual testing only

2. **Documentation**
   - Good README
   - But could use more inline comments

3. **Type Safety**
   - No TypeScript
   - Could benefit from type checking

---

## Conclusion

The codebase is generally well-structured with good error handling and security practices. The main issues preventing activities from loading are:

1. **Race conditions** in data store initialization
2. **API URL resolution** dependencies on build-time variables
3. **Missing validation** of environment variables

**Priority:** Fix the critical issues first, then implement reliability improvements.

**Estimated Time:**
- Phase 1 (Critical): 2-4 hours
- Phase 2 (Reliability): 4-8 hours
- Phase 3 (Monitoring): 8-16 hours

---

**Next Steps:**
1. Review this audit
2. Prioritize fixes based on current issues
3. Implement fixes incrementally
4. Test after each fix
5. Deploy and monitor

