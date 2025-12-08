// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the server directory
dotenv.config({ path: join(__dirname, '.env') });

// Validate environment variables
import { validateEnv, sanitizeError } from './utils/validation.js';
try {
	validateEnv();
} catch (error) {
	console.error('❌ Environment validation failed:', error.message);
	// Don't exit in production - allow server to start with warnings
	// Missing variables will cause specific features to fail, but server can still run
	console.warn('⚠️  Continuing despite validation errors. Please set required environment variables.');
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createDataStore } from './services/datastore/index.js';
import { authRouter } from './routes/auth.js';
import { activitiesRouter } from './routes/activities.js';
import { usersRouter } from './routes/users.js';
import { registrationsRouter } from './routes/registrations.js';
import { reviewsRouter } from './routes/reviews.js';
import { i18nRouter } from './routes/i18n.js';
import { paymentsRouter } from './routes/payments.js';
import { importRouter } from './routes/import.js';
import geocodeRouter from './routes/geocode.js';
import { feedbackRouter } from './routes/feedback.js';
import { metricsRouter } from './routes/metrics.js';
import { referralsRouter } from './routes/referrals.js';
import { preordersRouter } from './routes/preorders.js';
import { crawlerRouter } from './routes/crawler.js';
import { arrondissementCrawlerRouter } from './routes/arrondissementCrawler.js';
import { sessionsRouter } from './routes/sessions.js';
import { cardViewsRouter } from './routes/cardViews.js';
import { cacheRouter } from './routes/cache.js';
import { testEmailRouter } from './routes/test-email.js';
import { sandboxRouter } from './routes/sandbox.js';
import { initSandboxSheets } from './services/sandbox-sheets.js';
import { requireAuth } from './middleware/auth.js';
import { csrfProtection } from './middleware/csrf.js';
import { getCache } from './services/cache/index.js';

const app = express();
// Trust proxy for Railway (needed for rate limiting and correct IP detection)
// Only enable in production to avoid security warnings
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
	app.set('trust proxy', true);
	console.log('✅ Trust proxy enabled (production mode)');
} else {
	app.set('trust proxy', false);
	console.log('✅ Trust proxy disabled (development mode)');
}
const PORT = process.env.PORT || 4000;

// Log all incoming requests for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
	app.use((req, res, next) => {
		const origin = req.headers.origin;
		if (origin) {
			console.log(`📥 ${req.method} ${req.path} from origin: ${origin}`);
		} else {
			console.log(`📥 ${req.method} ${req.path} (no origin)`);
		}
		next();
	});
}

// Security headers with CSP
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
			fontSrc: ["'self'", "https://fonts.gstatic.com"],
			scriptSrc: ["'self'", "https://accounts.google.com", "https://js.stripe.com", "https://www.googletagmanager.com"],
			imgSrc: ["'self'", "data:", "https:", "blob:"],
			connectSrc: ["'self'", "https://api.stripe.com", "https://accounts.google.com", "https://www.google-analytics.com", "https://www.googletagmanager.com"],
			frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
			objectSrc: ["'none'"],
			baseUri: ["'self'"],
			formAction: ["'self'"],
			frameAncestors: ["'none'"],
			upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null, // Only in production
		},
	},
	hsts: {
		maxAge: 31536000, // 1 year
		includeSubDomains: true,
		preload: true
	},
	xContentTypeOptions: true,
	xFrameOptions: { action: 'deny' },
	referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
	permissionsPolicy: {
		geolocation: ["'self'"],
		camera: ["'none'"],
		microphone: ["'none'"],
		payment: ["'self'"] // Allow payment APIs for future Stripe integration
	}
}));

// CORS configuration - restrict in production
const corsOriginRaw = process.env.CORS_ORIGIN || '';
const allowedOrigins = corsOriginRaw
	.split(',')
	.map(o => o.trim())
	.filter(o => o.length > 0)
	.map(o => o.replace(/\/$/, '')); // Remove trailing slashes

console.log('🔍 CORS Configuration:');
console.log(`   CORS_ORIGIN env var: "${corsOriginRaw}"`);
console.log(`   Parsed origins: [${allowedOrigins.join(', ')}]`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
	console.warn('⚠️  WARNING: CORS_ORIGIN not set in production. Allowing all origins for now.');
	console.warn('   This is insecure! Set CORS_ORIGIN in Railway variables.');
	console.warn('   Expected: CORS_ORIGIN=https://victorious-gentleness-production.up.railway.app');
} else if (allowedOrigins.length > 0) {
	console.log(`✅ CORS configured for origins: ${allowedOrigins.join(', ')}`);
} else {
	console.log('ℹ️  CORS_ORIGIN not set (development mode - allowing all origins)');
}

// Explicit OPTIONS handler for all routes - MUST be BEFORE CORS middleware
app.options('*', (req, res) => {
	const origin = req.headers.origin;
	console.log(`📥 OPTIONS preflight request from: ${origin}`);
	
	// Always set CORS headers for OPTIONS
	if (origin) {
		// Check if origin is allowed
		if (allowedOrigins.length > 0) {
			const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
			const normalizedAllowed = allowedOrigins.map(o => o.replace(/\/$/, '').toLowerCase());
			
			if (normalizedAllowed.includes(normalizedOrigin)) {
				res.header('Access-Control-Allow-Origin', origin);
				res.header('Access-Control-Allow-Credentials', 'true');
				res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
				res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');
				res.header('Access-Control-Expose-Headers', 'X-CSRF-Token');
				res.header('Access-Control-Max-Age', '86400'); // 24 hours
				res.status(204).end();
				console.log(`✅ OPTIONS preflight allowed for: ${origin}`);
				return;
			} else {
				console.warn(`❌ OPTIONS preflight blocked for: ${origin} (not in allowed list)`);
				console.warn(`   Allowed origins: ${normalizedAllowed.join(', ')}`);
			}
		} else {
			// No CORS_ORIGIN set - allow all in development, but warn
			if (process.env.NODE_ENV === 'production') {
				console.warn(`⚠️  OPTIONS preflight: CORS_ORIGIN not set, but allowing ${origin} (production mode)`);
			}
			res.header('Access-Control-Allow-Origin', origin);
			res.header('Access-Control-Allow-Credentials', 'true');
			res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
			res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');
			res.header('Access-Control-Expose-Headers', 'X-CSRF-Token');
			res.header('Access-Control-Max-Age', '86400');
			res.status(204).end();
			return;
		}
	}
	
	// No origin header - allow anyway
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');
	res.status(204).end();
});

// CORS middleware with detailed logging and explicit preflight handling
app.use(cors({ 
	origin: function (origin, callback) {
		// Allow requests with no origin (like mobile apps or curl requests)
		if (!origin) {
			console.log('📥 Request with no origin header - allowing');
			return callback(null, true);
		}
		
		// In production, check against allowed origins
		if (allowedOrigins.length > 0) {
			// Normalize origin (remove trailing slash)
			const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
			const normalizedAllowed = allowedOrigins.map(o => o.replace(/\/$/, '').toLowerCase());
			
			if (normalizedAllowed.includes(normalizedOrigin)) {
				console.log(`✅ CORS allowed for origin: ${origin}`);
				return callback(null, true);
			} else {
				console.warn(`❌ CORS blocked for origin: ${origin}`);
				console.warn(`   Normalized: ${normalizedOrigin}`);
				console.warn(`   Allowed (normalized): ${normalizedAllowed.join(', ')}`);
				console.warn(`   CORS_ORIGIN env var: ${process.env.CORS_ORIGIN || 'NOT SET'}`);
				return callback(new Error('Not allowed by CORS'));
			}
		}
		
		// Allow all origins if CORS_ORIGIN not set (development or initial deployment)
		if (process.env.NODE_ENV === 'production') {
			console.warn(`⚠️  CORS allowing origin in production (CORS_ORIGIN not set): ${origin}`);
			console.warn(`   This is insecure! Set CORS_ORIGIN in Railway variables.`);
		} else {
			console.log(`✅ CORS allowing origin (development): ${origin}`);
		}
		return callback(null, true);
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
	exposedHeaders: ['X-CSRF-Token'],
	preflightContinue: false,
	optionsSuccessStatus: 204,
	maxAge: 86400 // 24 hours
}));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// CSRF protection for state-changing requests
app.use(csrfProtection());

// General rate limiting
// Fix trust proxy warning by only trusting proxy in production
const limiter = rateLimit({ 
	windowMs: 60 * 1000, 
	max: 120,
	trustProxy: process.env.NODE_ENV === 'production' ? true : false
});
app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // 5 attempts per window
	message: 'Too many authentication attempts, please try again later',
	standardHeaders: true,
	legacyHeaders: false,
	trustProxy: process.env.NODE_ENV === 'production' ? true : false
});

// Rate limiting for preorder/commitment endpoints (prevent abuse)
const preorderLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // 10 attempts per window (allows multiple promo code checks)
	message: 'Too many requests, please try again later',
	standardHeaders: true,
	legacyHeaders: false,
	trustProxy: process.env.NODE_ENV === 'production' ? true : false
});

// Stricter rate limiting for commitment creation (critical endpoint)
const commitmentLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 3, // Only 3 commitment attempts per hour
	message: 'Too many commitment attempts, please try again later',
	standardHeaders: true,
	legacyHeaders: false,
	trustProxy: process.env.NODE_ENV === 'production' ? true : false
});

// Initialize cache early (before data store)
getCache(); // Initialize cache singleton

// Data store binding on app with error handling
// Initialize data store asynchronously - don't block server startup
let dataStore = null;
(async () => {
	try {
		const backend = process.env.DATA_BACKEND || 'memory';
		console.log(`📦 Initializing data store: ${backend}`);
		console.log('🔍 DEBUG: About to check environment variables...');
		console.log('🔍 DEBUG: All env vars starting with GS_:', Object.keys(process.env).filter(k => k.startsWith('GS_')).join(', '));
		
		// Process private key BEFORE passing to createDataStore
		let processedPrivateKey = null;
		console.log('🔍 Checking for private key...');
		console.log('GS_PRIVATE_KEY_BASE64 exists:', !!process.env.GS_PRIVATE_KEY_BASE64);
		console.log('GS_PRIVATE_KEY_BASE64 length:', process.env.GS_PRIVATE_KEY_BASE64?.length || 0);
		console.log('GS_PRIVATE_KEY exists:', !!process.env.GS_PRIVATE_KEY);
		console.log('GS_PRIVATE_KEY length:', process.env.GS_PRIVATE_KEY?.length || 0);
		
		if (process.env.GS_PRIVATE_KEY_BASE64) {
			console.log('✅ Using GS_PRIVATE_KEY_BASE64 (base64-encoded)');
			try {
				const decoded = Buffer.from(process.env.GS_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');
				console.log('✅ Base64 key decoded successfully');
				console.log('Decoded key length:', decoded.length);
				console.log('Key preview (first 50 chars):', decoded.substring(0, 50));
				console.log('Key has newlines:', decoded.includes('\n'));
				if (!decoded.includes('BEGIN PRIVATE KEY')) {
					console.error('❌ Decoded key does not contain BEGIN PRIVATE KEY marker');
					throw new Error('Decoded base64 key is not a valid private key');
				}
				processedPrivateKey = decoded;
			} catch (error) {
				console.error('❌ Failed to decode GS_PRIVATE_KEY_BASE64:', error.message);
				throw new Error('GS_PRIVATE_KEY_BASE64 is invalid base64: ' + error.message);
			}
		} else if (process.env.GS_PRIVATE_KEY) {
			console.log('⚠️  Using GS_PRIVATE_KEY (not base64-encoded)');
			processedPrivateKey = process.env.GS_PRIVATE_KEY;
			
			// Pre-process the key to ensure proper format
			// Replace literal \n with actual newlines if needed
			if (processedPrivateKey.includes('\\n')) {
				console.log('🔧 Converting \\n to actual newlines');
				processedPrivateKey = processedPrivateKey.replace(/\\n/g, '\n');
			}
			
			// Ensure key has proper newlines
			if (!processedPrivateKey.includes('\n') && processedPrivateKey.includes('BEGIN PRIVATE KEY')) {
				console.log('🔧 Adding newlines to private key');
				processedPrivateKey = processedPrivateKey
					.replace(/-----BEGIN PRIVATE KEY-----/g, '-----BEGIN PRIVATE KEY-----\n')
					.replace(/-----END PRIVATE KEY-----/g, '\n-----END PRIVATE KEY-----')
					.replace(/\n+/g, '\n');
			}
			
			// Validate key format
			if (!processedPrivateKey.includes('BEGIN PRIVATE KEY') || !processedPrivateKey.includes('END PRIVATE KEY')) {
				console.error('❌ Private key format validation failed');
				console.error('Key preview (first 100 chars):', processedPrivateKey.substring(0, 100));
				throw new Error('GS_PRIVATE_KEY format is invalid. Must include BEGIN and END markers.');
			}
			
			console.log('✅ Private key format validated');
			console.log('Key has newlines:', processedPrivateKey.includes('\n'));
			console.log('Key preview (first 80 chars):', processedPrivateKey.substring(0, 80).replace(/\n/g, '\\n'));
		} else {
			console.error('❌ Neither GS_PRIVATE_KEY_BASE64 nor GS_PRIVATE_KEY is set');
			throw new Error('Neither GS_PRIVATE_KEY_BASE64 nor GS_PRIVATE_KEY is set');
		}
		
		console.log('✅ Private key processed, length:', processedPrivateKey?.length || 0);
		
		dataStore = await createDataStore({
			backend: backend,
			airtable: {
				apiKey: process.env.AIRTABLE_API_KEY,
				baseId: process.env.AIRTABLE_BASE_ID,
			},
			sheets: {
				serviceAccount: process.env.GS_SERVICE_ACCOUNT,
				privateKey: processedPrivateKey,
				sheetId: process.env.GS_SHEET_ID,
			}
		});
		app.set('dataStore', dataStore);
		console.log(`✅ Data store initialized: ${backend}`);
		
		// Initialize sandbox sheets (separate from production)
		initSandboxSheets().catch(err => {
			console.warn('⚠️  Sandbox sheets initialization failed (non-critical):', err.message);
		});
	} catch (error) {
		console.error('❌ Failed to initialize data store:', error.message);
		console.error('Stack:', error.stack);
		// Fallback to memory backend if sheets/airtable fails
		if (process.env.DATA_BACKEND !== 'memory') {
			console.warn('⚠️  Falling back to memory backend');
			try {
				dataStore = await createDataStore({
					backend: 'memory',
					airtable: {},
					sheets: {}
				});
				app.set('dataStore', dataStore);
				console.log('✅ Fallback to memory backend successful');
			} catch (fallbackError) {
				console.error('❌ Fallback to memory backend also failed:', fallbackError.message);
				// Server will still start, but data operations will fail
			}
		} else {
			console.error('❌ Memory backend failed - this is a critical error');
			// Server will still start, but data operations will fail
		}
	}
})();

// Root endpoint for Railway health checks - register BEFORE routes
app.get('/', (req, res) => {
	console.log('📥 Root endpoint hit');
	try {
		res.json({ 
			message: 'Parc Ton Gosse API',
			status: 'running',
			health: '/api/health',
			timestamp: new Date().toISOString()
		});
		console.log('✅ Root endpoint responded');
	} catch (error) {
		console.error('❌ Error in root endpoint:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Health check - should work even if data store fails
app.get('/api/health', (req, res) => {
	console.log('📥 Health endpoint hit');
	try {
		res.json({ 
			ok: true, 
			status: 'healthy',
			timestamp: new Date().toISOString(),
			dataStore: !!app.get('dataStore'),
			port: process.env.PORT || 4000
		});
		console.log('✅ Health endpoint responded');
	} catch (error) {
		console.error('❌ Error in health endpoint:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Data store health check - verifies data store is working
app.get('/api/health/datastore', async (req, res) => {
	console.log('📥 Data store health endpoint hit');
	try {
		const store = app.get('dataStore');
		if (!store) {
			return res.json({ 
				status: 'not_initialized',
				message: 'Data store has not been initialized yet',
				timestamp: new Date().toISOString()
			});
		}
		
		// Test data store by fetching activities
		try {
			const activities = await store.activities.list();
			res.json({ 
				status: 'healthy',
				activityCount: activities.length,
				backend: process.env.DATA_BACKEND || 'memory',
				timestamp: new Date().toISOString()
			});
			console.log(`✅ Data store health check: ${activities.length} activities found`);
		} catch (error) {
			console.error('❌ Data store health check failed:', error.message);
			res.json({ 
				status: 'error',
				error: error.message,
				backend: process.env.DATA_BACKEND || 'memory',
				timestamp: new Date().toISOString()
			});
		}
	} catch (error) {
		console.error('❌ Error in data store health endpoint:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth', authRouter);
app.use('/api/preorders/validate-promo', preorderLimiter);
app.use('/api/preorders/calculate-amount', preorderLimiter);
app.use('/api/preorders/commit', commitmentLimiter);
app.use('/api/preorders/track-page-view', preorderLimiter);
app.use('/api/activities', activitiesRouter);
app.use('/api/users', usersRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/i18n', i18nRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/import', importRouter);
app.use('/api/geocode', geocodeRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/card-views', cardViewsRouter);
app.use('/api/referrals', referralsRouter);
app.use('/api/preorders', preordersRouter);
app.use('/api/crawler', crawlerRouter);
app.use('/api/arrondissement-crawler', arrondissementCrawlerRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/cache', cacheRouter);
app.use('/api/test-email', testEmailRouter);
app.use('/api/sandbox', sandboxRouter);

// Get current user with trial status
app.get('/api/me', requireAuth(), async (req, res) => {
	const store = req.app.get('dataStore');
	if (!store) {
		return res.status(503).json({ error: 'Data store not initialized' });
	}
	const user = await store.users.get(req.user.id);
	if (!user) return res.status(404).json({ error: 'User not found' });
	
	// Calculate trial status
	let trialStatus = null;
	if (user.trialStartTime && !user.hasPreordered) {
		const trialStart = new Date(user.trialStartTime);
		const now = new Date();
		const trialDuration = 24 * 60 * 60 * 1000;
		const timeElapsed = now - trialStart;
		const timeRemaining = Math.max(0, trialDuration - timeElapsed);
		const isExpired = timeElapsed > trialDuration;
		
		trialStatus = {
			startTime: user.trialStartTime,
			expiresAt: new Date(trialStart.getTime() + trialDuration).toISOString(),
			timeRemaining: Math.floor(timeRemaining / 1000), // seconds
			isExpired,
			hasPreordered: user.hasPreordered || false
		};
	}
	
	res.json({ 
		user: {
			id: user.id,
			email: user.email,
			role: user.role,
			profile: user.profile,
			trialStatus,
			hasPreordered: user.hasPreordered || false,
			emailVerified: user.emailVerified !== false // Default to true for existing users
		}
	});
});

app.use((err, req, res, next) => {
	console.error('Error:', err);
	const isProduction = process.env.NODE_ENV === 'production';
	const errorMessage = sanitizeError(err, isProduction);
	res.status(err.status || 500).json({ error: errorMessage });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
	console.log(`✅ Server listening on port ${PORT}`);
	console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
	console.log(`✅ Data backend: ${process.env.DATA_BACKEND || 'memory'}`);
	console.log(`✅ Health check: http://0.0.0.0:${PORT}/api/health`);
	console.log(`✅ Root endpoint: http://0.0.0.0:${PORT}/`);
});

// Handle server errors
server.on('error', (error) => {
	console.error('❌ Server error:', error);
	if (error.code === 'EADDRINUSE') {
		console.error(`❌ Port ${PORT} is already in use`);
	}
});

// Keep server alive for Railway
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
	console.error('❌ Uncaught Exception:', error);
	// Don't exit in production - let Railway handle restarts
	if (process.env.NODE_ENV !== 'production') {
		process.exit(1);
	}
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
	// Don't exit in production - let Railway handle restarts
	if (process.env.NODE_ENV !== 'production') {
		process.exit(1);
	}
});
