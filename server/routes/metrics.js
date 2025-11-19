import express from 'express';
import { requireAuth } from '../middleware/auth.js';

export const metricsRouter = express.Router();

// Get comprehensive metrics for admin dashboard
metricsRouter.get('/dashboard', requireAuth('admin'), async (req, res) => {
	const store = req.app.get('dataStore');
	
	try {
		// Get all data
		const [users, logins, sessions, activities, registrations, feedback, preorders, conversionEvents] = await Promise.all([
			store.users.list().catch(() => []),
			store.logins.list().catch(() => []),
			store.sessions.list().catch(() => []),
			store.activities.list().catch(() => []),
			store.registrations.list().catch(() => []),
			store.feedback.list().catch(() => []),
			store.preorders?.list().catch(() => []) || Promise.resolve([]),
			store.conversionEvents?.list().catch(() => []) || Promise.resolve([])
		]);

		const now = new Date();
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

		// Helper to group by date
		const groupByDate = (items, dateField = 'timestamp') => {
			const grouped = {};
			items.forEach(item => {
				if (!item[dateField]) return;
				const date = new Date(item[dateField]).toISOString().split('T')[0];
				grouped[date] = (grouped[date] || 0) + 1;
			});
			return grouped;
		};

		// User growth over time (from createdAt)
		const userGrowth = {};
		users.forEach(user => {
			if (user.createdAt) {
				const date = new Date(user.createdAt).toISOString().split('T')[0];
				userGrowth[date] = (userGrowth[date] || 0) + 1;
			}
		});
		
		// Cumulative user growth
		const sortedDates = Object.keys(userGrowth).sort();
		const cumulativeUsers = [];
		let total = 0;
		sortedDates.forEach(date => {
			total += userGrowth[date];
			cumulativeUsers.push({ date, count: total });
		});

		// Login activity over time
		const loginActivity = groupByDate(logins, 'timestamp');
		const loginActivityArray = Object.keys(loginActivity)
			.sort()
			.map(date => ({ date, count: loginActivity[date] }));

		// Unique users (by email)
		const uniqueUsers = new Set(users.map(u => u.email).filter(Boolean));
		const uniqueLogins = new Set(logins.map(l => l.email).filter(Boolean));

		// Session metrics
		const totalSessions = sessions.length;
		const activeSessions = sessions.filter(s => !s.endTime).length;
		const completedSessions = sessions.filter(s => s.endTime && s.duration);
		const avgSessionDuration = completedSessions.length > 0
			? completedSessions.reduce((sum, s) => sum + (Number(s.duration) || 0), 0) / completedSessions.length
			: 0;

		// Total page views
		const totalPageViews = sessions.reduce((sum, s) => sum + (Number(s.pageViews) || 0), 0);

		// Activity engagement
		const totalActivities = activities.length;
		const totalRegistrations = registrations.length;
		const registrationRate = totalActivities > 0 ? (totalRegistrations / totalActivities) * 100 : 0;

		// Recent activity (last 7 days)
		const recentLogins = logins.filter(l => {
			if (!l.timestamp) return false;
			return new Date(l.timestamp) >= sevenDaysAgo;
		}).length;

		const recentSessions = sessions.filter(s => {
			if (!s.startTime) return false;
			return new Date(s.startTime) >= sevenDaysAgo;
		}).length;

		const recentRegistrations = registrations.filter(r => {
			if (!r.createdAt) return false;
			return new Date(r.createdAt) >= sevenDaysAgo;
		}).length;

		// Page views over time
		const pageViewsByDate = {};
		sessions.forEach(session => {
			if (session.startTime && session.pageViews) {
				const date = new Date(session.startTime).toISOString().split('T')[0];
				pageViewsByDate[date] = (pageViewsByDate[date] || 0) + (Number(session.pageViews) || 0);
			}
		});
		const pageViewsArray = Object.keys(pageViewsByDate)
			.sort()
			.map(date => ({ date, views: pageViewsByDate[date] }));

		// User roles breakdown
		const roleCounts = {};
		users.forEach(u => {
			const role = u.role || 'parent';
			roleCounts[role] = (roleCounts[role] || 0) + 1;
		});

		// Trial and preorder metrics
		const usersWithTrial = users.filter(u => u.trialStartTime && !u.hasPreordered);
		const expiredTrials = usersWithTrial.filter(u => {
			if (!u.trialStartTime) return false;
			const trialStart = new Date(u.trialStartTime);
			const trialDuration = 24 * 60 * 60 * 1000;
			return (now - trialStart) > trialDuration;
		});
		const activeTrials = usersWithTrial.filter(u => {
			if (!u.trialStartTime) return false;
			const trialStart = new Date(u.trialStartTime);
			const trialDuration = 24 * 60 * 60 * 1000;
			return (now - trialStart) <= trialDuration;
		});
		const committedUsers = users.filter(u => u.hasPreordered && u.preorderStatus === 'committed');
		const totalCommitmentRevenue = preorders
			.filter(p => p.status === 'committed')
			.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

		// Conversion Funnel Steps
		const signups = conversionEvents.filter(e => e.eventType === 'signup').length;
		const trialsStarted = conversionEvents.filter(e => e.eventType === 'trial_started').length;
		const trialsExpired = conversionEvents.filter(e => e.eventType === 'trial_expired').length;
		const preorderPageViews = conversionEvents.filter(e => e.eventType === 'preorder_page_viewed').length;
		const commitmentsMade = conversionEvents.filter(e => e.eventType === 'commitment_made').length;

		// Conversion Rates
		const signupToTrialRate = signups > 0 ? (trialsStarted / signups) * 100 : 0;
		const trialToExpiryRate = trialsStarted > 0 ? (trialsExpired / trialsStarted) * 100 : 0;
		const expiryToPageViewRate = trialsExpired > 0 ? (preorderPageViews / trialsExpired) * 100 : 0;
		const pageViewToCommitmentRate = preorderPageViews > 0 ? (commitmentsMade / preorderPageViews) * 100 : 0;
		const overallConversionRate = signups > 0 ? (commitmentsMade / signups) * 100 : 0;

		// Conversion Events over time
		const conversionEventsByDate = groupByDate(conversionEvents, 'timestamp');
		const conversionEventsArray = Object.keys(conversionEventsByDate)
			.sort()
			.map(date => ({ date, count: conversionEventsByDate[date] }));

		// Conversion Events by Type
		const conversionEventsByType = {};
		conversionEvents.forEach(event => {
			const type = event.eventType || 'unknown';
			conversionEventsByType[type] = (conversionEventsByType[type] || 0) + 1;
		});

		// Conversion Funnel Object
		const conversionFunnel = {
			signups,
			trialsStarted,
			trialsExpired,
			preorderPageViews,
			commitmentsMade
		};

		// Conversion Rates Object
		const conversionRates = {
			signupToTrialRate: Math.round(signupToTrialRate * 100) / 100,
			trialToExpiryRate: Math.round(trialToExpiryRate * 100) / 100,
			expiryToPageViewRate: Math.round(expiryToPageViewRate * 100) / 100,
			pageViewToCommitmentRate: Math.round(pageViewToCommitmentRate * 100) / 100,
			overallConversionRate: Math.round(overallConversionRate * 100) / 100
		};

		// Preorders over time
		const preordersByDate = groupByDate(preorders, 'createdAt');
		const preordersArray = Object.keys(preordersByDate)
			.sort()
			.map(date => ({ date, count: preordersByDate[date] }));

		res.json({
			// Time series data
			userGrowth: cumulativeUsers,
			loginActivity: loginActivityArray,
			pageViews: pageViewsArray,
			preorders: preordersArray,
			conversionEvents: conversionEventsArray,
			
			// Summary KPIs
			summary: {
				totalUsers: users.length,
				uniqueUsers: uniqueUsers.size,
				totalLogins: logins.length,
				uniqueLoginUsers: uniqueLogins.size,
				totalSessions: totalSessions,
				activeSessions: activeSessions,
				avgSessionDuration: Math.round(avgSessionDuration),
				totalPageViews: totalPageViews,
				totalActivities: totalActivities,
				totalRegistrations: totalRegistrations,
				registrationRate: Math.round(registrationRate * 100) / 100,
				totalFeedback: feedback.length,
				// Trial and preorder metrics
				activeTrials: activeTrials.length,
				expiredTrials: expiredTrials.length,
				totalCommitments: committedUsers.length,
				commitmentRevenue: Math.round(totalCommitmentRevenue * 100) / 100,
				conversionRate: Math.round(overallConversionRate * 100) / 100
			},
			
			// Recent activity (7 days)
			recent: {
				logins: recentLogins,
				sessions: recentSessions,
				registrations: recentRegistrations
			},
			
			// Breakdowns
			roleBreakdown: roleCounts,
			
			// Conversion Funnel
			conversionFunnel: conversionFunnel,
			conversionRates: conversionRates,
			conversionEventsByType: conversionEventsByType
		});
	} catch (error) {
		console.error('Error fetching metrics:', error);
		res.status(500).json({ error: 'Failed to fetch metrics' });
	}
});
