/**
 * Cleanup Google Sheets Data
 * Main script to clean and normalize data in the sandbox Google Sheet
 */

import dotenv from 'dotenv';
import { cleanupSheetData } from './sheets/cleaner.js';

dotenv.config();

const SANDBOX_SHEET_ID = process.env.GS_SANDBOX_SHEET_ID || '1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A';
const SOURCE_TAB = process.env.SOURCE_TAB || 'Parctongosse_exported_02-21-2024csv';
const TARGET_TAB = process.env.TARGET_TAB || 'Activities Cleaned';

async function main() {
  console.log('🚀 Google Sheets Data Cleanup Tool');
  console.log('📦 Isolated environment - will NOT affect the main website\n');

  // Check environment variables
  if (!process.env.GS_SERVICE_ACCOUNT) {
    console.error('❌ Error: GS_SERVICE_ACCOUNT not set in .env file');
    console.error('   Please create a .env file with your Google Sheets credentials');
    process.exit(1);
  }

  if (!process.env.GS_PRIVATE_KEY_BASE64 && !process.env.GS_PRIVATE_KEY) {
    console.error('❌ Error: GS_PRIVATE_KEY_BASE64 or GS_PRIVATE_KEY not set in .env file');
    process.exit(1);
  }

  try {
    const result = await cleanupSheetData(SANDBOX_SHEET_ID, SOURCE_TAB, TARGET_TAB);
    
    if (result.success) {
      console.log('\n📊 Summary:');
      console.log(`   Activities processed: ${result.count}`);
      console.log(`   Valid: ${result.validation.valid}`);
      console.log(`   Invalid: ${result.validation.invalid}`);
      console.log(`   New tab created: "${result.tabName}"`);
      console.log('\n✅ All done! Check your Google Sheet.');
    } else {
      console.error('\n❌ Cleanup failed:', result.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

