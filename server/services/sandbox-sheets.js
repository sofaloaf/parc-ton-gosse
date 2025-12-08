/**
 * Sandbox Google Sheets Connection
 * Separate from production sheet - for testing and editing
 */

import { google } from 'googleapis';
import { createSheetsStore } from './datastore/sheets-enhanced.js';

let sandboxStore = null;

/**
 * Initialize sandbox Google Sheets connection
 * Uses separate sheet ID from production
 */
export async function initSandboxSheets() {
	const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
	const sandboxSheetId = process.env.GS_SANDBOX_SHEET_ID; // New env var
	
	// Check for private key in both formats (Railway uses GS_PRIVATE_KEY_BASE64)
	let privateKey = process.env.GS_PRIVATE_KEY;
	const privateKeyBase64 = process.env.GS_PRIVATE_KEY_BASE64;
	
	console.log('🔍 Checking sandbox configuration...');
	console.log(`   GS_SANDBOX_SHEET_ID: ${sandboxSheetId ? 'SET' : 'NOT SET'}`);
	console.log(`   GS_SERVICE_ACCOUNT: ${serviceAccount ? 'SET' : 'NOT SET'}`);
	console.log(`   GS_PRIVATE_KEY: ${privateKey ? 'SET' : 'NOT SET'}`);
	console.log(`   GS_PRIVATE_KEY_BASE64: ${privateKeyBase64 ? 'SET' : 'NOT SET'}`);
	
	if (!sandboxSheetId) {
		console.warn('⚠️  GS_SANDBOX_SHEET_ID not set - sandbox features disabled');
		console.warn('   To enable sandbox, set GS_SANDBOX_SHEET_ID in Railway backend variables');
		return null;
	}
	
	if (!serviceAccount) {
		console.warn('⚠️  GS_SERVICE_ACCOUNT not set - sandbox features disabled');
		return null;
	}
	
	// Use base64 version if available (Railway format), otherwise use regular
	if (!privateKey && privateKeyBase64) {
		console.log('✅ Using GS_PRIVATE_KEY_BASE64 (base64-encoded)');
		try {
			privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');
			console.log(`✅ Base64 key decoded successfully (length: ${privateKey.length})`);
		} catch (e) {
			console.error('❌ Failed to decode GS_PRIVATE_KEY_BASE64:', e.message);
			return null;
		}
	}
	
	if (!privateKey) {
		console.warn('⚠️  Google Sheets private key not set (neither GS_PRIVATE_KEY nor GS_PRIVATE_KEY_BASE64) - sandbox features disabled');
		return null;
	}
	
	try {
		// Process private key (handle newlines and formatting)
		let processedPrivateKey = privateKey;
		
		// Replace escaped newlines with actual newlines
		processedPrivateKey = processedPrivateKey.replace(/\\n/g, '\n');
		
		// Ensure proper formatting
		if (!processedPrivateKey.includes('BEGIN PRIVATE KEY')) {
			console.warn('⚠️  Private key format may be incorrect');
		}
		
		sandboxStore = await createSheetsStore({
			serviceAccount,
			privateKey: processedPrivateKey,
			sheetId: sandboxSheetId
		});
		
		console.log('✅ Sandbox Google Sheets connected');
		console.log(`   Sandbox Sheet ID: ${sandboxSheetId}`);
		return sandboxStore;
	} catch (error) {
		console.error('❌ Failed to initialize sandbox Google Sheets:', error.message);
		return null;
	}
}

/**
 * Get sandbox store instance
 */
export function getSandboxStore() {
	return sandboxStore;
}

/**
 * Check if sandbox is available
 */
export function isSandboxAvailable() {
	return sandboxStore !== null;
}

