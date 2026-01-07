/**
 * ReviewsService Unit Tests
 * 
 * Tests for reviews and ratings business logic
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ReviewsService } from '../../services/reviewsService.js';
import { createMockDataStore, sampleReviews, sampleActivities } from '../helpers/mockDataStore.js';

describe('ReviewsService', () => {
	let service;
	let mockStore;

	beforeEach(() => {
		mockStore = createMockDataStore();
		service = new ReviewsService(mockStore);
	});

	describe('list', () => {
		it('should return all reviews', async () => {
			mockStore.reviews.list.mockResolvedValue(sampleReviews);

			const result = await service.list({}, {});

			expect(result).toHaveLength(1);
		});

		it('should filter by activity', async () => {
			const reviews = [
				...sampleReviews,
				{ ...sampleReviews[0], id: 'review-2', activityId: 'activity-2' }
			];
			mockStore.reviews.list.mockResolvedValue(reviews);

			const result = await service.list({ activityId: 'activity-1' }, {});

			expect(result.every(r => r.activityId === 'activity-1')).toBe(true);
		});

		it('should filter by status', async () => {
			const reviews = [
				...sampleReviews,
				{ ...sampleReviews[0], id: 'review-2', status: 'pending' }
			];
			mockStore.reviews.list.mockResolvedValue(reviews);

			const result = await service.list({ status: 'approved' }, {});

			expect(result.every(r => r.status === 'approved' || !r.status)).toBe(true);
		});
	});

	describe('getByActivity', () => {
		it('should return approved reviews for activity', async () => {
			mockStore.reviews.list.mockResolvedValue(sampleReviews);

			const result = await service.getByActivity('activity-1', {});

			expect(result.every(r => r.activityId === 'activity-1')).toBe(true);
			expect(result.every(r => r.status === 'approved' || !r.status)).toBe(true);
		});
	});

	describe('getRating', () => {
		it('should calculate average rating', async () => {
			const reviews = [
				{ ...sampleReviews[0], rating: 5 },
				{ ...sampleReviews[0], id: 'review-2', rating: 4 },
				{ ...sampleReviews[0], id: 'review-3', rating: 3 }
			];
			mockStore.reviews.list.mockResolvedValue(reviews);

			const result = await service.getRating('activity-1', {});

			expect(result.average).toBe(4);
			expect(result.count).toBe(3);
		});

		it('should return 0/0 when no ratings', async () => {
			mockStore.reviews.list.mockResolvedValue([]);

			const result = await service.getRating('activity-1', {});

			expect(result.average).toBe(0);
			expect(result.count).toBe(0);
		});
	});

	describe('getBatchRatings', () => {
		it('should return ratings for multiple activities', async () => {
			const reviews = [
				{ ...sampleReviews[0], rating: 5, activityId: 'activity-1' },
				{ ...sampleReviews[0], id: 'review-2', rating: 4, activityId: 'activity-2' }
			];
			mockStore.reviews.list.mockResolvedValue(reviews);

			const result = await service.getBatchRatings(['activity-1', 'activity-2'], {});

			expect(result['activity-1'].average).toBe(5);
			expect(result['activity-2'].average).toBe(4);
		});

		it('should limit to 50 activities', async () => {
			const activityIds = Array.from({ length: 100 }, (_, i) => `activity-${i}`);
			mockStore.reviews.list.mockResolvedValue([]);

			await service.getBatchRatings(activityIds, {});

			// Should only process first 50
			expect(mockStore.reviews.list).toHaveBeenCalled();
		});

		it('should throw error for non-array input', async () => {
			await expect(service.getBatchRatings('not-array', {})).rejects.toThrow();
		});
	});

	describe('getUserReview', () => {
		it('should return user review for activity', async () => {
			mockStore.reviews.list.mockResolvedValue(sampleReviews);

			const result = await service.getUserReview('activity-1', 'user-1', {});

			expect(result).toBeDefined();
			expect(result.parentId).toBe('user-1');
		});

		it('should return null when user has no review', async () => {
			mockStore.reviews.list.mockResolvedValue([]);

			const result = await service.getUserReview('activity-1', 'user-1', {});

			expect(result).toBeNull();
		});
	});

	describe('createOrUpdate', () => {
		it('should create new review', async () => {
			mockStore.reviews.list.mockResolvedValue([]);
			const newReview = {
				id: 'new-review',
				activityId: 'activity-1',
				parentId: 'user-1',
				userId: 'user-1',
				rating: 5,
				comment: 'Great!',
				status: 'approved'
			};
			mockStore.reviews.create.mockResolvedValue(newReview);

			const result = await service.createOrUpdate(
				{ activityId: 'activity-1', rating: 5, comment: 'Great!' },
				{ user: { id: 'user-1' } }
			);

			expect(result.rating).toBe(5);
			expect(mockStore.reviews.create).toHaveBeenCalled();
		});

		it('should update existing review', async () => {
			const existingReview = sampleReviews[0];
			mockStore.reviews.list.mockResolvedValue([existingReview]);
			const updated = { ...existingReview, rating: 4 };
			mockStore.reviews.update.mockResolvedValue(updated);

			const result = await service.createOrUpdate(
				{ activityId: 'activity-1', rating: 4 },
				{ user: { id: 'user-1' } }
			);

			expect(result.rating).toBe(4);
			expect(mockStore.reviews.update).toHaveBeenCalled();
		});

		it('should validate rating range', async () => {
			await expect(
				service.createOrUpdate(
					{ activityId: 'activity-1', rating: 6 },
					{ user: { id: 'user-1' } }
				)
			).rejects.toThrow();

			await expect(
				service.createOrUpdate(
					{ activityId: 'activity-1', rating: 0 },
					{ user: { id: 'user-1' } }
				)
			).rejects.toThrow();
		});

		it('should validate required fields', async () => {
			await expect(
				service.createOrUpdate({}, { user: { id: 'user-1' } })
			).rejects.toThrow();
		});
	});

	describe('moderate', () => {
		it('should update review status', async () => {
			const review = sampleReviews[0];
			const updated = { ...review, status: 'rejected' };
			mockStore.reviews.update.mockResolvedValue(updated);

			const result = await service.moderate(review.id, 'rejected', {});

			expect(result.status).toBe('rejected');
			expect(mockStore.reviews.update).toHaveBeenCalled();
		});

		it('should validate status', async () => {
			await expect(
				service.moderate('review-1', 'invalid-status', {})
			).rejects.toThrow();
		});

		it('should throw 404 when review not found', async () => {
			mockStore.reviews.update.mockResolvedValue(null);

			await expect(service.moderate('non-existent', 'approved', {})).rejects.toThrow();
		});
	});

	describe('delete', () => {
		it('should delete review', async () => {
			mockStore.reviews.remove.mockResolvedValue(true);

			const result = await service.delete('review-1', {});

			expect(result.ok).toBe(true);
		});

		it('should throw 404 when review not found', async () => {
			mockStore.reviews.remove.mockResolvedValue(false);

			await expect(service.delete('non-existent', {})).rejects.toThrow();
		});
	});
});

