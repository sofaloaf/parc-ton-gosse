# Testing Guide

## Overview

This project uses Jest for unit testing the service layer. Tests are located in `server/__tests__/` and follow a consistent structure.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPatterns=baseService.test.js

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
server/
├── __tests__/
│   ├── helpers/
│   │   ├── mockDataStore.js      # Mock data store and cache
│   │   └── mockCacheKeys.js      # Cache key mocks
│   └── services/
│       ├── baseService.test.js
│       ├── activitiesService.test.js
│       ├── usersService.test.js
│       ├── registrationsService.test.js
│       ├── reviewsService.test.js
│       ├── preordersService.test.js
│       └── feedbackService.test.js
├── jest.config.js                 # Jest configuration
└── jest.setup.js                  # Test setup
```

## Writing Tests

### Basic Test Structure

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MyService } from '../../services/myService.js';
import { createMockDataStore } from '../helpers/mockDataStore.js';

describe('MyService', () => {
  let service;
  let mockStore;

  beforeEach(() => {
    mockStore = createMockDataStore();
    service = new MyService(mockStore);
  });

  describe('myMethod', () => {
    it('should do something', async () => {
      // Arrange
      mockStore.myResource.get.mockResolvedValue({ id: 'test' });

      // Act
      const result = await service.myMethod('test-id', {});

      // Assert
      expect(result.id).toBe('test');
      expect(mockStore.myResource.get).toHaveBeenCalledWith('test-id');
    });
  });
});
```

### Mocking

#### Mock Data Store

```javascript
import { createMockDataStore } from '../helpers/mockDataStore.js';

const mockStore = createMockDataStore();
mockStore.activities.list.mockResolvedValue([...]);
```

#### Mock Cache

```javascript
import { createMockCache } from '../helpers/mockDataStore.js';

const mockCache = createMockCache();
mockCache.get.mockReturnValue(cachedData);
```

#### Mock Modules

```javascript
jest.unstable_mockModule('../../utils/myModule.js', () => ({
  myFunction: jest.fn().mockResolvedValue(true)
}));
```

### Testing Error Cases

```javascript
it('should throw 404 when resource not found', async () => {
  mockStore.resource.get.mockResolvedValue(null);

  await expect(service.get('non-existent', {})).rejects.toThrow();

  try {
    await service.get('non-existent', {});
  } catch (error) {
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('RESOURCE_NOT_FOUND');
  }
});
```

### Testing Authorization

```javascript
it('should allow admin to access resource', async () => {
  const result = await service.get('id', { user: { role: 'admin' } });
  expect(result).toBeDefined();
});

it('should throw 403 when user not authorized', async () => {
  await expect(
    service.get('id', { user: { id: 'other-user', role: 'user' } })
  ).rejects.toThrow();
});
```

## Test Coverage

Current coverage targets:
- **Branches**: 60%
- **Functions**: 60%
- **Lines**: 60%
- **Statements**: 60%

View coverage report:
```bash
npm run test:coverage
```

Coverage report is generated in `server/coverage/`.

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Use Mocks**: Mock external dependencies (data store, cache, APIs)
3. **Test Edge Cases**: Include error cases, boundary conditions
4. **Test Authorization**: Verify role-based access controls
5. **Test Validation**: Verify input validation works correctly
6. **Use Descriptive Names**: Test names should describe what they test
7. **Arrange-Act-Assert**: Follow AAA pattern for test structure

## Common Patterns

### Testing Service Methods

```javascript
describe('myMethod', () => {
  it('should return expected result', async () => {
    // Arrange
    const input = { ... };
    const expected = { ... };
    mockStore.resource.method.mockResolvedValue(expected);

    // Act
    const result = await service.myMethod(input, {});

    // Assert
    expect(result).toEqual(expected);
    expect(mockStore.resource.method).toHaveBeenCalledWith(input);
  });
});
```

### Testing Filtering

```javascript
it('should filter by category', async () => {
  const items = [
    { id: '1', category: 'sports' },
    { id: '2', category: 'arts' }
  ];
  mockStore.items.list.mockResolvedValue(items);

  const result = await service.list({ category: 'sports' }, {});

  expect(result.every(item => item.category === 'sports')).toBe(true);
});
```

### Testing Pagination

```javascript
it('should paginate results', async () => {
  const items = Array.from({ length: 100 }, (_, i) => ({ id: `item-${i}` }));
  mockStore.items.list.mockResolvedValue(items);

  const result = await service.list({}, { limit: 10, offset: 0 }, {});

  expect(result.data).toHaveLength(10);
  expect(result.pagination.total).toBe(100);
  expect(result.pagination.hasMore).toBe(true);
});
```

## Troubleshooting

### Tests Failing with "jest is not defined"

Import jest from `@jest/globals`:
```javascript
import { jest } from '@jest/globals';
```

### ES Module Import Errors

Ensure Jest is configured for ES modules in `jest.config.js` and use `NODE_OPTIONS=--experimental-vm-modules` in test scripts.

### Cache Mocking Issues

For services that use cache, pass a mock cache to the constructor:
```javascript
const mockCache = createMockCache();
const service = new ActivitiesService(mockStore, mockCache);
```

## Continuous Integration

Tests should run automatically in CI/CD pipelines. Ensure:
- All tests pass before merging
- Coverage thresholds are met
- No console errors in test output

## Next Steps

- Add integration tests for route + service combinations
- Add end-to-end tests for critical user flows
- Add performance tests for high-traffic endpoints
- Add security tests for authorization and validation

