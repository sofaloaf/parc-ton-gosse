/**
 * Generate clear, easy-to-understand descriptions for activities
 * Based on available data (categories, activity type, age range, etc.)
 */

/**
 * Generate English description
 */
export function generateDescriptionEn(activity) {
  const parts = [];
  
  // Start with activity name/title
  const title = activity.title_en || activity.title_fr || activity.title || 'This activity';
  
  // Add activity type if available
  if (activity.activityType) {
    parts.push(`${title} offers ${activity.activityType.toLowerCase()}`);
  } else {
    parts.push(`${title} offers`);
  }
  
  // Add categories (format nicely)
  if (activity.categories) {
    let categories = [];
    
    // Handle both array and string formats
    if (Array.isArray(activity.categories)) {
      categories = activity.categories;
    } else if (typeof activity.categories === 'string') {
      categories = activity.categories.split(/[,;]/).map(c => c.trim()).filter(c => c.length > 0);
    }
    
    if (categories.length > 0) {
      // Format each category nicely
      const formatted = categories.map(c => {
        // Capitalize first letter of each word
        return c.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      });
      
      if (formatted.length === 1) {
        parts.push(formatted[0]);
      } else if (formatted.length === 2) {
        parts.push(`${formatted[0]} and ${formatted[1]}`);
      } else {
        const last = formatted.pop();
        parts.push(`${formatted.join(', ')}, and ${last}`);
      }
    }
  }
  
  // Add age range
  if (activity.ageMin !== undefined && activity.ageMax !== undefined) {
    if (activity.ageMin === activity.ageMax) {
      parts.push(`for children aged ${activity.ageMin} years`);
    } else {
      parts.push(`for children aged ${activity.ageMin} to ${activity.ageMax} years`);
    }
  } else if (activity.ageMin !== undefined) {
    parts.push(`for children aged ${activity.ageMin} years and up`);
  } else if (activity.ageMax !== undefined) {
    parts.push(`for children up to ${activity.ageMax} years`);
  }
  
  // Add location info if available
  if (activity.addresses && Array.isArray(activity.addresses) && activity.addresses.length > 0) {
    const address = activity.addresses[0];
    if (address) {
      // Extract neighborhood or area if possible
      const neighborhoodMatch = address.match(/(\d{5})\s+Paris|(\d{1,2}(?:er|ème|e)\s+arrondissement)/i);
      if (neighborhoodMatch) {
        const arrondissement = neighborhoodMatch[2] || `${neighborhoodMatch[1]?.slice(0, 2)}ème arrondissement`;
        parts.push(`in the ${arrondissement}`);
      }
    }
  }
  
  // Add availability if mentioned (format nicely)
  if (activity.disponibiliteJours) {
    const days = activity.disponibiliteJours
      .split(/[,;]/)
      .map(d => d.trim())
      .filter(d => d.length > 0)
      .map(d => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase());
    
    if (days.length > 0) {
      if (days.length === 1) {
        parts.push(`available on ${days[0]}`);
      } else {
        parts.push(`available ${days.join(', ')}`);
      }
    }
  }
  
  // Add price info if available
  if (activity.price_amount && activity.price_amount > 0) {
    const currency = activity.price_currency || 'EUR';
    const priceStr = currency === 'EUR' ? `€${activity.price_amount}` : `${activity.price_amount} ${currency}`;
    parts.push(`with fees starting at ${priceStr}`);
  }
  
  // Join parts and create sentence
  let description = parts.join(' ');
  
  // Ensure it starts with capital letter and ends with period
  description = description.charAt(0).toUpperCase() + description.slice(1);
  if (!description.endsWith('.')) {
    description += '.';
  }
  
  return description;
}

/**
 * Generate French description
 */
export function generateDescriptionFr(activity) {
  const parts = [];
  
  // Start with activity name/title
  const title = activity.title_fr || activity.title_en || activity.title || 'Cette activité';
  
  // Add activity type if available
  if (activity.activityType) {
    parts.push(`${title} propose ${activity.activityType.toLowerCase()}`);
  } else {
    parts.push(`${title} propose`);
  }
  
  // Add categories (format nicely)
  if (activity.categories) {
    let categories = [];
    
    // Handle both array and string formats
    if (Array.isArray(activity.categories)) {
      categories = activity.categories;
    } else if (typeof activity.categories === 'string') {
      categories = activity.categories.split(/[,;]/).map(c => c.trim()).filter(c => c.length > 0);
    }
    
    if (categories.length > 0) {
      // Format each category nicely
      const formatted = categories.map(c => {
        // Capitalize first letter of each word
        return c.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      });
      
      if (formatted.length === 1) {
        parts.push(formatted[0]);
      } else if (formatted.length === 2) {
        parts.push(`${formatted[0]} et ${formatted[1]}`);
      } else {
        const last = formatted.pop();
        parts.push(`${formatted.join(', ')} et ${last}`);
      }
    }
  }
  
  // Add age range
  if (activity.ageMin !== undefined && activity.ageMax !== undefined) {
    if (activity.ageMin === activity.ageMax) {
      parts.push(`pour les enfants de ${activity.ageMin} ans`);
    } else {
      parts.push(`pour les enfants de ${activity.ageMin} à ${activity.ageMax} ans`);
    }
  } else if (activity.ageMin !== undefined) {
    parts.push(`pour les enfants à partir de ${activity.ageMin} ans`);
  } else if (activity.ageMax !== undefined) {
    parts.push(`pour les enfants jusqu'à ${activity.ageMax} ans`);
  }
  
  // Add location info if available
  if (activity.addresses && Array.isArray(activity.addresses) && activity.addresses.length > 0) {
    const address = activity.addresses[0];
    if (address) {
      // Extract neighborhood or area if possible
      const neighborhoodMatch = address.match(/(\d{5})\s+Paris|(\d{1,2}(?:er|ème|e)\s+arrondissement)/i);
      if (neighborhoodMatch) {
        const arrondissement = neighborhoodMatch[2] || `${neighborhoodMatch[1]?.slice(0, 2)}ème arrondissement`;
        parts.push(`dans le ${arrondissement}`);
      }
    }
  }
  
  // Add availability if mentioned (format nicely)
  if (activity.disponibiliteJours) {
    const days = activity.disponibiliteJours
      .split(/[,;]/)
      .map(d => d.trim())
      .filter(d => d.length > 0)
      .map(d => {
        // French day names
        const dayMap = {
          'lundi': 'lundi',
          'mardi': 'mardi',
          'mercredi': 'mercredi',
          'jeudi': 'jeudi',
          'vendredi': 'vendredi',
          'samedi': 'samedi',
          'dimanche': 'dimanche'
        };
        const lower = d.toLowerCase();
        return dayMap[lower] || d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
      });
    
    if (days.length > 0) {
      if (days.length === 1) {
        parts.push(`disponible le ${days[0]}`);
      } else {
        parts.push(`disponible ${days.join(', ')}`);
      }
    }
  }
  
  // Add price info if available
  if (activity.price_amount && activity.price_amount > 0) {
    const currency = activity.price_currency || 'EUR';
    const priceStr = currency === 'EUR' ? `${activity.price_amount}€` : `${activity.price_amount} ${currency}`;
    parts.push(`avec des tarifs à partir de ${priceStr}`);
  }
  
  // Join parts and create sentence
  let description = parts.join(' ');
  
  // Ensure it starts with capital letter and ends with period
  description = description.charAt(0).toUpperCase() + description.slice(1);
  if (!description.endsWith('.')) {
    description += '.';
  }
  
  return description;
}

