/**
 * Google Sheets Batch Operations
 * Implements request batching and deduplication for Google Sheets API calls
 */

export class SheetsBatch {
	constructor(sheets, sheetId) {
		this.sheets = sheets;
		this.sheetId = sheetId;
		this.pendingReads = new Map(); // key -> Promise
		this.pendingWrites = new Map(); // key -> Promise
		this.batchTimeout = 50; // ms - wait for batch window
		this.maxBatchSize = 10; // Max requests per batch
	}

	/**
	 * Read sheet with deduplication and batching
	 */
	async read(sheetName, sheetType = 'activities') {
		const cacheKey = `read:${sheetName}`;
		
		// If there's already a pending read for this sheet, return the same promise
		if (this.pendingReads.has(cacheKey)) {
			return this.pendingReads.get(cacheKey);
		}
		
		// Create new read promise
		const promise = this._doRead(sheetName, sheetType);
		this.pendingReads.set(cacheKey, promise);
		
		// Clean up after promise resolves
		promise.finally(() => {
			this.pendingReads.delete(cacheKey);
		});
		
		return promise;
	}

	/**
	 * Internal read implementation
	 */
	async _doRead(sheetName, sheetType) {
		try {
			const timeoutMs = 10000; // 10 seconds
			const timeoutPromise = new Promise((_, reject) => 
				setTimeout(() => reject(new Error(`Google Sheets API timeout after ${timeoutMs}ms`)), timeoutMs)
			);
			
			const apiPromise = this.sheets.spreadsheets.values.get({
				spreadsheetId: this.sheetId,
				range: `${sheetName}!A:Z`
			});
			
			const response = await Promise.race([apiPromise, timeoutPromise]);
			return response.data.values || [];
		} catch (error) {
			if (error.message?.includes('Unable to parse range')) {
				return [];
			}
			throw error;
		}
	}

	/**
	 * Batch write operations
	 */
	async batchWrite(operations) {
		if (operations.length === 0) return [];
		
		// Group operations by sheet
		const bySheet = {};
		operations.forEach(op => {
			if (!bySheet[op.sheetName]) {
				bySheet[op.sheetName] = [];
			}
			bySheet[op.sheetName].push(op);
		});
		
		// Execute writes for each sheet
		const results = await Promise.all(
			Object.entries(bySheet).map(([sheetName, ops]) => 
				this._batchWriteSheet(sheetName, ops)
			)
		);
		
		return results.flat();
	}

	/**
	 * Batch write for a single sheet
	 */
	async _batchWriteSheet(sheetName, operations) {
		// Use batchUpdate for multiple operations
		if (operations.length > 1) {
			const requests = operations.map(op => ({
				updateCells: {
					range: {
						sheetId: op.sheetId || 0,
						startRowIndex: op.startRow,
						endRowIndex: op.endRow,
						startColumnIndex: op.startCol,
						endColumnIndex: op.endCol
					},
					rows: op.rows,
					fields: op.fields || '*'
				}
			}));
			
			const response = await this.sheets.spreadsheets.batchUpdate({
				spreadsheetId: this.sheetId,
				requestBody: {
					requests
				}
			});
			
			return response.data;
		} else {
			// Single operation - use regular update
			const op = operations[0];
			const response = await this.sheets.spreadsheets.values.update({
				spreadsheetId: this.sheetId,
				range: op.range,
				valueInputOption: 'RAW',
				resource: { values: op.values }
			});
			
			return [response.data];
		}
	}
}

