# API Documentation

## Overview

This API provides endpoints for managing activities, users, registrations, reviews, preorders, and feedback for the Parc Ton Gosse platform.

## Base URL

- **Development**: `http://localhost:4000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

Most endpoints require authentication via JWT tokens. Include the token in cookies (httpOnly) or as a Bearer token in the Authorization header.

### Roles

- **parent**: Regular user, can view activities and create registrations
- **provider**: Can create and manage activities
- **admin**: Full access to all resources

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Error type",
  "message": "Human-readable message",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-06T...",
  "duration": "123ms" // optional
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable

## Endpoints

### Activities

#### List Activities
```
GET /api/activities
```

**Query Parameters:**
- `category` (string) - Filter by category
- `minAge` (number) - Minimum age
- `maxAge` (number) - Maximum age
- `startDate` (string) - Start date filter
- `endDate` (string) - End date filter
- `minPrice` (number) - Minimum price
- `maxPrice` (number) - Maximum price
- `neighborhood` (string) - Neighborhood filter
- `q` (string) - Search query
- `limit` (number) - Results per page (default: 200, max: 500)
- `offset` (number) - Pagination offset (default: 0)
- `refresh` (boolean) - Force cache refresh

**Response:**
```json
{
  "data": [
    {
      "id": "activity-1",
      "title": { "en": "Soccer Club", "fr": "Club de Football" },
      "description": { "en": "...", "fr": "..." },
      "categories": ["sports"],
      "ageMin": 5,
      "ageMax": 12,
      "price": { "amount": 50, "currency": "EUR" },
      "neighborhood": "20e",
      "approvalStatus": "approved"
    }
  ],
  "pagination": {
    "limit": 200,
    "offset": 0,
    "total": 132,
    "hasMore": false,
    "page": 1,
    "totalPages": 1
  },
  "_meta": {
    "cached": true,
    "duration": "45ms"
  }
}
```

#### Get Activity
```
GET /api/activities/:id
```

**Response:**
```json
{
  "id": "activity-1",
  "title": { "en": "Soccer Club", "fr": "Club de Football" },
  ...
  "_meta": {
    "cached": false,
    "duration": "12ms"
  }
}
```

#### Create Activity
```
POST /api/activities
Authorization: Bearer <token> (provider/admin)
```

**Request Body:**
```json
{
  "title": { "en": "New Activity", "fr": "Nouvelle Activité" },
  "description": { "en": "...", "fr": "..." },
  "categories": ["sports"],
  "ageMin": 5,
  "ageMax": 12,
  "price": { "amount": 50, "currency": "EUR" },
  "neighborhood": "20e"
}
```

#### Update Activity
```
PUT /api/activities/:id
Authorization: Bearer <token> (provider/admin)
```

#### Delete Activity
```
DELETE /api/activities/:id
Authorization: Bearer <token> (provider/admin)
```

### Users

#### List Users
```
GET /api/users
Authorization: Bearer <token> (admin)
```

#### Get User
```
GET /api/users/:id
Authorization: Bearer <token> (self/admin)
```

**Response:** User data (sanitized, password never included)

#### Create User
```
POST /api/users
Authorization: Bearer <token> (admin)
```

#### Update User
```
PUT /api/users/:id
Authorization: Bearer <token> (self/admin)
```

#### Delete User
```
DELETE /api/users/:id
Authorization: Bearer <token> (admin)
```

#### Save Onboarding Data
```
POST /api/users/onboarding
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "childAge": 5,
  "interests": ["sports", "arts"],
  "location": "Paris",
  "newsletter": true,
  "onboardingCompleted": true
}
```

### Registrations

#### List Registrations
```
GET /api/registrations
Authorization: Bearer <token> (provider/admin)
```

**Query Parameters:**
- `activityId` (string) - Filter by activity
- `status` (string) - Filter by status

#### Get Registration
```
GET /api/registrations/:id
Authorization: Bearer <token> (parent/admin)
```

#### Create Registration (Public)
```
POST /api/registrations/public
```

**Request Body:**
```json
{
  "activityId": "activity-1",
  "childName": "John Doe",
  "parentName": "Jane Doe",
  "email": "parent@example.com",
  "age": 7,
  "specialRequests": "None"
}
```

#### Create Registration (Authenticated)
```
POST /api/registrations
Authorization: Bearer <token> (parent)
```

#### Update Registration
```
PUT /api/registrations/:id
Authorization: Bearer <token> (provider/admin)
```

#### Delete Registration
```
DELETE /api/registrations/:id
Authorization: Bearer <token> (parent/admin)
```

### Reviews

#### List Reviews
```
GET /api/reviews
```

**Query Parameters:**
- `status` (string) - Filter by status (default: 'approved')

#### Get Reviews for Activity
```
GET /api/reviews/activity/:activityId
```

#### Get Rating for Activity
```
GET /api/reviews/activity/:activityId/rating
```

**Response:**
```json
{
  "average": 4.5,
  "count": 10
}
```

#### Batch Get Ratings
```
POST /api/reviews/activities/ratings
```

**Request Body:**
```json
{
  "activityIds": ["activity-1", "activity-2"]
}
```

**Response:**
```json
{
  "activity-1": { "average": 4.5, "count": 10 },
  "activity-2": { "average": 4.0, "count": 5 }
}
```

#### Get User Review
```
GET /api/reviews/activity/:activityId/user
Authorization: Bearer <token>
```

#### Create/Update Review
```
POST /api/reviews
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "activityId": "activity-1",
  "rating": 5,
  "comment": "Great activity!"
}
```

#### Moderate Review
```
PUT /api/reviews/:id/moderate
Authorization: Bearer <token> (admin)
```

**Request Body:**
```json
{
  "status": "approved" // or "rejected", "pending"
}
```

#### Delete Review
```
DELETE /api/reviews/:id
Authorization: Bearer <token> (admin)
```

### Preorders

#### Get Preorder Status
```
GET /api/preorders/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "hasPreordered": true,
  "preorderDate": "2025-01-06T...",
  "preorderId": "commitment-id"
}
```

#### Calculate Amount
```
POST /api/preorders/calculate-amount
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "promoCode": "LAUNCH20" // optional
}
```

**Response:**
```json
{
  "amount": 3.99,
  "originalAmount": 4.99,
  "discountApplied": true
}
```

#### Validate Promo Code
```
POST /api/preorders/validate-promo
```

**Request Body:**
```json
{
  "promoCode": "LAUNCH20"
}
```

**Response:**
```json
{
  "valid": true,
  "discount": 20,
  "amount": 3.99,
  "originalAmount": 4.99
}
```

#### Create Commitment
```
POST /api/preorders/commit
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "promoCode": "LAUNCH20", // optional
  "agreedToTerms": true,
  "plan": "monthly", // or "6months", "yearly"
  "amount": 3.99 // optional, from plan selection
}
```

**Response:**
```json
{
  "success": true,
  "commitmentId": "uuid",
  "preorderDate": "2025-01-06T...",
  "amount": 3.99,
  "plan": "monthly"
}
```

#### Track Page View
```
POST /api/preorders/track-page-view
Authorization: Bearer <token>
```

### Feedback

#### Submit Feedback
```
POST /api/feedback/submit
```

**Request Body:**
```json
{
  "message": "Feedback text",
  "type": "bug" // or "feature", "other"
}
```

#### Submit Organization Suggestion
```
POST /api/feedback/add-organization
```

**Request Body:**
```json
{
  "name": "Organization Name",
  "description": "...",
  "website": "https://...",
  "contact": "..."
}
```

#### List Feedback (Admin)
```
GET /api/feedback/list
Authorization: Bearer <token> (admin)
```

#### List Organization Suggestions (Admin)
```
GET /api/feedback/organizations/list
Authorization: Bearer <token> (admin)
```

#### Approve Organization (Admin)
```
PATCH /api/feedback/organizations/:id/approve
Authorization: Bearer <token> (admin)
```

#### Reject Organization (Admin)
```
PATCH /api/feedback/organizations/:id/reject
Authorization: Bearer <token> (admin)
```

## Service Layer

The API uses a service layer architecture for business logic:

### Services

- **ActivitiesService** - Activity management, filtering, pagination
- **UsersService** - User management, authorization, sanitization
- **RegistrationsService** - Registration management, validation
- **ReviewsService** - Review management, rating calculations
- **PreordersService** - Preorder management, promo codes
- **FeedbackService** - Feedback and organization suggestions

### BaseService

All services extend `BaseService` which provides:
- Consistent error handling
- Validation helpers (`_validateRequired`, `_validateType`, `_validateEnum`)
- Authorization checks (`_checkAuthorization`)
- String sanitization (`_sanitizeString`, `_sanitizeEmail`)

## Rate Limiting

Some endpoints have rate limiting:
- Authentication endpoints: 5 requests per 15 minutes
- Preorder endpoints: 10 requests per minute

## Caching

- Activities list: Cached for 5 minutes
- Individual activities: Cached for 10 minutes
- Use `?refresh=true` query parameter to bypass cache

## Testing

See `TESTING-SETUP-COMPLETE.md` for testing documentation.

## Support

For issues or questions, contact the development team.

