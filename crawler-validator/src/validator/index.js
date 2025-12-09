/**
 * Activity Validator
 * Validates and normalizes activity data
 */

/**
 * Validate an array of activities
 * @param {Array} activities - Raw activities to validate
 * @returns {Promise<Array>} Validated activities with validation results
 */
export async function validateActivities(activities) {
  console.log('✅ Validator: Starting validation...');
  
  const validated = activities.map(activity => {
    const result = {
      ...activity,
      valid: true,
      errors: [],
      warnings: []
    };

    // Validate required fields (handle both old and cleaned formats)
    const hasTitle = (activity.title && typeof activity.title === 'string' && activity.title.trim().length > 0) ||
                     (activity.title_en && typeof activity.title_en === 'string' && activity.title_en.trim().length > 0) ||
                     (activity.title_fr && typeof activity.title_fr === 'string' && activity.title_fr.trim().length > 0);
    
    if (!hasTitle) {
      result.valid = false;
      result.errors.push('Missing or invalid title (need title, title_en, or title_fr)');
    }

    const hasDescription = (activity.description && typeof activity.description === 'string' && activity.description.trim().length > 0) ||
                          (activity.description_en && typeof activity.description_en === 'string' && activity.description_en.trim().length > 0) ||
                          (activity.description_fr && typeof activity.description_fr === 'string' && activity.description_fr.trim().length > 0);
    
    if (!hasDescription) {
      result.warnings.push('Missing description');
    }

    // Validate categories
    if (!Array.isArray(activity.categories) || activity.categories.length === 0) {
      result.warnings.push('Missing categories');
    }

    // Validate age range
    if (activity.ageMin !== undefined && (typeof activity.ageMin !== 'number' || activity.ageMin < 0)) {
      result.errors.push('Invalid ageMin');
      result.valid = false;
    }

    if (activity.ageMax !== undefined && (typeof activity.ageMax !== 'number' || activity.ageMax < 0)) {
      result.errors.push('Invalid ageMax');
      result.valid = false;
    }

    if (activity.ageMin !== undefined && activity.ageMax !== undefined && activity.ageMin > activity.ageMax) {
      result.errors.push('ageMin cannot be greater than ageMax');
      result.valid = false;
    }

    // Validate price
    if (activity.price) {
      if (typeof activity.price === 'object') {
        if (typeof activity.price.amount !== 'number' || activity.price.amount < 0) {
          result.warnings.push('Invalid price amount');
        }
        if (!activity.price.currency || typeof activity.price.currency !== 'string') {
          result.warnings.push('Missing price currency');
        }
      } else if (typeof activity.price !== 'number') {
        result.warnings.push('Price should be a number or object with amount/currency');
      }
    }

    // Validate addresses
    if (activity.addresses) {
      if (!Array.isArray(activity.addresses)) {
        result.warnings.push('Addresses should be an array');
      }
    }

    // Validate URLs
    if (activity.websiteLink && !isValidUrl(activity.websiteLink)) {
      result.warnings.push('Invalid websiteLink URL');
    }

    if (activity.registrationLink && !isValidUrl(activity.registrationLink)) {
      result.warnings.push('Invalid registrationLink URL');
    }

    return result;
  });

  const validCount = validated.filter(a => a.valid).length;
  const invalidCount = validated.filter(a => !a.valid).length;
  
  console.log(`✅ Validator: ${validCount} valid, ${invalidCount} invalid`);

  return validated;
}

/**
 * Normalize activity data to standard format
 * @param {Object} activity - Activity to normalize
 * @returns {Object} Normalized activity
 */
export function normalizeActivity(activity) {
  const normalized = { ...activity };

  // Normalize title (ensure it's an object with en/fr if needed)
  if (typeof normalized.title === 'string') {
    normalized.title = {
      en: normalized.title,
      fr: normalized.title
    };
  }

  // Normalize description
  if (typeof normalized.description === 'string') {
    normalized.description = {
      en: normalized.description,
      fr: normalized.description
    };
  }

  // Normalize price
  if (typeof normalized.price === 'number') {
    normalized.price = {
      amount: normalized.price,
      currency: 'EUR'
    };
  }

  // Normalize categories (ensure array)
  if (!Array.isArray(normalized.categories)) {
    normalized.categories = normalized.categories ? [normalized.categories] : [];
  }

  // Normalize addresses (ensure array)
  if (!Array.isArray(normalized.addresses)) {
    normalized.addresses = normalized.addresses ? [normalized.addresses] : [];
  }

  return normalized;
}

/**
 * Check if a string is a valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

