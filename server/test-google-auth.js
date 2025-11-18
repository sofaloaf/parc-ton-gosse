// Test Google Sheets authentication
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

async function testAuth() {
	console.log('🔍 Testing Google Sheets Authentication...\n');
	
	// Get credentials
	const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
	const sheetId = process.env.GS_SHEET_ID;
	let privateKey = null;
	
	console.log('Service Account:', serviceAccount);
	console.log('Sheet ID:', sheetId);
	console.log('');
	
	// Get private key
	if (process.env.GS_PRIVATE_KEY_BASE64) {
		console.log('✅ Using GS_PRIVATE_KEY_BASE64');
		try {
			privateKey = Buffer.from(process.env.GS_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');
			console.log('✅ Base64 decoded successfully');
			console.log('Decoded key length:', privateKey.length);
			console.log('Has BEGIN marker:', privateKey.includes('BEGIN PRIVATE KEY'));
			console.log('Has newlines:', privateKey.includes('\n'));
			console.log('');
		} catch (error) {
			console.error('❌ Failed to decode base64:', error.message);
			process.exit(1);
		}
	} else if (process.env.GS_PRIVATE_KEY) {
		console.log('⚠️  Using GS_PRIVATE_KEY (not base64)');
		privateKey = process.env.GS_PRIVATE_KEY;
		// Fix newlines
		if (privateKey.includes('\\n')) {
			privateKey = privateKey.replace(/\\n/g, '\n');
		}
	} else {
		console.error('❌ No private key found (GS_PRIVATE_KEY_BASE64 or GS_PRIVATE_KEY)');
		process.exit(1);
	}
	
	// Validate key format
	if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
		console.error('❌ Private key format is invalid');
		process.exit(1);
	}
	
	// Create auth client
	console.log('🔍 Creating JWT auth client...');
	let auth;
	try {
		auth = new google.auth.JWT(
			serviceAccount,
			null,
			privateKey,
			['https://www.googleapis.com/auth/spreadsheets']
		);
		console.log('✅ Auth client created');
	} catch (error) {
		console.error('❌ Failed to create auth client:', error.message);
		process.exit(1);
	}
	
	// Test getting access token
	console.log('🔍 Testing access token...');
	try {
		const tokenResponse = await auth.getAccessToken();
		const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;
		if (token) {
			console.log('✅ Successfully obtained access token!');
			const tokenStr = typeof token === 'string' ? token : String(token);
			console.log('Token preview:', tokenStr.substring(0, 20) + '...');
		} else {
			console.error('❌ Access token is null');
			process.exit(1);
		}
	} catch (error) {
		console.error('❌ Failed to get access token:', error.message);
		console.error('Error code:', error.code);
		console.error('');
		console.error('This usually means:');
		console.error('1. The private key does not match the service account email');
		console.error('2. The service account key was regenerated/deleted');
		console.error('3. The key format is incorrect');
		console.error('');
		console.error('Solution:');
		console.error('1. Go to Google Cloud Console');
		console.error('2. Navigate to: IAM & Admin > Service Accounts');
		console.error('3. Find:', serviceAccount);
		console.error('4. Click "Keys" > "Add Key" > "Create new key"');
		console.error('5. Download the JSON file');
		console.error('6. Extract the private_key value and base64 encode it');
		process.exit(1);
	}
	
	// Test accessing the sheet
	console.log('🔍 Testing sheet access...');
	const sheets = google.sheets({ version: 'v4', auth });
	try {
		const response = await sheets.spreadsheets.get({
			spreadsheetId: sheetId
		});
		console.log('✅ Successfully accessed sheet!');
		console.log('Sheet title:', response.data.properties.title);
		console.log('Number of sheets:', response.data.sheets?.length || 0);
	} catch (error) {
		console.error('❌ Failed to access sheet:', error.message);
		console.error('Error code:', error.code);
		console.error('');
		if (error.message.includes('permission') || error.message.includes('403')) {
			console.error('This means the service account does not have access to the sheet.');
			console.error('Solution:');
			console.error('1. Open your Google Sheet');
			console.error('2. Click "Share" button');
			console.error('3. Add this email:', serviceAccount);
			console.error('4. Give it "Editor" permissions');
		}
		process.exit(1);
	}
	
	console.log('');
	console.log('✅ All tests passed! Your Google Sheets credentials are working correctly.');
}

testAuth().catch(console.error);

