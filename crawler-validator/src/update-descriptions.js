/**
 * Update descriptions in Google Sheets
 * Generates clear, easy-to-understand descriptions based on activity data
 */

import dotenv from 'dotenv';
import { readActivitiesFromSheet, writeCleanedActivities, cleanupSheetData } from './sheets/cleaner.js';
import { generateDescriptionEn, generateDescriptionFr } from './sheets/description-generator.js';

dotenv.config();

const SANDBOX_SHEET_ID = process.env.GS_SANDBOX_SHEET_ID || '1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A';
// Try cleaned tab first, fall back to original
const SOURCE_TAB = process.env.SOURCE_TAB || 'Activities Cleaned';
const TARGET_TAB = process.env.TARGET_TAB || 'Activities Cleaned';
const FALLBACK_TAB = 'Parctongosse_exported_02-21-2024csv';

async function main() {
  console.log('🚀 Updating Activity Descriptions');
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
    
    // If no activities found, try fallback tab and clean it first
    if (activities.length === 0 && SOURCE_TAB !== FALLBACK_TAB) {
      console.log(`⚠️  No activities found in "${SOURCE_TAB}"`);
      console.log(`📋 Running cleanup first to create cleaned data...`);
      await cleanupSheetData(SANDBOX_SHEET_ID, FALLBACK_TAB, TARGET_TAB);
      console.log(`\n📖 Now reading from cleaned tab: "${TARGET_TAB}"`);
      activities = await readActivitiesFromSheet(SANDBOX_SHEET_ID, TARGET_TAB);
    }
    
    if (activities.length === 0) {
      console.log('⚠️  No activities found in any tab');
      process.exit(1);
    }

    console.log(`✅ Read ${activities.length} activities\n`);
    console.log('✍️  Generating descriptions...\n`');

    // Generate descriptions for each activity
    let updated = 0;
    activities.forEach((activity, index) => {
      const oldDescEn = activity.description_en || '';
      const oldDescFr = activity.description_fr || '';
      
      // Generate new descriptions
      activity.description_en = generateDescriptionEn(activity);
      activity.description_fr = generateDescriptionFr(activity);
      
      if (oldDescEn !== activity.description_en || oldDescFr !== activity.description_fr) {
        updated++;
        console.log(`   ${index + 1}. ${activity.title_en || activity.title_fr || 'Untitled'}`);
        console.log(`      EN: ${activity.description_en}`);
        console.log(`      FR: ${activity.description_fr}\n`);
      }
    });

    console.log(`✅ Generated descriptions for ${updated} activities\n`);
    console.log('💾 Writing updated activities to sheet...');

    // Write back to sheet
    const result = await writeCleanedActivities(SANDBOX_SHEET_ID, activities, TARGET_TAB);

    console.log('\n✅ Descriptions updated successfully!');
    console.log(`   Updated ${updated} activities in "${TARGET_TAB}" tab`);
    console.log('   Check your Google Sheet to see the new descriptions');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

