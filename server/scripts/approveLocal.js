#!/usr/bin/env node
/**
 * Local Approval Interface for Crawler Results
 * 
 * Allows you to review and approve/reject organizations found by the crawler
 * directly from the terminal, without needing to use the web admin panel.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { google } from 'googleapis';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '../.env');
dotenv.config({ path: envPath });

// Get Google Sheets client
function getSheetsClient() {
	const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
	const privateKey = process.env.GS_PRIVATE_KEY_BASE64 
		? Buffer.from(process.env.GS_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
		: process.env.GS_PRIVATE_KEY;
	
	if (!serviceAccount || !privateKey) {
		throw new Error('Google Sheets credentials not configured');
	}
	
	const auth = new google.auth.JWT(
		serviceAccount,
		null,
		privateKey.replace(/\\n/g, '\n'),
		['https://www.googleapis.com/auth/spreadsheets']
	);
	
	return google.sheets({ version: 'v4', auth });
}

// Get pending activities from Google Sheets
async function getPendingActivities(sheets, sheetId) {
	const sheetName = 'Pending - ' + new Date().toISOString().split('T')[0] + ' - Arrondissement Crawler';
	
	try {
		const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
		const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
		
		if (!sheet) {
			// Try to find any "Pending" sheet
			const pendingSheets = spreadsheet.data.sheets
				.filter(s => s.properties.title.startsWith('Pending -'))
				.sort((a, b) => b.properties.title.localeCompare(a.properties.title));
			
			if (pendingSheets.length === 0) {
				console.log('❌ No pending activities sheets found');
				return [];
			}
			
			const latestSheet = pendingSheets[0];
			console.log(`📋 Using latest pending sheet: "${latestSheet.properties.title}"`);
			
			const response = await sheets.spreadsheets.values.get({
				spreadsheetId: sheetId,
				range: `${latestSheet.properties.title}!A:Z`
			});
			
			const rows = response.data.values || [];
			if (rows.length <= 1) {
				console.log('❌ No pending activities found');
				return [];
			}
			
			const headers = rows[0];
			const activities = rows.slice(1).map((row, index) => {
				const activity = {};
				headers.forEach((header, colIndex) => {
					activity[header] = row[colIndex] || '';
				});
				activity._rowIndex = index + 2; // +2 because row 1 is headers, and arrays are 0-indexed
				return activity;
			}).filter(a => a.approvalStatus === 'pending');
			
			return { activities, sheetName: latestSheet.properties.title };
		}
		
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: sheetId,
			range: `${sheetName}!A:Z`
		});
		
		const rows = response.data.values || [];
		if (rows.length <= 1) {
			console.log('❌ No pending activities found');
			return [];
		}
		
		const headers = rows[0];
		const activities = rows.slice(1).map((row, index) => {
			const activity = {};
			headers.forEach((header, colIndex) => {
				activity[header] = row[colIndex] || '';
			});
			activity._rowIndex = index + 2;
			return activity;
		}).filter(a => a.approvalStatus === 'pending');
		
		return { activities, sheetName };
	} catch (error) {
		console.error('❌ Error loading pending activities:', error.message);
		return [];
	}
}

// Update approval status in Google Sheets
async function updateApprovalStatus(sheets, sheetId, sheetName, rowIndex, status) {
	try {
		// Find the approvalStatus column
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: sheetId,
			range: `${sheetName}!A1:Z1`
		});
		
		const headers = response.data.values[0];
		const statusColIndex = headers.findIndex(h => h === 'approvalStatus');
		
		if (statusColIndex === -1) {
			console.error('❌ Could not find approvalStatus column');
			return false;
		}
		
		const colLetter = String.fromCharCode(65 + statusColIndex); // A=0, B=1, etc.
		
		await sheets.spreadsheets.values.update({
			spreadsheetId: sheetId,
			range: `${sheetName}!${colLetter}${rowIndex}`,
			valueInputOption: 'RAW',
			requestBody: { values: [[status]] }
		});
		
		return true;
	} catch (error) {
		console.error('❌ Error updating approval status:', error.message);
		return false;
	}
}

// Display activity and get user decision
function promptActivity(rl, activity, index, total) {
	return new Promise((resolve) => {
		console.log('\n' + '='.repeat(80));
		console.log(`📋 Activity ${index + 1} of ${total}`);
		console.log('='.repeat(80));
		console.log(`Name (EN): ${activity.title_en || 'N/A'}`);
		console.log(`Name (FR): ${activity.title_fr || 'N/A'}`);
		console.log(`Description (EN): ${(activity.description_en || '').substring(0, 100)}...`);
		console.log(`Description (FR): ${(activity.description_fr || '').substring(0, 100)}...`);
		console.log(`Website: ${activity.websiteLink || 'N/A'}`);
		console.log(`Email: ${activity.contactEmail || 'N/A'}`);
		console.log(`Phone: ${activity.contactPhone || 'N/A'}`);
		console.log(`Address: ${activity.addresses || 'N/A'}`);
		console.log(`Neighborhood: ${activity.neighborhood || 'N/A'}`);
		console.log('='.repeat(80));
		
		rl.question('\nApprove (a), Reject (r), Skip (s), or Quit (q)? ', (answer) => {
			const lower = answer.toLowerCase().trim();
			if (lower === 'a' || lower === 'approve') {
				resolve('approved');
			} else if (lower === 'r' || lower === 'reject') {
				resolve('rejected');
			} else if (lower === 's' || lower === 'skip') {
				resolve('skip');
			} else if (lower === 'q' || lower === 'quit') {
				resolve('quit');
			} else {
				console.log('Invalid input. Please enter a, r, s, or q.');
				resolve(promptActivity(rl, activity, index, total));
			}
		});
	});
}

// Main function
async function main() {
	const sheetId = process.env.GS_SHEET_ID;
	if (!sheetId) {
		console.error('❌ GS_SHEET_ID not configured');
		process.exit(1);
	}
	
	const sheets = getSheetsClient();
	
	console.log('📋 Loading pending activities from Google Sheets...\n');
	const result = await getPendingActivities(sheets, sheetId);
	
	if (!result || !result.activities || result.activities.length === 0) {
		console.log('✅ No pending activities to review');
		process.exit(0);
	}
	
	const { activities, sheetName } = result;
	console.log(`✅ Found ${activities.length} pending activities in "${sheetName}"\n`);
	
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	
	let approved = 0;
	let rejected = 0;
	let skipped = 0;
	
	for (let i = 0; i < activities.length; i++) {
		const activity = activities[i];
		const decision = await promptActivity(rl, activity, i, activities.length);
		
		if (decision === 'quit') {
			console.log('\n👋 Exiting...');
			break;
		} else if (decision === 'skip') {
			skipped++;
			continue;
		} else if (decision === 'approved') {
			const success = await updateApprovalStatus(sheets, sheetId, sheetName, activity._rowIndex, 'approved');
			if (success) {
				approved++;
				console.log('✅ Approved');
			} else {
				console.log('❌ Failed to update approval status');
			}
		} else if (decision === 'rejected') {
			const success = await updateApprovalStatus(sheets, sheetId, sheetName, activity._rowIndex, 'rejected');
			if (success) {
				rejected++;
				console.log('❌ Rejected');
			} else {
				console.log('❌ Failed to update approval status');
			}
		}
	}
	
	rl.close();
	
	console.log('\n' + '='.repeat(80));
	console.log('📊 Summary:');
	console.log(`   Approved: ${approved}`);
	console.log(`   Rejected: ${rejected}`);
	console.log(`   Skipped: ${skipped}`);
	console.log('='.repeat(80));
}

main().catch(error => {
	console.error('❌ Error:', error);
	process.exit(1);
});

