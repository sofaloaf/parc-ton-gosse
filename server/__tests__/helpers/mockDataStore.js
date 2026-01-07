/**
 * Mock Data Store
 * 
 * Provides a mock implementation of the data store for testing services
 */

import { jest } from '@jest/globals';

export function createMockDataStore() {
	const mockStore = {
		activities: {
			list: jest.fn(),
			get: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn()
		},
		users: {
			list: jest.fn(),
			get: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn()
		},
		registrations: {
			list: jest.fn(),
			get: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn()
		},
		reviews: {
			list: jest.fn(),
			get: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn()
		},
		feedback: {
			list: jest.fn(),
			create: jest.fn()
		},
		organizationSuggestions: {
			list: jest.fn(),
			read: jest.fn(),
			create: jest.fn(),
			update: jest.fn()
		},
		preorders: {
			list: jest.fn(),
			create: jest.fn()
		}
	};

	return mockStore;
}

/**
 * Create mock cache
 */
export function createMockCache() {
	const cache = new Map();
	
	return {
		get: jest.fn((key) => cache.get(key)),
		set: jest.fn((key, value, ttl) => {
			cache.set(key, value);
			return true;
		}),
		delete: jest.fn((key) => {
			cache.delete(key);
			return true;
		}),
		deletePattern: jest.fn((pattern) => {
			// Simple pattern matching for tests
			const regex = new RegExp(pattern.replace('*', '.*'));
			for (const key of cache.keys()) {
				if (regex.test(key)) {
					cache.delete(key);
				}
			}
			return true;
		}),
		clear: jest.fn(() => {
			cache.clear();
			return true;
		}),
		has: jest.fn((key) => cache.has(key))
	};
}

/**
 * Sample test data
 */
export const sampleActivities = [
	{
		id: 'activity-1',
		title: { en: 'Soccer Club', fr: 'Club de Football' },
		description: { en: 'Learn soccer', fr: 'Apprendre le football' },
		categories: ['sports'],
		ageMin: 5,
		ageMax: 12,
		price: { amount: 50, currency: 'EUR' },
		neighborhood: '20e',
		approvalStatus: 'approved'
	},
	{
		id: 'activity-2',
		title: { en: 'Dance Class', fr: 'Cours de Danse' },
		description: { en: 'Learn dance', fr: 'Apprendre la danse' },
		categories: ['arts'],
		ageMin: 6,
		ageMax: 14,
		price: { amount: 60, currency: 'EUR' },
		neighborhood: '11e',
		approvalStatus: 'approved'
	}
];

export const sampleUsers = [
	{
		id: 'user-1',
		email: 'parent@example.com',
		role: 'parent',
		profile: { name: 'John Doe' }
	},
	{
		id: 'user-2',
		email: 'admin@example.com',
		role: 'admin',
		profile: { name: 'Admin User' }
	}
];

export const sampleRegistrations = [
	{
		id: 'reg-1',
		activityId: 'activity-1',
		parentId: 'user-1',
		status: 'pending',
		waitlist: false
	}
];

export const sampleReviews = [
	{
		id: 'review-1',
		activityId: 'activity-1',
		parentId: 'user-1',
		userId: 'user-1',
		rating: 5,
		comment: 'Great activity!',
		status: 'approved'
	}
];

