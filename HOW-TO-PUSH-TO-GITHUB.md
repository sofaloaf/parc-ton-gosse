# 📤 How to Push Config Files to GitHub (for Railway)

## What "Push to GitHub" Means

When you "push" files, you're sending your local changes to GitHub. Railway watches your GitHub repository and automatically redeploys when you push changes.

---

## Step-by-Step: Push Config Files

### Step 1: Open Terminal

On Mac:
- Press `Cmd + Space` (Spotlight)
- Type "Terminal"
- Press Enter

Or:
- Open Finder
- Go to Applications → Utilities → Terminal

---

### Step 2: Navigate to Your Project

In Terminal, type:
```bash
cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"
```

Press Enter.

---

### Step 3: Check What Files Changed

Type:
```bash
git status
```

You should see `railway.json` and `nixpacks.toml` listed.

---

### Step 4: Add Files to Git

Type:
```bash
git add railway.json nixpacks.toml
```

Press Enter. (No output is normal)

---

### Step 5: Commit the Changes

Type:
```bash
git commit -m "Fix Railway config - backend only"
```

Press Enter. You should see a message like "2 files changed".

---

### Step 6: Push to GitHub

Type:
```bash
git push
```

Press Enter. You might be asked for your GitHub username and password/token.

**If asked for password:**
- Use your **Personal Access Token** (not your GitHub password)
- The token starts with `ghp_`

---

### Step 7: Wait for Railway to Redeploy

1. Go back to Railway dashboard
2. Go to your backend service
3. Click "Deployments" tab
4. You should see a new deployment starting automatically
5. Wait 1-2 minutes for it to complete

---

## ✅ Complete Commands (Copy & Paste)

Copy and paste these commands one by one into Terminal:

```bash
cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"
git add railway.json nixpacks.toml
git commit -m "Fix Railway config - backend only"
git push
```

---

## 🆘 Troubleshooting

### "fatal: not a git repository"
- Make sure you're in the right folder
- Run: `cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"`

### "Authentication failed"
- You need to use your Personal Access Token (not password)
- If you don't have one, see `GIT-AUTHENTICATION-FIX.md`

### "Nothing to commit"
- The files might already be committed
- Run: `git status` to check

### "Permission denied"
- Check your GitHub token is still valid
- You might need to create a new token

---

## 🎯 What Happens After Pushing

1. ✅ Files are uploaded to GitHub
2. ✅ Railway detects the changes
3. ✅ Railway automatically starts a new deployment
4. ✅ Railway uses the new `railway.json` configuration
5. ✅ Backend should start correctly (if JWT_SECRET is set)

---

## 💡 Alternative: Use GitHub Website

If Terminal is too complicated, you can also:

1. **Go to GitHub website:**
   - https://github.com/sofaloaf/parc-ton-gosse

2. **Click "Add file" → "Upload files"**

3. **Drag and drop:**
   - `railway.json`
   - `nixpacks.toml`

4. **Click "Commit changes"**

5. **Railway will automatically redeploy!**

---

## 📋 Quick Checklist

- [ ] Open Terminal
- [ ] Navigate to project folder
- [ ] Run `git add railway.json nixpacks.toml`
- [ ] Run `git commit -m "Fix Railway config"`
- [ ] Run `git push`
- [ ] Check Railway Deployments tab
- [ ] Wait for new deployment

---

**Need help?** Just copy and paste the commands from "Complete Commands" section above!

