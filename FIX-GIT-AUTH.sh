#!/bin/bash

# Quick script to fix Git authentication for GitHub

echo "🔧 Fixing Git Authentication for GitHub"
echo ""

# Remove existing remote
echo "1. Removing existing remote origin..."
git remote remove origin 2>/dev/null || echo "   (No existing remote to remove)"
echo ""

# Check if repository exists
echo "2. Checking Git status..."
git status --short
echo ""

echo "📋 NEXT STEPS:"
echo ""
echo "Option 1: Use Personal Access Token (Recommended)"
echo "  1. Go to: https://github.com/settings/tokens"
echo "  2. Click 'Generate new token (classic)'"
echo "  3. Name: 'parc-ton-gosse-deployment'"
echo "  4. Check 'repo' scope"
echo "  5. Generate and copy token"
echo "  6. Run: git remote add origin https://ghp_YOUR_TOKEN@github.com/sofaloaf/parc-ton-gosse.git"
echo "  7. Run: git push -u origin main"
echo ""
echo "Option 2: Use GitHub CLI (Easiest)"
echo "  1. Install: brew install gh"
echo "  2. Run: gh auth login"
echo "  3. Run: git remote add origin https://github.com/sofaloaf/parc-ton-gosse.git"
echo "  4. Run: git push -u origin main"
echo ""
echo "Option 3: Use SSH (Most Secure)"
echo "  1. Generate key: ssh-keygen -t ed25519 -C 'your_email@example.com'"
echo "  2. Add key to GitHub: https://github.com/settings/keys"
echo "  3. Run: git remote add origin git@github.com:sofaloaf/parc-ton-gosse.git"
echo "  4. Run: git push -u origin main"
echo ""
echo "📄 For detailed instructions, see: GIT-AUTHENTICATION-FIX.md"

