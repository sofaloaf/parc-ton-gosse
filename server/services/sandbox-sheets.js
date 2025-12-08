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
	const privateKey = process.env.GS_PRIVATE_KEY;
	const sandboxSheetId = process.env.GS_SANDBOX_SHEET_ID; // New env var
	
	console.log('🔍 Checking sandbox configuration...');
	console.log(`   GS_SANDBOX_SHEET_ID: ${sandboxSheetId ? 'SET' : 'NOT SET'}`);
	console.log(`   GS_SERVICE_ACCOUNT: ${serviceAccount ? 'SET' : 'NOT SET'}`);
	console.log(`   GS_PRIVATE_KEY: ${privateKey ? 'SET' : 'NOT SET'}`);
	
	if (!sandboxSheetId) {
		console.warn('⚠️  GS_SANDBOX_SHEET_ID not set - sandbox features disabled');
		console.warn('   To enable sandbox, set GS_SANDBOX_SHEET_ID in Railway backend variables');
		return null;
	}
	
	if (!serviceAccount || !privateKey) {
		console.warn('⚠️  Google Sheets credentials not set - sandbox features disabled');
		return null;
	}
	
	try {
		// Process private key (handle base64 encoding)
		let processedPrivateKey = privateKey;
		if (!privateKey.includes('BEGIN PRIVATE KEY')) {
			try {
				processedPrivateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
			} catch (e) {
				// Not base64, use as-is
				processedPrivateKey = privateKey;
			}
		}
		processedPrivateKey = processedPrivateKey.replace(/\\n/g, '\n');
		
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

