# Step-by-Step: Fix Base64 Private Key

## Prerequisites

- Your service account JSON file downloaded from Google Cloud Console
- Terminal (on Mac, this is the Terminal app)

---

## Step 1: Open Terminal

1. **On Mac:** Press `Cmd + Space`, type "Terminal", press Enter
2. **Or:** Go to Applications → Utilities → Terminal

---

## Step 2: Navigate to Where Your JSON File Is

**In Terminal, type:**

```bash
cd ~/Downloads
```

*(This assumes your JSON file is in Downloads. If it's elsewhere, use that path instead)*

**To check what files are there, type:**
```bash
ls *.json
```

*(This shows all JSON files in that folder)*

---

## Step 3: Check if You Have `jq` Installed

**In Terminal, type:**

```bash
jq --version
```

**If you see a version number** (like `jq-1.6`), skip to Step 5.

**If you see "command not found"**, continue to Step 4.

---

## Step 4: Install `jq` (If Needed)

**In Terminal, type:**

```bash
brew install jq
```

*(This may take a minute. If you get an error about brew not found, install Homebrew first: https://brew.sh)*

**Wait for it to finish**, then verify:
```bash
jq --version
```

---

## Step 5: Find Your JSON File Name

**In Terminal, type:**

```bash
ls *.json
```

**Note the exact filename** (e.g., `my-project-123456-abc123.json`)

---

## Step 6: Create the Base64 Key

**In Terminal, type this command** (replace `your-file.json` with your actual filename):

```bash
cat your-file.json | jq -r '.private_key' | base64
```

**Example:**
```bash
cat my-project-123456-abc123.json | jq -r '.private_key' | base64
```

**Press Enter**

**You'll see a LONG string of letters, numbers, `+`, `/`, and `=` characters** - this is your base64 key!

**Example output:**
```
LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2QUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktZZ2dnU2lBZ0VBQW9JQkFRRElFZnQyRVc1ZGtwNm0KV3o4NCtqbUhKNXpoclljWktwNFZPejk0Vk5qV0g1MlpuZDZhSGQ4WkNM...
```

---

## Step 7: Copy the Base64 String

1. **In Terminal**, the base64 string will be displayed (it's one long line)
2. **Click and drag** to select the entire string
3. **Press `Cmd + C`** to copy it
4. **Make sure you got the ENTIRE string** (it's very long, scroll if needed)

---

## Step 8: Verify the Base64 (Optional but Recommended)

**In Terminal, paste this command** (replace `<paste-your-base64-here>` with the base64 you just copied):

```bash
echo "<paste-your-base64-here>" | base64 -d | head -c 50
```

**Example:**
```bash
echo "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2QUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktZZ2dnU2lBZ0VBQW9JQkFRRElFZnQyRVc1ZGtwNm0KV3o4NCtqbUhKNXpoclljWktwNFZPejk0Vk5qV0g1MlpuZDZhSGQ4WkNM..." | base64 -d | head -c 50
```

**Press Enter**

**Should show:**
```
-----BEGIN PRIVATE KEY-----
```

**If it shows `"-----BEGIN` (with a quote), the base64 is still wrong - go back to Step 6.**

---

## Step 9: Update Railway

1. **Go to:** https://railway.app
2. **Click** your project
3. **Click** your Backend Service
4. **Click** "Variables" tab
5. **Find** `GS_PRIVATE_KEY_BASE64`
6. **Click** the value field
7. **Delete** the old value
8. **Paste** your new base64 string (from Step 7)
9. **Make sure there are NO quotes** around it
10. **Click "Save"** or press Enter

---

## Step 10: Wait for Redeploy

1. **Railway will automatically redeploy** (usually takes 1-2 minutes)
2. **You can watch the deployment:**
   - Railway → Backend Service → Deployments
   - Click the latest deployment
   - Watch the logs

---

## Step 11: Check the Logs

**In Railway:**
1. Go to Backend Service → Deployments → Latest → View Logs
2. **Look for:**
   - ✅ `✅ Data store initialized: sheets`
   - ✅ NO `ERR_OSSL_UNSUPPORTED` errors
   - ✅ NO "Sheet may not exist: error:1E08010C" warnings

---

## Step 12: Test the Endpoint

**In Terminal, type:**

```bash
curl -m 10 https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```

**Press Enter**

**Should return:** A JSON array (even if empty `[]`)

**If it times out or shows errors**, check the logs again.

---

## Troubleshooting

### Problem: "jq: command not found" after installing

**Solution:**
```bash
# Close and reopen Terminal, then try again
jq --version
```

### Problem: "brew: command not found"

**Solution:**
1. Install Homebrew first: https://brew.sh
2. Copy the command from that page
3. Paste in Terminal and run it
4. Then try `brew install jq` again

### Problem: "No such file or directory" when running cat command

**Solution:**
1. Find where your JSON file actually is:
   ```bash
   find ~ -name "*.json" -type f 2>/dev/null | head -5
   ```
2. Navigate to that folder:
   ```bash
   cd /path/to/folder
   ```
3. Then run the cat command again

### Problem: Base64 verification shows quote at start

**Solution:**
- Make sure you're using `jq -r` (the `-r` flag is important!)
- The command should be: `cat file.json | jq -r '.private_key' | base64`
- NOT: `cat file.json | jq '.private_key' | base64` (missing `-r`)

---

## Summary of Commands

**All in one place:**

```bash
# 1. Navigate to Downloads (or wherever your JSON file is)
cd ~/Downloads

# 2. Check if jq is installed
jq --version

# 3. If not installed, install it:
brew install jq

# 4. List JSON files to find yours
ls *.json

# 5. Create base64 key (replace filename with yours)
cat your-file.json | jq -r '.private_key' | base64

# 6. Copy the output and paste into Railway

# 7. Verify (optional - replace with your base64)
echo "<your-base64>" | base64 -d | head -c 50

# 8. Test endpoint
curl -m 10 https://parc-ton-gosse-backend-production.up.railway.app/api/activities
```

---

**Follow these steps exactly and your base64 key will be correct!**

---

**Last Updated:** $(date)

