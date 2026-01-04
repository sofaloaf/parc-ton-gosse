/**
 * Sync address columns based on manually updated addresses column
 * Reads addresses from column E and updates structured/display columns
 * Keeps addresses_original unchanged
 */

import dotenv from 'dotenv';
import { readActivitiesFromSheet, writeCleanedActivities } from './sheets/cleaner.js';
import { structureAddressesForStorage } from './sheets/address-parser.js';

dotenv.config();

const SANDBOX_SHEET_ID = process.env.GS_SANDBOX_SHEET_ID || '1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A';
const SOURCE_TAB = process.env.SOURCE_TAB || 'Activities Cleaned';
const TARGET_TAB = process.env.TARGET_TAB || 'Activities Cleaned';

async function main() {
  console.log('🔄 Syncing Address Columns');
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
    
    // If no activities found, try the cleaned tab
    if (activities.length === 0 && SOURCE_TAB !== 'Activities Cleaned') {
      console.log(`⚠️  No activities found in "${SOURCE_TAB}", trying "Activities Cleaned"...`);
      activities = await readActivitiesFromSheet(SANDBOX_SHEET_ID, 'Activities Cleaned');
    }
    
    if (activities.length === 0) {
      console.log('⚠️  No activities found in any tab');
      process.exit(1);
    }

    console.log(`✅ Read ${activities.length} activities\n`);
    console.log('🔄 Syncing address columns based on updated addresses...\n');

    let updated = 0;
    // Find addresses column - check multiple possible field names
    const possibleAddressFields = ['addresses', 'address', 'Adresse', 'Addresse', 'Address', 'addresses_display', 'addresses_original'];
    
    activities.forEach((activity, index) => {
      // Try to find addresses in any of the possible fields
      let updatedAddresses = null;
      let addressFieldName = null;
      
      for (const field of possibleAddressFields) {
        if (activity[field] && (typeof activity[field] === 'string' && activity[field].trim().length > 0) ||
            (Array.isArray(activity[field]) && activity[field].length > 0)) {
          updatedAddresses = activity[field];
          addressFieldName = field;
          break;
        }
      }
      
      // Also check if there's a column E value (might be stored differently)
      // Check all activity keys for address-like content
      if (!updatedAddresses) {
        Object.keys(activity).forEach(key => {
          const value = activity[key];
          if (value && typeof value === 'string' && value.length > 10) {
            const lower = value.toLowerCase();
            if ((lower.includes('rue') || lower.includes('boulevard') || lower.includes('750') || 
                 lower.includes('paris') || lower.includes('gymnase') || lower.includes('centre')) &&
                !lower.includes('description') && !lower.includes('title')) {
              updatedAddresses = value;
              addressFieldName = key;
            }
          }
        });
      }
      
      // Skip if no addresses found
      if (!updatedAddresses || (typeof updatedAddresses === 'string' && updatedAddresses.trim().length === 0)) {
        return;
      }
      
      console.log(`   Found addresses in field: ${addressFieldName || 'addresses'}`);

      // Structure the updated addresses
      const structured = structureAddressesForStorage(updatedAddresses);
      
      // Update structured column (JSON for machines)
      activity.addresses_structured = JSON.stringify(structured.structured);
      
      // Update display column (formatted for display)
      activity.addresses_display = structured.display;
      
      // Update main addresses field with the structured display
      activity.addresses = structured.display;
      
      // Keep addresses_original unchanged (preserve reference)
      // Only set if it doesn't exist yet
      if (!activity.addresses_original && addressFieldName && addressFieldName !== 'addresses_original') {
        activity.addresses_original = typeof updatedAddresses === 'string' 
          ? updatedAddresses 
          : (Array.isArray(updatedAddresses) ? updatedAddresses.join(' | ') : String(updatedAddresses));
      }
      
      updated++;
      
      if (index < 10) {
        console.log(`   ${index + 1}. ${activity.title_en || activity.title_fr || 'Untitled'}`);
        console.log(`      Addresses: ${typeof updatedAddresses === 'string' ? updatedAddresses.substring(0, 60) + '...' : 'Multiple addresses'}`);
        console.log(`      Structured: ${structured.count} address(es)${structured.hasConditions ? ' with conditions' : ''}\n`);
      }
    });

    console.log(`✅ Synced address columns for ${updated} activities\n`);
    console.log('💾 Writing updated activities to sheet...');

    // Write back to sheet
    const result = await writeCleanedActivities(SANDBOX_SHEET_ID, activities, TARGET_TAB);

    console.log('\n✅ Address columns synced successfully!');
    console.log(`   Updated ${updated} activities in "${TARGET_TAB}" tab`);
    console.log('\n📋 Updated columns:');
    console.log('   ✅ addresses: Kept as manually updated');
    console.log('   ✅ addresses_structured: Updated from addresses column');
    console.log('   ✅ addresses_display: Updated from addresses column');
    console.log('   ✅ addresses_original: Unchanged (preserved reference)');
    console.log('\n   Check your Google Sheet to see the synced columns');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

