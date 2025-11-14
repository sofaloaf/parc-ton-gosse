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
import { preordersRouter } from './routes/preorders.js';
import { requireAuth } from './middleware/auth.js';
import { csrfProtection } from './middleware/csrf.js';

const app = express();
// Trust proxy for Railway (needed for rate limiting and correct IP detection)
app.set('trust proxy', true);
const PORT = process.env.PORT || 4000;

// Log all incoming requests for debugging
app.use((req, res, next) => {
	console.log(`📥 ${req.method} ${req.path}`);
	next();
});

// Security headers with CSP
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
			fontSrc: ["'self'", "https://fonts.gstatic.com"],
			scriptSrc: ["'self'", "https://accounts.google.com", "https://js.stripe.com"],
			imgSrc: ["'self'", "data:", "https:", "blob:"],
			connectSrc: ["'self'", "https://api.stripe.com", "https://accounts.google.com"],
			frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
		},
	},
	hsts: {
		maxAge: 31536000,
		includeSubDomains: true,
		preload: true
	},
	xContentTypeOptions: true,
	xFrameOptions: { action: 'deny' },
	referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS configuration - restrict in production
const corsOriginRaw = process.env.CORS_ORIGIN || '';
const allowedOrigins = corsOriginRaw
	.split(',')
	.map(o => o.trim())
	.filter(o => o.length > 0)
	.map(o => o.replace(/\/$/, '')); // Remove trailing slashes

if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
	console.warn('⚠️  WARNING: CORS_ORIGIN not set in production. Allowing all origins for now.');
} else {
	console.log(`✅ CORS configured for origins: ${allowedOrigins.join(', ')}`);
}

// CORS middleware with detailed logging
app.use(cors({ 
	origin: function (origin, callback) {
		// Allow requests with no origin (like mobile apps or curl requests)
		if (!origin) {
			return callback(null, true);
		}
		
		// In production, check against allowed origins
		if (allowedOrigins.length > 0) {
			if (allowedOrigins.includes(origin)) {
				console.log(`✅ CORS allowed for origin: ${origin}`);
				return callback(null, true);
			} else {
				console.warn(`❌ CORS blocked for origin: ${origin} (not in allowed list)`);
				return callback(new Error('Not allowed by CORS'));
			}
		}
		
		// Allow all origins if CORS_ORIGIN not set (development or initial deployment)
		return callback(null, true);
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
	exposedHeaders: ['X-CSRF-Token']
}));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// CSRF protection for state-changing requests
app.use(csrfProtection());

// General rate limiting
const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // 5 attempts per window
	message: 'Too many authentication attempts, please try again later',
	standardHeaders: true,
	legacyHeaders: false,
});

// Data store binding on app with error handling
// Initialize data store asynchronously - don't block server startup
let dataStore = null;
(async () => {
	try {
		const backend = process.env.DATA_BACKEND || 'memory';
		console.log(`📦 Initializing data store: ${backend}`);
		
		dataStore = await createDataStore({
			backend: backend,
			airtable: {
				apiKey: process.env.AIRTABLE_API_KEY,
				baseId: process.env.AIRTABLE_BASE_ID,
			},
			sheets: {
				serviceAccount: process.env.GS_SERVICE_ACCOUNT,
				// Support both regular key and base64-encoded key
				privateKey: (() => {
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
							return decoded;
						} catch (error) {
							console.error('❌ Failed to decode GS_PRIVATE_KEY_BASE64:', error.message);
							throw new Error('GS_PRIVATE_KEY_BASE64 is invalid base64: ' + error.message);
						}
					} else if (process.env.GS_PRIVATE_KEY) {
						console.log('⚠️  Using GS_PRIVATE_KEY (not base64-encoded)');
						return process.env.GS_PRIVATE_KEY;
					} else {
						console.error('❌ Neither GS_PRIVATE_KEY_BASE64 nor GS_PRIVATE_KEY is set');
						throw new Error('Neither GS_PRIVATE_KEY_BASE64 nor GS_PRIVATE_KEY is set');
					}
				})(),
				sheetId: process.env.GS_SHEET_ID,
			}
		});
		app.set('dataStore', dataStore);
		console.log(`✅ Data store initialized: ${backend}`);
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

// Routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth', authRouter);
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
app.use('/api/preorders', preordersRouter);

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
			hasPreordered: user.hasPreordered || false
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
