/**
 * PreordersService Unit Tests
 * 
 * Tests for preorder management business logic
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PreordersService } from '../../services/preordersService.js';
import { createMockDataStore, sampleUsers } from '../helpers/mockDataStore.js';

// Mock conversion tracking
jest.unstable_mockModule('../../utils/conversionTracking.js', () => ({
	trackConversionEvent: jest.fn().mockResolvedValue(true)
}));

describe('PreordersService', () => {
	let service;
	let mockStore;

	beforeEach(() => {
		mockStore = createMockDataStore();
		service = new PreordersService(mockStore);
	});

	describe('getStatus', () => {
		it('should return preorder status', async () => {
			const user = { ...sampleUsers[0], hasPreordered: true, preorderDate: '2025-01-01', preorderId: 'commit-1' };
			mockStore.users.get.mockResolvedValue(user);

			const result = await service.getStatus(user.id, {});

			expect(result.hasPreordered).toBe(true);
			expect(result.preorderDate).toBe('2025-01-01');
			expect(result.preorderId).toBe('commit-1');
		});

		it('should return false when user has not preordered', async () => {
			const user = sampleUsers[0];
			mockStore.users.get.mockResolvedValue(user);

			const result = await service.getStatus(user.id, {});

			expect(result.hasPreordered).toBe(false);
		});

		it('should throw 404 when user not found', async () => {
			mockStore.users.get.mockResolvedValue(null);

			await expect(service.getStatus('non-existent', {})).rejects.toThrow();
		});
	});

	describe('validatePromoCode', () => {
		it('should validate valid promo code', () => {
			const result = service.validatePromoCode('LAUNCH20');

			expect(result.valid).toBe(true);
			expect(result.discount).toBe(20);
			expect(result.amount).toBeCloseTo(3.99, 2);
		});

		it('should reject invalid promo code', () => {
			const result = service.validatePromoCode('INVALID');

			expect(result.valid).toBe(false);
		});

		it('should handle case-insensitive codes', () => {
			const result = service.validatePromoCode('launch20');

			expect(result.valid).toBe(true);
		});

		it('should handle null/empty codes', () => {
			const result1 = service.validatePromoCode(null);
			const result2 = service.validatePromoCode('');

			expect(result1.valid).toBe(false);
			expect(result2.valid).toBe(false);
		});
	});

	describe('calculateAmount', () => {
		it('should calculate amount with promo code', async () => {
			const result = await service.calculateAmount({ promoCode: 'LAUNCH20' }, {});

			expect(result.amount).toBeCloseTo(3.99, 2);
			expect(result.discountApplied).toBe(true);
		});

		it('should return base amount without promo code', async () => {
			const result = await service.calculateAmount({}, {});

			expect(result.amount).toBe(4.99);
			expect(result.discountApplied).toBe(false);
		});

		it('should use requested amount when provided', async () => {
			const result = await service.calculateAmount({ requestedAmount: 9.99 }, {});

			expect(result.amount).toBe(9.99);
			expect(result.discountApplied).toBe(false);
		});

		it('should ignore promo code when requested amount provided', async () => {
			const result = await service.calculateAmount({ requestedAmount: 9.99, promoCode: 'LAUNCH20' }, {});

			expect(result.amount).toBe(9.99);
			expect(result.discountApplied).toBe(false);
		});
	});

	describe('createCommitment', () => {
		it('should create commitment', async () => {
			const user = sampleUsers[0];
			mockStore.users.get.mockResolvedValue(user);
			mockStore.users.update.mockResolvedValue({ ...user, hasPreordered: true });

			const result = await service.createCommitment(
				{ agreedToTerms: true, plan: 'monthly' },
				{ user: { id: user.id, email: user.email } }
			);

			expect(result.success).toBe(true);
			expect(result.commitmentId).toBeDefined();
			expect(mockStore.users.update).toHaveBeenCalled();
		});

		it('should throw error when user already preordered', async () => {
			const user = { ...sampleUsers[0], hasPreordered: true };
			mockStore.users.get.mockResolvedValue(user);

			await expect(
				service.createCommitment(
					{ agreedToTerms: true },
					{ user: { id: user.id, email: user.email } }
				)
			).rejects.toThrow();
		});

		it('should throw error when terms not agreed', async () => {
			const user = sampleUsers[0];
			mockStore.users.get.mockResolvedValue(user);

			await expect(
				service.createCommitment(
					{ agreedToTerms: false },
					{ user: { id: user.id, email: user.email } }
				)
			).rejects.toThrow();
		});

		it('should apply promo code discount', async () => {
			const user = sampleUsers[0];
			mockStore.users.get.mockResolvedValue(user);
			mockStore.users.update.mockResolvedValue({ ...user, hasPreordered: true });

			const result = await service.createCommitment(
				{ agreedToTerms: true, promoCode: 'LAUNCH20' },
				{ user: { id: user.id, email: user.email } }
			);

			expect(result.amount).toBeCloseTo(3.99, 2);
		});

		it('should validate plan', async () => {
			const user = sampleUsers[0];
			mockStore.users.get.mockResolvedValue(user);
			mockStore.users.update.mockResolvedValue({ ...user, hasPreordered: true });

			const result = await service.createCommitment(
				{ agreedToTerms: true, plan: 'invalid' },
				{ user: { id: user.id, email: user.email } }
			);

			// Should default to 'monthly'
			expect(result.plan).toBe('monthly');
		});
	});

	describe('trackPageView', () => {
		it('should track page view', async () => {
			const result = await service.trackPageView('user-1', 'user@example.com', {});

			expect(result.success).toBe(true);
		});

		it('should handle tracking errors gracefully', async () => {
			// Mock tracking to fail
			const { trackConversionEvent } = await import('../../utils/conversionTracking.js');
			trackConversionEvent.mockRejectedValueOnce(new Error('Tracking failed'));

			const result = await service.trackPageView('user-1', 'user@example.com', {});

			// Should return success: false but not throw
			expect(result.success).toBe(false);
		});
	});
});

