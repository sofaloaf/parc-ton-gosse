/**
 * Activity Crawler
 * Crawls and collects activity data from various sources
 */

/**
 * Crawl activities from configured sources
 * @returns {Promise<Array>} Array of raw activity data
 */
export async function crawlActivities() {
  console.log('🕷️  Crawler: Starting...');
  
  // TODO: Implement crawler logic
  // This is a placeholder structure
  
  const activities = [];
  
  // Example structure for activities:
  // {
  //   title: 'Activity Name',
  //   description: 'Description',
  //   categories: ['sports', 'music'],
  //   ageMin: 5,
  //   ageMax: 12,
  //   price: { amount: 100, currency: 'EUR' },
  //   addresses: ['123 Main St, Paris'],
  //   websiteLink: 'https://...',
  //   registrationLink: 'https://...',
  //   source: 'website-url',
  //   rawData: { ... } // Original crawled data
  // }
  
  console.log('🕷️  Crawler: No sources configured yet');
  console.log('   Ready for implementation');
  
  return activities;
}

/**
 * Crawl from a specific URL
 * @param {string} url - URL to crawl
 * @returns {Promise<Object>} Crawled activity data
 */
export async function crawlFromUrl(url) {
  // TODO: Implement URL crawling
  throw new Error('Not implemented yet');
}

