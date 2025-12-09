/**
 * Google Sheets Data Cleaner
 * Reads, cleans, normalizes, and writes back data to Google Sheets
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';
import { normalizeActivity, validateActivities } from '../validator/index.js';

dotenv.config();

let sheetsClient = null;

/**
 * Initialize Google Sheets client
 */
async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const serviceAccount = process.env.GS_SERVICE_ACCOUNT;
  const privateKeyBase64 = process.env.GS_PRIVATE_KEY_BASE64;
  const privateKeyRaw = process.env.GS_PRIVATE_KEY;

  if (!serviceAccount) {
    throw new Error('GS_SERVICE_ACCOUNT not set in .env');
  }

  let privateKey = '';
  if (privateKeyBase64) {
    privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');
  } else if (privateKeyRaw) {
    privateKey = privateKeyRaw;
  } else {
    throw new Error('GS_PRIVATE_KEY_BASE64 or GS_PRIVATE_KEY must be set in .env');
  }

  // Process private key
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT(
    serviceAccount,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  await auth.authorize();
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

/**
 * Read activities from a specific tab in Google Sheets
 */
export async function readActivitiesFromSheet(sheetId, tabName = 'Activities') {
  const sheets = await getSheetsClient();
  
  console.log(`📖 Reading activities from tab: "${tabName}"`);
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!A:Z`
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      console.log('⚠️  No data found in sheet');
      return [];
    }

    // Find first non-empty row as headers
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      if (rows[i] && rows[i].length > 0 && rows[i].some(cell => cell && cell.toString().trim().length > 0)) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = rows[headerRowIndex].map(h => h?.toString().trim() || '');
    console.log(`📋 Found ${headers.length} columns: ${headers.slice(0, 5).join(', ')}...`);

    // Check if this is already a cleaned sheet (has English column names)
    const isCleanedSheet = headers.some(h => 
      h === 'title_en' || h === 'title_fr' || h === 'description_en' || h === 'description_fr'
    );

    // Map French column names to English field names (only if not already cleaned)
    const columnMap = isCleanedSheet ? {} : {
      'Nom du club': 'title',
      'Titre': 'title',
      'Title': 'title',
      'Catégories': 'categories',
      'Categories': 'categories',
      'Type d\'activité (specifique)': 'activityType',
      'Type d\'activité': 'activityType',
      'Age valable': 'ageRange',
      'Age Min': 'ageMin',
      'Age Max': 'ageMax',
      'Disponibilité (jours)': 'disponibiliteJours',
      'Disponibilité (dates)': 'disponibiliteDates',
      'Addresse': 'addresses',
      'Address': 'addresses',
      'Adresse': 'addresses',
      'Prix': 'price',
      'Price': 'price',
      'Lien du site': 'websiteLink',
      'Website Link': 'websiteLink',
      'Lien pour s\'enregistrer': 'registrationLink',
      'Registration Link': 'registrationLink',
      'Description': 'description',
      'Autres informations pertinentes': 'description'
    };

    const activities = [];
    const dataStartRow = headerRowIndex + 1;
    for (let i = dataStartRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const activity = {};
      headers.forEach((header, colIndex) => {
        if (!header) return;
        const value = row[colIndex]?.toString().trim() || '';
        if (value || value === '0') { // Include 0 values
          // Map French column names to English (only if not cleaned sheet)
          const mappedHeader = columnMap[header] || header;
          
          // Handle arrays (categories, addresses) - if comma-separated string
          if ((mappedHeader === 'categories' || mappedHeader === 'addresses') && value.includes(',')) {
            activity[mappedHeader] = value.split(',').map(v => v.trim()).filter(v => v.length > 0);
          }
          // Try to parse JSON if it looks like JSON
          else if (value.startsWith('{') || value.startsWith('[')) {
            try {
              activity[mappedHeader] = JSON.parse(value);
            } catch {
              activity[mappedHeader] = value;
            }
          } else {
            activity[mappedHeader] = value;
          }
        }
      });

      // Only add if it has some data
      if (Object.keys(activity).length > 0) {
        // Generate ID if missing
        if (!activity.id) {
          activity.id = `activity-${i}`;
        }
        activities.push(activity);
      }
    }

    console.log(`✅ Read ${activities.length} activities from sheet`);
    return activities;
  } catch (error) {
    console.error(`❌ Error reading sheet: ${error.message}`);
    throw error;
  }
}

/**
 * Clean and normalize activity data
 */
function cleanActivity(activity) {
  const cleaned = { ...activity };

  // Clean title (handle bilingual and French column names)
  if (cleaned.title) {
    if (typeof cleaned.title === 'string') {
      const title = cleaned.title.trim();
      cleaned.title_en = title;
      cleaned.title_fr = title;
      delete cleaned.title;
    } else if (typeof cleaned.title === 'object') {
      cleaned.title_en = cleaned.title.en?.trim() || cleaned.title.title?.trim() || '';
      cleaned.title_fr = cleaned.title.fr?.trim() || cleaned.title.title?.trim() || '';
      delete cleaned.title;
    }
  } else if (cleaned['Nom du club']) {
    // Handle French column name directly
    const title = cleaned['Nom du club'].trim();
    cleaned.title_en = title;
    cleaned.title_fr = title;
    delete cleaned['Nom du club'];
  }

  // Clean description (handle bilingual)
  if (cleaned.description) {
    if (typeof cleaned.description === 'string') {
      const desc = cleaned.description.trim();
      cleaned.description_en = desc;
      cleaned.description_fr = desc;
      delete cleaned.description;
    } else if (typeof cleaned.description === 'object') {
      cleaned.description_en = cleaned.description.en?.trim() || cleaned.description.description?.trim() || '';
      cleaned.description_fr = cleaned.description.fr?.trim() || cleaned.description.description?.trim() || '';
      delete cleaned.description;
    }
  }

  // Clean categories (ensure array, remove duplicates, trim)
  if (cleaned.categories) {
    if (typeof cleaned.categories === 'string') {
      cleaned.categories = cleaned.categories
        .split(/[,;|]/)
        .map(c => c.trim())
        .filter(c => c.length > 0);
    } else if (Array.isArray(cleaned.categories)) {
      cleaned.categories = cleaned.categories
        .map(c => typeof c === 'string' ? c.trim() : String(c).trim())
        .filter(c => c.length > 0);
    }
    // Remove duplicates
    cleaned.categories = [...new Set(cleaned.categories)];
  } else {
    cleaned.categories = [];
  }

  // Clean age range (handle "Age valable" format like "5-12" or "5 à 12")
  if (cleaned.ageRange) {
    const ageRange = cleaned.ageRange.toString().trim();
    const match = ageRange.match(/(\d+)\s*[-àto]\s*(\d+)/i);
    if (match) {
      cleaned.ageMin = parseInt(match[1]) || 0;
      cleaned.ageMax = parseInt(match[2]) || 0;
    } else {
      // Try single number
      const singleAge = parseInt(ageRange);
      if (!isNaN(singleAge)) {
        cleaned.ageMin = singleAge;
        cleaned.ageMax = singleAge;
      }
    }
    delete cleaned.ageRange;
  }
  
  if (cleaned.ageMin !== undefined && cleaned.ageMin !== null) {
    cleaned.ageMin = parseInt(cleaned.ageMin) || 0;
  }
  if (cleaned.ageMax !== undefined && cleaned.ageMax !== null) {
    cleaned.ageMax = parseInt(cleaned.ageMax) || 0;
  }

  // Clean price
  if (cleaned.price) {
    if (typeof cleaned.price === 'object') {
      cleaned.price_amount = parseFloat(cleaned.price.amount) || 0;
      cleaned.price_currency = cleaned.price.currency?.toUpperCase() || 'EUR';
      delete cleaned.price;
    } else if (typeof cleaned.price === 'number') {
      cleaned.price_amount = cleaned.price;
      cleaned.price_currency = 'EUR';
      delete cleaned.price;
    } else if (typeof cleaned.price === 'string') {
      // Try to parse "100 EUR" or "100"
      const match = cleaned.price.match(/(\d+(?:\.\d+)?)\s*(\w+)?/);
      if (match) {
        cleaned.price_amount = parseFloat(match[1]) || 0;
        cleaned.price_currency = (match[2]?.toUpperCase() || 'EUR');
      } else {
        cleaned.price_amount = 0;
        cleaned.price_currency = 'EUR';
      }
      delete cleaned.price;
    }
  } else {
    cleaned.price_amount = 0;
    cleaned.price_currency = 'EUR';
  }

  // Clean addresses (ensure array, trim)
  if (cleaned.addresses) {
    if (typeof cleaned.addresses === 'string') {
      cleaned.addresses = cleaned.addresses
        .split(/[|;]/)
        .map(a => a.trim())
        .filter(a => a.length > 0);
    } else if (Array.isArray(cleaned.addresses)) {
      cleaned.addresses = cleaned.addresses
        .map(a => typeof a === 'string' ? a.trim() : String(a).trim())
        .filter(a => a.length > 0);
    }
  } else {
    cleaned.addresses = [];
  }

  // Clean URLs (trim, ensure https://)
  if (cleaned.websiteLink) {
    cleaned.websiteLink = cleaned.websiteLink.trim();
    if (cleaned.websiteLink && !cleaned.websiteLink.startsWith('http')) {
      cleaned.websiteLink = 'https://' + cleaned.websiteLink;
    }
  }
  if (cleaned.registrationLink) {
    cleaned.registrationLink = cleaned.registrationLink.trim();
    if (cleaned.registrationLink && !cleaned.registrationLink.startsWith('http')) {
      cleaned.registrationLink = 'https://' + cleaned.registrationLink;
    }
  }

  // Clean dates (normalize format)
  if (cleaned.startDate) {
    cleaned.startDate = normalizeDate(cleaned.startDate);
  }
  if (cleaned.endDate) {
    cleaned.endDate = normalizeDate(cleaned.endDate);
  }

  // Clean availability
  if (cleaned.disponibiliteJours) {
    if (typeof cleaned.disponibiliteJours === 'string') {
      cleaned.disponibiliteJours = cleaned.disponibiliteJours.trim();
    }
  }
  if (cleaned.disponibiliteDates) {
    if (typeof cleaned.disponibiliteDates === 'string') {
      cleaned.disponibiliteDates = cleaned.disponibiliteDates.trim();
    }
  }

  // Remove empty values for cleaner output
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === '' || cleaned[key] === null || cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });

  return cleaned;
}

/**
 * Normalize date to ISO format
 */
function normalizeDate(date) {
  if (!date) return '';
  if (typeof date === 'string') {
    // Try to parse and format
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0]; // YYYY-MM-DD
    }
  }
  return String(date).trim();
}

/**
 * Get headers for cleaned activities
 */
function getHeaders(activities) {
  const allKeys = new Set();
  activities.forEach(activity => {
    Object.keys(activity).forEach(key => allKeys.add(key));
  });

  // Define preferred column order
  const preferredOrder = [
    'id',
    'title_en',
    'title_fr',
    'description_en',
    'description_fr',
    'categories',
    'ageMin',
    'ageMax',
    'price_amount',
    'price_currency',
    'addresses',
    'websiteLink',
    'registrationLink',
    'disponibiliteJours',
    'disponibiliteDates',
    'startDate',
    'endDate',
    'activityType',
    'adults'
  ];

  const headers = [];
  preferredOrder.forEach(key => {
    if (allKeys.has(key)) {
      headers.push(key);
      allKeys.delete(key);
    }
  });

  // Add remaining keys alphabetically
  Array.from(allKeys).sort().forEach(key => headers.push(key));

  return headers;
}

/**
 * Write cleaned activities to a new tab in Google Sheets
 */
export async function writeCleanedActivities(sheetId, activities, tabName = 'Activities Cleaned') {
  const sheets = await getSheetsClient();

  console.log(`💾 Writing ${activities.length} cleaned activities to tab: "${tabName}"`);

  // Get headers
  const headers = getHeaders(activities);
  console.log(`📋 Using ${headers.length} columns: ${headers.slice(0, 10).join(', ')}...`);

  // Prepare rows
  const rows = [headers];
  activities.forEach(activity => {
    const row = headers.map(header => {
      const value = activity[header];
      
      if (value === null || value === undefined) return '';
      
      // Handle arrays (categories, addresses)
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      
      // Handle objects (shouldn't happen after cleaning, but just in case)
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      
      return String(value);
    });
    rows.push(row);
  });

  // Check if tab exists
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const tabExists = meta.data.sheets?.some(s => s.properties.title === tabName);
    
    if (tabExists) {
      console.log(`⚠️  Tab "${tabName}" already exists. Updating...`);
      // Clear existing data
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `${tabName}!A:Z`
      });
    } else {
      console.log(`📝 Creating new tab: "${tabName}"`);
      // Create new tab
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: tabName
              }
            }
          }]
        }
      });
    }
  } catch (error) {
    console.error(`❌ Error checking/creating tab: ${error.message}`);
    throw error;
  }

  // Write data
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${tabName}!A1`,
      valueInputOption: 'RAW',
      resource: { values: rows }
    });

    console.log(`✅ Successfully wrote ${activities.length} activities to "${tabName}"`);
    return { success: true, count: activities.length, tabName };
  } catch (error) {
    console.error(`❌ Error writing to sheet: ${error.message}`);
    throw error;
  }
}

/**
 * Main cleanup function
 */
export async function cleanupSheetData(sheetId, sourceTabName = 'Parctongosse_exported_02-21-2024csv', targetTabName = 'Activities Cleaned') {
  console.log('🧹 Starting Google Sheets data cleanup...');
  console.log(`   Sheet ID: ${sheetId}`);
  console.log(`   Source tab: ${sourceTabName}`);
  console.log(`   Target tab: ${targetTabName}\n`);

  try {
    // Step 1: Read activities
    const rawActivities = await readActivitiesFromSheet(sheetId, sourceTabName);
    
    if (rawActivities.length === 0) {
      console.log('⚠️  No activities found to clean');
      return { success: false, message: 'No activities found' };
    }

    // Step 2: Clean and normalize
    console.log('\n🧹 Cleaning and normalizing data...');
    const cleanedActivities = rawActivities.map(activity => cleanActivity(activity));
    console.log(`✅ Cleaned ${cleanedActivities.length} activities`);

    // Step 3: Validate
    console.log('\n✅ Validating cleaned data...');
    const validated = await validateActivities(cleanedActivities);
    const validCount = validated.filter(a => a.valid).length;
    const invalidCount = validated.filter(a => !a.valid).length;
    console.log(`   Valid: ${validCount}, Invalid: ${invalidCount}`);

    if (invalidCount > 0) {
      console.log('\n⚠️  Some activities have validation errors:');
      validated.filter(a => !a.valid).slice(0, 5).forEach(activity => {
        console.log(`   - ${activity.title_en || activity.title_fr || 'Untitled'}: ${activity.errors.join(', ')}`);
      });
    }

    // Step 4: Write back to sheet
    console.log('\n💾 Writing cleaned data to sheet...');
    const result = await writeCleanedActivities(sheetId, cleanedActivities, targetTabName);

    console.log('\n✅ Cleanup completed successfully!');
    console.log(`   Check your Google Sheet for the new "${targetTabName}" tab`);

    return {
      success: true,
      ...result,
      validation: {
        total: validated.length,
        valid: validCount,
        invalid: invalidCount
      }
    };
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    throw error;
  }
}

