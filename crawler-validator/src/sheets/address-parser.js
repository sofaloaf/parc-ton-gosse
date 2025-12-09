/**
 * Address Parser and Structurer
 * Parses messy address data and structures it for machine/human readability
 * 
 * Best Practices:
 * - Structured JSON format for machines/AI agents
 * - Human-readable summary for humans
 * - Separate addresses by conditions (days, age, class type, time)
 * - Standardized address components
 */

/**
 * Parse a single address string and extract structured information
 */
export function parseAddress(addressStr) {
  if (!addressStr || typeof addressStr !== 'string') {
    return null;
  }

  const address = addressStr.trim();
  if (address.length === 0) return null;

  const result = {
    address: '',
    street: '',
    city: '',
    postalCode: '',
    neighborhood: '',
    days: [],
    ageMin: null,
    ageMax: null,
    classType: null,
    time: null,
    level: null,
    notes: ''
  };

  // Extract days (French and English)
  const dayPatterns = {
    'lundi': 'monday',
    'mardi': 'tuesday',
    'mercredi': 'wednesday',
    'jeudi': 'thursday',
    'vendredi': 'friday',
    'samedi': 'saturday',
    'dimanche': 'sunday',
    'monday': 'monday',
    'tuesday': 'tuesday',
    'wednesday': 'wednesday',
    'thursday': 'thursday',
    'friday': 'friday',
    'saturday': 'saturday',
    'sunday': 'sunday'
  };

  Object.keys(dayPatterns).forEach(frDay => {
    const regex = new RegExp(`\\b${frDay}\\b`, 'i');
    if (regex.test(address)) {
      result.days.push(dayPatterns[frDay]);
    }
  });

  // Extract age range (e.g., "4/7 ans", "8-12 ans", "4 à 7 ans")
  const agePatterns = [
    /(\d+)\s*[\/\-àto]\s*(\d+)\s*(?:ans|years?|age)/i,
    /(?:pour|for)\s*(\d+)\s*(?:à|to|-)\s*(\d+)/i,
    /(\d+)\s*(?:ans|years?)\s*(?:à|to|-)\s*(\d+)\s*(?:ans|years?)/i
  ];

  for (const pattern of agePatterns) {
    const match = address.match(pattern);
    if (match) {
      result.ageMin = parseInt(match[1]);
      result.ageMax = parseInt(match[2]);
      break;
    }
  }

  // Extract time (e.g., "20h00 à 21h30", "14:30-15:30", "20:00 to 21:30")
  const timePatterns = [
    /(\d{1,2})h(\d{2})\s*(?:à|to|-)\s*(\d{1,2})h(\d{2})/i,
    /(\d{1,2}):(\d{2})\s*(?:à|to|-)\s*(\d{1,2}):(\d{2})/i
  ];

  for (const pattern of timePatterns) {
    const match = address.match(pattern);
    if (match) {
      result.time = `${match[1]}:${match[2]}-${match[3]}:${match[4]}`;
      break;
    }
  }

  // Extract class type/level
  const classTypePatterns = {
    'débutant': 'beginner',
    'beginner': 'beginner',
    'initiation': 'beginner',
    'avancé': 'advanced',
    'advanced': 'advanced',
    'tous niveaux': 'all levels',
    'all levels': 'all levels',
    'intermédiaire': 'intermediate',
    'intermediate': 'intermediate',
    'adultes': 'adults',
    'adults': 'adults',
    'enfants': 'children',
    'children': 'children'
  };

  for (const key of Object.keys(classTypePatterns)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(address)) {
      result.classType = classTypePatterns[key];
      break;
    }
  }

  // Extract postal code (French format: 75008, 75020, etc.)
  const postalCodeMatch = address.match(/\b(75\d{3}|750\d{2})\b/);
  if (postalCodeMatch) {
    result.postalCode = postalCodeMatch[1];
    // Extract arrondissement from postal code
    const arrondissement = postalCodeMatch[1].slice(-2);
    if (arrondissement !== '00') {
      result.neighborhood = `${arrondissement}ème arrondissement`;
    }
  }

  // Extract street address (look for "rue", "boulevard", "avenue", etc.)
  const streetPatterns = [
    /(\d+[\s-]?\d*)\s*(rue|boulevard|avenue|bd|av|impasse|place|allée|passage)\s+([^,\n]+)/i,
    /(\d+[\s-]?\d*)\s+([A-Z][^,\n]+(?:rue|boulevard|avenue|street|road|ave|blvd))/i
  ];

  for (const pattern of streetPatterns) {
    const match = address.match(pattern);
    if (match) {
      result.street = match[0].trim();
      break;
    }
  }

  // Extract city (usually "Paris" or neighborhood name)
  if (address.match(/\bParis\b/i)) {
    result.city = 'Paris';
  }

  // Clean address - remove day/time/age references for core address
  let cleanAddress = address;
  
  // Remove day references
  Object.keys(dayPatterns).forEach(day => {
    cleanAddress = cleanAddress.replace(new RegExp(`\\b${day}\\b`, 'gi'), '');
  });
  
  // Remove time references
  cleanAddress = cleanAddress.replace(/\d{1,2}[h:]\d{2}\s*(?:à|to|-)\s*\d{1,2}[h:]\d{2}/gi, '');
  
  // Remove age references
  cleanAddress = cleanAddress.replace(/\d+\s*[\/\-àto]\s*\d+\s*(?:ans|years?)/gi, '');
  
  // Remove class type references
  Object.keys(classTypePatterns).forEach(type => {
    cleanAddress = cleanAddress.replace(new RegExp(`\\b${type}\\b`, 'gi'), '');
  });
  
  // Clean up extra whitespace and separators
  cleanAddress = cleanAddress
    .replace(/[|;]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[:\-]\s*/, '')
    .trim();

  result.address = cleanAddress || address;

  return result;
}

/**
 * Check if a string looks like a complete address
 */
function isCompleteAddress(str) {
  // Has postal code (750XX format)
  if (/\b75\d{3}\b/.test(str)) return true;
  // Has street number and street name
  if (/\d+[\s-]?\d*\s+(rue|boulevard|avenue|bd|av|street|road|ave|blvd|impasse|place|allée|passage)/i.test(str)) return true;
  // Has recognizable location name (Gymnase, Centre, Dojo, etc.)
  if (/\b(gymnase|centre|dojo|piscine|salle|club|école|école|école)\b/i.test(str)) return true;
  return false;
}

/**
 * Combine address components into complete addresses
 */
function combineAddressComponents(components) {
  if (components.length === 0) return [];
  if (components.length === 1) return [components[0]];
  
  const addresses = [];
  let currentAddress = [];
  
  components.forEach((component, index) => {
    const trimmed = component.trim();
    if (trimmed.length === 0) return;
    
    const hasPostalCode = /\b75\d{3}\b/.test(trimmed);
    const isLocationName = /^(?:Gymnase|Centre|Dojo|Piscine|Salle|Club|École|École|Lycée|Collège)/i.test(trimmed);
    const isStreetNumber = /^\d+[\s-]?\d*$/.test(trimmed);
    const isStreetName = /\b(rue|boulevard|avenue|bd|av|street|road|ave|blvd|impasse|place|allée|passage)\b/i.test(trimmed);
    const isCity = /^(?:Paris|750\d{2})/i.test(trimmed);
    
    // If we have components and this looks like a new address start
    if (currentAddress.length > 0) {
      const lastComponent = currentAddress[currentAddress.length - 1];
      const lastHasPostalCode = /\b75\d{3}\b/.test(lastComponent);
      
      // If last component had postal code, this is likely a new address
      if (lastHasPostalCode && (isLocationName || isStreetNumber)) {
        addresses.push(currentAddress.join(' ').trim());
        currentAddress = [];
      }
    }
    
    currentAddress.push(trimmed);
    
    // If this component has postal code and we have multiple components, likely complete
    if (hasPostalCode && currentAddress.length >= 2) {
      addresses.push(currentAddress.join(' ').trim());
      currentAddress = [];
    }
  });
  
  // Add remaining components as one address
  if (currentAddress.length > 0) {
    addresses.push(currentAddress.join(' ').trim());
  }
  
  return addresses.filter(a => a.length > 0);
}

/**
 * Parse multiple addresses from a string or array
 * Handles addresses with conditions (days, age, class type, etc.)
 */
export function parseAddresses(addressData) {
  if (!addressData) return [];

  let addressStrings = [];
  
  // Convert to array if needed
  if (typeof addressData === 'string') {
    // First, split by major sections (Cours du Samedi, day names, etc.)
    const majorSections = addressData.split(/(?=Cours\s+(?:du|de|le)|(?:\b(?:Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b[^|;]*[:\-])|(?:\d+\s*[\/\-àto]\s*\d+\s*(?:ans|years?)\s*[:\-]))/i);
    
    majorSections.forEach(section => {
      section = section.trim();
      if (section.length === 0) return;
      
      // Check if this section has structured info (days, age, etc.)
      const hasStructure = section.match(/(?:Cours|Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|\d+\s*[\/\-àto]\s*\d+\s*(?:ans|years?))/i);
      
      if (hasStructure) {
        // This is a structured address with conditions - keep as is
        addressStrings.push(section);
      } else {
        // Split by | or ; and combine components
        const components = section.split(/[|;]/).map(c => c.trim()).filter(c => c.length > 0);
        const combined = combineAddressComponents(components);
        addressStrings.push(...combined);
      }
    });
  } else if (Array.isArray(addressData)) {
    // For arrays, try to combine related components
    const combined = combineAddressComponents(addressData.map(a => String(a).trim()));
    addressStrings.push(...combined);
  }

  // Parse each address
  const parsed = addressStrings.map(parseAddress).filter(a => a !== null);

  // Group addresses by conditions if they're similar
  const grouped = [];
  const seen = new Set();

  parsed.forEach(addr => {
    // Create a key for grouping (same address, different conditions)
    const addressKey = addr.address.toLowerCase().replace(/\s+/g, ' ');
    
    if (!seen.has(addressKey)) {
      seen.add(addressKey);
      
      // Find all addresses with same core address but different conditions
      const related = parsed.filter(a => 
        a.address.toLowerCase().replace(/\s+/g, ' ') === addressKey
      );

      if (related.length === 1) {
        grouped.push(related[0]);
      } else {
        // Merge conditions
        const merged = {
          ...related[0],
          days: [...new Set(related.flatMap(a => a.days))],
          time: related.find(a => a.time)?.time || null,
          classType: related.find(a => a.classType)?.classType || null,
          ageMin: related.find(a => a.ageMin)?.ageMin || null,
          ageMax: related.find(a => a.ageMax)?.ageMax || null,
          notes: related.map(a => a.notes).filter(n => n).join('; ')
        };
        grouped.push(merged);
      }
    }
  });

  return grouped;
}

/**
 * Format addresses for human-readable display in Google Sheets
 */
export function formatAddressesForDisplay(structuredAddresses) {
  if (!structuredAddresses || structuredAddresses.length === 0) {
    return '';
  }

  if (structuredAddresses.length === 1) {
    const addr = structuredAddresses[0];
    return formatSingleAddressForDisplay(addr);
  }

  // Multiple addresses - format with conditions
  return structuredAddresses.map((addr, index) => {
    const conditions = [];
    
    if (addr.days.length > 0) {
      conditions.push(addr.days.join(', '));
    }
    if (addr.time) {
      conditions.push(addr.time);
    }
    if (addr.ageMin !== null && addr.ageMax !== null) {
      conditions.push(`${addr.ageMin}-${addr.ageMax} ans`);
    }
    if (addr.classType) {
      conditions.push(addr.classType);
    }

    const conditionStr = conditions.length > 0 ? ` (${conditions.join('; ')})` : '';
    return `${index + 1}. ${addr.address}${conditionStr}`;
  }).join('\n');
}

/**
 * Format a single address for display
 */
function formatSingleAddressForDisplay(addr) {
  const parts = [addr.address];
  
  if (addr.days.length > 0) {
    parts.push(`Days: ${addr.days.join(', ')}`);
  }
  if (addr.time) {
    parts.push(`Time: ${addr.time}`);
  }
  if (addr.ageMin !== null && addr.ageMax !== null) {
    parts.push(`Age: ${addr.ageMin}-${addr.ageMax} ans`);
  }
  if (addr.classType) {
    parts.push(`Level: ${addr.classType}`);
  }

  return parts.join(' | ');
}

/**
 * Structure addresses for storage (JSON format for machines)
 */
export function structureAddressesForStorage(addressData) {
  const parsed = parseAddresses(addressData);
  
  return {
    structured: parsed,
    display: formatAddressesForDisplay(parsed),
    count: parsed.length,
    hasConditions: parsed.some(a => 
      a.days.length > 0 || a.time || a.ageMin !== null || a.classType
    )
  };
}

