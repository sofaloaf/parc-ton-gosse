/**
 * FeedbackService Unit Tests
 * 
 * Tests for feedback and organization suggestions business logic
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { FeedbackService } from '../../services/feedbackService.js';
import { createMockDataStore } from '../helpers/mockDataStore.js';

describe('FeedbackService', () => {
	let service;
	let mockStore;

	beforeEach(() => {
		mockStore = createMockDataStore();
		service = new FeedbackService(mockStore);
	});

	describe('submitFeedback', () => {
		it('should submit feedback', async () => {
			const feedbackData = { message: 'Test feedback', type: 'bug' };
			const created = { id: 'feedback-1', ...feedbackData, status: 'pending' };
			mockStore.feedback.create.mockResolvedValue(created);

			const result = await service.submitFeedback(feedbackData, {
				user: { id: 'user-1' },
				userAgent: 'Test Agent'
			});

			expect(result.id).toBe('feedback-1');
			expect(result.status).toBe('pending');
			expect(mockStore.feedback.create).toHaveBeenCalled();
		});

		it('should handle anonymous feedback', async () => {
			const feedbackData = { message: 'Anonymous feedback' };
			const created = { id: 'feedback-1', ...feedbackData, userId: 'anonymous' };
			mockStore.feedback.create.mockResolvedValue(created);

			const result = await service.submitFeedback(feedbackData, { userAgent: 'Test Agent' });

			expect(result.userId).toBe('anonymous');
		});
	});

	describe('submitOrganization', () => {
		it('should submit organization suggestion', async () => {
			const orgData = {
				name: 'Test Organization',
				description: 'Test description',
				website: 'https://test.com'
			};
			const created = { id: 'org-1', ...orgData, status: 'pending' };
			mockStore.organizationSuggestions.create.mockResolvedValue(created);

			const result = await service.submitOrganization(orgData, {
				user: { id: 'user-1' },
				userAgent: 'Test Agent'
			});

			expect(result.id).toBe('org-1');
			expect(result.status).toBe('pending');
		});
	});

	describe('listFeedback', () => {
		it('should return all feedback', async () => {
			const feedbacks = [
				{ id: 'feedback-1', message: 'Test 1' },
				{ id: 'feedback-2', message: 'Test 2' }
			];
			mockStore.feedback.list.mockResolvedValue(feedbacks);

			const result = await service.listFeedback({ user: { role: 'admin' } });

			expect(result).toHaveLength(2);
		});
	});

	describe('listOrganizations', () => {
		it('should return all organization suggestions', async () => {
			const orgs = [
				{ id: 'org-1', name: 'Org 1' },
				{ id: 'org-2', name: 'Org 2' }
			];
			mockStore.organizationSuggestions.list.mockResolvedValue(orgs);

			const result = await service.listOrganizations({ user: { role: 'admin' } });

			expect(result).toHaveLength(2);
		});
	});

	describe('approveOrganization', () => {
		it('should approve organization suggestion', async () => {
			const org = { id: 'org-1', name: 'Test Org', status: 'pending' };
			const updated = { ...org, status: 'approved', reviewedBy: 'admin-1', reviewedAt: '2025-01-06' };
			mockStore.organizationSuggestions.read.mockResolvedValue(org);
			mockStore.organizationSuggestions.update.mockResolvedValue(updated);

			const result = await service.approveOrganization('org-1', {
				user: { id: 'admin-1', role: 'admin' }
			});

			expect(result.status).toBe('approved');
			expect(result.reviewedBy).toBe('admin-1');
			expect(mockStore.organizationSuggestions.update).toHaveBeenCalled();
		});

		it('should throw 404 when organization not found', async () => {
			mockStore.organizationSuggestions.read.mockResolvedValue(null);

			await expect(
				service.approveOrganization('non-existent', { user: { role: 'admin' } })
			).rejects.toThrow();
		});
	});

	describe('rejectOrganization', () => {
		it('should reject organization suggestion', async () => {
			const org = { id: 'org-1', name: 'Test Org', status: 'pending' };
			const updated = { ...org, status: 'rejected', reviewedBy: 'admin-1', reviewedAt: '2025-01-06' };
			mockStore.organizationSuggestions.read.mockResolvedValue(org);
			mockStore.organizationSuggestions.update.mockResolvedValue(updated);

			const result = await service.rejectOrganization('org-1', {
				user: { id: 'admin-1', role: 'admin' }
			});

			expect(result.status).toBe('rejected');
			expect(result.reviewedBy).toBe('admin-1');
		});

		it('should throw 404 when organization not found', async () => {
			mockStore.organizationSuggestions.read.mockResolvedValue(null);

			await expect(
				service.rejectOrganization('non-existent', { user: { role: 'admin' } })
			).rejects.toThrow();
		});
	});
});

