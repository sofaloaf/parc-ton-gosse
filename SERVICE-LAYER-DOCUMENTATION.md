# Service Layer Documentation

## Overview

The service layer provides a clean separation between HTTP routes and business logic. All services extend `BaseService` for common functionality.

## Architecture

```
Routes (HTTP Layer)
  ↓
Services (Business Logic)
  ↓
DataStore (Data Access)
  ↓
Google Sheets / Airtable / Memory
```

## BaseService

All services extend `BaseService` which provides common utilities:

### Error Handling

```javascript
// Automatically handles errors with appropriate status codes
throw this._handleError(error, 'Default message', 'ERROR_CODE');
```

### Validation

```javascript
// Validate required fields
this._validateRequired(data, ['field1', 'field2']);

// Validate type
this._validateType(data, 'age', 'number');

// Validate enum
this._validateEnum(data, 'role', ['admin', 'user', 'parent']);
```

### Authorization

```javascript
// Check if user is authorized (admin or owner)
this._checkAuthorization(user, resourceUserId, ['admin']);
```

### Sanitization

```javascript
// Sanitize strings
const clean = this._sanitizeString(input, maxLength);

// Sanitize emails
const email = this._sanitizeEmail(input);
```

## Services

### ActivitiesService

**Location**: `server/services/activitiesService.js`

**Methods:**
- `list(filters, pagination, options)` - List activities with filtering and pagination
- `get(id, options)` - Get single activity
- `create(data, options)` - Create new activity
- `update(id, data, options)` - Update activity
- `delete(id, options)` - Delete activity

**Features:**
- Complex filtering (category, age, price, date, neighborhood, search)
- Pagination with metadata
- Cache management
- Approval status filtering (admin vs regular users)
- Input validation

**Example:**
```javascript
const service = new ActivitiesService(dataStore);
const result = await service.list(
  { category: 'sports', minAge: 5, maxAge: 12 },
  { limit: 20, offset: 0 },
  { user: req.user }
);
```

### UsersService

**Location**: `server/services/usersService.js`

**Methods:**
- `list(options)` - List all users (admin only)
- `get(id, options)` - Get user (with authorization check)
- `create(data, options)` - Create user
- `update(id, data, options)` - Update user
- `delete(id, options)` - Delete user
- `saveOnboarding(userId, data, options)` - Save onboarding data

**Features:**
- Authorization checks (users can only access their own data)
- Data sanitization (removes sensitive fields)
- Email and role validation

**Example:**
```javascript
const service = new UsersService(dataStore);
const user = await service.get(userId, { user: requestingUser });
// Returns sanitized user data (no password)
```

### RegistrationsService

**Location**: `server/services/registrationsService.js`

**Methods:**
- `list(filters, options)` - List registrations
- `get(id, options)` - Get registration
- `create(data, options)` - Create registration
- `update(id, data, options)` - Update registration
- `delete(id, options)` - Delete registration

**Features:**
- Role-based filtering (parents see only their registrations)
- Activity existence validation
- Status validation

### ReviewsService

**Location**: `server/services/reviewsService.js`

**Methods:**
- `list(filters, options)` - List reviews
- `getByActivity(activityId, options)` - Get reviews for activity
- `getRating(activityId, options)` - Get average rating
- `getBatchRatings(activityIds, options)` - Batch get ratings
- `getUserReview(activityId, userId, options)` - Get user's review
- `get(id, options)` - Get single review
- `createOrUpdate(data, options)` - Create or update review
- `moderate(id, status, options)` - Moderate review (admin)
- `delete(id, options)` - Delete review (admin)

**Features:**
- Rating calculations (single and batch)
- Activity review filtering
- Review moderation
- Status filtering

**Example:**
```javascript
const service = new ReviewsService(dataStore);
const rating = await service.getRating('activity-1', {});
// Returns { average: 4.5, count: 10 }
```

### PreordersService

**Location**: `server/services/preordersService.js`

**Methods:**
- `getStatus(userId, options)` - Get preorder status
- `validatePromoCode(promoCode)` - Validate promo code
- `calculateAmount(data, options)` - Calculate amount with promo
- `createCommitment(data, options)` - Create commitment
- `trackPageView(userId, userEmail, options)` - Track page view

**Features:**
- Promo code validation and calculation
- Amount calculation with discounts
- Commitment creation
- Conversion event tracking

**Example:**
```javascript
const service = new PreordersService(dataStore);
const validation = service.validatePromoCode('LAUNCH20');
// Returns { valid: true, discount: 20, amount: 3.99, ... }
```

### FeedbackService

**Location**: `server/services/feedbackService.js`

**Methods:**
- `submitFeedback(data, options)` - Submit feedback
- `submitOrganization(data, options)` - Submit organization suggestion
- `listFeedback(options)` - List feedback (admin)
- `listOrganizations(options)` - List organizations (admin)
- `approveOrganization(id, options)` - Approve organization (admin)
- `rejectOrganization(id, options)` - Reject organization (admin)

**Features:**
- Feedback submission
- Organization suggestion management
- Approval/rejection workflow

## Error Handling

All services use consistent error handling:

```javascript
try {
  // Service logic
} catch (error) {
  throw this._handleError(error, 'Default message', 'ERROR_CODE');
}
```

Errors are automatically:
- Wrapped with status codes
- Logged with context
- Sanitized for production

## Testing

Services can be tested in isolation:

```javascript
import { ActivitiesService } from '../services/activitiesService.js';
import { createMockDataStore } from '../helpers/mockDataStore.js';

const mockStore = createMockDataStore();
const service = new ActivitiesService(mockStore);

// Test service methods
const result = await service.list({}, {}, {});
```

See `TESTING-SETUP-COMPLETE.md` for testing documentation.

## Best Practices

1. **Always use services in routes** - Don't access data store directly
2. **Pass user context** - Include `{ user: req.user }` in options
3. **Handle errors** - Services throw errors, routes catch and format responses
4. **Validate input** - Use service validation methods
5. **Check authorization** - Services handle authorization checks

## Adding a New Service

1. Create service file: `server/services/myService.js`
2. Extend `BaseService`
3. Implement business logic methods
4. Add error handling
5. Write unit tests
6. Update route to use service

**Example:**
```javascript
import { BaseService } from './baseService.js';

export class MyService extends BaseService {
  constructor(dataStore) {
    super(dataStore);
  }

  async myMethod(data, options = {}) {
    try {
      // Business logic
      const result = await this.store.myResource.create(data);
      return result;
    } catch (error) {
      throw this._handleError(error, 'Failed to create', 'CREATE_ERROR');
    }
  }
}
```

## Migration Notes

- All services are backward compatible
- No breaking API changes
- Services can be used by routes, scripts, background jobs
- Business logic is now reusable and testable

