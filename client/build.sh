#!/bin/bash
set -e

echo "🚀 Starting build process..."
echo "📂 Current directory: $(pwd)"
echo "📂 Listing files:"
ls -la

# Ensure we're in the client directory (if build.sh is in client/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "📂 Changed to script directory: $(pwd)"

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

# Clean previous build to ensure fresh build
echo "🧹 Cleaning previous build..."
rm -rf dist
rm -rf .vite
rm -rf node_modules/.vite
echo "✅ Cleaned dist and cache directories"

# Set timeout for build (5 minutes max)
echo "🔨 Building application..."
echo "📂 Building from: $(pwd)"
timeout 300 npm run build || {
  echo "❌ Build timed out or failed"
  exit 1
}

# Verify build output
echo "📂 Verifying build output..."
if [ -d "dist" ]; then
  echo "✅ dist directory exists"
  ls -la dist/
  if [ -f "dist/index.html" ]; then
    echo "✅ index.html exists"
    echo "📄 Checking JS file reference in index.html:"
    JS_FILE=$(grep -o 'index-[^"]*\.js' dist/index.html | head -1)
    if [ -n "$JS_FILE" ]; then
      echo "   Referenced JS file: $JS_FILE"
      if [ -f "dist/assets/$JS_FILE" ]; then
        echo "✅ Referenced JS file exists in dist/assets/"
      else
        echo "❌ Referenced JS file NOT FOUND in dist/assets/"
        echo "   Files in dist/assets/:"
        ls -la dist/assets/ || echo "   dist/assets/ directory not found"
        exit 1
      fi
    else
      echo "⚠️  No JS file reference found in index.html"
    fi
  else
    echo "❌ index.html not found in dist/"
    exit 1
  fi
else
  echo "❌ dist directory not found"
  exit 1
fi

echo "✅ Build completed successfully"

