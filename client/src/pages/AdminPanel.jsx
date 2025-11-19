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

	useEffect(() => {
		// First, ensure we have a CSRF token by making a GET request
		// This will set the CSRF token cookie if it doesn't exist
		api('/me')
			.then(data => {
				if (data.user?.role === 'admin') {
					setIsAuthenticated(true);
					loadMetrics();
				} else {
					setIsAuthenticated(false);
					setLoading(false);
					// Initialize Google Sign-In after ensuring CSRF token is set
					setTimeout(() => initializeGoogleSignIn(), 100);
				}
			})
			.catch(() => {
				setIsAuthenticated(false);
				setLoading(false);
				// Initialize Google Sign-In after ensuring CSRF token is set
				setTimeout(() => initializeGoogleSignIn(), 100);
			});
	}, []);

	const initializeGoogleSignIn = async () => {
		const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
		
		if (!clientId) {
			if (process.env.NODE_ENV === 'development') {
				console.error('VITE_GOOGLE_CLIENT_ID is missing');
			}
			return;
		}

		try {
			// Load Google Sign-In script if not already loaded
			if (!window.google || !window.google.accounts) {
				const script = document.createElement('script');
				script.src = 'https://accounts.google.com/gsi/client';
				script.async = true;
				script.defer = true;
				
				await new Promise((resolve, reject) => {
					script.onload = () => {
						if (process.env.NODE_ENV === 'development') {
							console.log('Google Sign-In script loaded');
						}
						resolve();
					};
					script.onerror = () => {
						if (process.env.NODE_ENV === 'development') {
							console.error('Failed to load Google Sign-In script');
						}
						reject(new Error('Failed to load Google Sign-In script'));
					};
					document.head.appendChild(script);
				});
				
				// Wait for script to fully initialize
				await new Promise(resolve => setTimeout(resolve, 200));
			}

			if (window.google?.accounts?.id) {
				// Initialize Google Sign-In
				window.google.accounts.id.initialize({
					client_id: clientId,
					callback: handleCredentialResponse,
				});

				// Render the button
				const buttonDiv = document.getElementById('google-signin-button');
				if (buttonDiv && !buttonDiv.hasChildNodes()) {
					window.google.accounts.id.renderButton(buttonDiv, {
						type: 'standard',
						theme: 'outline',
						size: 'large',
						text: 'signin_with',
					});
				}
			}
		} catch (err) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to initialize Google Sign-In:', err);
			}
		}
	};

	const handleGoogleLogin = async () => {
		// Re-initialize if button wasn't rendered
		await initializeGoogleSignIn();
	};

	const handleCredentialResponse = async (response) => {
		try {
			const result = await api('/auth/admin/google', {
				method: 'POST',
				body: { idToken: response.credential }
			});

			// Token is now in httpOnly cookie, no need to store locally
			setIsAuthenticated(true);
			setError('');
			loadMetrics();
		} catch (err) {
			setError(err.message || 'Login failed. Only authorized admin can access.');
			if (process.env.NODE_ENV === 'development') {
				console.error('Admin login error:', err);
			}
		}
	};

	const loadMetrics = async () => {
		try {
			const data = await api('/metrics/dashboard');
			setMetrics(data);
		} catch (err) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to load metrics:', err);
			}
			setError('Failed to load dashboard metrics');
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

	if (!metrics) {
		return (
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
				<div>Loading metrics...</div>
			</div>
		);
	}

	const { summary, userGrowth, loginActivity, pageViews, recent, roleBreakdown } = metrics;

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
				<h1>Admin Dashboard - KPI Overview</h1>
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
				<KPICard title="Total Page Views" value={summary.totalPageViews.toLocaleString()} subtitle="all time" />
				<KPICard title="Total Activities" value={summary.totalActivities} subtitle={`${summary.totalRegistrations} registrations`} />
				<KPICard title="Registration Rate" value={`${summary.registrationRate}%`} subtitle="conversion" />
				<KPICard title="Total Feedback" value={summary.totalFeedback} subtitle="submissions" />
			</div>

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


