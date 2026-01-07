/**
 * UsersService Unit Tests
 * 
 * Tests for user management business logic
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UsersService } from '../../services/usersService.js';
import { createMockDataStore, sampleUsers } from '../helpers/mockDataStore.js';

describe('UsersService', () => {
	let service;
	let mockStore;

	beforeEach(() => {
		mockStore = createMockDataStore();
		service = new UsersService(mockStore);
	});

	describe('list', () => {
		it('should return all users', async () => {
			mockStore.users.list.mockResolvedValue(sampleUsers);

			const result = await service.list({});

			expect(result).toHaveLength(2);
			expect(mockStore.users.list).toHaveBeenCalledTimes(1);
		});

		it('should handle data store errors', async () => {
			mockStore.users.list.mockRejectedValue(new Error('Database error'));

			await expect(service.list({})).rejects.toThrow();
		});
	});

	describe('get', () => {
		it('should return user by id', async () => {
			const user = sampleUsers[0];
			mockStore.users.get.mockResolvedValue(user);

			const result = await service.get(user.id, { user: { role: 'admin' } });

			expect(result.id).toBe(user.id);
			expect(result.email).toBe(user.email);
		});

		it('should sanitize user data for non-admin', async () => {
			const user = { ...sampleUsers[0], password: 'secret', createdAt: '2024-01-01' };
			mockStore.users.get.mockResolvedValue(user);

			const result = await service.get(user.id, { user: { id: user.id, role: 'parent' } });

			expect(result.password).toBeUndefined();
			expect(result.createdAt).toBeUndefined();
		});

		it('should allow users to view their own data', async () => {
			const user = sampleUsers[0];
			mockStore.users.get.mockResolvedValue(user);

			const result = await service.get(user.id, { user: { id: user.id, role: 'parent' } });

			expect(result.id).toBe(user.id);
		});

		it('should throw 403 when user tries to view another user data', async () => {
			const user = sampleUsers[0];
			mockStore.users.get.mockResolvedValue(user);

			await expect(
				service.get(user.id, { user: { id: 'other-user', role: 'parent' } })
			).rejects.toThrow();

			try {
				await service.get(user.id, { user: { id: 'other-user', role: 'parent' } });
			} catch (error) {
				expect(error.statusCode).toBe(403);
				expect(error.code).toBe('FORBIDDEN');
			}
		});

		it('should throw 404 when user not found', async () => {
			mockStore.users.get.mockResolvedValue(null);

			await expect(service.get('non-existent', { user: { role: 'admin' } })).rejects.toThrow();

			try {
				await service.get('non-existent', { user: { role: 'admin' } });
			} catch (error) {
				expect(error.statusCode).toBe(404);
				expect(error.code).toBe('USER_NOT_FOUND');
			}
		});
	});

	describe('create', () => {
		it('should create new user', async () => {
			const newUser = {
				email: 'new@example.com',
				role: 'parent'
			};
			const created = { id: 'new-id', ...newUser };
			mockStore.users.create.mockResolvedValue(created);

			const result = await service.create(newUser, { user: { role: 'admin' } });

			expect(result.id).toBe('new-id');
			expect(result.email).toBe(newUser.email);
			expect(result.password).toBeUndefined(); // Should be sanitized
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

		it('should validate email format', async () => {
			await expect(
				service.create({ email: 'invalid-email' }, {})
			).rejects.toThrow();
		});

		it('should validate role', async () => {
			await expect(
				service.create({ email: 'test@example.com', role: 'invalid' }, {})
			).rejects.toThrow();
		});
	});

	describe('update', () => {
		it('should update user', async () => {
			const user = sampleUsers[0];
			const updates = { profile: { name: 'Updated Name' } };
			const updated = { ...user, ...updates };
			mockStore.users.update.mockResolvedValue(updated);

			const result = await service.update(user.id, updates, { user: { id: user.id, role: 'parent' } });

			expect(result.profile.name).toBe('Updated Name');
		});

		it('should throw 403 when user tries to update another user', async () => {
			const user = sampleUsers[0];
			await expect(
				service.update(user.id, {}, { user: { id: 'other-user', role: 'parent' } })
			).rejects.toThrow();
		});

		it('should throw 404 when user not found', async () => {
			mockStore.users.update.mockResolvedValue(null);

			await expect(
				service.update('non-existent', {}, { user: { role: 'admin' } })
			).rejects.toThrow();
		});
	});

	describe('delete', () => {
		it('should delete user', async () => {
			mockStore.users.remove.mockResolvedValue(true);

			const result = await service.delete('user-1', { user: { role: 'admin' } });

			expect(result.ok).toBe(true);
		});

		it('should throw 404 when user not found', async () => {
			mockStore.users.remove.mockResolvedValue(false);

			await expect(service.delete('non-existent', { user: { role: 'admin' } })).rejects.toThrow();
		});
	});

	describe('saveOnboarding', () => {
		it('should save onboarding data', async () => {
			const user = sampleUsers[0];
			const onboardingData = {
				childAge: 5,
				interests: ['sports'],
				location: 'Paris',
				newsletter: true,
				onboardingCompleted: true
			};
			mockStore.users.get.mockResolvedValue(user);
			mockStore.users.update.mockResolvedValue({ ...user, profile: { ...user.profile, ...onboardingData } });

			const result = await service.saveOnboarding(user.id, onboardingData, { user: { id: user.id } });

			expect(result.success).toBe(true);
			expect(mockStore.users.update).toHaveBeenCalled();
		});

		it('should throw 403 when user tries to update another user onboarding', async () => {
			await expect(
				service.saveOnboarding('other-user', {}, { user: { id: 'user-1' } })
			).rejects.toThrow();
		});
	});
});

