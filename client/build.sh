#!/bin/bash
set -e

echo "🚀 Starting build process..."

# Set timeout for npm install (10 minutes max)
echo "📦 Installing dependencies..."
timeout 600 npm install --no-audit --no-fund --prefer-offline --legacy-peer-deps || {
  echo "❌ npm install timed out or failed"
  exit 1
}

echo "✅ Dependencies installed"

# Set timeout for build (5 minutes max)
echo "🔨 Building application..."
timeout 300 npm run build || {
  echo "❌ Build timed out or failed"
  exit 1
}

echo "✅ Build completed successfully"

