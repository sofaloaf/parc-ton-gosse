# Which OAuth Client ID to Use?

## ✅ Use This One: "Parc Ton Gosse Admin Client"

**Type: Web application** ← This is the correct one!

## ❌ Don't Use: "Parc ton gosse admin app"

**Type: Desktop** ← This is for desktop apps, not web browsers

---

## Why?

Your React app runs in a **web browser**, so you need a **Web application** OAuth client, not a Desktop client.

## Next Steps

1. **Click on "Parc Ton Gosse Admin Client"** (the Web application one)
2. **Add these Authorized JavaScript origins:**
   ```
   http://localhost:5173
   https://victorious-gentleness-production.up.railway.app
   ```
3. **Add these Authorized redirect URIs:**
   ```
   http://localhost:5173
   https://victorious-gentleness-production.up.railway.app
   ```
4. **Save** and wait 1-2 minutes
5. **Try logging in again**

---

## How to Verify You're Using the Right Client ID

1. Check your `client/.env` file for `VITE_GOOGLE_CLIENT_ID`
2. It should match the Client ID of "Parc Ton Gosse Admin Client"
3. The Client ID starts with: `313916247169-60ir...`

If it doesn't match, update your `.env` file with the correct Client ID from "Parc Ton Gosse Admin Client".

