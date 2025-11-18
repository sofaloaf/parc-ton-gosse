// Runtime API URL override - loaded before React
// This ensures the correct backend URL is used even if VITE_API_URL wasn't set at build time
(function() {
  'use strict';
  
  // Set API URL before React loads
  window.__PTG_API_URL__ = 'https://parc-ton-gosse-backend-production.up.railway.app/api';
  console.log('🔧 Runtime API URL override set:', window.__PTG_API_URL__);
})();

