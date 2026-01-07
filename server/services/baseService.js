/**
 * Base Service
 * 
 * Common functionality shared across all services.
 * Provides error handling, validation helpers, and common patterns.
 */

export class BaseService {
	constructor(dataStore) {
		this.store = dataStore;
	}

	/**
	 * Handle service errors consistently
	 * @protected
	 */
	_handleError(error, defaultMessage = 'An unexpected error occurred', defaultCode = 'SERVICE_ERROR') {
		console.error(`❌ Error in ${this.constructor.name}:`, error.message || error);

		// If error already has statusCode, return as-is
		if (error.statusCode) {
			return error;
		}

		// Determine status code from error type
		let statusCode = 500;
		if (error.message?.includes('not found')) {
			statusCode = 404;
		} else if (error.message?.includes('forbidden') || error.message?.includes('unauthorized')) {
			statusCode = 403;
		} else if (error.message?.includes('validation') || error.message?.includes('invalid')) {
			statusCode = 400;
		}

		return {
			statusCode,
			message: error.message || defaultMessage,
			code: error.code || defaultCode,
			originalError: error
		};
	}

	/**
	 * Validate required fields
	 * @protected
	 */
	_validateRequired(data, requiredFields) {
		const missing = requiredFields.filter(field => !data[field]);
		
		if (missing.length > 0) {
			throw {
				statusCode: 400,
				message: `Missing required fields: ${missing.join(', ')}`,
				code: 'VALIDATION_ERROR',
				missingFields: missing
			};
		}
	}

	/**
	 * Validate data types
	 * @protected
	 */
	_validateType(data, field, expectedType) {
		if (data[field] !== undefined && typeof data[field] !== expectedType) {
			throw {
				statusCode: 400,
				message: `Field '${field}' must be of type ${expectedType}`,
				code: 'VALIDATION_ERROR'
			};
		}
	}

	/**
	 * Validate enum values
	 * @protected
	 */
	_validateEnum(data, field, allowedValues) {
		if (data[field] !== undefined && !allowedValues.includes(data[field])) {
			throw {
				statusCode: 400,
				message: `Field '${field}' must be one of: ${allowedValues.join(', ')}`,
				code: 'VALIDATION_ERROR'
			};
		}
	}

	/**
	 * Check authorization
	 * @protected
	 */
	_checkAuthorization(user, resourceUserId, allowedRoles = ['admin']) {
		if (!user) {
			throw {
				statusCode: 401,
				message: 'Unauthorized',
				code: 'UNAUTHORIZED'
			};
		}

		const isAllowedRole = allowedRoles.includes(user.role);
		const isOwner = resourceUserId && user.id === resourceUserId;

		if (!isAllowedRole && !isOwner) {
			throw {
				statusCode: 403,
				message: 'Forbidden',
				code: 'FORBIDDEN'
			};
		}

		return true;
	}

	/**
	 * Sanitize string input
	 * @protected
	 */
	_sanitizeString(str, maxLength = null) {
		if (typeof str !== 'string') return str;
		let sanitized = str.trim();
		if (maxLength) {
			sanitized = sanitized.substring(0, maxLength);
		}
		return sanitized;
	}

	/**
	 * Sanitize email
	 * @protected
	 */
	_sanitizeEmail(email) {
		if (!email) return null;
		return email.trim().toLowerCase();
	}
}

