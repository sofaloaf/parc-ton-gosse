/**
 * RegistrationsService Unit Tests
 * 
 * Tests for registration management business logic
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RegistrationsService } from '../../services/registrationsService.js';
import { createMockDataStore, sampleRegistrations, sampleActivities } from '../helpers/mockDataStore.js';

describe('RegistrationsService', () => {
	let service;
	let mockStore;

	beforeEach(() => {
		mockStore = createMockDataStore();
		service = new RegistrationsService(mockStore);
	});

	describe('list', () => {
		it('should return all registrations for admin', async () => {
			mockStore.registrations.list.mockResolvedValue(sampleRegistrations);

			const result = await service.list({}, { user: { role: 'admin' } });

			expect(result).toHaveLength(1);
		});

		it('should filter by parent for parent users', async () => {
			const registrations = [
				...sampleRegistrations,
				{ ...sampleRegistrations[0], id: 'reg-2', parentId: 'other-user' }
			];
			mockStore.registrations.list.mockResolvedValue(registrations);

			const result = await service.list({}, { user: { id: 'user-1', role: 'parent' } });

			expect(result).toHaveLength(1);
			expect(result[0].parentId).toBe('user-1');
		});

		it('should filter by activityId', async () => {
			const registrations = [
				...sampleRegistrations,
				{ ...sampleRegistrations[0], id: 'reg-2', activityId: 'activity-2' }
			];
			mockStore.registrations.list.mockResolvedValue(registrations);

			const result = await service.list({ activityId: 'activity-1' }, {});

			expect(result.every(r => r.activityId === 'activity-1')).toBe(true);
		});

		it('should filter by status', async () => {
			const registrations = [
				...sampleRegistrations,
				{ ...sampleRegistrations[0], id: 'reg-2', status: 'confirmed' }
			];
			mockStore.registrations.list.mockResolvedValue(registrations);

			const result = await service.list({ status: 'pending' }, {});

			expect(result.every(r => r.status === 'pending')).toBe(true);
		});
	});

	describe('get', () => {
		it('should return registration by id', async () => {
			const registration = sampleRegistrations[0];
			mockStore.registrations.get.mockResolvedValue(registration);

			const result = await service.get(registration.id, { user: { role: 'admin' } });

			expect(result.id).toBe(registration.id);
		});

		it('should allow parent to view their own registration', async () => {
			const registration = sampleRegistrations[0];
			mockStore.registrations.get.mockResolvedValue(registration);

			const result = await service.get(registration.id, {
				user: { id: registration.parentId, role: 'parent' }
			});

			expect(result.id).toBe(registration.id);
		});

		it('should throw 403 when parent tries to view another parent registration', async () => {
			const registration = sampleRegistrations[0];
			mockStore.registrations.get.mockResolvedValue(registration);

			await expect(
				service.get(registration.id, { user: { id: 'other-user', role: 'parent' } })
			).rejects.toThrow();
		});

		it('should throw 404 when registration not found', async () => {
			mockStore.registrations.get.mockResolvedValue(null);

			await expect(service.get('non-existent', {})).rejects.toThrow();
		});
	});

	describe('create', () => {
		it('should create new registration', async () => {
			const newRegistration = {
				activityId: 'activity-1',
				parentId: 'user-1',
				status: 'pending'
			};
			const created = { id: 'new-id', ...newRegistration };
			mockStore.activities.get.mockResolvedValue(sampleActivities[0]);
			mockStore.registrations.create.mockResolvedValue(created);

			const result = await service.create(newRegistration, { user: { id: 'user-1', role: 'parent' } });

			expect(result.id).toBe('new-id');
			expect(mockStore.registrations.create).toHaveBeenCalled();
		});

		it('should set parentId from authenticated user', async () => {
			const registrationData = { activityId: 'activity-1' };
			mockStore.activities.get.mockResolvedValue(sampleActivities[0]);
			mockStore.registrations.create.mockResolvedValue({ id: 'new-id', ...registrationData, parentId: 'user-1' });

			await service.create(registrationData, { user: { id: 'user-1', role: 'parent' } });

			expect(mockStore.registrations.create).toHaveBeenCalledWith(
				expect.objectContaining({ parentId: 'user-1' })
			);
		});

		it('should validate required fields', async () => {
			await expect(service.create({}, {})).rejects.toThrow();
		});

		it('should validate activity exists', async () => {
			mockStore.activities.get.mockResolvedValue(null);

			await expect(
				service.create({ activityId: 'non-existent', parentId: 'user-1' }, {})
			).rejects.toThrow();
		});

		it('should validate status', async () => {
			mockStore.activities.get.mockResolvedValue(sampleActivities[0]);

			await expect(
				service.create(
					{ activityId: 'activity-1', parentId: 'user-1', status: 'invalid' },
					{}
				)
			).rejects.toThrow();
		});
	});

	describe('update', () => {
		it('should update registration', async () => {
			const registration = sampleRegistrations[0];
			const updates = { status: 'confirmed' };
			const updated = { ...registration, ...updates };
			mockStore.registrations.update.mockResolvedValue(updated);

			const result = await service.update(registration.id, updates, {});

			expect(result.status).toBe('confirmed');
		});

		it('should throw 404 when registration not found', async () => {
			mockStore.registrations.update.mockResolvedValue(null);

			await expect(service.update('non-existent', {}, {})).rejects.toThrow();
		});
	});

	describe('delete', () => {
		it('should delete registration', async () => {
			mockStore.registrations.remove.mockResolvedValue(true);

			const result = await service.delete('reg-1', { user: { role: 'admin' } });

			expect(result.ok).toBe(true);
		});

		it('should allow parent to delete their own registration', async () => {
			const registration = sampleRegistrations[0];
			mockStore.registrations.get.mockResolvedValue(registration);
			mockStore.registrations.remove.mockResolvedValue(true);

			const result = await service.delete(registration.id, {
				user: { id: registration.parentId, role: 'parent' }
			});

			expect(result.ok).toBe(true);
		});

		it('should throw 403 when parent tries to delete another parent registration', async () => {
			const registration = sampleRegistrations[0];
			mockStore.registrations.get.mockResolvedValue(registration);

			await expect(
				service.delete(registration.id, { user: { id: 'other-user', role: 'parent' } })
			).rejects.toThrow();
		});

		it('should throw 404 when registration not found', async () => {
			mockStore.registrations.remove.mockResolvedValue(false);

			await expect(service.delete('non-existent', {})).rejects.toThrow();
		});
	});
});

