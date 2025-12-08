/**
 * Activity Data Validator
 * Validates activity data before writing to Google Sheets
 */

/**
 * Validate activity data
 */
export function validateActivity(activity, isUpdate = false) {
	const errors = [];
	const warnings = [];
	
	// Required fields for new activities
	if (!isUpdate) {
		if (!activity.id) {
			errors.push('Missing required field: id');
		}
	}
	
	// Title validation
	if (activity.title) {
		if (typeof activity.title === 'object') {
			if (!activity.title.en && !activity.title.fr) {
				errors.push('Title must have at least en or fr');
			}
		} else if (typeof activity.title === 'string') {
			if (!activity.title.trim()) {
				errors.push('Title cannot be empty');
			}
		} else {
			errors.push('Title must be a string or object with en/fr');
		}
	} else if (!isUpdate) {
		errors.push('Missing required field: title');
	}
	
	// Description validation (optional but validate format if present)
	if (activity.description) {
		if (typeof activity.description === 'object') {
			// OK - bilingual format
		} else if (typeof activity.description !== 'string') {
			errors.push('Description must be a string or object with en/fr');
		}
	}
	
	// Categories validation
	if (activity.categories) {
		if (!Array.isArray(activity.categories)) {
			if (typeof activity.categories === 'string') {
				// Will be converted to array
			} else {
				errors.push('Categories must be an array or comma-separated string');
			}
		}
	}
	
	// Age validation
	if (activity.ageMin !== undefined) {
		const ageMin = Number(activity.ageMin);
		if (isNaN(ageMin) || ageMin < 0 || ageMin > 18) {
			errors.push('ageMin must be a number between 0 and 18');
		}
	}
	
	if (activity.ageMax !== undefined) {
		const ageMax = Number(activity.ageMax);
		if (isNaN(ageMax) || ageMax < 0 || ageMax > 18) {
			errors.push('ageMax must be a number between 0 and 18');
		}
	}
	
	// Age range validation
	if (activity.ageMin !== undefined && activity.ageMax !== undefined) {
		if (Number(activity.ageMin) > Number(activity.ageMax)) {
			errors.push('ageMin cannot be greater than ageMax');
		}
	}
	
	// Price validation
	if (activity.price !== undefined) {
		if (typeof activity.price === 'object') {
			if (activity.price.amount !== undefined) {
				const amount = Number(activity.price.amount);
				if (isNaN(amount) || amount < 0) {
					errors.push('Price amount must be a non-negative number');
				}
			}
			if (activity.price.currency && typeof activity.price.currency !== 'string') {
				errors.push('Price currency must be a string');
			}
		} else if (typeof activity.price === 'number') {
			if (activity.price < 0) {
				errors.push('Price must be a non-negative number');
			}
		} else {
			errors.push('Price must be a number or object with amount/currency');
		}
	}
	
	// Neighborhood validation
	if (activity.neighborhood && typeof activity.neighborhood !== 'string') {
		errors.push('Neighborhood must be a string');
	}
	
	// Email validation
	if (activity.contactEmail) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(activity.contactEmail)) {
			errors.push('Invalid email format for contactEmail');
		}
	}
	
	// URL validation
	if (activity.websiteLink) {
		try {
			new URL(activity.websiteLink);
		} catch (e) {
			errors.push('Invalid URL format for websiteLink');
		}
	}
	
	if (activity.registrationLink) {
		try {
			new URL(activity.registrationLink);
		} catch (e) {
			errors.push('Invalid URL format for registrationLink');
		}
	}
	
	// Warnings (non-blocking)
	if (!activity.description) {
		warnings.push('No description provided');
	}
	if (!activity.categories || (Array.isArray(activity.categories) && activity.categories.length === 0)) {
		warnings.push('No categories provided');
	}
	if (!activity.neighborhood) {
		warnings.push('No neighborhood provided');
	}
	
	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * Normalize activity data (convert formats, set defaults)
 */
export function normalizeActivity(activity) {
	const normalized = { ...activity };
	
	// ID will be set by caller if needed
	
	// Normalize title
	if (typeof normalized.title === 'string') {
		normalized.title = {
			en: normalized.title,
			fr: normalized.title
		};
	} else if (normalized.title && typeof normalized.title === 'object') {
		normalized.title = {
			en: normalized.title.en || normalized.title.en || '',
			fr: normalized.title.fr || normalized.title.fr || ''
		};
	}
	
	// Normalize description
	if (typeof normalized.description === 'string') {
		normalized.description = {
			en: normalized.description,
			fr: normalized.description
		};
	} else if (normalized.description && typeof normalized.description === 'object') {
		normalized.description = {
			en: normalized.description.en || '',
			fr: normalized.description.fr || ''
		};
	}
	
	// Normalize categories
	if (typeof normalized.categories === 'string') {
		normalized.categories = normalized.categories.split(',').map(s => s.trim()).filter(s => s);
	} else if (!Array.isArray(normalized.categories)) {
		normalized.categories = [];
	}
	
	// Normalize price
	if (typeof normalized.price === 'number') {
		normalized.price = {
			amount: normalized.price,
			currency: 'EUR'
		};
	} else if (!normalized.price || typeof normalized.price !== 'object') {
		normalized.price = { amount: 0, currency: 'EUR' };
	}
	
	// Set defaults
	if (!normalized.ageMin) normalized.ageMin = 0;
	if (!normalized.ageMax) normalized.ageMax = 99;
	if (!normalized.createdAt) normalized.createdAt = new Date().toISOString();
	normalized.updatedAt = new Date().toISOString();
	
	return normalized;
}

