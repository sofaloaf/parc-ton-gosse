/**
 * Training Script for ML Quality Scorer
 * 
 * Loads existing 132 activities from Google Sheets and trains the ML model.
 * Run this script to initialize the model before first use.
 * 
 * Usage: node server/scripts/trainMLModel.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDataStore } from '../services/datastore/index.js';
import { MLQualityScorer } from '../services/crawler/mlQualityScorer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

async function main() {
	console.log('🚀 Starting ML Model Training...\n');

	try {
		// Initialize data store
		console.log('📁 Initializing data store...');
		const config = {
			backend: 'sheets',
			sheets: {
				sheetId: process.env.GS_SHEET_ID,
				serviceAccount: process.env.GS_SERVICE_ACCOUNT,
				privateKey: process.env.GS_PRIVATE_KEY || (process.env.GS_PRIVATE_KEY_BASE64 ? Buffer.from(process.env.GS_PRIVATE_KEY_BASE64, 'base64').toString('utf-8') : null)
			}
		};

		if (!config.sheets.sheetId || !config.sheets.serviceAccount || !config.sheets.privateKey) {
			throw new Error('Missing required environment variables: GS_SHEET_ID, GS_SERVICE_ACCOUNT, GS_PRIVATE_KEY');
		}

		const dataStore = await createDataStore(config);
		console.log('✅ Data store initialized\n');

		// Load existing activities
		console.log('📥 Loading existing activities from Google Sheets...');
		const activities = await dataStore.activities.list();
		console.log(`✅ Loaded ${activities.length} activities\n`);

		if (activities.length === 0) {
			console.warn('⚠️  No activities found. Cannot train model without training data.');
			process.exit(1);
		}

		// Initialize ML Quality Scorer
		console.log('🧠 Initializing ML Quality Scorer...');
		const scorer = new MLQualityScorer();
		await scorer.initialize();
		console.log('✅ ML Quality Scorer initialized\n');

		// Train model
		console.log('🎓 Training model on existing activities...');
		console.log('   (All activities are labeled as "approved" = score 10)\n');
		await scorer.train(activities);

		console.log('\n✅ Training completed successfully!');
		console.log('📊 Model is ready to use for scoring organizations.\n');

		// Test the model on a few activities
		console.log('🧪 Testing model on sample activities...\n');
		for (let i = 0; i < Math.min(3, activities.length); i++) {
			const activity = activities[i];
			const result = await scorer.score(activity);
			console.log(`Activity ${i + 1}: "${activity.title_en || activity.title?.en || 'N/A'}"`);
			console.log(`  Score: ${result.score}/10 (${result.method})`);
			console.log(`  Recommendation: ${result.recommendation}`);
			console.log(`  Breakdown:`, result.breakdown);
			console.log('');
		}

		console.log('✨ All done! Model is ready for use in crawler.\n');

	} catch (error) {
		console.error('❌ Training failed:', error);
		process.exit(1);
	}
}

main();

