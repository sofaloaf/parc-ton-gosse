/**
 * Analyze current address data structure
 * Read addresses from sheet and show patterns
 */

import dotenv from 'dotenv';
import { readActivitiesFromSheet } from './sheets/cleaner.js';

dotenv.config();

const SANDBOX_SHEET_ID = process.env.GS_SANDBOX_SHEET_ID || '1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A';

async function analyzeAddresses() {
  console.log('🔍 Analyzing address data structure...\n');
  
  const activities = await readActivitiesFromSheet(SANDBOX_SHEET_ID, 'Activities Cleaned');
  
  console.log(`📊 Analyzing ${activities.length} activities\n`);
  
  const addressPatterns = {
    single: 0,
    multiple: 0,
    withDays: 0,
    withAge: 0,
    withType: 0,
    structured: 0,
    unstructured: 0
  };
  
  const examples = {
    single: [],
    multiple: [],
    complex: []
  };
  
  activities.forEach((activity, index) => {
    const addresses = activity.addresses;
    
    if (!addresses || (Array.isArray(addresses) && addresses.length === 0)) {
      return;
    }
    
    const addrStr = Array.isArray(addresses) ? addresses.join(' | ') : String(addresses);
    const addrLower = addrStr.toLowerCase();
    
    // Check patterns
    if (Array.isArray(addresses) && addresses.length === 1) {
      addressPatterns.single++;
      if (examples.single.length < 3) {
        examples.single.push({ title: activity.title_en || activity.title_fr, address: addresses[0] });
      }
    } else if (Array.isArray(addresses) && addresses.length > 1) {
      addressPatterns.multiple++;
      if (examples.multiple.length < 3) {
        examples.multiple.push({ title: activity.title_en || activity.title_fr, addresses });
      }
    }
    
    // Check for day references
    if (addrLower.includes('lundi') || addrLower.includes('mardi') || addrLower.includes('mercredi') ||
        addrLower.includes('jeudi') || addrLower.includes('vendredi') || addrLower.includes('samedi') ||
        addrLower.includes('dimanche') || addrLower.includes('monday') || addrLower.includes('tuesday')) {
      addressPatterns.withDays++;
      if (examples.complex.length < 5) {
        examples.complex.push({ title: activity.title_en || activity.title_fr, address: addrStr, reason: 'contains days' });
      }
    }
    
    // Check for age references
    if (addrLower.includes('ans') || addrLower.includes('age') || addrLower.includes('years') ||
        addrLower.match(/\d+\s*(ans|years|age)/)) {
      addressPatterns.withAge++;
      if (examples.complex.length < 5) {
        examples.complex.push({ title: activity.title_en || activity.title_fr, address: addrStr, reason: 'contains age' });
      }
    }
    
    // Check for type/class references
    if (addrLower.includes('cours') || addrLower.includes('classe') || addrLower.includes('class') ||
        addrLower.includes('niveau') || addrLower.includes('level') || addrLower.includes('débutant') ||
        addrLower.includes('avancé') || addrLower.includes('beginner') || addrLower.includes('advanced')) {
      addressPatterns.withType++;
      if (examples.complex.length < 5) {
        examples.complex.push({ title: activity.title_en || activity.title_fr, address: addrStr, reason: 'contains class type' });
      }
    }
    
    // Check if already structured (JSON-like)
    if (addrStr.startsWith('{') || addrStr.startsWith('[')) {
      addressPatterns.structured++;
    } else {
      addressPatterns.unstructured++;
    }
  });
  
  console.log('📈 Address Patterns:');
  console.log(`   Single address: ${addressPatterns.single}`);
  console.log(`   Multiple addresses: ${addressPatterns.multiple}`);
  console.log(`   With day references: ${addressPatterns.withDays}`);
  console.log(`   With age references: ${addressPatterns.withAge}`);
  console.log(`   With class/type references: ${addressPatterns.withType}`);
  console.log(`   Already structured: ${addressPatterns.structured}`);
  console.log(`   Unstructured: ${addressPatterns.unstructured}\n`);
  
  console.log('📝 Examples:\n');
  
  console.log('Single Address:');
  examples.single.forEach(ex => {
    console.log(`   - ${ex.title}`);
    console.log(`     ${ex.address}\n`);
  });
  
  console.log('Multiple Addresses:');
  examples.multiple.forEach(ex => {
    console.log(`   - ${ex.title}`);
    ex.addresses.forEach((addr, i) => {
      console.log(`     ${i + 1}. ${addr}`);
    });
    console.log();
  });
  
  console.log('Complex Addresses (with conditions):');
  examples.complex.forEach(ex => {
    console.log(`   - ${ex.title} (${ex.reason})`);
    console.log(`     ${ex.address}\n`);
  });
}

analyzeAddresses().catch(console.error);

