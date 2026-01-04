/**
 * Find which column contains addresses in Activities Cleaned tab
 */

import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

async function findAddressColumn() {
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

  // Read entire sheet to find addresses
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A1:ZZ200`
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    console.log('No data found');
    return;
  }

  // Find header row
  let headerRow = rows[0];
  let maxHeaders = 0;
  rows.slice(0, 5).forEach((row, i) => {
    const count = row ? row.filter(c => c && c.toString().trim().length > 0).length : 0;
    if (count > maxHeaders) {
      maxHeaders = count;
      headerRow = row;
    }
  });

  console.log('📋 All headers found:');
  const headerMap = {};
  headerRow.forEach((header, i) => {
    if (header && header.toString().trim().length > 0) {
      const colLetter = i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(65 + Math.floor(i/26) - 1) + String.fromCharCode(65 + (i % 26));
      headerMap[header.toString().trim()] = { col: colLetter, index: i };
      console.log(`   ${colLetter} (${i + 1}): "${header}"`);
    }
  });

  // Check for address-related headers
  console.log('\n🔍 Address-related columns:');
  Object.keys(headerMap).forEach(header => {
    const lower = header.toLowerCase();
    if (lower.includes('address') || lower.includes('adresse') || lower.includes('location') || lower.includes('lieu')) {
      const info = headerMap[header];
      console.log(`   ⭐ ${info.col}: "${header}"`);
      
      // Show sample data
      let sampleCount = 0;
      rows.slice(1, 11).forEach((row, i) => {
        if (row && row[info.index] && row[info.index].toString().trim().length > 0 && sampleCount < 3) {
          console.log(`      Row ${i + 2}: ${row[info.index].toString().substring(0, 80)}...`);
          sampleCount++;
        }
      });
    }
  });

  // Also check column E specifically (user mentioned column E)
  console.log('\n📍 Column E (index 4) specifically:');
  const colEIndex = 4;
  let foundInE = 0;
  rows.slice(1, 20).forEach((row, i) => {
    if (row && row[colEIndex] && row[colEIndex].toString().trim().length > 0) {
      foundInE++;
      if (foundInE <= 5) {
        const value = row[colEIndex].toString();
        console.log(`   Row ${i + 2}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
      }
    }
  });
  console.log(`   Found data in ${foundInE} of ${Math.min(19, rows.length - 1)} rows checked`);

  // Check all columns for address-like content
  console.log('\n🔎 Scanning all columns for address-like content:');
  const addressKeywords = ['rue', 'boulevard', 'avenue', '750', 'paris', 'arrondissement', 'gymnase', 'centre', 'dojo'];
  const foundColumns = new Set();
  
  rows.slice(1, 20).forEach((row, i) => {
    if (row) {
      row.forEach((cell, colIndex) => {
        if (cell) {
          const cellStr = cell.toString().toLowerCase();
          const hasKeyword = addressKeywords.some(keyword => cellStr.includes(keyword));
          if (hasKeyword && cellStr.length > 10) {
            const colLetter = colIndex < 26 ? String.fromCharCode(65 + colIndex) : String.fromCharCode(65 + Math.floor(colIndex/26) - 1) + String.fromCharCode(65 + (colIndex % 26));
            foundColumns.add(colLetter);
            if (foundColumns.size <= 10) {
              const header = headerRow[colIndex] || '(no header)';
              console.log(`   Column ${colLetter} (${header}): ${cell.toString().substring(0, 60)}...`);
            }
          }
        }
      });
    }
  });
}

findAddressColumn().catch(console.error);



