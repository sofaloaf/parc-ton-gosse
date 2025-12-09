/**
 * List all tabs in Google Sheet
 */

import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

async function listTabs() {
  const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
  const privateKeyBase64 = process.env.GS_PRIVATE_KEY_BASE64;
  const privateKeyRaw = process.env.GS_PRIVATE_KEY;
  const sheetId = process.env.GS_SANDBOX_SHEET_ID || '1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A';

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

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  console.log('📋 Available tabs:');
  meta.data.sheets?.forEach((sheet, i) => {
    console.log(`   ${i + 1}. "${sheet.properties.title}" (${sheet.properties.gridProperties?.rowCount || 0} rows)`);
  });
}

listTabs().catch(console.error);

