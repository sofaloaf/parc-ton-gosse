/**
 * Update addresses in Google Sheets
 * Structures addresses for machine/human readability
 */

import dotenv from 'dotenv';
import { readActivitiesFromSheet, writeCleanedActivities } from './sheets/cleaner.js';
import { structureAddressesForStorage } from './sheets/address-parser.js';

dotenv.config();

const SANDBOX_SHEET_ID = process.env.GS_SANDBOX_SHEET_ID || '1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A';
const SOURCE_TAB = process.env.SOURCE_TAB || 'Activities Cleaned';
const TARGET_TAB = process.env.TARGET_TAB || 'Activities Cleaned';

async function main() {
  console.log('🚀 Updating Address Structure');
  console.log('📦 Isolated environment - will NOT affect the main website\n');

  // Check environment variables
  if (!process.env.GS_SERVICE_ACCOUNT) {
    console.error('❌ Error: GS_SERVICE_ACCOUNT not set in .env file');
    process.exit(1);
  }

  if (!process.env.GS_PRIVATE_KEY_BASE64 && !process.env.GS_PRIVATE_KEY) {
    console.error('❌ Error: GS_PRIVATE_KEY_BASE64 or GS_PRIVATE_KEY must be set in .env file');
    process.exit(1);
  }

  try {
    console.log(`📖 Reading activities from tab: "${SOURCE_TAB}"`);
    let activities = await readActivitiesFromSheet(SANDBOX_SHEET_ID, SOURCE_TAB);
    
    if (activities.length === 0) {
      console.log('⚠️  No activities found');
      process.exit(1);
    }

    console.log(`✅ Read ${activities.length} activities\n`);
    console.log('🔧 Structuring addresses...\n');

    let updated = 0;
    activities.forEach((activity, index) => {
      const oldAddresses = activity.addresses;
      
      if (!oldAddresses || (Array.isArray(oldAddresses) && oldAddresses.length === 0)) {
        return;
      }

      // Structure addresses
      const structured = structureAddressesForStorage(oldAddresses);
      
      // Store structured data (JSON for machines)
      activity.addresses_structured = JSON.stringify(structured.structured);
      
      // Store human-readable format
      activity.addresses_display = structured.display;
      
      // Keep original for reference
      activity.addresses_original = Array.isArray(oldAddresses) 
        ? oldAddresses.join(' | ') 
        : String(oldAddresses);
      
      // Update main addresses field with display format
      activity.addresses = structured.display;

      updated++;
      
      if (index < 10) {
        console.log(`   ${index + 1}. ${activity.title_en || activity.title_fr || 'Untitled'}`);
        console.log(`      Original: ${activity.addresses_original.substring(0, 80)}...`);
        console.log(`      Structured: ${structured.count} address(es) with ${structured.hasConditions ? 'conditions' : 'no conditions'}`);
        console.log(`      Display: ${structured.display.substring(0, 80)}...\n`);
      }
    });

    console.log(`✅ Structured addresses for ${updated} activities\n`);
    console.log('💾 Writing updated activities to sheet...');

    // Write back to sheet
    const result = await writeCleanedActivities(SANDBOX_SHEET_ID, activities, TARGET_TAB);

    console.log('\n✅ Addresses updated successfully!');
    console.log(`   Updated ${updated} activities in "${TARGET_TAB}" tab`);
    console.log('\n📋 New columns:');
    console.log('   - addresses: Human-readable format');
    console.log('   - addresses_structured: JSON format (for machines/AI)');
    console.log('   - addresses_display: Formatted display version');
    console.log('   - addresses_original: Original data (for reference)');
    console.log('\n   Check your Google Sheet to see the structured addresses');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

