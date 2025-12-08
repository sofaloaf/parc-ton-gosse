/**
 * Simple Express server to serve static files with correct MIME types
 * Used in production on Railway
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const distPath = join(__dirname, 'dist');

// Log available files for debugging
console.log(`📂 Dist directory: ${distPath}`);
if (existsSync(distPath)) {
  console.log(`✅ Dist directory exists`);
  try {
    const files = readdirSync(distPath);
    console.log(`📄 Files in dist: ${files.join(', ')}`);
    if (existsSync(join(distPath, 'assets'))) {
      const assets = readdirSync(join(distPath, 'assets'));
      console.log(`📦 Assets: ${assets.slice(0, 5).join(', ')}${assets.length > 5 ? '...' : ''}`);
    }
  } catch (e) {
    console.warn(`⚠️  Could not list dist files: ${e.message}`);
  }
} else {
  console.error(`❌ Dist directory does not exist!`);
}

// Serve static files from dist directory with explicit MIME types
app.use(express.static(distPath, {
  setHeaders: (res, path) => {
    // Set correct MIME types
    if (path.endsWith('.js') || path.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    } else if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  },
  // Don't fall through to SPA route if file doesn't exist
  fallthrough: false
}));

// SPA fallback - serve index.html for routes that don't match static files
// This will only be reached if express.static didn't find a file
app.get('*', (req, res, next) => {
  // Skip if this is a request for a static asset - return 404 with helpful message
  if (req.path.startsWith('/assets/') || req.path.match(/\.(js|css|json|ico|png|jpg|svg|woff|woff2|ttf|eot)$/)) {
    console.error(`❌ Static file not found: ${req.path}`);
    console.error(`   This usually means the build is out of sync. Check that index.html references the correct files.`);
    return res.status(404).json({ 
      error: 'File not found',
      path: req.path,
      message: 'Static asset not found. The build may be out of sync.'
    });
  }
  // Otherwise serve index.html for SPA routing
  res.sendFile(join(distPath, 'index.html'), (err) => {
    if (err) {
      console.error(`❌ Error serving index.html: ${err.message}`);
      res.status(500).send('Internal server error');
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`✅ Serving static files from: ${distPath}`);
});

