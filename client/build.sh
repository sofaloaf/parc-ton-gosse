#!/bin/bash
set -e

echo "🚀 Starting build process..."

# Nixpacks should have already run npm install, but verify dependencies exist
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies (Nixpacks didn't install them)..."
  timeout 600 npm install --no-audit --no-fund --prefer-offline --legacy-peer-deps || {
    echo "❌ npm install timed out or failed"
    exit 1
  }
  echo "✅ Dependencies installed"
else
  echo "✅ Dependencies already installed by Nixpacks"
fi

# Set timeout for build (5 minutes max)
echo "🔨 Building application..."
timeout 300 npm run build || {
  echo "❌ Build timed out or failed"
  exit 1
}

echo "✅ Build completed successfully"

