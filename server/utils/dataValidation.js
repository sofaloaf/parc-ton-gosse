/**
 * Data Validation Utilities
 * 
 * Validates and sanitizes enriched data fields:
 * - Email validation (format + domain check)
 * - Phone validation (French format)
 * - URL validation (accessibility check)
 * - Age range validation
 * - Price validation
 * - Address validation (Paris postal codes)
 */

/**
 * Validate email format and domain
 */
export function validateEmail(email) {
	if (!email || typeof email !== 'string') {
		return { valid: false, error: 'Email is required' };
	}
	
	const trimmed = email.trim().toLowerCase();
	
	// Basic format validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(trimmed)) {
		return { valid: false, error: 'Invalid email format' };
	}
	
	// Check for common invalid patterns
	if (trimmed.includes('..') || trimmed.startsWith('.') || trimmed.endsWith('.')) {
		return { valid: false, error: 'Invalid email format (consecutive dots or leading/trailing dot)' };
	}
	
	// Domain validation (basic check)
	const domain = trimmed.split('@')[1];
	if (!domain || domain.length < 3) {
		return { valid: false, error: 'Invalid domain' };
	}
	
	// Check for common temporary/disposable email domains
	const disposableDomains = [
		'10minutemail.com', 'tempmail.com', 'guerrillamail.com',
		'mailinator.com', 'throwaway.email', 'temp-mail.org'
	];
	if (disposableDomains.some(d => domain.includes(d))) {
		return { valid: false, error: 'Disposable email domain not allowed' };
	}
	
	return { valid: true, sanitized: trimmed };
}

/**
 * Validate French phone number
 * Formats: +33 X XX XX XX XX, 0X XX XX XX XX, +33XXXXXXXXX, 0XXXXXXXXX
 */
export function validatePhone(phone) {
	if (!phone || typeof phone !== 'string') {
		return { valid: false, error: 'Phone is required' };
	}
	
	// Remove all spaces, dots, dashes, parentheses
	let cleaned = phone.replace(/[\s\.\-\(\)]/g, '');
	
	// Convert to international format
	if (cleaned.startsWith('0')) {
		// French national format: 0X XX XX XX XX -> +33 X XX XX XX XX
		cleaned = '+33' + cleaned.substring(1);
	} else if (!cleaned.startsWith('+33')) {
		// Assume it's missing +33 prefix
		if (cleaned.length === 9 && cleaned.match(/^[1-9]/)) {
			cleaned = '+33' + cleaned;
		} else {
			return { valid: false, error: 'Invalid French phone format' };
		}
	}
	
	// Validate format: +33 followed by 9 digits (first digit should be 1-9, not 0)
	const phoneRegex = /^\+33[1-9]\d{8}$/;
	if (!phoneRegex.test(cleaned)) {
		return { valid: false, error: 'Invalid French phone number format' };
	}
	
	// Format nicely: +33 X XX XX XX XX
	const formatted = '+33 ' + cleaned.substring(3).match(/.{1,2}/g).join(' ');
	
	return { valid: true, sanitized: cleaned, formatted };
}

/**
 * Validate URL format and check accessibility
 */
export async function validateUrl(url, checkAccessibility = false) {
	if (!url || typeof url !== 'string') {
		return { valid: false, error: 'URL is required' };
	}
	
	let cleaned = url.trim();
	
	// Add https:// if no protocol
	if (!cleaned.match(/^https?:\/\//i)) {
		cleaned = 'https://' + cleaned;
	}
	
	// Basic URL format validation
	try {
		const urlObj = new URL(cleaned);
		if (!['http:', 'https:'].includes(urlObj.protocol)) {
			return { valid: false, error: 'URL must use HTTP or HTTPS' };
		}
		
		if (!urlObj.hostname || urlObj.hostname.length < 3) {
			return { valid: false, error: 'Invalid hostname' };
		}
	} catch (error) {
		return { valid: false, error: 'Invalid URL format' };
	}
	
	// Optional: Check accessibility
	if (checkAccessibility) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);
			
			const fetch = (await import('node-fetch')).default;
			const response = await fetch(cleaned, {
				method: 'HEAD',
				signal: controller.signal,
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; ParcTonGosse/1.0)'
				}
			});
			
			clearTimeout(timeoutId);
			
			if (response.status >= 400) {
				return { valid: false, error: `URL returned status ${response.status}` };
			}
		} catch (error) {
			if (error.name !== 'AbortError') {
				// Don't fail validation for network errors, just warn
				console.warn(`  ⚠️  Could not verify URL accessibility: ${error.message}`);
			}
		}
	}
	
	return { valid: true, sanitized: cleaned };
}

/**
 * Validate age range
 */
export function validateAgeRange(minAge, maxAge) {
	const min = minAge !== undefined && minAge !== null ? Number(minAge) : null;
	const max = maxAge !== undefined && maxAge !== null ? Number(maxAge) : null;
	
	if (min !== null && (isNaN(min) || min < 0 || min > 18)) {
		return { valid: false, error: 'Min age must be between 0 and 18' };
	}
	
	if (max !== null && (isNaN(max) || max < 0 || max > 18)) {
		return { valid: false, error: 'Max age must be between 0 and 18' };
	}
	
	if (min !== null && max !== null && min > max) {
		return { valid: false, error: 'Min age cannot be greater than max age' };
	}
	
	return { 
		valid: true, 
		sanitized: { 
			minAge: min !== null ? min : undefined, 
			maxAge: max !== null ? max : undefined 
		} 
	};
}

/**
 * Validate price
 */
export function validatePrice(price, currency = 'EUR') {
	if (price === undefined || price === null || price === '') {
		return { valid: true, sanitized: null }; // Price is optional
	}
	
	const numPrice = Number(price);
	if (isNaN(numPrice) || numPrice < 0) {
		return { valid: false, error: 'Price must be a non-negative number' };
	}
	
	// Round to 2 decimal places
	const rounded = Math.round(numPrice * 100) / 100;
	
	return { 
		valid: true, 
		sanitized: { 
			amount: rounded, 
			currency: currency.toUpperCase() 
		} 
	};
}

/**
 * Validate Paris address (postal code)
 */
export function validateAddress(address) {
	if (!address || typeof address !== 'string') {
		return { valid: true, sanitized: address || '' }; // Address is optional
	}
	
	const trimmed = address.trim();
	
	// Check for Paris postal codes (75001-75020)
	const postalCodeMatch = trimmed.match(/\b750([0-1][0-9]|20)\b/);
	if (postalCodeMatch) {
		return { valid: true, sanitized: trimmed, postalCode: postalCodeMatch[0] };
	}
	
	// Address doesn't have to be in Paris (could be in suburbs)
	// Just validate it's not empty
	return { valid: true, sanitized: trimmed };
}

/**
 * Extract postal code from address
 */
export function extractPostalCode(address) {
	if (!address || typeof address !== 'string') {
		return null;
	}
	
	const match = address.match(/\b750([0-1][0-9]|20)\b/);
	return match ? match[0] : null;
}

/**
 * Validate all fields for an activity
 */
export function validateActivityFields(activity) {
	const errors = {};
	const sanitized = { ...activity };
	
	// Validate email
	if (activity.contactEmail) {
		const emailValidation = validateEmail(activity.contactEmail);
		if (!emailValidation.valid) {
			errors.contactEmail = emailValidation.error;
		} else {
			sanitized.contactEmail = emailValidation.sanitized;
		}
	}
	
	// Validate phone
	if (activity.contactPhone) {
		const phoneValidation = validatePhone(activity.contactPhone);
		if (!phoneValidation.valid) {
			errors.contactPhone = phoneValidation.error;
		} else {
			sanitized.contactPhone = phoneValidation.formatted || phoneValidation.sanitized;
		}
	}
	
	// Validate website URL (async - will need to be handled separately)
	// validateUrl is async, so we'll handle it in the enrichment pipeline
	
	// Validate age range
	const ageValidation = validateAgeRange(activity.ageMin, activity.ageMax);
	if (!ageValidation.valid) {
		errors.ageRange = ageValidation.error;
	} else {
		if (ageValidation.sanitized.minAge !== undefined) {
			sanitized.ageMin = ageValidation.sanitized.minAge;
		}
		if (ageValidation.sanitized.maxAge !== undefined) {
			sanitized.ageMax = ageValidation.sanitized.maxAge;
		}
	}
	
	// Validate price
	const priceValidation = validatePrice(activity.price?.amount || activity.price, activity.price?.currency);
	if (!priceValidation.valid) {
		errors.price = priceValidation.error;
	} else if (priceValidation.sanitized) {
		sanitized.price = priceValidation.sanitized;
	}
	
	// Validate address
	const addressValidation = validateAddress(activity.addresses || activity.address);
	if (!addressValidation.valid) {
		errors.address = addressValidation.error;
	} else {
		if (activity.addresses) {
			sanitized.addresses = addressValidation.sanitized;
		} else if (activity.address) {
			sanitized.address = addressValidation.sanitized;
		}
	}
	
	return {
		valid: Object.keys(errors).length === 0,
		errors,
		sanitized
	};
}

