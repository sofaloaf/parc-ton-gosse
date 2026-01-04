import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../shared/api.js';
import { auth } from '../shared/api.js';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AdminPanel() {
	const navigate = useNavigate();
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [loading, setLoading] = useState(true);
	const [metrics, setMetrics] = useState(null);
	const [error, setError] = useState('');
	const [crawlerLoading, setCrawlerLoading] = useState(false);
	const [crawlerResults, setCrawlerResults] = useState(null);
	const [crawlerError, setCrawlerError] = useState('');
	const [arrondissementCrawlerLoading, setArrondissementCrawlerLoading] = useState(false);
	const [arrondissementCrawlerResults, setArrondissementCrawlerResults] = useState(null);
	const [arrondissementCrawlerError, setArrondissementCrawlerError] = useState('');
	const [pendingActivities, setPendingActivities] = useState([]);
	const [pendingLoading, setPendingLoading] = useState(false);
	const [cleanupLoading, setCleanupLoading] = useState(false);
	const [cleanupResults, setCleanupResults] = useState(null);
	const [cleanupError, setCleanupError] = useState('');
	const [sandboxStatus, setSandboxStatus] = useState(null);
	const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' or 'crawler'
	const [enhancedCrawlerLoading, setEnhancedCrawlerLoading] = useState(false);
	const [enhancedCrawlerResults, setEnhancedCrawlerResults] = useState(null);
	const [enhancedCrawlerError, setEnhancedCrawlerError] = useState('');
	const [comparisonData, setComparisonData] = useState(null);

	useEffect(() => {
		// First, ensure we have a CSRF token by making a GET request
		// This will set the CSRF token cookie if it doesn't exist
		const timeoutPromise = new Promise((_, reject) => 
			setTimeout(() => reject(new Error('Authentication timeout')), 15000)
		);
		
		Promise.race([
			api('/me'),
			timeoutPromise
		])
			.then(data => {
				if (data.user?.role === 'admin') {
					setIsAuthenticated(true);
					setLoading(false);
					loadMetrics();
				} else {
					setIsAuthenticated(false);
					setLoading(false);
					// Initialize Google Sign-In after ensuring CSRF token is set
					setTimeout(() => {
						initializeGoogleSignIn().catch(err => {
							console.error('Failed to initialize Google Sign-In:', err);
						});
					}, 100);
				}
			})
			.catch((err) => {
				console.error('Auth check failed:', err);
				setIsAuthenticated(false);
				setLoading(false);
				// Initialize Google Sign-In after ensuring CSRF token is set
				setTimeout(() => {
					initializeGoogleSignIn().catch(err => {
						console.error('Failed to initialize Google Sign-In:', err);
					});
				}, 100);
			});
	}, []);

	const initializeGoogleSignIn = async () => {
		const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
		
		if (!clientId) {
			console.error('VITE_GOOGLE_CLIENT_ID is missing');
			return;
		}

		try {
			// Load Google Sign-In script if not already loaded
			if (!window.google || !window.google.accounts) {
				// Check if script is already being loaded
				if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
					// Wait for it to load
					await new Promise((resolve) => {
						const checkInterval = setInterval(() => {
							if (window.google?.accounts) {
								clearInterval(checkInterval);
								resolve();
							}
						}, 100);
						// Timeout after 5 seconds
						setTimeout(() => {
							clearInterval(checkInterval);
							resolve();
						}, 5000);
					});
				} else {
					const script = document.createElement('script');
					script.src = 'https://accounts.google.com/gsi/client';
					script.async = true;
					script.defer = true;
					
					await new Promise((resolve, reject) => {
						script.onload = () => {
							console.log('Google Sign-In script loaded');
							resolve();
						};
						script.onerror = () => {
							console.error('Failed to load Google Sign-In script');
							reject(new Error('Failed to load Google Sign-In script'));
						};
						document.head.appendChild(script);
					});
					
					// Wait for script to fully initialize
					await new Promise(resolve => setTimeout(resolve, 300));
				}
			}

			if (window.google?.accounts?.id) {
				// Initialize Google Sign-In
				window.google.accounts.id.initialize({
					client_id: clientId,
					callback: handleCredentialResponse,
				});

				// Render the button - clear any existing content first
				const buttonDiv = document.getElementById('google-signin-button');
				if (buttonDiv) {
					// Clear existing content
					buttonDiv.innerHTML = '';
					window.google.accounts.id.renderButton(buttonDiv, {
						type: 'standard',
						theme: 'outline',
						size: 'large',
						text: 'signin_with',
					});
					console.log('Google Sign-In button rendered');
				}
			} else {
				console.error('Google Sign-In API not available');
			}
		} catch (err) {
			console.error('Failed to initialize Google Sign-In:', err);
		}
	};

	const handleGoogleLogin = async () => {
		// Re-initialize if button wasn't rendered
		await initializeGoogleSignIn();
	};

	const handleCredentialResponse = async (response) => {
		try {
			setLoading(true);
			setError('');
			const result = await api('/auth/admin/google', {
				method: 'POST',
				body: { idToken: response.credential }
			});

			// Token is now in httpOnly cookie, no need to store locally
			setIsAuthenticated(true);
			await loadMetrics();
		} catch (err) {
			setIsAuthenticated(false);
			setLoading(false);
			setError(err.message || 'Login failed. Only authorized admin can access.');
			console.error('Admin login error:', err);
		}
	};

	const loadMetrics = async () => {
		try {
			setLoading(true);
			// Add timeout to prevent hanging
			const timeoutPromise = new Promise((_, reject) => 
				setTimeout(() => reject(new Error('Request timeout')), 30000)
			);
			const data = await Promise.race([
				api('/metrics/dashboard'),
				timeoutPromise
			]);
			setMetrics(data);
			setError('');
		} catch (err) {
			console.error('Failed to load metrics:', err);
			setError(err.message || 'Failed to load dashboard metrics. Please try refreshing the page.');
		} finally {
			setLoading(false);
		}
	};

	const formatDuration = (seconds) => {
		if (!seconds) return '0s';
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		if (mins > 0) return `${mins}m ${secs}s`;
		return `${secs}s`;
	};

	const runCrawler = async () => {
		setCrawlerLoading(true);
		setCrawlerError('');
		setCrawlerResults(null);

		try {
			// First ensure we have a CSRF token by making a GET request
			// This will set the CSRF token cookie if it doesn't exist
			await api('/me');
			
			// Wait a bit to ensure cookie is set
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// Then make the POST request
			const result = await api('/crawler/validate', {
				method: 'POST'
			});

			setCrawlerResults(result);
			setCrawlerError('');
		} catch (err) {
			setCrawlerError(err.message || 'Failed to run crawler');
			setCrawlerResults(null);
			console.error('Crawler error:', err);
		} finally {
			setCrawlerLoading(false);
		}
	};

	const runCleanup = async () => {
		setCleanupLoading(true);
		setCleanupError('');
		setCleanupResults(null);

		try {
			// First ensure we have a CSRF token
			await api('/me');
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// Get source tab name from input
			const sourceTabInput = document.getElementById('sourceTabName');
			const sourceTabName = sourceTabInput?.value?.trim() || 'Parctongosse_exported_02-21-2024csv';
			
			// Execute cleanup
			const result = await api('/sandbox/cleanup/copy-and-format', {
				method: 'POST',
				body: {
					newTabName: 'Activities Cleaned',
					sourceTabName: sourceTabName
				}
			});

			setCleanupResults(result);
			setCleanupError('');
		} catch (err) {
			setCleanupError(err.message || 'Failed to run cleanup');
			setCleanupResults(null);
			console.error('Cleanup error:', err);
		} finally {
			setCleanupLoading(false);
		}
	};

	const runArrondissementCrawler = async (arrondissements = []) => {
		setArrondissementCrawlerLoading(true);
		setArrondissementCrawlerError('');
		setArrondissementCrawlerResults(null);

		try {
			await api('/me');
			await new Promise(resolve => setTimeout(resolve, 100));
			
			const result = await api('/arrondissement-crawler/search', {
				method: 'POST',
				body: {
					arrondissements: arrondissements.length > 0 ? arrondissements : undefined, // Empty array means all
					useTemplate: true
				}
			});

			setArrondissementCrawlerResults(result);
			setArrondissementCrawlerError('');
			// Refresh pending activities after a short delay to allow sheet write to complete
			setTimeout(() => {
				loadPendingActivities();
			}, 2000);
		} catch (err) {
			setArrondissementCrawlerError(err.message || 'Failed to run arrondissement crawler');
			setArrondissementCrawlerResults(null);
			console.error('Arrondissement crawler error:', err);
		} finally {
			setArrondissementCrawlerLoading(false);
		}
	};

	const run20eTest = async () => {
		await runArrondissementCrawler(['20e']);
	};

	const runEnhanced20eTest = async () => {
		setEnhancedCrawlerLoading(true);
		setEnhancedCrawlerError('');
		setEnhancedCrawlerResults(null);
		setComparisonData(null);

		try {
			await api('/me', { timeout: 15000 });
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// Run enhanced crawler with extended timeout (crawler can take several minutes)
			const crawlerResult = await api('/arrondissement-crawler/search-enhanced', {
				method: 'POST',
				body: {
					arrondissements: ['20e']
				},
				timeout: 300000 // 5 minutes timeout for crawler
			});

			setEnhancedCrawlerResults(crawlerResult);

			// Get existing activities for comparison
			const existingActivitiesResponse = await api('/activities?neighborhood=20e&limit=1000');
			
			// Activities API returns { data: [...], pagination: {...} }
			const existingActivities = Array.isArray(existingActivitiesResponse) 
				? existingActivitiesResponse 
				: (existingActivitiesResponse.data || existingActivitiesResponse.activities || []);
			
			// Ensure crawler entities is an array
			const crawlerEntities = Array.isArray(crawlerResult.entities) 
				? crawlerResult.entities 
				: [];
			
			console.log('Crawler entities:', crawlerEntities.length, 'Existing activities:', existingActivities.length);
			
			// Compare results
			const comparison = compareResults(
				crawlerEntities,
				existingActivities
			);

			setComparisonData(comparison);
			
			// Refresh pending activities
			setTimeout(() => {
				loadPendingActivities();
			}, 2000);
		} catch (err) {
			setEnhancedCrawlerError(err.message || 'Failed to run enhanced crawler');
			console.error('Enhanced crawler error:', err);
		} finally {
			setEnhancedCrawlerLoading(false);
		}
	};

	const compareResults = (crawlerEntities, existingActivities) => {
		// Ensure both inputs are arrays
		const crawlerArray = Array.isArray(crawlerEntities) ? crawlerEntities : [];
		const existingArray = Array.isArray(existingActivities) ? existingActivities : [];

		const crawlerNames = new Set(
			crawlerArray.map(e => {
				const name = e.data?.name || e.data?.title || e.name || e.title || '';
				return typeof name === 'string' ? name.toLowerCase().trim() : '';
			}).filter(Boolean)
		);

		const existingNames = new Set(
			existingArray.map(a => {
				const name = a.title?.en || a.title?.fr || a.title || '';
				return typeof name === 'string' ? name.toLowerCase().trim() : '';
			}).filter(Boolean)
		);

		// Find new entities (in crawler but not in existing)
		const newEntities = crawlerArray.filter(e => {
			const name = (e.data?.name || e.data?.title || e.name || e.title || '').toLowerCase().trim();
			return name && !existingNames.has(name);
		});

		// Find missing entities (in existing but not in crawler)
		const missingEntities = existingArray.filter(a => {
			const name = (a.title?.en || a.title?.fr || a.title || '').toLowerCase().trim();
			return name && !crawlerNames.has(name);
		});

		return {
			crawlerCount: crawlerArray.length,
			existingCount: existingArray.length,
			newCount: newEntities.length,
			missingCount: missingEntities.length,
			overlapCount: crawlerArray.length - newEntities.length,
			newEntities: newEntities.slice(0, 20), // Limit to 20 for display
			missingEntities: missingEntities.slice(0, 20) // Limit to 20 for display
		};
	};

	const loadPendingActivities = async () => {
		setPendingLoading(true);
		try {
			// Add timeout to prevent hanging
			const timeoutPromise = new Promise((_, reject) => 
				setTimeout(() => reject(new Error('Request timeout')), 30000)
			);
			const result = await Promise.race([
				api('/arrondissement-crawler/pending'),
				timeoutPromise
			]);
			setPendingActivities(result.activities || []);
		} catch (err) {
			console.error('Failed to load pending activities:', err);
			// Don't show error to user, just log it
			setPendingActivities([]);
		} finally {
			setPendingLoading(false);
		}
	};

	const approveActivity = async (activityId, action) => {
		try {
			const result = await api('/arrondissement-crawler/approve', {
				method: 'POST',
				body: { activityId, action }
			});
			
			// Show success message
			const actionText = action === 'approve' ? 'approved' : 'rejected';
			console.log(`✅ Activity ${actionText}:`, result);
			
			// Remove the activity from the list immediately for better UX
			setPendingActivities(prev => prev.filter(a => a.id !== activityId));
			
			// Refresh pending activities after a short delay to ensure sync
			setTimeout(() => {
				loadPendingActivities();
			}, 1000);
		} catch (err) {
			console.error('Failed to approve/reject activity:', err);
			alert(`Failed to ${action} activity: ${err.message || 'Unknown error'}`);
		}
	};

	const batchApprove = async (activityIds, action) => {
		if (!activityIds || activityIds.length === 0) {
			alert('No activities selected');
			return;
		}
		
		if (!confirm(`Are you sure you want to ${action} ${activityIds.length} activit${activityIds.length === 1 ? 'y' : 'ies'}?`)) {
			return;
		}
		
		try {
			const result = await api('/arrondissement-crawler/batch-approve', {
				method: 'POST',
				body: { activityIds, action }
			});
			
			const actionText = action === 'approve' ? 'approved' : 'rejected';
			console.log(`✅ Batch ${actionText} ${result.results?.length || activityIds.length} activities:`, result);
			
			// Remove approved/rejected activities from the list immediately
			setPendingActivities(prev => prev.filter(a => !activityIds.includes(a.id)));
			
			// Refresh pending activities after a short delay
			setTimeout(() => {
				loadPendingActivities();
			}, 1500);
		} catch (err) {
			console.error('Failed to batch approve/reject:', err);
			alert(`Failed to ${action} activities: ${err.message || 'Unknown error'}`);
		}
	};

	// Load pending activities on mount
	useEffect(() => {
		if (isAuthenticated) {
			loadPendingActivities();
			checkSandboxStatus();
		}
	}, [isAuthenticated]);
	
	const checkSandboxStatus = async () => {
		try {
			// Add timeout to prevent hanging
			const timeoutPromise = new Promise((_, reject) => 
				setTimeout(() => reject(new Error('Request timeout')), 10000)
			);
			const status = await Promise.race([
				api('/sandbox/cleanup/status'),
				timeoutPromise
			]);
			setSandboxStatus(status);
		} catch (err) {
			console.error('Failed to check sandbox status:', err);
			// Don't show error, just log it
		}
	};

	if (loading) {
		return (
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
				<div>Loading...</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div style={{ 
				display: 'flex', 
				flexDirection: 'column', 
				alignItems: 'center', 
				justifyContent: 'center', 
				minHeight: '400px',
				gap: 20
			}}>
				<h2>Admin Login Required</h2>
				<p>Please login with your authorized Google account to access the admin dashboard.</p>
				{error && (
					<div style={{ padding: 12, background: '#f8d7da', color: '#721c24', borderRadius: 4 }}>
						{error}
					</div>
				)}
				<div id="google-signin-button" style={{ marginBottom: 12 }}></div>
				<button
					onClick={handleGoogleLogin}
					style={{
						padding: '12px 24px',
						background: '#4285f4',
						color: 'white',
						border: 'none',
						borderRadius: 4,
						cursor: 'pointer',
						fontSize: 16,
						display: 'flex',
						alignItems: 'center',
						gap: 8
					}}
				>
					<svg width="18" height="18" viewBox="0 0 18 18">
						<path fill="#fff" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
						<path fill="#fff" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
						<path fill="#fff" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
						<path fill="#fff" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
					</svg>
					Sign in with Google
				</button>
			</div>
		);
	}

	if (loading || !metrics) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '400px', gap: 12 }}>
				<div>Loading metrics...</div>
				{error && (
					<div style={{ padding: 12, background: '#f8d7da', color: '#721c24', borderRadius: 4, maxWidth: 500 }}>
						{error}
					</div>
				)}
			</div>
		);
	}

	// Safely destructure metrics with defaults to prevent errors
	const { 
		summary = {}, 
		userGrowth = [], 
		loginActivity = [], 
		pageViews = [], 
		recent = {}, 
		roleBreakdown = {}, 
		conversionFunnel = {}, 
		conversionRates = {}, 
		conversionEventsByType = {} 
	} = metrics || {};

	const roleData = Object.keys(roleBreakdown || {}).map(role => ({
		name: role.charAt(0).toUpperCase() + role.slice(1),
		value: roleBreakdown[role]
	}));

	return (
		<div style={{ padding: 20, maxWidth: '1400px', margin: '0 auto' }}>
			<style>{`
				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			`}</style>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
				<h1>Admin Dashboard</h1>
				<button
					onClick={async () => {
						try {
							await auth.logout();
						} catch (e) {
							// Ignore errors
						}
						setIsAuthenticated(false);
						setMetrics(null);
					}}
					style={{
						padding: '8px 16px',
						background: '#dc3545',
						color: 'white',
						border: 'none',
						borderRadius: 4,
						cursor: 'pointer'
					}}
				>
					Logout
				</button>
			</div>

			{/* Navigation Tabs */}
			<div style={{ 
				display: 'flex', 
				gap: 8, 
				marginBottom: 30,
				borderBottom: '2px solid #e0e0e0'
			}}>
				<button
					onClick={() => setActiveTab('analytics')}
					style={{
						padding: '12px 24px',
						background: activeTab === 'analytics' ? '#007bff' : 'transparent',
						color: activeTab === 'analytics' ? 'white' : '#666',
						border: 'none',
						borderBottom: activeTab === 'analytics' ? '3px solid #007bff' : '3px solid transparent',
						borderRadius: '4px 4px 0 0',
						cursor: 'pointer',
						fontSize: 16,
						fontWeight: activeTab === 'analytics' ? 'bold' : 'normal',
						transition: 'all 0.2s'
					}}
				>
					📊 Analytics
				</button>
				<button
					onClick={() => setActiveTab('crawler')}
					style={{
						padding: '12px 24px',
						background: activeTab === 'crawler' ? '#007bff' : 'transparent',
						color: activeTab === 'crawler' ? 'white' : '#666',
						border: 'none',
						borderBottom: activeTab === 'crawler' ? '3px solid #007bff' : '3px solid transparent',
						borderRadius: '4px 4px 0 0',
						cursor: 'pointer',
						fontSize: 16,
						fontWeight: activeTab === 'crawler' ? 'bold' : 'normal',
						transition: 'all 0.2s'
					}}
				>
					🔍 Crawler & Data Tools
				</button>
			</div>

			{/* Analytics Section */}
			{activeTab === 'analytics' && (
				<div>
					{/* KPI Cards */}
					<div style={{ 
				display: 'grid', 
					gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
					gap: 20, 
					marginBottom: 30 
				}}>
					<KPICard title="Total Users" value={summary.totalUsers} subtitle={`${summary.uniqueUsers} unique`} />
				<KPICard title="Total Logins" value={summary.totalLogins} subtitle={`${summary.uniqueLoginUsers} users`} />
				<KPICard title="Total Sessions" value={summary.totalSessions} subtitle={`${summary.activeSessions} active`} />
				<KPICard title="Avg Session Duration" value={formatDuration(summary.avgSessionDuration)} subtitle="per session" />
				<KPICard title="Total Page Views" value={(summary.totalPageViews || 0).toLocaleString()} subtitle="all time" />
				<KPICard title="Total Activities" value={summary.totalActivities || 0} subtitle={`${summary.totalRegistrations || 0} registrations`} />
				<KPICard title="Registration Rate" value={`${summary.registrationRate || 0}%`} subtitle="conversion" />
				<KPICard title="Total Feedback" value={summary.totalFeedback || 0} subtitle="submissions" />
				<KPICard title="Active Trials" value={summary.activeTrials || 0} subtitle={`${summary.expiredTrials || 0} expired`} color="#FFBB28" />
				<KPICard title="Total Commitments" value={summary.totalCommitments || 0} subtitle={`€${summary.commitmentRevenue || 0}`} color="#10b981" />
					<KPICard title="Conversion Rate" value={`${(summary.conversionRate || 0).toFixed(1)}%`} subtitle="trial to paid" color="#3b82f6" />
				</div>

				{/* Conversion Funnel */}
				{conversionFunnel && (
					<div style={{ 
					background: 'white', 
					padding: 24, 
					borderRadius: 8, 
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
					marginBottom: 30
				}}>
					<h2 style={{ marginTop: 0, marginBottom: 20 }}>Conversion Funnel</h2>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
						<div style={{ textAlign: 'center', padding: 16, background: '#f8fafc', borderRadius: 8 }}>
							<div style={{ fontSize: 32, fontWeight: 700, color: '#1e40af' }}>{conversionFunnel.signups || 0}</div>
							<div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Signups</div>
						</div>
						<div style={{ textAlign: 'center', padding: 16, background: '#f8fafc', borderRadius: 8 }}>
							<div style={{ fontSize: 32, fontWeight: 700, color: '#1e40af' }}>{conversionFunnel.trialsStarted || 0}</div>
							<div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Trials Started</div>
							{conversionRates && conversionRates.signupToTrialRate > 0 && (
								<div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
									{conversionRates.signupToTrialRate.toFixed(1)}% conversion
								</div>
							)}
						</div>
						<div style={{ textAlign: 'center', padding: 16, background: '#f8fafc', borderRadius: 8 }}>
							<div style={{ fontSize: 32, fontWeight: 700, color: '#1e40af' }}>{conversionFunnel.trialsExpired || 0}</div>
							<div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Trials Expired</div>
							{conversionRates && conversionRates.trialToExpiryRate > 0 && (
								<div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
									{conversionRates.trialToExpiryRate.toFixed(1)}% expired
								</div>
							)}
						</div>
						<div style={{ textAlign: 'center', padding: 16, background: '#f8fafc', borderRadius: 8 }}>
							<div style={{ fontSize: 32, fontWeight: 700, color: '#1e40af' }}>{conversionFunnel.preorderPageViews || 0}</div>
							<div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Page Views</div>
							{conversionRates && conversionRates.expiryToPageViewRate > 0 && (
								<div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
									{conversionRates.expiryToPageViewRate.toFixed(1)}% viewed
								</div>
							)}
						</div>
						<div style={{ textAlign: 'center', padding: 16, background: '#10b981', borderRadius: 8, color: 'white' }}>
							<div style={{ fontSize: 32, fontWeight: 700 }}>{conversionFunnel.commitmentsMade || 0}</div>
							<div style={{ fontSize: 14, marginTop: 4, opacity: 0.9 }}>Commitments</div>
							{conversionRates && conversionRates.pageViewToCommitment > 0 && (
								<div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
									{conversionRates.pageViewToCommitment.toFixed(1)}% converted
								</div>
							)}
						</div>
					</div>
					{conversionRates && (
						<div style={{ 
							padding: 16, 
							background: '#eff6ff', 
							borderRadius: 8,
							border: '1px solid #3b82f6'
						}}>
							<div style={{ fontSize: 18, fontWeight: 600, color: '#1e40af', marginBottom: 8 }}>
								Overall Conversion Rate: {(conversionRates.overallConversionRate || 0).toFixed(2)}%
							</div>
							<div style={{ fontSize: 14, color: '#475569' }}>
								{conversionFunnel.signups || 0} signups → {conversionFunnel.commitmentsMade || 0} commitments
							</div>
						</div>
					)}
					</div>
				)}

				{/* Recent Activity (7 days) */}
				<div style={{ 
					display: 'grid', 
					gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
					gap: 20, 
					marginBottom: 30 
				}}>
					<h2 style={{ gridColumn: '1 / -1', margin: 0 }}>Recent Activity (Last 7 Days)</h2>
					<KPICard title="Recent Logins" value={recent.logins} color="#0088FE" />
					<KPICard title="Recent Sessions" value={recent.sessions} color="#00C49F" />
					<KPICard title="Recent Registrations" value={recent.registrations} color="#FFBB28" />
				</div>

				{/* Charts */}
				<div style={{ display: 'grid', gap: 30, marginBottom: 30 }}>
					{/* User Growth Over Time */}
					<ChartCard title="User Growth Over Time">
					<ResponsiveContainer width="100%" height={300}>
						<AreaChart data={userGrowth}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="date" />
							<YAxis />
							<Tooltip />
							<Legend />
							<Area type="monotone" dataKey="count" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} />
						</AreaChart>
						</ResponsiveContainer>
					</ChartCard>

					{/* Login Activity Over Time */}
					<ChartCard title="Login Activity Over Time">
					<ResponsiveContainer width="100%" height={300}>
						<LineChart data={loginActivity}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="date" />
							<YAxis />
							<Tooltip />
							<Legend />
							<Line type="monotone" dataKey="count" stroke="#00C49F" strokeWidth={2} />
						</LineChart>
						</ResponsiveContainer>
					</ChartCard>

					{/* Page Views Over Time */}
					<ChartCard title="Page Views Over Time">
					<ResponsiveContainer width="100%" height={300}>
						<BarChart data={pageViews}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="date" />
							<YAxis />
							<Tooltip />
							<Legend />
							<Bar dataKey="views" fill="#FFBB28" />
						</BarChart>
						</ResponsiveContainer>
					</ChartCard>

					{/* User Roles Breakdown */}
					<ChartCard title="User Roles Distribution">
					<ResponsiveContainer width="100%" height={300}>
						<PieChart>
							<Pie
								data={roleData}
								cx="50%"
								cy="50%"
								labelLine={false}
								label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
								outerRadius={80}
								fill="#8884d8"
								dataKey="value"
							>
								{roleData.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
								))}
							</Pie>
							<Tooltip />
						</PieChart>
						</ResponsiveContainer>
					</ChartCard>
				</div>

				<button
						onClick={loadMetrics}
						style={{
							padding: '10px 20px',
							background: '#007bff',
							color: 'white',
							border: 'none',
							borderRadius: 4,
							cursor: 'pointer',
							marginTop: 20
						}}
					>
						Refresh Metrics
					</button>
				</div>
			)}

			{/* Crawler & Data Tools Section */}
			{activeTab === 'crawler' && (
				<div>
					{/* Data Validator/Crawler Section */}
					<ChartCard title="Data Validator / Crawler">
					<div style={{ marginBottom: 20 }}>
						<p style={{ color: '#666', marginBottom: 16 }}>
							Validate and update activity data by crawling websites. This will:
						</p>
					<ul style={{ color: '#666', marginLeft: 20, marginBottom: 16 }}>
						<li>Read all activities from Google Sheets</li>
						<li>Visit each activity's website</li>
						<li>Extract and validate data</li>
						<li>Create a new versioned sheet with updated data</li>
					</ul>
					<button
						onClick={runCrawler}
						disabled={crawlerLoading}
						style={{
							padding: '12px 24px',
							background: crawlerLoading ? '#6c757d' : '#28a745',
							color: 'white',
							border: 'none',
							borderRadius: 4,
							cursor: crawlerLoading ? 'not-allowed' : 'pointer',
							fontSize: 16,
							fontWeight: 'bold',
							display: 'flex',
							alignItems: 'center',
							gap: 8
						}}
					>
						{crawlerLoading ? (
							<>
								<span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
								Running Crawler...
							</>
						) : (
							<>
								🚀 Run Data Validator
							</>
						)}
					</button>
					{crawlerError && (
						<div style={{
							marginTop: 16,
							padding: 12,
							background: '#f8d7da',
							color: '#721c24',
							borderRadius: 4,
							border: '1px solid #f5c6cb'
						}}>
							<strong>Error:</strong> {crawlerError}
						</div>
					)}
					{crawlerResults && (
						<div style={{
							marginTop: 16,
							padding: 16,
							background: '#d4edda',
							borderRadius: 4,
							border: '1px solid #c3e6cb'
						}}>
							<h4 style={{ marginTop: 0, color: '#155724' }}>✅ Crawler Completed Successfully!</h4>
							<div style={{ marginBottom: 12 }}>
								<strong>New Sheet:</strong> <code style={{ background: 'white', padding: '2px 6px', borderRadius: 3 }}>{crawlerResults.sheetName}</code>
							</div>
							<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
								<div>
									<strong style={{ color: '#155724' }}>Total:</strong> {crawlerResults.summary.total}
								</div>
								<div>
									<strong style={{ color: '#155724' }}>Successful:</strong> {crawlerResults.summary.successful}
								</div>
								<div>
									<strong style={{ color: '#856404' }}>Errors:</strong> {crawlerResults.summary.errors}
								</div>
								<div>
									<strong style={{ color: '#856404' }}>Skipped:</strong> {crawlerResults.summary.skipped}
								</div>
								<div>
									<strong style={{ color: '#155724' }}>Changes:</strong> {crawlerResults.summary.totalChanges}
								</div>
							</div>
							{crawlerResults.results && crawlerResults.results.length > 0 && (
								<div style={{ marginTop: 12 }}>
									<strong style={{ color: '#155724' }}>Sample Results:</strong>
									<div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', background: 'white', padding: 12, borderRadius: 4 }}>
										{crawlerResults.results.slice(0, 5).map((r, i) => (
											<div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < 4 ? '1px solid #e0e0e0' : 'none' }}>
												<div style={{ fontSize: 12, color: '#666' }}>Row {r.row}: {r.url}</div>
												<div style={{ fontSize: 11, color: r.status === 'success' ? '#28a745' : r.status === 'error' ? '#dc3545' : '#ffc107', marginTop: 4 }}>
													Status: {r.status}
													{r.changes && ` • ${r.changes} changes`}
													{r.error && ` • ${r.error}`}
												</div>
											</div>
										))}
									</div>
								</div>
							)}
							<div style={{ marginTop: 12, fontSize: 14, color: '#155724' }}>
								✅ Check your Google Sheets for the new tab: <strong>{crawlerResults.sheetName}</strong>
							</div>
						</div>
					)}
				</div>
				</ChartCard>

				{/* Arrondissement Crawler Section */}
				<ChartCard title="Arrondissement Crawler">
					<div style={{ marginBottom: 20 }}>
						<p style={{ color: '#666', marginBottom: 16 }}>
							Search for activities in Paris arrondissements. This will:
						</p>
						<ul style={{ color: '#666', marginLeft: 20, marginBottom: 16 }}>
							<li>Search mairie websites for organizations</li>
							<li>Extract data from organization websites</li>
							<li>Save activities with pending status (requires approval)</li>
						</ul>
						
						{/* Test Buttons for 20e */}
						<div style={{ marginBottom: 16, padding: 12, background: '#fff3cd', borderRadius: 4, border: '1px solid #ffc107' }}>
							<p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#856404' }}>
								🧪 Test: 20th Arrondissement (20e)
							</p>
							<p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#856404' }}>
								Test the crawler on 20e to compare with existing manually extracted activities and identify gaps.
							</p>
							<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
								<button
									onClick={run20eTest}
									disabled={arrondissementCrawlerLoading || enhancedCrawlerLoading}
									style={{
										padding: '10px 20px',
										background: arrondissementCrawlerLoading ? '#6c757d' : '#ffc107',
										color: arrondissementCrawlerLoading ? '#fff' : '#000',
										border: 'none',
										borderRadius: 4,
										cursor: arrondissementCrawlerLoading ? 'not-allowed' : 'pointer',
										fontSize: 14,
										fontWeight: 'bold',
										display: 'flex',
										alignItems: 'center',
										gap: 8
									}}
								>
									{arrondissementCrawlerLoading ? (
										<>
											<span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
											Crawling 20e...
										</>
									) : (
										<>
											🧪 Test Crawler for 20e
										</>
									)}
								</button>
								<button
									onClick={runEnhanced20eTest}
									disabled={arrondissementCrawlerLoading || enhancedCrawlerLoading}
									style={{
										padding: '10px 20px',
										background: enhancedCrawlerLoading ? '#6c757d' : '#28a745',
										color: 'white',
										border: 'none',
										borderRadius: 4,
										cursor: enhancedCrawlerLoading ? 'not-allowed' : 'pointer',
										fontSize: 14,
										fontWeight: 'bold',
										display: 'flex',
										alignItems: 'center',
										gap: 8
									}}
								>
									{enhancedCrawlerLoading ? (
										<>
											<span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
											Running Enhanced Crawler...
										</>
									) : (
										<>
											✨ Enhanced Crawler for 20e
										</>
									)}
								</button>
							</div>
						</div>

						{/* All Arrondissements Button */}
						<div style={{ marginBottom: 12 }}>
							<button
								onClick={() => runArrondissementCrawler()}
								disabled={arrondissementCrawlerLoading}
								style={{
									padding: '12px 24px',
									background: arrondissementCrawlerLoading ? '#6c757d' : '#17a2b8',
									color: 'white',
									border: 'none',
									borderRadius: 4,
									cursor: arrondissementCrawlerLoading ? 'not-allowed' : 'pointer',
									fontSize: 16,
									fontWeight: 'bold',
									display: 'flex',
									alignItems: 'center',
									gap: 8
								}}
							>
								{arrondissementCrawlerLoading ? (
									<>
										<span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
										Searching Arrondissements...
									</>
								) : (
									<>
										🔍 Search All Arrondissements
									</>
								)}
							</button>
						</div>
						{arrondissementCrawlerError && (
							<div style={{
								marginTop: 16,
								padding: 12,
								background: '#f8d7da',
								color: '#721c24',
								borderRadius: 4,
								border: '1px solid #f5c6cb'
							}}>
								<strong>Error:</strong> {arrondissementCrawlerError}
							</div>
						)}
						{enhancedCrawlerError && (
							<div style={{
								marginTop: 16,
								padding: 12,
								background: '#f8d7da',
								color: '#721c24',
								borderRadius: 4,
								border: '1px solid #f5c6cb'
							}}>
								<strong>Enhanced Crawler Error:</strong> {enhancedCrawlerError}
							</div>
						)}
						{enhancedCrawlerResults && (
							<div style={{
								marginTop: 16,
								padding: 16,
								background: '#d1ecf1',
								borderRadius: 4,
								border: '1px solid #bee5eb'
							}}>
								<h4 style={{ marginTop: 0, color: '#0c5460' }}>✨ Enhanced Crawler Completed!</h4>
								<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
									<div>
										<strong style={{ color: '#0c5460' }}>Entities Found:</strong> {enhancedCrawlerResults.summary?.entities || 0}
									</div>
									<div>
										<strong style={{ color: '#0c5460' }}>Sources Searched:</strong> {enhancedCrawlerResults.summary?.arrondissements || 0}
									</div>
									<div>
										<strong style={{ color: '#856404' }}>Errors:</strong> {enhancedCrawlerResults.summary?.errors || 0}
									</div>
								</div>
								{enhancedCrawlerResults.saveResult && (
									<div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 4, border: '1px solid #bee5eb' }}>
										<strong style={{ color: '#0c5460' }}>📋 Results saved to Google Sheets:</strong>
										<div style={{ marginTop: 8, fontSize: 14 }}>
											<div><strong>Tab name:</strong> {enhancedCrawlerResults.saveResult.tabName}</div>
											{enhancedCrawlerResults.saveResult.sheetUrl && (
												<div style={{ marginTop: 4 }}>
													<strong>Sheet URL:</strong>{' '}
													<a href={enhancedCrawlerResults.saveResult.sheetUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'underline' }}>
														{enhancedCrawlerResults.saveResult.sheetUrl}
													</a>
												</div>
											)}
										</div>
									</div>
								)}
							</div>
						)}
						{comparisonData && (
							<div style={{
								marginTop: 16,
								padding: 16,
								background: '#e7f3ff',
								borderRadius: 4,
								border: '1px solid #b3d9ff'
							}}>
								<h4 style={{ marginTop: 0, color: '#004085' }}>📊 Comparison with Existing Data</h4>
								<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
									<div>
										<strong style={{ color: '#004085' }}>Crawler Found:</strong> {comparisonData.crawlerCount}
									</div>
									<div>
										<strong style={{ color: '#004085' }}>Existing Data:</strong> {comparisonData.existingCount}
									</div>
									<div style={{ background: '#d4edda', padding: 8, borderRadius: 4 }}>
										<strong style={{ color: '#155724' }}>New Entities:</strong> {comparisonData.newCount}
									</div>
									<div style={{ background: '#fff3cd', padding: 8, borderRadius: 4 }}>
										<strong style={{ color: '#856404' }}>Missing in Crawler:</strong> {comparisonData.missingCount}
									</div>
									<div>
										<strong style={{ color: '#004085' }}>Overlap:</strong> {comparisonData.overlapCount}
									</div>
								</div>
								{comparisonData.newEntities && comparisonData.newEntities.length > 0 && (
									<div style={{ marginTop: 16 }}>
										<strong style={{ color: '#155724' }}>✅ New Entities Found by Crawler ({comparisonData.newEntities.length} shown):</strong>
										<div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', background: 'white', padding: 12, borderRadius: 4 }}>
											{comparisonData.newEntities.map((entity, idx) => (
												<div key={idx} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: idx < comparisonData.newEntities.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
													<div style={{ fontSize: 13, fontWeight: 'bold' }}>
														{entity.data?.name || entity.data?.title || entity.name || entity.title || 'Untitled'}
													</div>
													{entity.data?.website && (
														<div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
															🔗 {entity.data.website}
														</div>
													)}
												</div>
											))}
										</div>
									</div>
								)}
								{comparisonData.missingEntities && comparisonData.missingEntities.length > 0 && (
									<div style={{ marginTop: 16 }}>
										<strong style={{ color: '#856404' }}>⚠️ Entities in Existing Data but Not Found by Crawler ({comparisonData.missingEntities.length} shown):</strong>
										<div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', background: 'white', padding: 12, borderRadius: 4 }}>
											{comparisonData.missingEntities.map((activity, idx) => (
												<div key={activity.id || idx} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: idx < comparisonData.missingEntities.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
													<div style={{ fontSize: 13, fontWeight: 'bold' }}>
														{activity.title?.en || activity.title?.fr || activity.title || 'Untitled'}
													</div>
													{activity.websiteLink && (
														<div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
															🔗 {activity.websiteLink}
														</div>
													)}
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						)}
						{arrondissementCrawlerResults && (
							<div style={{
								marginTop: 16,
								padding: 16,
								background: '#d4edda',
								borderRadius: 4,
								border: '1px solid #c3e6cb'
							}}>
								<h4 style={{ marginTop: 0, color: '#155724' }}>✅ Crawler Completed!</h4>
								<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
									<div>
										<strong style={{ color: '#155724' }}>Total Searched:</strong> {arrondissementCrawlerResults.summary?.total || 0}
									</div>
									<div>
										<strong style={{ color: '#155724' }}>Found:</strong> {arrondissementCrawlerResults.summary?.successful || 0}
									</div>
									<div>
										<strong style={{ color: '#856404' }}>Errors:</strong> {arrondissementCrawlerResults.summary?.errors || 0}
									</div>
									<div>
										<strong style={{ color: '#155724' }}>Pending:</strong> {arrondissementCrawlerResults.summary?.pendingActivities || 0}
									</div>
								</div>
								{arrondissementCrawlerResults.pendingSheet && (
									<div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 4, border: '1px solid #c3e6cb' }}>
										<strong style={{ color: '#155724' }}>📋 Results saved to Google Sheets:</strong>
										<div style={{ marginTop: 8, fontSize: 14 }}>
											<div><strong>Tab name:</strong> {arrondissementCrawlerResults.pendingSheet}</div>
											{arrondissementCrawlerResults.sheetUrl && (
												<div style={{ marginTop: 4 }}>
													<strong>Sheet URL:</strong>{' '}
													<a href={arrondissementCrawlerResults.sheetUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'underline' }}>
														{arrondissementCrawlerResults.sheetUrl}
													</a>
												</div>
											)}
										</div>
									</div>
								)}
								<div style={{ marginTop: 12, fontSize: 14, color: '#155724' }}>
									✅ {arrondissementCrawlerResults.summary?.pendingActivities || 0} activities are pending approval. 
									Click "🔄 Refresh Pending Activities" below to see them.
								</div>
							</div>
						)}
					</div>
				</ChartCard>

				{/* Pending Activities Approval Section */}
				<ChartCard title="Pending Activities Approval">
					<div style={{ marginBottom: 20 }}>
						<p style={{ color: '#666', marginBottom: 16 }}>
							Review and approve activities found by the crawler. Only approved activities will be visible to users.
						</p>
						<button
							onClick={loadPendingActivities}
							disabled={pendingLoading}
							style={{
								padding: '8px 16px',
								background: '#6c757d',
								color: 'white',
								border: 'none',
								borderRadius: 4,
								cursor: pendingLoading ? 'not-allowed' : 'pointer',
								fontSize: 14,
								marginBottom: 16
							}}
						>
							{pendingLoading ? 'Loading...' : '🔄 Refresh Pending Activities'}
						</button>
						
						{pendingActivities.length === 0 ? (
							<div style={{
								padding: 20,
								background: '#f8f9fa',
								borderRadius: 4,
								textAlign: 'center',
								color: '#666'
							}}>
								No pending activities. Run the arrondissement crawler to find new activities.
							</div>
						) : (
							<>
								<div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<strong style={{ color: '#333' }}>{pendingActivities.length} pending activities</strong>
									<div style={{ display: 'flex', gap: 8 }}>
										<button
											onClick={() => {
												const allIds = pendingActivities.map(a => a.id);
												batchApprove(allIds, 'approve');
											}}
											style={{
												padding: '6px 12px',
												background: '#28a745',
												color: 'white',
												border: 'none',
												borderRadius: 4,
												cursor: 'pointer',
												fontSize: 12
											}}
										>
											✅ Approve All
										</button>
										<button
											onClick={() => {
												const allIds = pendingActivities.map(a => a.id);
												batchApprove(allIds, 'reject');
											}}
											style={{
												padding: '6px 12px',
												background: '#dc3545',
												color: 'white',
												border: 'none',
												borderRadius: 4,
												cursor: 'pointer',
												fontSize: 12
											}}
										>
											❌ Reject All
										</button>
									</div>
								</div>
								<div style={{ maxHeight: 600, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}>
									{pendingActivities.map((activity, idx) => (
										<div key={activity.id} style={{
											padding: 16,
											borderBottom: idx < pendingActivities.length - 1 ? '1px solid #e0e0e0' : 'none',
											background: idx % 2 === 0 ? '#fff' : '#f8f9fa'
										}}>
											<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
												<div style={{ flex: 1 }}>
													<h4 style={{ margin: '0 0 8px 0', color: '#333' }}>
														{typeof activity.title === 'string' 
															? activity.title 
															: (activity.title?.en || activity.title?.fr || 'Untitled Activity')}
													</h4>
													<div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
														<strong>Arrondissement:</strong> {activity.neighborhood || 'N/A'} | 
														<strong> Categories:</strong> {Array.isArray(activity.categories) ? activity.categories.join(', ') : activity.categories || 'N/A'} |
														<strong> Age:</strong> {activity.ageMin || 'N/A'}-{activity.ageMax || 'N/A'} ans
													</div>
													{activity.description && (
														<p style={{ fontSize: 13, color: '#555', margin: '8px 0', maxHeight: 60, overflow: 'hidden' }}>
															{typeof activity.description === 'string' 
																? activity.description 
																: (activity.description?.en || activity.description?.fr || '')}
														</p>
													)}
													{activity.websiteLink && (
														<a 
															href={activity.websiteLink} 
															target="_blank" 
															rel="noopener noreferrer"
															style={{ fontSize: 12, color: '#007bff', textDecoration: 'none' }}
														>
															🔗 {activity.websiteLink}
														</a>
													)}
												</div>
												<div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
													<button
														onClick={() => approveActivity(activity.id, 'approve')}
														style={{
															padding: '6px 12px',
															background: '#28a745',
															color: 'white',
															border: 'none',
															borderRadius: 4,
															cursor: 'pointer',
															fontSize: 12
														}}
													>
														✅ Approve
													</button>
													<button
														onClick={() => approveActivity(activity.id, 'reject')}
														style={{
															padding: '6px 12px',
															background: '#dc3545',
															color: 'white',
															border: 'none',
															borderRadius: 4,
															cursor: 'pointer',
															fontSize: 12
														}}
													>
														❌ Reject
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							</>
						)}
					</div>
				</ChartCard>

				{/* Sandbox Cleanup Section */}
				<ChartCard title="Sandbox Cleanup & Formatting">
					<div style={{ marginBottom: 20 }}>
					{sandboxStatus && (
						<div style={{
							marginBottom: 16,
							padding: 12,
							background: sandboxStatus.available ? '#d4edda' : '#fff3cd',
							border: `1px solid ${sandboxStatus.available ? '#c3e6cb' : '#ffeaa7'}`,
							borderRadius: 4
						}}>
							<strong style={{ color: sandboxStatus.available ? '#155724' : '#856404' }}>
								Status: {sandboxStatus.available ? '✅ Ready' : '⚠️ Not Configured'}
							</strong>
							<div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
								{sandboxStatus.message}
							</div>
							{!sandboxStatus.configured && (
								<div style={{ fontSize: 11, color: '#856404', marginTop: 8 }}>
									<strong>Setup Required:</strong> Set <code>GS_SANDBOX_SHEET_ID</code> in Railway backend variables.
									<br />Value: <code>1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A</code>
								</div>
							)}
						</div>
					)}
					<p style={{ color: '#666', marginBottom: 16 }}>
						Create a new tab in the sandbox sheet with cleaned and formatted activity data. 
						This will:
					</p>
					<ul style={{ color: '#666', marginLeft: 20, marginBottom: 16 }}>
						<li>Copy all activities from the source tab</li>
						<li>Clean formatting (remove extra spaces, normalize data)</li>
						<li>Separate bilingual fields (title_en, title_fr, etc.)</li>
						<li>Format price (amount, currency columns)</li>
						<li>Create a new "Activities Cleaned" tab</li>
					</ul>
					<div style={{ marginBottom: 16 }}>
						<label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#333' }}>
							Source Tab Name:
						</label>
						<input
							type="text"
							id="sourceTabName"
							defaultValue="Parctongosse_exported_02-21-2024csv"
							style={{
								width: '100%',
								padding: '8px 12px',
								border: '1px solid #ddd',
								borderRadius: 4,
								fontSize: 14
							}}
							placeholder="Enter tab name (e.g., Parctongosse_exported_02-21-2024csv)"
						/>
					</div>
					<button
						onClick={runCleanup}
						disabled={cleanupLoading}
						style={{
							padding: '12px 24px',
							background: cleanupLoading ? '#6c757d' : '#28a745',
							color: 'white',
							border: 'none',
							borderRadius: 4,
							cursor: cleanupLoading ? 'not-allowed' : 'pointer',
							fontSize: 16,
							fontWeight: 'bold'
						}}
					>
						{cleanupLoading ? (
							<>
								<span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: 8 }}></span>
								Cleaning and Formatting...
							</>
						) : (
							<>
								🧹 Create Cleaned Tab
							</>
						)}
					</button>
					{cleanupError && (
						<div style={{
							marginTop: 16,
							padding: 12,
							background: '#f8d7da',
							color: '#721c24',
							borderRadius: 4,
							border: '1px solid #f5c6cb'
						}}>
							<strong>Error:</strong> {cleanupError}
						</div>
					)}
					{cleanupResults && (
						<div style={{
							marginTop: 16,
							padding: 16,
							background: '#d4edda',
							borderRadius: 4,
							border: '1px solid #c3e6cb'
						}}>
							<h4 style={{ marginTop: 0, color: '#155724' }}>✅ Cleanup Completed Successfully!</h4>
							<div style={{ marginBottom: 12 }}>
								<strong>New Tab:</strong> <code style={{ background: 'white', padding: '2px 6px', borderRadius: 3 }}>{cleanupResults.tabName}</code>
							</div>
							<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
								<div>
									<strong style={{ color: '#155724' }}>Activities Copied:</strong> {cleanupResults.count}
								</div>
								<div>
									<strong style={{ color: '#155724' }}>Columns:</strong> {cleanupResults.activities?.[0] ? Object.keys(cleanupResults.activities[0]).length : 'N/A'}
								</div>
							</div>
							<div style={{ marginTop: 12, fontSize: 14, color: '#155724' }}>
								✅ Check your Google Sheets for the new tab: <strong>{cleanupResults.tabName}</strong>
							</div>
						</div>
					)}
					</div>
				</ChartCard>
				</div>
			)}
		</div>
	);
}

function KPICard({ title, value, subtitle, color = '#007bff' }) {
	return (
		<div style={{
			padding: 20,
			background: 'white',
			border: '1px solid #e0e0e0',
			borderRadius: 8,
			borderLeft: `4px solid ${color}`,
			boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
		}}>
			<div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>{title}</div>
			<div style={{ fontSize: 32, fontWeight: 'bold', color: color, marginBottom: 4 }}>{value}</div>
			{subtitle && <div style={{ fontSize: 12, color: '#999' }}>{subtitle}</div>}
		</div>
	);
}

function ChartCard({ title, children }) {
	return (
		<div style={{
			padding: 20,
			background: 'white',
			border: '1px solid #e0e0e0',
			borderRadius: 8,
			boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
		}}>
			<h3 style={{ marginTop: 0, marginBottom: 20 }}>{title}</h3>
			{children}
		</div>
	);
}


