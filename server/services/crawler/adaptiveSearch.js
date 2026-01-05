/**
 * Adaptive Search Strategy
 * 
 * Learns from rejections and adapts search strategies:
 * - Cycles through different keyword/activity combinations
 * - Tracks which searches yield approved vs rejected results
 * - Prioritizes successful search patterns
 * - Explores new combinations when current ones fail
 */

export class AdaptiveSearchStrategy {
	constructor(options = {}) {
		this.rejectedPatterns = new Set(); // Patterns that led to rejections
		this.approvedPatterns = new Map(); // Patterns that led to approvals (with success rate)
		this.searchHistory = []; // History of searches and their outcomes
		this.cycleIndex = 0; // Current position in keyword cycling
		this.maxRejectionsPerPattern = 3; // Stop using pattern after N rejections
	}

	/**
	 * Get next search strategy based on learning
	 * @param {Object} context - Current search context (arrondissement, etc.)
	 * @returns {Object} Search strategy with keywords, sources, and approach
	 */
	getNextStrategy(context) {
		const arrondissement = context.arrondissement || '20e';
		
		// Analyze recent rejections to avoid repeating failed patterns
		const recentRejections = this.searchHistory
			.filter(h => h.outcome === 'rejected')
			.slice(-20); // Last 20 rejections
		
		// Extract patterns from rejections
		const failedKeywords = new Set();
		const failedSources = new Set();
		recentRejections.forEach(rejection => {
			if (rejection.keywords) {
				rejection.keywords.forEach(kw => failedKeywords.add(kw));
			}
			if (rejection.source) {
				failedSources.add(rejection.source);
			}
		});
		
		// Get keyword combinations to try
		const keywordCombinations = this.generateKeywordCombinations(arrondissement, failedKeywords);
		
		// Get source priorities (avoid failed sources)
		const sourcePriorities = this.getSourcePriorities(failedSources);
		
		// Select next combination (cycle through, but skip known failures)
		const strategy = this.selectStrategy(keywordCombinations, sourcePriorities);
		
		return strategy;
	}

	/**
	 * Generate diverse keyword combinations, avoiding failed patterns
	 */
	generateKeywordCombinations(arrondissement, failedKeywords) {
		const combinations = [];
		
		// Core activity keywords (avoid ones that failed)
		const activityKeywords = [
			'sport', 'sports', 'activité', 'activités', 'activity', 'activities',
			'club', 'clubs', 'association', 'associations',
			'théâtre', 'theater', 'theatre', 'danse', 'dance',
			'musique', 'music', 'arts martiaux', 'martial arts',
			'gymnastique', 'gymnastics', 'natation', 'swimming',
			'football', 'soccer', 'basketball', 'tennis',
			'judo', 'karate', 'karaté', 'aïkido', 'aikido',
			'escrime', 'fencing', 'boxe', 'boxing',
			'atelier', 'ateliers', 'workshop', 'cours', 'lesson'
		].filter(kw => !failedKeywords.has(kw.toLowerCase()));
		
		// Kids-specific keywords
		const kidsKeywords = [
			'enfant', 'enfants', 'kids', 'children', 'jeune', 'jeunes', 'youth',
			'ado', 'adolescent', 'petit', 'petits', 'junior'
		];
		
		// Generate combinations
		// Strategy 1: Specific activity + kids
		for (const activity of activityKeywords.slice(0, 15)) {
			combinations.push({
				type: 'specific_activity',
				keywords: [activity, ...kidsKeywords.slice(0, 2)],
				query: `Paris ${arrondissement} arrondissement ${activity} ${kidsKeywords[0]} ${kidsKeywords[1]}`,
				priority: 1
			});
		}
		
		// Strategy 2: General activity + kids
		combinations.push({
			type: 'general_activity',
			keywords: ['activité', 'activités', ...kidsKeywords.slice(0, 3)],
			query: `Paris ${arrondissement} arrondissement activités enfants kids`,
			priority: 2
		});
		
		// Strategy 3: Club/Association focus
		combinations.push({
			type: 'club_focus',
			keywords: ['club', 'clubs', 'association', ...kidsKeywords.slice(0, 2)],
			query: `Paris ${arrondissement} arrondissement clubs associations enfants`,
			priority: 2
		});
		
		// Strategy 4: Sport-specific
		const sports = ['sport', 'sports', 'loisir', 'loisirs'];
		combinations.push({
			type: 'sport_focus',
			keywords: [...sports, ...kidsKeywords.slice(0, 2)],
			query: `Paris ${arrondissement} arrondissement sports loisirs enfants`,
			priority: 2
		});
		
		// Strategy 5: Creative activities
		combinations.push({
			type: 'creative_focus',
			keywords: ['théâtre', 'danse', 'musique', 'art', ...kidsKeywords.slice(0, 2)],
			query: `Paris ${arrondissement} arrondissement théâtre danse musique enfants`,
			priority: 2
		});
		
		return combinations;
	}

	/**
	 * Get source priorities based on what's worked
	 */
	getSourcePriorities(failedSources) {
		const priorities = [
			{ source: 'mairie', priority: 1, reason: 'Authoritative municipal source' },
			{ source: 'locality_first', priority: 1, reason: 'High precision municipal crawler' },
			{ source: 'wikidata', priority: 2, reason: 'Structured data source' },
			{ source: 'google_search', priority: 3, reason: 'Broad coverage' },
			{ source: 'intelligent_crawler', priority: 3, reason: 'AI-assisted discovery' },
			{ source: 'advanced_crawler', priority: 4, reason: 'JS-heavy sites' },
			{ source: 'orchestrator', priority: 4, reason: 'Graph expansion' }
		];
		
		// Lower priority for failed sources
		priorities.forEach(p => {
			if (failedSources.has(p.source)) {
				p.priority += 2; // Lower priority
			}
		});
		
		// Sort by priority (lower = better)
		priorities.sort((a, b) => a.priority - b.priority);
		
		return priorities;
	}

	/**
	 * Select next strategy, cycling through but avoiding failures
	 */
	selectStrategy(keywordCombinations, sourcePriorities) {
		// Filter out combinations that match rejected patterns
		const validCombinations = keywordCombinations.filter(combo => {
			const comboKey = combo.keywords.join('|');
			return !this.rejectedPatterns.has(comboKey);
		});
		
		if (validCombinations.length === 0) {
			// All combinations failed, reset and try again
			console.log('⚠️  All keyword combinations have been rejected, resetting and trying new ones...');
			this.rejectedPatterns.clear();
			return keywordCombinations[this.cycleIndex % keywordCombinations.length];
		}
		
		// Cycle through valid combinations
		const selected = validCombinations[this.cycleIndex % validCombinations.length];
		this.cycleIndex++;
		
		// Get top priority source
		const topSource = sourcePriorities[0];
		
		return {
			keywords: selected.keywords,
			query: selected.query,
			source: topSource.source,
			type: selected.type,
			priority: selected.priority
		};
	}

	/**
	 * Record search outcome for learning
	 * @param {Object} searchInfo - Information about the search
	 * @param {String} outcome - 'approved' or 'rejected'
	 * @param {Number} mlScore - ML score if available
	 */
	recordOutcome(searchInfo, outcome, mlScore = null) {
		const patternKey = searchInfo.keywords ? searchInfo.keywords.join('|') : searchInfo.query;
		
		this.searchHistory.push({
			...searchInfo,
			outcome,
			mlScore,
			timestamp: new Date().toISOString()
		});
		
		// Keep only last 100 searches
		if (this.searchHistory.length > 100) {
			this.searchHistory.shift();
		}
		
		if (outcome === 'rejected') {
			// Track rejected patterns
			this.rejectedPatterns.add(patternKey);
			
			// Count rejections for this pattern
			const rejectionCount = this.searchHistory.filter(
				h => h.keywords && h.keywords.join('|') === patternKey && h.outcome === 'rejected'
			).length;
			
			if (rejectionCount >= this.maxRejectionsPerPattern) {
				console.log(`🚫 Pattern "${patternKey}" has ${rejectionCount} rejections, avoiding in future searches`);
			}
		} else if (outcome === 'approved') {
			// Track successful patterns
			const successCount = this.searchHistory.filter(
				h => h.keywords && h.keywords.join('|') === patternKey && h.outcome === 'approved'
			).length;
			const totalCount = this.searchHistory.filter(
				h => h.keywords && h.keywords.join('|') === patternKey
			).length;
			
			const successRate = totalCount > 0 ? successCount / totalCount : 0;
			this.approvedPatterns.set(patternKey, {
				successRate,
				successCount,
				totalCount,
				lastUsed: new Date().toISOString()
			});
		}
	}

	/**
	 * Get statistics about search performance
	 */
	getStatistics() {
		const total = this.searchHistory.length;
		const approved = this.searchHistory.filter(h => h.outcome === 'approved').length;
		const rejected = this.searchHistory.filter(h => h.outcome === 'rejected').length;
		
		const avgScore = this.searchHistory
			.filter(h => h.mlScore !== null)
			.reduce((sum, h) => sum + h.mlScore, 0) / 
			Math.max(1, this.searchHistory.filter(h => h.mlScore !== null).length);
		
		return {
			totalSearches: total,
			approved: approved,
			rejected: rejected,
			approvalRate: total > 0 ? (approved / total) * 100 : 0,
			avgMLScore: avgScore || 0,
			rejectedPatterns: this.rejectedPatterns.size,
			approvedPatterns: this.approvedPatterns.size,
			topPatterns: Array.from(this.approvedPatterns.entries())
				.sort((a, b) => b[1].successRate - a[1].successRate)
				.slice(0, 5)
				.map(([pattern, stats]) => ({ pattern, ...stats }))
		};
	}

	/**
	 * Reset learning (start fresh)
	 */
	reset() {
		this.rejectedPatterns.clear();
		this.approvedPatterns.clear();
		this.searchHistory = [];
		this.cycleIndex = 0;
		console.log('🔄 Adaptive search strategy reset');
	}
}

