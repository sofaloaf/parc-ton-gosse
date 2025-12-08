/**
 * Instruction Parser
 * Parses natural language and structured JSON instructions into operations
 */

/**
 * Parse natural language instruction
 * Examples:
 * - "Update activity with id 'abc123' to set price to 50"
 * - "Add new activity: Soccer Training in 16e arrondissement"
 * - "Delete activity with id 'xyz789'"
 * - "Update all activities in category 'sports' to set ageMin to 5"
 */
export function parseNaturalLanguage(instruction) {
	const lower = instruction.toLowerCase().trim();
	
	// Update single activity by ID
	const updateByIdMatch = lower.match(/update\s+activity\s+(?:with\s+)?id\s+['"]?([^'"]+)['"]?\s+(?:to\s+)?(?:set\s+)?(.+)/i);
	if (updateByIdMatch) {
		const id = updateByIdMatch[1].trim();
		const updates = parseUpdates(updateByIdMatch[2]);
		return {
			action: 'update',
			target: { type: 'id', value: id },
			updates
		};
	}
	
	// Update by field match
	const updateByFieldMatch = lower.match(/update\s+(?:all\s+)?activities?\s+(?:where|in|with)\s+(.+?)\s+(?:to\s+)?(?:set\s+)?(.+)/i);
	if (updateByFieldMatch) {
		const condition = parseCondition(updateByFieldMatch[1]);
		const updates = parseUpdates(updateByFieldMatch[2]);
		return {
			action: 'update',
			target: { type: 'filter', condition },
			updates
		};
	}
	
	// Add new activity
	const addMatch = lower.match(/add\s+(?:new\s+)?activity:?\s*(.+)/i);
	if (addMatch) {
		const description = addMatch[1].trim();
		const activity = parseActivityDescription(description);
		return {
			action: 'create',
			data: activity
		};
	}
	
	// Delete by ID
	const deleteByIdMatch = lower.match(/delete\s+activity\s+(?:with\s+)?id\s+['"]?([^'"]+)['"]?/i);
	if (deleteByIdMatch) {
		return {
			action: 'delete',
			target: { type: 'id', value: deleteByIdMatch[1].trim() }
		};
	}
	
	// Delete by filter
	const deleteByFilterMatch = lower.match(/delete\s+(?:all\s+)?activities?\s+(?:where|in|with)\s+(.+)/i);
	if (deleteByFilterMatch) {
		const condition = parseCondition(deleteByFilterMatch[1]);
		return {
			action: 'delete',
			target: { type: 'filter', condition }
		};
	}
	
	// Bulk operations
	const bulkMatch = lower.match(/bulk\s+(update|delete|create)\s+(.+)/i);
	if (bulkMatch) {
		return {
			action: `bulk_${bulkMatch[1]}`,
			data: parseBulkData(bulkMatch[2])
		};
	}
	
	throw new Error(`Could not parse instruction: "${instruction}"`);
}

/**
 * Parse structured JSON instruction
 */
export function parseStructuredJSON(instruction) {
	if (typeof instruction === 'string') {
		try {
			instruction = JSON.parse(instruction);
		} catch (e) {
			throw new Error('Invalid JSON format');
		}
	}
	
	if (!instruction.action) {
		throw new Error('Missing "action" field in instruction');
	}
	
	const { action, target, data, updates, condition } = instruction;
	
	switch (action) {
		case 'update':
			if (!target && !condition) {
				throw new Error('Update action requires "target" or "condition"');
			}
			if (!updates && !data) {
				throw new Error('Update action requires "updates" or "data"');
			}
			return {
				action: 'update',
				target: target || { type: 'filter', condition },
				updates: updates || data
			};
		
		case 'create':
		case 'add':
			if (!data) {
				throw new Error('Create action requires "data"');
			}
			return {
				action: 'create',
				data: Array.isArray(data) ? data : [data]
			};
		
		case 'delete':
		case 'remove':
			if (!target && !condition) {
				throw new Error('Delete action requires "target" or "condition"');
			}
			return {
				action: 'delete',
				target: target || { type: 'filter', condition }
			};
		
		case 'bulk_update':
		case 'bulk_create':
		case 'bulk_delete':
			if (!data || !Array.isArray(data)) {
				throw new Error('Bulk action requires "data" array');
			}
			return {
				action,
				data
			};
		
		default:
			throw new Error(`Unknown action: ${action}`);
	}
}

/**
 * Parse instruction (auto-detect format)
 */
export function parseInstruction(instruction) {
	if (typeof instruction === 'string') {
		// Try JSON first
		if (instruction.trim().startsWith('{') || instruction.trim().startsWith('[')) {
			try {
				return parseStructuredJSON(instruction);
			} catch (e) {
				// Not valid JSON, try natural language
			}
		}
		// Try natural language
		return parseNaturalLanguage(instruction);
	} else if (typeof instruction === 'object') {
		// Already an object, parse as structured JSON
		return parseStructuredJSON(instruction);
	}
	
	throw new Error('Invalid instruction format');
}

/**
 * Parse update string (e.g., "price to 50, ageMin to 5")
 */
function parseUpdates(updateStr) {
	const updates = {};
	const pairs = updateStr.split(',').map(s => s.trim());
	
	for (const pair of pairs) {
		const match = pair.match(/(.+?)\s+(?:to|is|=\s*)(.+)/i);
		if (match) {
			const field = match[1].trim();
			let value = match[2].trim();
			
			// Remove quotes
			if ((value.startsWith('"') && value.endsWith('"')) || 
			    (value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
			}
			
			// Try to parse as number
			if (!isNaN(value) && value !== '') {
				value = Number(value);
			}
			// Try to parse as boolean
			else if (value.toLowerCase() === 'true') {
				value = true;
			}
			else if (value.toLowerCase() === 'false') {
				value = false;
			}
			
			updates[field] = value;
		}
	}
	
	return updates;
}

/**
 * Parse condition (e.g., "category is 'sports'", "neighborhood in '16e'")
 */
function parseCondition(conditionStr) {
	const condition = {};
	
	// Category match
	const categoryMatch = conditionStr.match(/category\s+(?:is|equals?|=\s*)['"]?([^'"]+)['"]?/i);
	if (categoryMatch) {
		condition.categories = categoryMatch[1].trim();
	}
	
	// Neighborhood match
	const neighborhoodMatch = conditionStr.match(/neighborhood\s+(?:is|equals?|=\s*|in\s+)['"]?([^'"]+)['"]?/i);
	if (neighborhoodMatch) {
		condition.neighborhood = neighborhoodMatch[1].trim();
	}
	
	// Age range
	const ageMinMatch = conditionStr.match(/ageMin\s+(?:is|equals?|=\s*|>=\s*)(\d+)/i);
	if (ageMinMatch) {
		condition.ageMin = Number(ageMinMatch[1]);
	}
	
	const ageMaxMatch = conditionStr.match(/ageMax\s+(?:is|equals?|=\s*|<=\s*)(\d+)/i);
	if (ageMaxMatch) {
		condition.ageMax = Number(ageMaxMatch[1]);
	}
	
	return condition;
}

/**
 * Parse activity description (basic - can be enhanced)
 */
function parseActivityDescription(description) {
	const activity = {
		title: { en: '', fr: '' },
		description: { en: '', fr: '' },
		categories: [],
		neighborhood: '',
		ageMin: 0,
		ageMax: 99,
		price: { amount: 0, currency: 'EUR' }
	};
	
	// Extract neighborhood (e.g., "16e", "16th arrondissement")
	const neighborhoodMatch = description.match(/(\d+)(?:e|th|ème)\s*(?:arrondissement|arr|district)?/i);
	if (neighborhoodMatch) {
		activity.neighborhood = `${neighborhoodMatch[1]}e`;
	}
	
	// Extract title (first part before "in" or comma)
	const titleMatch = description.match(/^([^,]+?)(?:\s+in\s+|\s*,|$)/i);
	if (titleMatch) {
		activity.title.en = titleMatch[1].trim();
		activity.title.fr = titleMatch[1].trim();
	}
	
	return activity;
}

/**
 * Parse bulk data
 */
function parseBulkData(dataStr) {
	// Try to parse as JSON array
	try {
		return JSON.parse(dataStr);
	} catch (e) {
		// Not JSON, return as single item array
		return [dataStr];
	}
}

