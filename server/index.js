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
const PORT = process.env.PORT || 4000;

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
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean) || [];
if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
	console.warn('⚠️  WARNING: CORS_ORIGIN not set in production. Allowing all origins is insecure!');
}
app.use(cors({ 
	origin: allowedOrigins.length > 0 ? allowedOrigins : (process.env.NODE_ENV === 'production' ? false : '*'), 
	credentials: true 
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
let dataStore;
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
			privateKey: process.env.GS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
			sheetId: process.env.GS_SHEET_ID,
		}
	});
	console.log(`✅ Data store initialized: ${backend}`);
} catch (error) {
	console.error('❌ Failed to initialize data store:', error.message);
	// Fallback to memory backend if sheets/airtable fails
	if (process.env.DATA_BACKEND !== 'memory') {
		console.warn('⚠️  Falling back to memory backend');
		dataStore = await createDataStore({
			backend: 'memory',
			airtable: {},
			sheets: {}
		});
	} else {
		// If memory also fails, we have a bigger problem
		throw error;
	}
}
app.set('dataStore', dataStore);

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

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

app.listen(PORT, '0.0.0.0', () => {
	console.log(`✅ Server listening on port ${PORT}`);
	console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
	console.log(`✅ Data backend: ${process.env.DATA_BACKEND || 'memory'}`);
});

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
