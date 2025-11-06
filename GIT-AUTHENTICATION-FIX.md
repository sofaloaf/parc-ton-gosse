# 🔧 Fix Git Authentication Issue

## Problem
GitHub no longer accepts passwords for Git operations. You need to use a **Personal Access Token** instead.

## Solution: Use Personal Access Token

### STEP 1: Remove Existing Remote
```bash
cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"
git remote remove origin
```

### STEP 2: Create GitHub Personal Access Token

1. **Go to GitHub:**
   - Visit: https://github.com/settings/tokens
   - Or: GitHub → Your Profile (top right) → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Generate New Token:**
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a name: `parc-ton-gosse-deployment`
   - Set expiration: `90 days` (or `No expiration` if you prefer)
   - Select scopes (check these boxes):
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (if you plan to use GitHub Actions)

3. **Generate and Copy Token:**
   - Click "Generate token" at the bottom
   - **IMPORTANT:** Copy the token immediately (you won't see it again!)
   - It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### STEP 3: Add Remote with Token

**Option A: Use Token in URL (Easiest)**
```bash
git remote add origin https://ghp_YOUR_TOKEN_HERE@github.com/sofaloaf/parc-ton-gosse.git
```

Replace `YOUR_TOKEN_HERE` with your actual token.

**Option B: Use GitHub CLI (Recommended - More Secure)**
```bash
# Install GitHub CLI (if not installed)
brew install gh

# Login to GitHub
gh auth login

# Follow prompts:
# - GitHub.com
# - HTTPS
# - Authenticate Git with your GitHub credentials? Yes
# - Login with a web browser
```

Then:
```bash
git remote add origin https://github.com/sofaloaf/parc-ton-gosse.git
```

### STEP 4: Push Your Code

```bash
# Check if you have commits
git log --oneline

# If no commits, make one:
git add .
git commit -m "Initial commit - ready for deployment"

# Push to GitHub
git branch -M main
git push -u origin main
```

When prompted for password, use your **Personal Access Token** (not your GitHub password).

---

## Alternative: Use SSH (More Secure)

### STEP 1: Generate SSH Key
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter to accept default location
# Press Enter twice for no passphrase (or set one if you prefer)
```

### STEP 2: Add SSH Key to GitHub
```bash
# Copy your public key
cat ~/.ssh/id_ed25519.pub
# Copy the entire output
```

1. Go to: https://github.com/settings/keys
2. Click "New SSH key"
3. Title: `My Mac - Parc Ton Gosse`
4. Paste your public key
5. Click "Add SSH key"

### STEP 3: Update Remote to Use SSH
```bash
git remote remove origin
git remote add origin git@github.com:sofaloaf/parc-ton-gosse.git
git push -u origin main
```

---

## Quick Fix (If Repository Already Exists on GitHub)

If your repository already exists on GitHub:

1. **Remove local remote:**
   ```bash
   git remote remove origin
   ```

2. **Add remote with your username:**
   ```bash
   git remote add origin https://github.com/sofaloaf/parc-ton-gosse.git
   ```

3. **Push using token:**
   ```bash
   git push -u origin main
   ```
   
   When asked for password, paste your **Personal Access Token**.

---

## Store Credentials (Avoid Entering Token Every Time)

### macOS Keychain (Recommended)
```bash
# Store credentials in macOS keychain
git config --global credential.helper osxkeychain

# Now when you push, macOS will remember your token
git push -u origin main
```

### Or Store in Git Config (Less Secure)
```bash
# Store token in Git config (not recommended for shared computers)
git config --global credential.helper store
```

---

## Verify It Works

```bash
# Check remote is set correctly
git remote -v

# Should show:
# origin  https://github.com/sofaloaf/parc-ton-gosse.git (fetch)
# origin  https://github.com/sofaloaf/parc-ton-gosse.git (push)

# Test connection
git fetch origin
```

---

## Troubleshooting

### "Repository not found"
- Make sure repository exists on GitHub
- Check repository name is correct: `parc-ton-gosse`
- Verify you have access to the repository

### "Authentication failed"
- Make sure you're using a Personal Access Token (not password)
- Check token hasn't expired
- Verify token has `repo` scope

### "Permission denied"
- Check your GitHub username is correct: `sofaloaf`
- Verify repository exists and you have access
- Try creating a new token

---

## Next Steps After Fixing

Once you can push to GitHub:
1. ✅ Continue with Step 2 in `DEPLOYMENT-STEPS.md`
2. ✅ Deploy backend on Railway
3. ✅ Deploy frontend on Railway
4. ✅ Get your website URL!

---

**Need help?** The most common issue is using a password instead of a token. Make sure you create and use a Personal Access Token!

