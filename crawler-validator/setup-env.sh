#!/bin/bash
# Helper script to set up .env file for crawler-validator
# Copies credentials from server/.env or prompts for Railway credentials

echo "🔧 Setting up .env file for crawler-validator..."

# Check if server/.env exists
if [ -f "../server/.env" ]; then
  echo "📋 Found server/.env, copying relevant variables..."
  
  # Extract variables from server/.env
  GS_SERVICE_ACCOUNT=$(grep "^GS_SERVICE_ACCOUNT=" ../server/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  GS_PRIVATE_KEY_BASE64=$(grep "^GS_PRIVATE_KEY_BASE64=" ../server/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  GS_SANDBOX_SHEET_ID=$(grep "^GS_SANDBOX_SHEET_ID=" ../server/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  
  if [ -n "$GS_SERVICE_ACCOUNT" ] && [ -n "$GS_PRIVATE_KEY_BASE64" ]; then
    cat > .env << EOF
# Google Sheets Configuration
# Copied from server/.env

GS_SERVICE_ACCOUNT=$GS_SERVICE_ACCOUNT
GS_PRIVATE_KEY_BASE64=$GS_PRIVATE_KEY_BASE64
GS_SANDBOX_SHEET_ID=${GS_SANDBOX_SHEET_ID:-1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A}

# Source and target tabs
SOURCE_TAB=Parctongosse_exported_02-21-2024csv
TARGET_TAB=Activities Cleaned

# Debug mode
DEBUG=false
EOF
    echo "✅ .env file created from server/.env"
    exit 0
  fi
fi

echo "⚠️  Could not find credentials in server/.env"
echo ""
echo "Please create .env file manually with:"
echo ""
echo "GS_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com"
echo "GS_PRIVATE_KEY_BASE64=your-base64-encoded-private-key"
echo "GS_SANDBOX_SHEET_ID=1CLgw4ut7WI2nWxGP2xDhBer1ejjwbqXr4OTspJidI1A"
echo ""
echo "Or get these from Railway backend environment variables"

