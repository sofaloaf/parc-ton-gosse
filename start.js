#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = __dirname;
const serverDir = join(rootDir, 'server');
const clientDir = join(rootDir, 'client');

console.log('🚀 Starting Parc Ton Gosse Application...\n');

// Start server
console.log('Starting backend server...');
const server = spawn('npm', ['run', 'dev'], {
  cwd: serverDir,
  stdio: 'inherit',
  shell: true
});

// Wait a bit then start client
setTimeout(() => {
  console.log('\nStarting frontend client...');
  const client = spawn('npm', ['run', 'dev'], {
    cwd: clientDir,
    stdio: 'inherit',
    shell: true
  });

  // Open browser after client starts
  setTimeout(() => {
    const open = (process.platform === 'darwin' ? 'open' :
                  process.platform === 'win32' ? 'start' : 'xdg-open');
    spawn(open, ['http://localhost:5173'], { shell: true });
    console.log('\n✅ Application is running!');
    console.log('Backend: http://localhost:4000');
    console.log('Frontend: http://localhost:5173');
    console.log('\nPress Ctrl+C to stop both servers\n');
  }, 5000);
}, 2000);

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n\nStopping servers...');
  server.kill();
  process.exit();
});

