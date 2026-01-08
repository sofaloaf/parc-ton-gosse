/**
 * Jest Configuration
 * 
 * Configuration for unit testing with ES modules support
 */

export default {
	// Use ES modules
	testEnvironment: 'node',
	
	// File extensions to test
	testMatch: [
		'**/__tests__/**/*.test.js',
		'**/?(*.)+(spec|test).js'
	],
	
	// Module file extensions
	moduleFileExtensions: ['js', 'json'],
	
	// Transform configuration for ES modules
	transform: {},
	
	// Coverage configuration
	collectCoverageFrom: [
		'services/**/*.js',
		'!services/**/*.test.js',
		'!services/**/__tests__/**',
		'!services/crawler/**', // Skip crawler for now
		'!services/datastore/**', // Skip datastore (tested via integration)
	],
	
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	
	// Coverage thresholds (can be adjusted)
	coverageThreshold: {
		global: {
			branches: 60,
			functions: 60,
			lines: 60,
			statements: 60
		}
	},
	
	// Setup files
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	
	// Module name mapping (if needed)
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	
	// Verbose output
	verbose: true,
	
	// Clear mocks between tests
	clearMocks: true,
	
	// Reset mocks between tests
	resetMocks: true,
	
	// Restore mocks between tests
	restoreMocks: true,
};

