/**
 * Error Handling Middleware
 * 
 * Centralized error handling for consistent error responses across all routes.
 * Works with service layer error format.
 */

export function errorHandler(err, req, res, next) {
	// If response already sent, delegate to default Express error handler
	if (res.headersSent) {
		return next(err);
	}

	// Handle service layer errors (structured error objects)
	if (err.statusCode) {
		const errorResponse = {
			error: err.error || 'An error occurred',
			message: err.message || 'An unexpected error occurred',
			code: err.code || 'UNKNOWN_ERROR',
			timestamp: err.timestamp || new Date().toISOString()
		};

		// Add optional fields
		if (err.duration) errorResponse.duration = err.duration;
		if (err.missingFields) errorResponse.missingFields = err.missingFields;

		// Log error details (but not in production for security)
		if (process.env.NODE_ENV !== 'production') {
			console.error('Service Error:', {
				statusCode: err.statusCode,
				code: err.code,
				message: err.message,
				path: req.path,
				method: req.method
			});

			// Include stack trace in development
			if (err.originalError?.stack) {
				console.error('Stack:', err.originalError.stack);
			}
		}

		return res.status(err.statusCode).json(errorResponse);
	}

	// Handle validation errors (express-validator)
	if (err.array && typeof err.array === 'function') {
		const errors = err.array();
		return res.status(400).json({
			error: 'Validation failed',
			message: errors[0]?.msg || 'Invalid input',
			code: 'VALIDATION_ERROR',
			details: errors.map(e => ({
				field: e.path || e.param,
				message: e.msg,
				value: e.value
			})),
			timestamp: new Date().toISOString()
		});
	}

	// Handle JWT errors
	if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
		return res.status(401).json({
			error: 'Authentication failed',
			message: 'Invalid or expired token',
			code: 'AUTH_ERROR',
			timestamp: new Date().toISOString()
		});
	}

	// Handle unknown errors
	console.error('❌ Unhandled error:', {
		message: err.message,
		stack: err.stack,
		path: req.path,
		method: req.method
	});

	const isProduction = process.env.NODE_ENV === 'production';
	const statusCode = err.status || err.statusCode || 500;

	res.status(statusCode).json({
		error: 'Internal server error',
		message: isProduction 
			? 'An unexpected error occurred. Please try again later.'
			: err.message || 'An unexpected error occurred',
		code: 'INTERNAL_ERROR',
		timestamp: new Date().toISOString()
	});
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 */
export function asyncHandler(fn) {
	return (req, res, next) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
}

