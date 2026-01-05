/**
 * ML Quality Scorer
 * 
 * Machine learning model that grades organizations on a 0-10 scale.
 * Uses TensorFlow.js for local execution.
 * 
 * Features:
 * - Trains on existing 132 activities (all labeled as "approved")
 * - Scores new organizations based on learned patterns
 * - Provides confidence scores and feature breakdowns
 * - Can be retrained with user feedback
 */

import * as tf from '@tensorflow/tfjs';
import { FeatureExtractor } from './featureExtractor.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MLQualityScorer {
	constructor(options = {}) {
		this.model = null;
		this.featureExtractor = new FeatureExtractor();
		this.modelPath = options.modelPath || path.join(__dirname, '../../models/quality_model.json');
		this.confidenceThreshold = options.confidenceThreshold || 7.0;
		this.isTraining = false;
	}

	/**
	 * Initialize the model (load from disk or create new)
	 */
	async initialize() {
		// For now, model will be created on first training
		// File loading can be added later if needed
		// Model works fine in-memory for crawler sessions
		console.log('📝 Model will be created on first training (in-memory mode)');
		return false;
	}

	/**
	 * Create a new model architecture
	 */
	createModel(inputShape) {
		const model = tf.sequential({
			layers: [
				// Input layer
				tf.layers.dense({
					inputShape: [inputShape],
					units: 64,
					activation: 'relu',
					name: 'dense1'
				}),
				tf.layers.dropout({ rate: 0.2, name: 'dropout1' }),
				
				// Hidden layer 1
				tf.layers.dense({
					units: 32,
					activation: 'relu',
					name: 'dense2'
				}),
				tf.layers.dropout({ rate: 0.2, name: 'dropout2' }),
				
				// Hidden layer 2
				tf.layers.dense({
					units: 16,
					activation: 'relu',
					name: 'dense3'
				}),
				
				// Output layer (single score 0-10)
				tf.layers.dense({
					units: 1,
					activation: 'linear', // Linear for regression (0-10 score)
					name: 'output'
				})
			]
		});

		model.compile({
			optimizer: 'adam',
			loss: 'meanSquaredError',
			metrics: ['mae'] // Mean Absolute Error
		});

		return model;
	}

	/**
	 * Train the model on activities with labels
	 * @param {Array} activities - Array of activity objects
	 * @param {Array} labels - Optional array of labels (0-10). If not provided, all activities are labeled as 10 (approved)
	 */
	async train(activities, labels = null) {
		if (this.isTraining) {
			console.log('⏳ Model is already training, skipping...');
			return;
		}

		this.isTraining = true;
		console.log(`🧠 Training ML model on ${activities.length} activities...`);

		try {
			// Extract features for all activities
			const features = [];
			const trainingLabels = [];

			for (let i = 0; i < activities.length; i++) {
				const activity = activities[i];
				const featureVector = this.featureExtractor.extract(activity);
				features.push(featureVector);
				
				// Use provided labels or default to 10 (approved)
				if (labels && labels[i] !== undefined) {
					trainingLabels.push(labels[i]);
				} else {
					// Default: all activities are "approved" = score 10
					trainingLabels.push(10.0);
				}
			}

			if (features.length === 0) {
				console.warn('⚠️  No features extracted, cannot train model');
				this.isTraining = false;
				return;
			}

			// Normalize features (important for training stability)
			const normalizedFeatures = this.normalizeFeatures(features);

			// Convert to tensors
			const featureTensor = tf.tensor2d(normalizedFeatures);
			const labelTensor = tf.tensor2d(trainingLabels.map(l => [l]));

			// Create or load model
			if (!this.model) {
				const inputShape = normalizedFeatures[0].length;
				this.model = this.createModel(inputShape);
				console.log(`📊 Created new model with input shape: [${inputShape}]`);
			}

			// Train the model
			const history = await this.model.fit(featureTensor, labelTensor, {
				epochs: 100,
				batchSize: Math.min(32, features.length),
				validationSplit: 0.2, // Use 20% for validation
				verbose: 1,
				callbacks: {
					onEpochEnd: (epoch, logs) => {
						if (epoch % 20 === 0) {
							console.log(`  Epoch ${epoch}: loss=${logs.loss.toFixed(4)}, mae=${logs.mae.toFixed(4)}`);
						}
					}
				}
			});

			// Clean up tensors
			featureTensor.dispose();
			labelTensor.dispose();

			// Save model (optional - model works in-memory even if save fails)
			try {
				await this.saveModel();
			} catch (saveError) {
				console.warn('⚠️  Could not save model to disk, but model is ready in memory:', saveError.message);
			}

			console.log('✅ Model training completed');
			console.log(`   Final loss: ${history.history.loss[history.history.loss.length - 1].toFixed(4)}`);
			console.log(`   Final MAE: ${history.history.mae[history.history.mae.length - 1].toFixed(4)}`);

			this.isTraining = false;
		} catch (error) {
			console.error('❌ Model training failed:', error);
			this.isTraining = false;
			throw error;
		}
	}

	/**
	 * Score an organization (0-10 scale)
	 * @param {Object} organization - Organization/activity object
	 * @returns {Object} Score object with score, confidence, breakdown, recommendation
	 */
	async score(organization) {
		if (!this.model) {
			// Fallback to rule-based scoring if model not trained
			return this.ruleBasedScore(organization);
		}

		try {
			// Extract features
			const features = this.featureExtractor.extract(organization);
			// Normalize features if normalization params exist
			const normalizedFeatures = this.normalizeFeatureVector(features);
			const featureTensor = tf.tensor2d([normalizedFeatures]);

			// Predict
			const prediction = this.model.predict(featureTensor);
			const scoreValue = await prediction.data();
			const score = Math.max(0, Math.min(10, scoreValue[0])); // Clamp to 0-10

			// Calculate confidence (based on how close to training data)
			// For now, use a simple heuristic: higher scores = higher confidence
			const confidence = Math.min(1.0, score / 10);

			// Clean up
			featureTensor.dispose();
			prediction.dispose();

			// Get feature breakdown for interpretability
			const breakdown = this.getFeatureBreakdown(organization, features);

			return {
				score: parseFloat(score.toFixed(2)),
				confidence: parseFloat(confidence.toFixed(2)),
				breakdown: breakdown,
				recommendation: score >= this.confidenceThreshold ? 'accept' : 'review',
				method: 'ml'
			};
		} catch (error) {
			console.error('❌ ML scoring failed, falling back to rule-based:', error);
			return this.ruleBasedScore(organization);
		}
	}

	/**
	 * Rule-based scoring (fallback when ML model not available)
	 */
	ruleBasedScore(organization) {
		let score = 0;
		const breakdown = {};

		// Relevance to kids' activities (0-3 points)
		const text = `${organization.title_en || ''} ${organization.title_fr || ''} ${organization.description_en || ''} ${organization.description_fr || ''}`.toLowerCase();
		const hasKidsKeywords = this.featureExtractor.kidsKeywords.some(kw => text.includes(kw));
		const hasActivityKeywords = this.featureExtractor.activityKeywords.some(kw => text.includes(kw));
		
		if (hasKidsKeywords && hasActivityKeywords) {
			score += 3;
			breakdown.relevance = 3;
		} else if (hasKidsKeywords || hasActivityKeywords) {
			score += 2;
			breakdown.relevance = 2;
		} else {
			breakdown.relevance = 0;
		}

		// Data completeness (0-2 points)
		const hasContact = !!(organization.contactEmail || organization.contactPhone || organization.websiteLink);
		const hasLocation = !!(organization.neighborhood || organization.addresses);
		if (hasContact && hasLocation) {
			score += 2;
			breakdown.completeness = 2;
		} else if (hasContact || hasLocation) {
			score += 1;
			breakdown.completeness = 1;
		} else {
			breakdown.completeness = 0;
		}

		// Source authority (0-2 points) - assume 1 for now
		score += 1;
		breakdown.authority = 1;

		// Geographic relevance (0-2 points)
		const address = (organization.addresses || organization.address || '').toLowerCase();
		if (address.includes('75020') || address.includes('paris 20')) {
			score += 2;
			breakdown.geographic = 2;
		} else if (organization.neighborhood) {
			score += 1;
			breakdown.geographic = 1;
		} else {
			breakdown.geographic = 0;
		}

		// Contact information quality (0-1 point)
		if (organization.contactEmail && organization.contactPhone) {
			score += 1;
			breakdown.contact = 1;
		} else if (organization.contactEmail || organization.contactPhone) {
			score += 0.5;
			breakdown.contact = 0.5;
		} else {
			breakdown.contact = 0;
		}

		return {
			score: Math.min(10, score),
			confidence: 0.5, // Lower confidence for rule-based
			breakdown: breakdown,
			recommendation: score >= this.confidenceThreshold ? 'accept' : 'review',
			method: 'rule-based'
		};
	}

	/**
	 * Get feature breakdown for interpretability
	 */
	getFeatureBreakdown(organization, features) {
		// Extract meaningful breakdown from features
		return {
			relevance: this.calculateRelevanceScore(features),
			completeness: this.calculateCompletenessScore(features),
			authority: 1.0, // Default, can be enhanced
			geographic: this.calculateGeographicScore(features),
			contact: this.calculateContactScore(features)
		};
	}

	calculateRelevanceScore(features) {
		// Features 0-9 are kids keywords, 10-19 are activity keywords
		const kidsScore = features.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
		const activityScore = features.slice(10, 20).reduce((a, b) => a + b, 0) / 10;
		return (kidsScore + activityScore) / 2 * 3; // Scale to 0-3
	}

	calculateCompletenessScore(features) {
		// Feature 62 is overall completeness
		return features[62] * 2; // Scale to 0-2
	}

	calculateGeographicScore(features) {
		// Features 44-48 are geographic
		const geoFeatures = features.slice(44, 49);
		const geoScore = geoFeatures.reduce((a, b) => a + b, 0) / geoFeatures.length;
		return geoScore * 2; // Scale to 0-2
	}

	calculateContactScore(features) {
		// Feature 43 is contact completeness
		return features[43]; // Already 0-1
	}

	/**
	 * Normalize features to 0-1 range (prevents NaN during training)
	 */
	normalizeFeatures(features) {
		if (features.length === 0) return features;

		const featureCount = features[0].length;
		const normalized = [];

		// Calculate min/max for each feature
		const mins = new Array(featureCount).fill(Infinity);
		const maxs = new Array(featureCount).fill(-Infinity);

		for (const featureVector of features) {
			for (let i = 0; i < featureCount; i++) {
				const val = featureVector[i] || 0;
				mins[i] = Math.min(mins[i], val);
				maxs[i] = Math.max(maxs[i], val);
			}
		}

		// Normalize each feature vector
		for (const featureVector of features) {
			const normalizedVector = [];
			for (let i = 0; i < featureCount; i++) {
				const val = featureVector[i] || 0;
				const range = maxs[i] - mins[i];
				if (range > 0) {
					normalizedVector.push((val - mins[i]) / range);
				} else {
					normalizedVector.push(0); // All same value, normalize to 0
				}
			}
			normalized.push(normalizedVector);
		}

		// Store normalization params for inference
		this.normalizationParams = { mins, maxs };

		return normalized;
	}

	/**
	 * Normalize a single feature vector using stored params
	 */
	normalizeFeatureVector(features) {
		if (!this.normalizationParams) {
			return features; // No normalization params, return as-is
		}

		const { mins, maxs } = this.normalizationParams;
		const normalized = [];

		for (let i = 0; i < features.length; i++) {
			const val = features[i] || 0;
			const range = maxs[i] - mins[i];
			if (range > 0) {
				normalized.push((val - mins[i]) / range);
			} else {
				normalized.push(0);
			}
		}

		return normalized;
	}

	/**
	 * Save model to disk (using JSON format since file:// doesn't work with browser version)
	 */
	async saveModel() {
		if (!this.model) {
			console.warn('⚠️  No model to save');
			return;
		}

		try {
			// Ensure models directory exists
			const modelsDir = path.dirname(this.modelPath);
			if (!fs.existsSync(modelsDir)) {
				fs.mkdirSync(modelsDir, { recursive: true });
			}

			// Save model architecture and weights separately
			const modelJson = this.model.toJSON();
			const weights = await this.model.getWeights();
			const weightsData = weights.map(w => Array.from(w.dataSync()));

			const modelData = {
				modelTopology: modelJson,
				weights: weightsData,
				normalizationParams: this.normalizationParams
			};

			// Save to JSON file
			const jsonPath = this.modelPath.replace('.json', '_data.json');
			fs.writeFileSync(jsonPath, JSON.stringify(modelData, null, 2));
			console.log(`💾 Model saved to: ${jsonPath}`);

			// Also save normalization params separately for easy loading
			if (this.normalizationParams) {
				const normPath = this.modelPath.replace('.json', '_normalization.json');
				fs.writeFileSync(normPath, JSON.stringify(this.normalizationParams, null, 2));
			}
		} catch (error) {
			console.error('❌ Failed to save model:', error);
			// Don't throw - model can still be used in memory
			console.warn('⚠️  Model will only be available in current session');
		}
	}

	/**
	 * Retrain model with new feedback
	 * @param {Array} feedback - Array of {organization, userDecision, mlScore}
	 */
	async retrainWithFeedback(feedback) {
		console.log(`🔄 Retraining model with ${feedback.length} feedback examples...`);

		// Combine existing training data with feedback
		// For now, we'll retrain from scratch with all data
		// In future, can implement incremental learning

		const trainingData = feedback.map(f => ({
			organization: f.organization,
			label: f.userDecision === 'approved' ? 10.0 : 0.0
		}));

		await this.train(trainingData.map(t => t.organization));
	}
}

