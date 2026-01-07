/**
 * Preorders Service
 * 
 * Business logic layer for preorder management.
 * Handles promo code validation, amount calculation, and commitment creation.
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseService } from './baseService.js';
import { trackConversionEvent } from '../utils/conversionTracking.js';

const PREORDER_AMOUNT = 4.99; // €4.99

// Valid promo codes and their discount multipliers
const VALID_PROMO_CODES = {
	'LAUNCH20': 0.8,  // 20% off
	'FOUNDER': 0.5,   // 50% off
	'BETA': 0.9       // 10% off
};

// Valid subscription plans
const VALID_PLANS = ['monthly', '6months', 'yearly'];

export class PreordersService extends BaseService {
	constructor(dataStore) {
		super(dataStore);
	}

	/**
	 * Get preorder status for a user
	 * @param {string} userId - User ID
	 * @param {Object} options - Additional options
	 * @returns {Promise<Object>} Preorder status
	 */
	async getStatus(userId, options = {}) {
		try {
			const user = await this.store.users.get(userId);
			
			if (!user) {
				throw {
					statusCode: 404,
					message: 'User not found',
					code: 'USER_NOT_FOUND'
				};
			}

			return {
				hasPreordered: user.hasPreordered || false,
				preorderDate: user.preorderDate || null,
				preorderId: user.preorderId || null
			};
		} catch (error) {
			throw this._handleError(error, 'Failed to get preorder status', 'PREORDER_STATUS_ERROR');
		}
	}

	/**
	 * Sanitize and validate promo code
	 * @param {string} promoCode - Promo code
	 * @returns {string|null} Sanitized promo code or null
	 */
	_sanitizePromoCode(promoCode) {
		if (!promoCode) return null;
		return String(promoCode).trim().toUpperCase().substring(0, 50);
	}

	/**
	 * Validate promo code
	 * @param {string} promoCode - Promo code to validate
	 * @returns {Object} Validation result {valid, discount, amount, originalAmount}
	 */
	validatePromoCode(promoCode) {
		const sanitizedCode = this._sanitizePromoCode(promoCode);
		
		if (!sanitizedCode || !VALID_PROMO_CODES[sanitizedCode]) {
			return { valid: false };
		}

		const multiplier = VALID_PROMO_CODES[sanitizedCode];
		const discountPercent = Math.round((1 - multiplier) * 100);
		const discountedAmount = PREORDER_AMOUNT * multiplier;

		return {
			valid: true,
			discount: discountPercent,
			amount: Math.round(discountedAmount * 100) / 100,
			originalAmount: PREORDER_AMOUNT
		};
	}

	/**
	 * Calculate preorder amount with optional promo code
	 * @param {Object} data - Calculation data {promoCode, requestedAmount}
	 * @param {Object} options - Additional options
	 * @returns {Promise<Object>} Calculated amount details
	 */
	async calculateAmount(data = {}, options = {}) {
		try {
			const { promoCode, requestedAmount } = data;
			
			// If requested amount is provided, use it directly (from plan selection)
			if (requestedAmount !== undefined) {
				const amount = parseFloat(requestedAmount);
				if (isNaN(amount) || amount <= 0) {
					throw {
						statusCode: 400,
						message: 'Invalid requested amount',
						code: 'VALIDATION_ERROR'
					};
				}

				return {
					amount: Math.round(amount * 100) / 100,
					originalAmount: PREORDER_AMOUNT,
					discountApplied: false
				};
			}

			// Otherwise, calculate from base amount and promo code
			let amount = PREORDER_AMOUNT;
			let discountApplied = false;

			if (promoCode) {
				const validation = this.validatePromoCode(promoCode);
				if (validation.valid) {
					amount = validation.amount;
					discountApplied = true;
				}
			}

			return {
				amount: Math.round(amount * 100) / 100,
				originalAmount: PREORDER_AMOUNT,
				discountApplied
			};
		} catch (error) {
			throw this._handleError(error, 'Failed to calculate amount', 'AMOUNT_CALCULATION_ERROR');
		}
	}

	/**
	 * Create a commitment to pay
	 * @param {Object} data - Commitment data {promoCode, agreedToTerms, plan, amount}
	 * @param {Object} options - Additional options (user)
	 * @returns {Promise<Object>} Commitment details
	 */
	async createCommitment(data, options = {}) {
		try {
			const { user: requestingUser } = options;
			const { promoCode, agreedToTerms, plan, amount: requestedAmount } = data;

			// Validate required fields
			if (agreedToTerms !== true) {
				throw {
					statusCode: 400,
					message: 'You must agree to the terms and conditions',
					code: 'VALIDATION_ERROR'
				};
			}

			// Check if user already preordered
			const user = await this.store.users.get(requestingUser.id);
			if (!user) {
				throw {
					statusCode: 404,
					message: 'User not found',
					code: 'USER_NOT_FOUND'
				};
			}

			if (user.hasPreordered) {
				throw {
					statusCode: 400,
					message: 'You have already committed to pay',
					code: 'ALREADY_PREORDERED'
				};
			}

			// Sanitize and validate promo code
			const sanitizedPromoCode = this._sanitizePromoCode(promoCode);

			// Validate plan
			const selectedPlan = plan && VALID_PLANS.includes(plan) ? plan : 'monthly';

			// Calculate amount
			let amount = requestedAmount ? parseFloat(requestedAmount) : PREORDER_AMOUNT;

			// Apply promo code discount if valid (only if using default amount)
			if (!requestedAmount && sanitizedPromoCode) {
				const validation = this.validatePromoCode(sanitizedPromoCode);
				if (validation.valid) {
					amount = validation.amount;
				}
			}

			// Ensure amount is valid
			if (isNaN(amount) || amount <= 0) {
				amount = PREORDER_AMOUNT; // Fallback to default
			}

			const now = new Date().toISOString();
			const commitmentId = uuidv4();
			const finalAmount = Math.round(amount * 100) / 100;

			// Update user to mark as committed and clear session limit
			await this.store.users.update(requestingUser.id, {
				hasPreordered: true,
				preorderDate: now,
				preorderId: commitmentId,
				preorderAmount: finalAmount,
				preorderPlan: selectedPlan,
				preorderStatus: 'committed',
				preorderPromoCode: sanitizedPromoCode || '',
				subscriptionActive: true,
				sessionStartTime: null // Clear session timer - unlimited access granted
			});

			// Create commitment record for tracking (if preorders store exists)
			if (this.store.preorders && typeof this.store.preorders.create === 'function') {
				try {
					const preorderRecord = {
						id: commitmentId,
						userId: requestingUser.id,
						userEmail: requestingUser.email,
						userName: user.profile?.name || user.email,
						plan: selectedPlan,
						amount: finalAmount,
						currency: 'EUR',
						promoCode: sanitizedPromoCode || '',
						paymentIntentId: null,
						status: 'committed',
						createdAt: now,
						updatedAt: now
					};

					await this.store.preorders.create(preorderRecord);
				} catch (e) {
					// Log error but don't fail the commitment if tracking fails
					console.error('❌ Failed to create commitment record:', e);
				}
			}

			// Track conversion event
			try {
				await trackConversionEvent(this.store, {
					userId: requestingUser.id,
					userEmail: requestingUser.email,
					eventType: 'commitment_made',
					eventData: {
						commitmentId,
						amount: finalAmount,
						promoCode: sanitizedPromoCode || null
					},
					timestamp: now
				});
			} catch (e) {
				// Log error but don't fail the commitment if tracking fails
				if (process.env.NODE_ENV === 'development') {
					console.error('Failed to track conversion event:', e);
				}
			}

			return {
				success: true,
				commitmentId,
				preorderDate: now,
				amount: finalAmount,
				plan: selectedPlan
			};
		} catch (error) {
			throw this._handleError(error, 'Failed to create commitment', 'COMMITMENT_CREATE_ERROR');
		}
	}

	/**
	 * Track preorder page view
	 * @param {string} userId - User ID
	 * @param {string} userEmail - User email
	 * @param {Object} options - Additional options
	 * @returns {Promise<Object>} Success status
	 */
	async trackPageView(userId, userEmail, options = {}) {
		try {
			const now = new Date().toISOString();
			
			await trackConversionEvent(this.store, {
				userId,
				userEmail,
				eventType: 'preorder_page_viewed',
				eventData: {},
				timestamp: now
			});

			return { success: true };
		} catch (e) {
			// Log error but don't fail the request if tracking fails
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to track page view:', e);
			}
			return { success: false };
		}
	}
}

