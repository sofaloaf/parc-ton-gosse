# ✅ Quick OAuth Fix - Use the Right Client ID

## 🎯 Use This One: "Parc Ton Gosse Admin Client"

**Type: Web application** ✅  
**Client ID: `313916247169-60ir...`**

## ❌ Don't Use: "Parc ton gosse admin app"

**Type: Desktop** ❌ (This is for desktop apps, not web browsers)

---

## 📝 Step-by-Step Fix

### Step 1: Click on "Parc Ton Gosse Admin Client"
- In Google Cloud Console, click on **"Parc Ton Gosse Admin Client"** (the Web application one)
- Click the **Edit** (pencil) icon

### Step 2: Add Authorized JavaScript Origins
Click **"+ ADD URI"** and add:
```
http://localhost:5173
https://victorious-gentleness-production.up.railway.app
```

### Step 3: Add Authorized Redirect URIs
Click **"+ ADD URI"** and add:
```
http://localhost:5173
https://victorious-gentleness-production.up.railway.app
```

### Step 4: Save
- Click **SAVE**
- Wait 1-2 minutes
- Clear browser cache
- Try logging in again

---

## 🔍 Verify Your Client ID Matches

Make sure your `.env` files use the **Web application** Client ID:

**In `client/.env`:**
```env
VITE_GOOGLE_CLIENT_ID=313916247169-60ir...
```

**In `server/.env`:**
```env
GOOGLE_CLIENT_ID=313916247169-60ir...
```

The Client ID should start with `313916247169-60ir...` (from "Parc Ton Gosse Admin Client"), NOT `313916247169-ekle...` (from the Desktop app).

---

## ✅ After Fixing

1. ✅ Origins added to "Parc Ton Gosse Admin Client"
2. ✅ Client ID matches in your `.env` files
3. ✅ Wait 1-2 minutes
4. ✅ Clear browser cache
5. ✅ Try logging in → Should work! 🎉

