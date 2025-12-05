/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests when service is down
 */

export class CircuitBreaker {
	constructor(options = {}) {
		this.failureThreshold = options.failureThreshold || 5; // Open after 5 failures
		this.resetTimeout = options.resetTimeout || 30000; // Try again after 30s
		this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
		this.failureCount = 0;
		this.lastFailureTime = null;
		this.successCount = 0;
		this.name = options.name || 'CircuitBreaker';
	}

	/**
	 * Execute function with circuit breaker protection
	 */
	async execute(fn, fallback = null) {
		// Check if we should attempt to close the circuit
		if (this.state === 'OPEN') {
			if (Date.now() - this.lastFailureTime > this.resetTimeout) {
				this.state = 'HALF_OPEN';
				this.successCount = 0;
				console.log(`🔄 ${this.name}: Circuit breaker entering HALF_OPEN state`);
			} else {
				// Circuit is open - use fallback or throw error
				if (fallback) {
					console.log(`⚠️  ${this.name}: Circuit OPEN, using fallback`);
					return fallback();
				}
				throw new Error(`Circuit breaker is OPEN for ${this.name}`);
			}
		}

		try {
			const result = await fn();
			
			// Success - reset failure count
			if (this.state === 'HALF_OPEN') {
				this.successCount++;
				if (this.successCount >= 2) {
					// Two successes in a row - close the circuit
					this.state = 'CLOSED';
					this.failureCount = 0;
					this.successCount = 0;
					console.log(`✅ ${this.name}: Circuit breaker CLOSED (recovered)`);
				}
			} else {
				// Normal operation - reset failure count on success
				this.failureCount = 0;
			}
			
			return result;
		} catch (error) {
			this.failureCount++;
			this.lastFailureTime = Date.now();
			
			if (this.failureCount >= this.failureThreshold) {
				this.state = 'OPEN';
				console.error(`❌ ${this.name}: Circuit breaker OPENED after ${this.failureCount} failures`);
			}
			
			// If in half-open and we fail, go back to open
			if (this.state === 'HALF_OPEN') {
				this.state = 'OPEN';
				this.successCount = 0;
			}
			
			// Try fallback if available
			if (fallback) {
				console.log(`⚠️  ${this.name}: Error occurred, using fallback`);
				return fallback();
			}
			
			throw error;
		}
	}

	/**
	 * Get current state
	 */
	getState() {
		return {
			state: this.state,
			failureCount: this.failureCount,
			lastFailureTime: this.lastFailureTime,
			successCount: this.successCount
		};
	}

	/**
	 * Reset circuit breaker
	 */
	reset() {
		this.state = 'CLOSED';
		this.failureCount = 0;
		this.successCount = 0;
		this.lastFailureTime = null;
		console.log(`🔄 ${this.name}: Circuit breaker manually reset`);
	}
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff(fn, options = {}) {
	const maxRetries = options.maxRetries || 3;
	const initialDelay = options.initialDelay || 100;
	const maxDelay = options.maxDelay || 5000;
	const multiplier = options.multiplier || 2;
	
	let lastError;
	
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			
			// Don't retry on certain errors
			if (error.status === 404 || error.status === 401 || error.status === 403) {
				throw error;
			}
			
			// If this was the last attempt, throw
			if (attempt === maxRetries) {
				throw error;
			}
			
			// Calculate delay with exponential backoff
			const delay = Math.min(initialDelay * Math.pow(multiplier, attempt), maxDelay);
			
			// Add jitter (random variation)
			const jitter = Math.random() * delay * 0.1;
			const finalDelay = delay + jitter;
			
			console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(finalDelay)}ms`);
			await new Promise(resolve => setTimeout(resolve, finalDelay));
		}
	}
	
	throw lastError;
}

