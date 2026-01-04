/**
 * Validation Module
 * 
 * Handles data validation, quality checks, and deduplication
 */

export class ValidationModule {
	constructor(options = {}) {
		this.minConfidence = options.minConfidence || 0.3;
		this.deduplicationThreshold = options.deduplicationThreshold || 0.85;
	}

	/**
	 * Validate extracted data
	 */
	validate(data) {
		const issues = [];
		const warnings = [];

		// Required fields check
		if (!data.name && !data.title && !data.heading) {
			issues.push('Missing name/title');
		}

		// Email validation
		if (data.email && !this.isValidEmail(data.email)) {
			warnings.push('Invalid email format');
			data.email = null;
		}

		// Phone validation
		if (data.phone && !this.isValidPhone(data.phone)) {
			warnings.push('Invalid phone format');
			data.phone = null;
		}

		// URL validation
		if (data.website && !this.isValidUrl(data.website)) {
			warnings.push('Invalid website URL');
			data.website = null;
		}

		// Address validation
		if (data.address && data.address.length < 10) {
			warnings.push('Address seems too short');
		}

		// Confidence check
		if (data.confidence < this.minConfidence) {
			issues.push(`Low confidence: ${data.confidence}`);
		}

		return {
			valid: issues.length === 0,
			issues,
			warnings,
			score: this.calculateQualityScore(data, issues, warnings)
		};
	}

	/**
	 * Deduplicate entities based on similarity
	 */
	deduplicate(entities) {
		const unique = [];
		const seen = new Set();

		for (const entity of entities) {
			let isDuplicate = false;

			for (const existing of unique) {
				const similarity = this.calculateSimilarity(entity, existing);
				
				if (similarity >= this.deduplicationThreshold) {
					// Merge entities (keep the one with higher confidence)
					if (entity.confidence > existing.confidence) {
						const index = unique.indexOf(existing);
						unique[index] = this.mergeEntities(existing, entity);
					}
					isDuplicate = true;
					break;
				}
			}

			if (!isDuplicate) {
				unique.push(entity);
			}
		}

		return unique;
	}

	/**
	 * Calculate similarity between two entities
	 */
	calculateSimilarity(entity1, entity2) {
		let score = 0;
		let maxScore = 0;

		// Name similarity (highest weight)
		const name1 = (entity1.name || entity1.title || '').toLowerCase();
		const name2 = (entity2.name || entity2.title || '').toLowerCase();
		if (name1 && name2) {
			const nameSim = this.stringSimilarity(name1, name2);
			score += nameSim * 0.4;
			maxScore += 0.4;
		}

		// Email match
		if (entity1.email && entity2.email && entity1.email === entity2.email) {
			score += 0.3;
			maxScore += 0.3;
		}

		// Phone match
		if (entity1.phone && entity2.phone && this.normalizePhone(entity1.phone) === this.normalizePhone(entity2.phone)) {
			score += 0.2;
			maxScore += 0.2;
		}

		// Website match
		if (entity1.website && entity2.website) {
			try {
				const url1 = new URL(entity1.website).hostname;
				const url2 = new URL(entity2.website).hostname;
				if (url1 === url2) {
					score += 0.1;
					maxScore += 0.1;
				}
			} catch {
				// Invalid URLs, skip
			}
		}

		return maxScore > 0 ? score / maxScore : 0;
	}

	/**
	 * String similarity using Levenshtein distance
	 */
	stringSimilarity(str1, str2) {
		const longer = str1.length > str2.length ? str1 : str2;
		const shorter = str1.length > str2.length ? str2 : str1;
		
		if (longer.length === 0) return 1.0;
		
		const distance = this.levenshteinDistance(longer, shorter);
		return (longer.length - distance) / longer.length;
	}

	/**
	 * Levenshtein distance calculation
	 */
	levenshteinDistance(str1, str2) {
		const matrix = [];
		
		for (let i = 0; i <= str2.length; i++) {
			matrix[i] = [i];
		}
		
		for (let j = 0; j <= str1.length; j++) {
			matrix[0][j] = j;
		}
		
		for (let i = 1; i <= str2.length; i++) {
			for (let j = 1; j <= str1.length; j++) {
				if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
					matrix[i][j] = matrix[i - 1][j - 1];
				} else {
					matrix[i][j] = Math.min(
						matrix[i - 1][j - 1] + 1,
						matrix[i][j - 1] + 1,
						matrix[i - 1][j] + 1
					);
				}
			}
		}
		
		return matrix[str2.length][str1.length];
	}

	/**
	 * Merge two entities (keep best data from both)
	 */
	mergeEntities(entity1, entity2) {
		const merged = { ...entity1 };
		
		// Keep higher confidence
		if (entity2.confidence > entity1.confidence) {
			merged.confidence = entity2.confidence;
		}

		// Merge data (prefer non-null values)
		for (const [key, value] of Object.entries(entity2.data || {})) {
			if (!merged.data[key] || (value && !merged.data[key])) {
				merged.data = merged.data || {};
				merged.data[key] = value;
			}
		}

		// Merge sources
		if (entity2.sources) {
			merged.sources = [...(merged.sources || []), ...entity2.sources];
		}

		return merged;
	}

	/**
	 * Calculate quality score
	 */
	calculateQualityScore(data, issues, warnings) {
		let score = 1.0;
		
		// Deduct for issues
		score -= issues.length * 0.2;
		
		// Deduct for warnings
		score -= warnings.length * 0.1;
		
		// Boost for completeness
		const fields = ['name', 'description', 'email', 'phone', 'address', 'website'];
		const filledFields = fields.filter(f => data[f] && data[f].trim().length > 0).length;
		score += (filledFields / fields.length) * 0.2;
		
		return Math.max(0, Math.min(1, score));
	}

	/**
	 * Validate email format
	 */
	isValidEmail(email) {
		const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		return pattern.test(email);
	}

	/**
	 * Validate phone format (French)
	 */
	isValidPhone(phone) {
		const pattern = /(?:\+33|0)[1-9](?:[.\s]?\d{2}){4}/;
		return pattern.test(phone);
	}

	/**
	 * Validate URL format
	 */
	isValidUrl(url) {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Normalize phone number for comparison
	 */
	normalizePhone(phone) {
		return phone.replace(/[.\s-]/g, '').replace(/^\+33/, '0');
	}
}

