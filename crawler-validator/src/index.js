/**
 * Main entry point for Crawler & Validator
 * This is an isolated system that does NOT interact with the main website
 */

import dotenv from 'dotenv';
import { crawlActivities } from './crawler/index.js';
import { validateActivities } from './validator/index.js';

// Load environment variables
dotenv.config();

console.log('🚀 Starting Crawler & Validator System');
console.log('📦 This is an isolated environment - will NOT affect the main website\n');

async function main() {
  try {
    // Step 1: Crawl activities
    console.log('🕷️  Step 1: Crawling activities...');
    const rawActivities = await crawlActivities();
    console.log(`✅ Crawled ${rawActivities.length} activities\n`);

    // Step 2: Validate activities
    console.log('✅ Step 2: Validating activities...');
    const validatedActivities = await validateActivities(rawActivities);
    console.log(`✅ Validated ${validatedActivities.length} activities\n`);

    // Step 3: Output results
    console.log('📊 Results:');
    console.log(`   Total crawled: ${rawActivities.length}`);
    console.log(`   Valid: ${validatedActivities.filter(a => a.valid).length}`);
    console.log(`   Invalid: ${validatedActivities.filter(a => !a.valid).length}`);

    // Save to output directory
    const { writeFileSync, mkdirSync } = await import('fs');
    const { join } = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const outputDir = join(__dirname, '../../output');

    mkdirSync(outputDir, { recursive: true });
    
    writeFileSync(
      join(outputDir, 'crawled-activities.json'),
      JSON.stringify(rawActivities, null, 2)
    );
    
    writeFileSync(
      join(outputDir, 'validated-activities.json'),
      JSON.stringify(validatedActivities, null, 2)
    );

    console.log(`\n💾 Results saved to output/ directory`);
    console.log('✅ Process completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

