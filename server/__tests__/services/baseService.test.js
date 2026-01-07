/**
 * BaseService Unit Tests
 * 
 * Tests for common service patterns and utilities
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BaseService } from '../../services/baseService.js';

// Create a concrete implementation for testing
class TestService extends BaseService {
	constructor(dataStore) {
		super(dataStore);
	}
}

describe('BaseService', () => {
	let service;
	let mockStore;

	beforeEach(() => {
		mockStore = { test: 'store' };
		service = new TestService(mockStore);
	});

	describe('_handleError', () => {
		it('should return error with statusCode as-is', () => {
			const error = {
				statusCode: 404,
				message: 'Not found',
				code: 'NOT_FOUND'
			};

			const result = service._handleError(error);
			expect(result).toEqual(error);
		});

		it('should wrap error without statusCode', () => {
			const error = new Error('Something went wrong');
			const result = service._handleError(error, 'Default message', 'DEFAULT_CODE');

			expect(result.statusCode).toBe(500);
			expect(result.message).toBe('Something went wrong');
			expect(result.code).toBe('DEFAULT_CODE');
			expect(result.originalError).toBe(error);
		});

		it('should determine status code from error message', () => {
			const error = new Error('Resource not found');
			const result = service._handleError(error);

			expect(result.statusCode).toBe(404);
		});

		it('should determine 403 for forbidden errors', () => {
			const error = new Error('Access forbidden');
			const result = service._handleError(error);

			expect(result.statusCode).toBe(403);
		});

		it('should determine 400 for validation errors', () => {
			const error = new Error('Invalid input validation');
			const result = service._handleError(error);

			expect(result.statusCode).toBe(400);
		});
	});

	describe('_validateRequired', () => {
		it('should pass when all required fields are present', () => {
			const data = { name: 'Test', email: 'test@example.com' };
			expect(() => {
				service._validateRequired(data, ['name', 'email']);
			}).not.toThrow();
		});

		it('should throw when required fields are missing', () => {
			const data = { name: 'Test' };
			expect(() => {
				service._validateRequired(data, ['name', 'email']);
			}).toThrow();

			try {
				service._validateRequired(data, ['name', 'email']);
			} catch (error) {
				expect(error.statusCode).toBe(400);
				expect(error.code).toBe('VALIDATION_ERROR');
				expect(error.missingFields).toEqual(['email']);
			}
		});
	});

	describe('_validateType', () => {
		it('should pass when type matches', () => {
			const data = { age: 25 };
			expect(() => {
				service._validateType(data, 'age', 'number');
			}).not.toThrow();
		});

		it('should throw when type does not match', () => {
			const data = { age: '25' };
			expect(() => {
				service._validateType(data, 'age', 'number');
			}).toThrow();

			try {
				service._validateType(data, 'age', 'number');
			} catch (error) {
				expect(error.statusCode).toBe(400);
				expect(error.code).toBe('VALIDATION_ERROR');
			}
		});

		it('should pass when field is undefined', () => {
			const data = {};
			expect(() => {
				service._validateType(data, 'age', 'number');
			}).not.toThrow();
		});
	});

	describe('_validateEnum', () => {
		it('should pass when value is in allowed list', () => {
			const data = { role: 'admin' };
			expect(() => {
				service._validateEnum(data, 'role', ['admin', 'user']);
			}).not.toThrow();
		});

		it('should throw when value is not in allowed list', () => {
			const data = { role: 'invalid' };
			expect(() => {
				service._validateEnum(data, 'role', ['admin', 'user']);
			}).toThrow();

			try {
				service._validateEnum(data, 'role', ['admin', 'user']);
			} catch (error) {
				expect(error.statusCode).toBe(400);
				expect(error.code).toBe('VALIDATION_ERROR');
			}
		});

		it('should pass when field is undefined', () => {
			const data = {};
			expect(() => {
				service._validateEnum(data, 'role', ['admin', 'user']);
			}).not.toThrow();
		});
	});

	describe('_checkAuthorization', () => {
		it('should pass for admin role', () => {
			const user = { id: 'user-1', role: 'admin' };
			expect(() => {
				service._checkAuthorization(user, 'user-2', ['admin']);
			}).not.toThrow();
		});

		it('should pass when user is owner', () => {
			const user = { id: 'user-1', role: 'user' };
			expect(() => {
				service._checkAuthorization(user, 'user-1', ['admin']);
			}).not.toThrow();
		});

		it('should throw 401 when user is not provided', () => {
			expect(() => {
				service._checkAuthorization(null, 'user-1', ['admin']);
			}).toThrow();

			try {
				service._checkAuthorization(null, 'user-1', ['admin']);
			} catch (error) {
				expect(error.statusCode).toBe(401);
				expect(error.code).toBe('UNAUTHORIZED');
			}
		});

		it('should throw 403 when user is not authorized', () => {
			const user = { id: 'user-1', role: 'user' };
			expect(() => {
				service._checkAuthorization(user, 'user-2', ['admin']);
			}).toThrow();

			try {
				service._checkAuthorization(user, 'user-2', ['admin']);
			} catch (error) {
				expect(error.statusCode).toBe(403);
				expect(error.code).toBe('FORBIDDEN');
			}
		});
	});

	describe('_sanitizeString', () => {
		it('should trim whitespace', () => {
			const result = service._sanitizeString('  test  ');
			expect(result).toBe('test');
		});

		it('should limit length', () => {
			const result = service._sanitizeString('a'.repeat(100), 50);
			expect(result).toHaveLength(50);
		});

		it('should return non-strings as-is', () => {
			const result = service._sanitizeString(123);
			expect(result).toBe(123);
		});
	});

	describe('_sanitizeEmail', () => {
		it('should lowercase and trim email', () => {
			const result = service._sanitizeEmail('  TEST@EXAMPLE.COM  ');
			expect(result).toBe('test@example.com');
		});

		it('should return null for empty input', () => {
			const result = service._sanitizeEmail('');
			expect(result).toBeNull();
		});

		it('should return null for null input', () => {
			const result = service._sanitizeEmail(null);
			expect(result).toBeNull();
		});
	});
});

