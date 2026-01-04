/**
 * Storage Module
 * 
 * Handles data persistence with provenance tracking
 */

import { google } from 'googleapis';
import { generateTabName, activityToSheetRow, getHeaders, ACTIVITIES_COLUMN_ORDER } from '../../utils/sheetsFormatter.js';

export class StorageModule {
	constructor(options = {}) {
		this.sheetId = options.sheetId || process.env.GS_SHEET_ID;
		this.sheetsClient = null;
		this.provenanceTracking = new Map(); // entityId -> provenance data
	}

	/**
	 * Initialize Google Sheets client
	 */
	getSheetsClient() {
		if (this.sheetsClient) return this.sheetsClient;

		const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
		const privateKey = process.env.GS_PRIVATE_KEY_BASE64 
			? Buffer.from(process.env.GS_PRIVATE_KEY_BASE64, 'base64').toString('utf-8')
			: process.env.GS_PRIVATE_KEY;
		
		if (!serviceAccount || !privateKey) {
			throw new Error('Google Sheets credentials not configured');
		}

		let processedKey = privateKey.replace(/\\n/g, '\n');
		if (!processedKey.includes('\n') && processedKey.includes('-----BEGIN')) {
			processedKey = processedKey.replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
				.replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----');
		}

		const auth = new google.auth.JWT({
			email: serviceAccount,
			key: processedKey,
			scopes: ['https://www.googleapis.com/auth/spreadsheets']
		});

		this.sheetsClient = google.sheets({ version: 'v4', auth });
		return this.sheetsClient;
	}

	/**
	 * Save entities to Google Sheets with provenance
	 */
	async saveEntities(entities, options = {}) {
		if (!this.sheetId) {
			throw new Error('GS_SHEET_ID not configured');
		}

		const sheets = this.getSheetsClient();
		const tabName = options.tabName || generateTabName('pending', 'enhanced-crawler');
		
		// Create tab if it doesn't exist
		await this.ensureTab(sheets, tabName);

		// Prepare rows
		const headers = getHeaders(ACTIVITIES_COLUMN_ORDER);
		const rows = [headers];

		for (const entity of entities) {
			// Track provenance
			this.trackProvenance(entity);

			// Convert to sheet format
			const sheetRow = this.entityToSheetRow(entity);
			const row = ACTIVITIES_COLUMN_ORDER.map(col => sheetRow[col] || '');
			rows.push(row);
		}

		// Write to sheet
		await sheets.spreadsheets.values.update({
			spreadsheetId: this.sheetId,
			range: `${tabName}!A1`,
			valueInputOption: 'RAW',
			requestBody: { values: rows }
		});

		return {
			tabName,
			count: entities.length,
			sheetUrl: `https://docs.google.com/spreadsheets/d/${this.sheetId}/edit`
		};
	}

	/**
	 * Ensure tab exists
	 */
	async ensureTab(sheets, tabName) {
		try {
			// Try to get the spreadsheet
			const spreadsheet = await sheets.spreadsheets.get({
				spreadsheetId: this.sheetId
			});

			// Check if tab exists
			const exists = spreadsheet.data.sheets.some(sheet => sheet.properties.title === tabName);

			if (!exists) {
				// Create tab
				await sheets.spreadsheets.batchUpdate({
					spreadsheetId: this.sheetId,
					requestBody: {
						requests: [{
							addSheet: {
								properties: { title: tabName }
							}
						}]
					}
				});
			}
		} catch (error) {
			if (error.message && error.message.includes('already exists')) {
				// Tab exists, that's fine
				return;
			}
			throw error;
		}
	}

	/**
	 * Convert entity to sheet row format
	 */
	entityToSheetRow(entity) {
		const data = entity.data || {};
		
		return {
			id: entity.id || entity.data?.id || '',
			title_en: data.title?.en || data.title || data.name || '',
			title_fr: data.title?.fr || data.title || data.name || '',
			description_en: data.description?.en || data.description || data.content || '',
			description_fr: data.description?.fr || data.description || data.content || '',
			categories: data.categories || [],
			ageMin: data.ageMin || 0,
			ageMax: data.ageMax || 99,
			price_amount: data.price?.amount || 0,
			currency: data.price?.currency || 'EUR',
			neighborhood: data.neighborhood || '',
			addresses: data.address || data.formattedAddress || '',
			contactEmail: data.email || '',
			contactPhone: data.phone || '',
			websiteLink: data.website || '',
			images: data.images || [],
			approvalStatus: 'pending',
			crawledAt: entity.extractedAt || new Date().toISOString(),
			createdAt: entity.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			// Provenance fields
			_sourceUrl: entity.url || '',
			_confidence: entity.confidence || 0,
			_sources: (entity.sources || []).join('; ')
		};
	}

	/**
	 * Track provenance for an entity
	 */
	trackProvenance(entity) {
		const entityId = entity.id || entity.data?.id;
		if (!entityId) return;

		this.provenanceTracking.set(entityId, {
			entityId,
			sourceUrl: entity.url,
			extractedAt: entity.extractedAt || new Date().toISOString(),
			confidence: entity.confidence || 0,
			sources: entity.sources || [],
			validationScore: entity.validationScore || 0,
			enrichmentVersion: entity.enrichmentVersion || '1.0'
		});
	}

	/**
	 * Get provenance for an entity
	 */
	getProvenance(entityId) {
		return this.provenanceTracking.get(entityId);
	}

	/**
	 * Get all provenance data
	 */
	getAllProvenance() {
		return Array.from(this.provenanceTracking.values());
	}
}

