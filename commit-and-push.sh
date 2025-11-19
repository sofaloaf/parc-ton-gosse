#!/bin/bash

# Fix CSRF token mismatch for Google OAuth login
# This script commits and pushes changes to trigger Railway redeployment

cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"

echo "📦 Staging changes..."

# Stage the critical CSRF fix files
git add server/middleware/csrf.js
git add client/src/pages/AdminPanel.jsx

# Stage other important changes (excluding node_modules)
git add server/index.js
git add server/routes/auth.js
git add server/routes/users.js
git add server/package.json
git add client/src/App.jsx
git add client/src/pages/Profile.jsx
git add client/src/shared/api.js
git add client/package.json

# Stage new files
git add client/src/components/GoogleSignIn.jsx
git add client/src/components/ReferralCodeDisplay.jsx
git add client/src/pages/ForgotPassword.jsx
git add client/src/pages/Onboarding.jsx
git add client/src/pages/ResetPassword.jsx
git add client/src/pages/VerifyEmail.jsx
git add client/src/utils/
git add server/routes/crawler.js
git add server/routes/referrals.js
git add server/services/notifications/templates.js
git add server/services/notifications/index.js
git add server/services/datastore/memory.js
git add server/services/datastore/sheets-enhanced.js
git add run-crawler.js

# Stage documentation files
git add *.md

echo "✅ Files staged"
echo ""
echo "📝 Committing changes..."

git commit -m "Fix CSRF token mismatch for Google OAuth admin login

- Updated CSRF middleware to properly detect OAuth endpoints
- OAuth endpoints now bypass CSRF checks (authenticated by Google token)
- Fixed JSX structure in AdminPanel component
- Improved OAuth endpoint detection using both req.path and req.originalUrl"

echo ""
echo "🚀 Pushing to repository..."

git push

echo ""
echo "✅ Done! Railway should automatically redeploy."
echo "   Check your Railway dashboard for deployment status."

