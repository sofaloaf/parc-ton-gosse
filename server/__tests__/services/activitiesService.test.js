/**
 * ActivitiesService Unit Tests
 * 
 * Tests for activities business logic
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ActivitiesService } from '../../services/activitiesService.js';
import { createMockDataStore, createMockCache, sampleActivities } from '../helpers/mockDataStore.js';

// Mock the cache module
const mockInvalidateActivities = jest.fn();
const mockCacheKeys = {
	activities: {
		list: (filters = {}) => {
			const filterStr = JSON.stringify(filters);
			const hash = Buffer.from(filterStr).toString('base64').slice(0, 16);
			return `activities:list:${hash}`;
		},
		item: (id) => `activities:${id}`
	}
};

// Mock the cache module before importing ActivitiesService
jest.unstable_mockModule('../../services/cache/index.js', () => ({
	getCache: jest.fn(() => createMockCache()),
	cacheKeys: mockCacheKeys,
	invalidateActivities: mockInvalidateActivities
}));

describe('ActivitiesService', () => {
	let service;
	let mockStore;
	let mockCache;

	beforeEach(() => {
		mockStore = createMockDataStore();
		mockCache = createMockCache();
		service = new ActivitiesService(mockStore, mockCache);
	});

	describe('list', () => {
		it('should return paginated activities', async () => {
			mockStore.activities.list.mockResolvedValue(sampleActivities);

			const result = await service.list({}, { limit: 10, offset: 0 }, {});

			expect(result.data).toHaveLength(2);
			expect(result.pagination.total).toBe(2);
			expect(result.pagination.limit).toBe(10);
			expect(result.pagination.offset).toBe(0);
			expect(mockStore.activities.list).toHaveBeenCalledTimes(1);
		});

		it('should filter by category', async () => {
			mockStore.activities.list.mockResolvedValue(sampleActivities);

			const result = await service.list({ category: 'sports' }, {}, {});

			expect(result.data).toHaveLength(1);
			expect(result.data[0].categories).toContain('sports');
		});

		it('should filter by age range', async () => {
			mockStore.activities.list.mockResolvedValue(sampleActivities);

			const result = await service.list({ minAge: 5, maxAge: 10 }, {}, {});

			expect(result.data.length).toBeGreaterThan(0);
			result.data.forEach(activity => {
				expect(activity.ageMin).toBeLessThanOrEqual(10);
				expect(activity.ageMax).toBeGreaterThanOrEqual(5);
			});
		});

		it('should filter by neighborhood', async () => {
			mockStore.activities.list.mockResolvedValue(sampleActivities);

			const result = await service.list({ neighborhood: '20e' }, {}, {});

			expect(result.data).toHaveLength(1);
			expect(result.data[0].neighborhood).toBe('20e');
		});

		it('should filter by price range', async () => {
			mockStore.activities.list.mockResolvedValue(sampleActivities);

			const result = await service.list({ minPrice: 40, maxPrice: 55 }, {}, {});

			expect(result.data.length).toBeGreaterThan(0);
			result.data.forEach(activity => {
				expect(activity.price.amount).toBeGreaterThanOrEqual(40);
				expect(activity.price.amount).toBeLessThanOrEqual(55);
			});
		});

		it('should filter by search query', async () => {
			mockStore.activities.list.mockResolvedValue(sampleActivities);

			const result = await service.list({ q: 'soccer' }, {}, {});

			expect(result.data.length).toBeGreaterThan(0);
		});

		it('should hide pending activities from non-admin users', async () => {
			const activitiesWithPending = [
				...sampleActivities,
				{ id: 'activity-3', title: { en: 'Pending', fr: 'En attente' }, approvalStatus: 'pending' }
			];
			mockStore.activities.list.mockResolvedValue(activitiesWithPending);

			const result = await service.list({}, {}, { user: { role: 'parent' } });

			expect(result.data.every(a => a.approvalStatus !== 'pending')).toBe(true);
		});

		it('should show all activities to admin users', async () => {
			const activitiesWithPending = [
				...sampleActivities,
				{ id: 'activity-3', title: { en: 'Pending', fr: 'En attente' }, approvalStatus: 'pending' }
			];
			mockStore.activities.list.mockResolvedValue(activitiesWithPending);

			const result = await service.list({}, {}, { user: { role: 'admin' } });

			expect(result.data.length).toBe(3);
		});

		it('should use cache when available', async () => {
			mockCache.get.mockReturnValue(sampleActivities);

			const result = await service.list({}, {}, {});

			expect(mockStore.activities.list).not.toHaveBeenCalled();
			expect(mockCache.get).toHaveBeenCalled();
			expect(result.data).toHaveLength(2);
		});

		it('should bypass cache when forceRefresh is true', async () => {
			mockCache.get.mockReturnValue(sampleActivities);
			mockStore.activities.list.mockResolvedValue(sampleActivities);

			await service.list({}, {}, { forceRefresh: true });

			expect(mockStore.activities.list).toHaveBeenCalled();
		});

		it('should handle data store timeout', async () => {
			mockStore.activities.list.mockImplementation(() => 
				new Promise(resolve => setTimeout(resolve, 35000))
			);

			await expect(service.list({}, {}, {})).rejects.toThrow();
		});

		it('should handle missing data store', async () => {
			const serviceWithoutStore = new ActivitiesService(null, mockCache);
			
			await expect(serviceWithoutStore.list({}, {}, {})).rejects.toThrow();
		});
	});

	describe('get', () => {
		it('should return activity by id', async () => {
			const activity = sampleActivities[0];
			mockStore.activities.get.mockResolvedValue(activity);

			const result = await service.get(activity.id, {});

			expect(result.id).toBe(activity.id);
			expect(mockStore.activities.get).toHaveBeenCalledWith(activity.id);
		});

		it('should throw 404 when activity not found', async () => {
			mockStore.activities.get.mockResolvedValue(null);

			await expect(service.get('non-existent', {})).rejects.toThrow();

			try {
				await service.get('non-existent', {});
			} catch (error) {
				expect(error.statusCode).toBe(404);
				expect(error.code).toBe('ACTIVITY_NOT_FOUND');
			}
		});

		it('should use cache when available', async () => {
			const activity = sampleActivities[0];
			mockCache.get.mockReturnValue(activity);

			const result = await service.get(activity.id, {});

			expect(mockStore.activities.get).not.toHaveBeenCalled();
			expect(result.id).toBe(activity.id);
		});
	});

	describe('create', () => {
		it('should create new activity', async () => {
			const newActivity = {
				title: { en: 'New Activity', fr: 'Nouvelle Activité' },
				categories: ['sports']
			};
			const created = { id: 'new-id', ...newActivity };
			mockStore.activities.create.mockResolvedValue(created);

			const result = await service.create(newActivity, {});

			expect(result.id).toBe('new-id');
			expect(mockStore.activities.create).toHaveBeenCalled();
		});

		it('should validate required fields', async () => {
			await expect(service.create({}, {})).rejects.toThrow();

			try {
				await service.create({}, {});
			} catch (error) {
				expect(error.statusCode).toBe(400);
				expect(error.code).toBe('VALIDATION_ERROR');
			}
		});

		it('should validate age range', async () => {
			const invalidActivity = {
				title: { en: 'Test' },
				ageMin: 10,
				ageMax: 5 // Invalid: min > max
			};

			await expect(service.create(invalidActivity, {})).rejects.toThrow();
		});

		it('should validate price is not negative', async () => {
			const invalidActivity = {
				title: { en: 'Test' },
				price: { amount: -10 }
			};

			await expect(service.create(invalidActivity, {})).rejects.toThrow();
		});
	});

	describe('update', () => {
		it('should update existing activity', async () => {
			const activity = sampleActivities[0];
			const updates = { title: { en: 'Updated', fr: 'Mis à jour' } };
			const updated = { ...activity, ...updates };
			mockStore.activities.update.mockResolvedValue(updated);

			const result = await service.update(activity.id, updates, {});

			expect(result.title.en).toBe('Updated');
			expect(mockStore.activities.update).toHaveBeenCalled();
		});

		it('should throw 404 when activity not found', async () => {
			mockStore.activities.update.mockResolvedValue(null);

			await expect(service.update('non-existent', {}, {})).rejects.toThrow();

			try {
				await service.update('non-existent', {}, {});
			} catch (error) {
				expect(error.statusCode).toBe(404);
				expect(error.code).toBe('ACTIVITY_NOT_FOUND');
			}
		});
	});

	describe('delete', () => {
		it('should delete activity', async () => {
			mockStore.activities.remove.mockResolvedValue(true);

			const result = await service.delete('activity-1', {});

			expect(result.ok).toBe(true);
			expect(mockStore.activities.remove).toHaveBeenCalledWith('activity-1');
		});

		it('should throw 404 when activity not found', async () => {
			mockStore.activities.remove.mockResolvedValue(false);

			await expect(service.delete('non-existent', {})).rejects.toThrow();

			try {
				await service.delete('non-existent', {});
			} catch (error) {
				expect(error.statusCode).toBe(404);
				expect(error.code).toBe('ACTIVITY_NOT_FOUND');
			}
		});
	});
});

