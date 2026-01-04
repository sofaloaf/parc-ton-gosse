/**
 * Debug: Check what's actually in the Activities Cleaned tab
 */

import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

async function debugSheet() {
  const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
  const privateKeyBase64 = process.env.GS_PRIVATE_KEY_BASE64;
  const privateKeyRaw = process.env.GS_PRIVATE_KEY;
  const sheetId = process.env.GS_SANDBOX_SHEET_ID || '1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A';
  const tabName = 'Activities Cleaned';

  let privateKey = '';
  if (privateKeyBase64) {
    privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');
  } else if (privateKeyRaw) {
    privateKey = privateKeyRaw;
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT(
    serviceAccount,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  await auth.authorize();
  const sheets = google.sheets({ version: 'v4', auth });

  // Read more rows to find addresses
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A1:AZ50`
  });

  const rows = response.data.values || [];
  console.log(`📋 Found ${rows.length} rows\n`);
  
  // Find row with most non-empty cells (likely the header row)
  let headerRowIndex = 0;
  let maxCells = 0;
  rows.forEach((row, i) => {
    const nonEmpty = row ? row.filter(c => c && c.toString().trim().length > 0).length : 0;
    if (nonEmpty > maxCells) {
      maxCells = nonEmpty;
      headerRowIndex = i;
    }
  });
  
  console.log(`📊 Header row appears to be row ${headerRowIndex + 1} (${maxCells} non-empty cells)\n`);
  
  // Show first few rows
  rows.slice(0, Math.min(5, rows.length)).forEach((row, i) => {
    if (i === headerRowIndex) {
      console.log(`⭐ Row ${i + 1} (HEADER ROW):`);
    } else {
      console.log(`Row ${i + 1}:`);
    }
    if (row) {
      row.slice(0, 15).forEach((cell, j) => {
        if (cell && cell.toString().trim().length > 0) {
          const colLetter = j < 26 ? String.fromCharCode(65 + j) : String.fromCharCode(65 + Math.floor(j/26) - 1) + String.fromCharCode(65 + (j % 26));
          console.log(`   ${colLetter}: "${cell.toString().substring(0, 40)}${cell.toString().length > 40 ? '...' : ''}"`);
        }
      });
    }
    console.log();
  });
  
  // Check which column has "addresses"
  if (rows.length > 0) {
    const headers = rows[0];
    console.log('\n📋 All column headers:');
    headers.forEach((header, i) => {
      const colNum = i + 1;
      const colLetter = i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(65 + Math.floor(i/26) - 1) + String.fromCharCode(65 + (i % 26));
      const headerStr = header ? `"${header}"` : '(empty)';
      console.log(`   Column ${colLetter} (${colNum}): ${headerStr}`);
      
      // Highlight addresses column
      if (header && (header.toString().toLowerCase().includes('address') || header.toString().toLowerCase() === 'addresses')) {
        console.log(`      ⭐ THIS IS THE ADDRESSES COLUMN!`);
      }
    });
    
    // Check column E specifically (user said they updated it)
    console.log('\n📍 Checking Column E (addresses column) in all rows:');
    let foundAddresses = 0;
    if (rows.length > 1) {
      rows.slice(1).forEach((row, i) => {
        const colE = row && row[4] ? row[4].toString().trim() : '';
        if (colE.length > 0) {
          foundAddresses++;
          if (foundAddresses <= 5) {
            console.log(`   Row ${i + 2}: ${colE.substring(0, 100)}${colE.length > 100 ? '...' : ''}`);
          }
        }
      });
      console.log(`   Found addresses in ${foundAddresses} rows`);
    }
    
    // Also check all columns for any that contain "address" in header or data
    console.log('\n🔍 Searching for address-related columns:');
    if (rows.length > 0) {
      const headerRow = rows[0];
      headerRow.forEach((header, i) => {
        const headerStr = header ? header.toString().toLowerCase() : '';
        if (headerStr.includes('address') || headerStr.includes('adresse')) {
          console.log(`   Column ${String.fromCharCode(65 + (i % 26))}: "${header}"`);
          // Show sample data
          if (rows.length > 1 && rows[1][i]) {
            console.log(`      Sample: ${rows[1][i].toString().substring(0, 60)}...`);
          }
        }
      });
      
      // Also check data rows for columns that might be addresses
      if (rows.length > 1) {
        const dataRow = rows[1];
        dataRow.forEach((cell, i) => {
          if (cell && cell.toString().trim().length > 20) {
            const cellStr = cell.toString().toLowerCase();
            if (cellStr.includes('rue') || cellStr.includes('boulevard') || cellStr.includes('750') || cellStr.includes('paris')) {
              const colLetter = i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(65 + Math.floor(i/26) - 1) + String.fromCharCode(65 + (i % 26));
              const header = headerRow[i] || '(no header)';
              console.log(`   Column ${colLetter} (${header}): Might be address - ${cell.toString().substring(0, 60)}...`);
            }
          }
        });
      }
    }
  }
}

debugSheet().catch(console.error);

