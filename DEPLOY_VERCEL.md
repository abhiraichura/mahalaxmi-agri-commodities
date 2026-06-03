# Mahalaxmi Agri Contracts - GitHub + Vercel + Firebase Deployment Guide

## ✅ FREE TIER COMPATIBLE - No Paid Plans Needed

Firebase Spark (Free) Plan Includes:
- Authentication: 50,000 users/month
- Firestore: 50,000 reads/day, 20,000 writes/day
- Hosting: 10GB/month bandwidth, 1GB storage
- All features you need: FREE

---

## Step 1: Create GitHub Repository (5 minutes)

1. Go to **github.com** and sign in (or create account)
2. Click **"+"** icon (top right) → **"New repository"**
3. Fill in:
   - Repository name: `mahalaxmi-contracts`
   - Description: `Contract management system for Mahalaxmi Agri Commodities`
   - Select **Private** (your business data)
   - Check **"Add a README file"**
4. Click **"Create repository"**

---

## Step 2: Upload Your Code to GitHub

### Method A: Web Upload (Easiest - No Git Knowledge Needed)

1. Extract the `mahalaxmi-contract-app-complete.zip` file on your computer
2. In your GitHub repo, click **"Add file"** → **"Upload files"**
3. Drag and drop ALL files from the extracted folder into the upload area
   - Include ALL folders: `src/`, `public/`, config files
4. In "Commit changes" box, type: `Initial commit - complete contract app`
5. Click **"Commit changes"**

### Method B: Git Command Line (If you know Git)

```bash
# Open terminal in the extracted folder
cd mahalaxmi-contract-app

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - complete contract app"

# Connect to GitHub (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/mahalaxmi-contracts.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 3: Set Up Firebase (Free Account)

### 3.1 Create Firebase Project

1. Go to **console.firebase.google.com**
2. Sign in with your **Gmail account**
3. Click **"Create a project"**
4. Project name: `mahalaxmi-contracts`
5. **Disable** Google Analytics (not needed, keeps it simpler)
6. Click **"Create project"**

### 3.2 Register Web App

1. In your Firebase project dashboard, click **"</>"** (Web icon)
2. App nickname: `mahalaxmi-web`
3. **Check** "Also set up Firebase Hosting" (optional, we use Vercel)
4. Click **"Register app"**
5. You will see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "mahalaxmi-contracts.firebaseapp.com",
  projectId: "mahalaxmi-contracts",
  appId: "1:123456789:web:abc123"
};
```

**COPY these values** — you need them for the next step.

### 3.3 Enable Authentication

1. Left sidebar → **Build** → **Authentication**
2. Click **"Get started"**
3. Sign-in method tab → Click **"Google"**
4. Toggle to **Enable**
5. Support email: your Gmail address
6. Click **"Save"**
7. Also enable **"Email/Password"** (for backup login)

### 3.4 Create Firestore Database

1. Left sidebar → **Build** → **Firestore Database**
2. Click **"Create database"**
3. Start in **production mode**
4. Location: **asia-south1** (Mumbai — closest to Gujarat)
5. Click **"Enable"**

### 3.5 Set Security Rules (CRITICAL)

1. In Firestore Database → **Rules** tab
2. Replace everything with this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users full access (for single-user business)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **"Publish"**

> **Note**: This allows any logged-in user to read/write. Since this is YOUR business app and you'll be the only user, this is fine. For multi-user later, we can restrict further.

---

## Step 4: Deploy to Vercel (5 minutes)

### 4.1 Connect GitHub to Vercel

1. Go to **vercel.com**
2. Click **"Sign Up"** → Choose **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub
4. Click **"Add New Project"**
5. Find and select `mahalaxmi-contracts` repository
6. Click **"Import"**

### 4.2 Configure Build Settings

Vercel auto-detects Vite, but verify these settings:

| Setting | Value |
|---------|-------|
| Framework Preset | **Vite** |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

### 4.3 Add Environment Variables (CRITICAL)

This is where you paste your Firebase config:

1. Expand **"Environment Variables"** section
2. Add these variables one by one:

| Name | Value (from Firebase config) |
|------|------------------------------|
| `VITE_FIREBASE_API_KEY` | Your apiKey value |
| `VITE_FIREBASE_AUTH_DOMAIN` | Your authDomain value |
| `VITE_FIREBASE_PROJECT_ID` | Your projectId value |
| `VITE_FIREBASE_APP_ID` | Your appId value |

Example:
```
VITE_FIREBASE_API_KEY = AIzaSyB123example456
VITE_FIREBASE_AUTH_DOMAIN = mahalaxmi-contracts.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = mahalaxmi-contracts
VITE_FIREBASE_APP_ID = 1:123456789:web:abc123def456
```

3. Click **"Deploy"**

Wait 2-3 minutes. Vercel builds and deploys your app.

### 4.4 Your App is Live!

- URL: `https://mahalaxmi-contracts.vercel.app` (or similar)
- Every time you push code to GitHub, Vercel auto-redeploys

---

## Step 5: Verify Everything Works

1. Open your Vercel URL
2. You should see the **Login screen**
3. Click **"Continue with Google"**
4. Sign in with your Gmail
5. You should see the **Dashboard**

### Test the Core Features:

1. **Settings** → Upload your Mahalaxmi logo (stores in Firestore, free)
2. **Party Directory** → Add a test buyer/seller
3. **Products** → Add "Coriander Seeds" with specifications
4. **New Contract** → Select parties, enter quantity/price
5. **Generate Contract** → PDF downloads instantly

---

## Step 6: Add Custom Domain (Optional)

If you have a domain from BigRock:

1. In Vercel dashboard → your project → **Settings** → **Domains**
2. Enter your domain: `contracts.yourdomain.com` or `yourdomain.com`
3. Vercel gives you DNS records
4. Log into BigRock cPanel → DNS Management
5. Add the CNAME/TXT records as instructed
6. Vercel auto-provisions SSL (free HTTPS)

---

## Step 7: Install as Mobile App (PWA)

### Android (Chrome):
1. Open your Vercel URL in Chrome
2. Tap **menu (3 dots)** → **"Add to Home screen"**
3. Tap **"Install"**
4. App appears on home screen like native app

### iPhone (Safari):
1. Open your Vercel URL in Safari
2. Tap **Share button** (square with arrow)
3. Scroll down → **"Add to Home Screen"**
4. Tap **"Add"**

### Desktop (Chrome/Edge):
1. Open your Vercel URL
2. Look for **install icon** in address bar (or menu → Install)
3. App opens as standalone window

---

## Troubleshooting

### Build Fails on Vercel

**Error**: "Command failed" or "Build failed"

**Solution**:
1. Check Environment Variables are added correctly
2. Verify variable names match exactly (case-sensitive)
3. Redeploy: Vercel dashboard → Deployments → Redeploy

### Firebase Auth Not Working

**Error**: "auth/invalid-api-key" or login button does nothing

**Solution**:
1. Double-check `VITE_FIREBASE_API_KEY` in Vercel env vars
2. In Firebase Console → Authentication → Sign-in method → Ensure Google is enabled
3. Add your Vercel domain to authorized domains:
   - Firebase Console → Authentication → Settings → Authorized domains
   - Add: `mahalaxmi-contracts.vercel.app`

### Firestore Permission Denied

**Error**: "Missing or insufficient permissions"

**Solution**:
1. Go to Firebase Console → Firestore Database → Rules
2. Ensure rules allow `request.auth != null`
3. Click "Publish"

### Logo Upload Not Working

**Error**: Logo doesn't save or show

**Solution**:
1. Logo must be under 500KB (compress at tinypng.com if needed)
2. Check browser console for errors
3. Ensure you're logged in (logo saves to your user ID)

---

## Updating Your App Later

When you want to make changes:

1. Edit files on your computer
2. Upload to GitHub (or git push)
3. Vercel **automatically redeploys** in ~1 minute
4. Refresh your app — changes are live

---

## Cost Breakdown (100% FREE)

| Service | Free Tier Limit | Your Expected Usage | Cost |
|---------|----------------|---------------------|------|
| Firebase Auth | 50,000 users/month | 1-5 users | FREE |
| Firestore | 50K reads, 20K writes/day | ~100/day | FREE |
| Firebase Hosting | 10GB/month | Not using | FREE |
| Vercel Hosting | 100GB bandwidth | < 1GB | FREE |
| Vercel Builds | 6,000 minutes/month | ~10 min | FREE |
| **TOTAL** | | | **₹0** |

---

## What You Get

✅ **Always online** — Vercel CDN serves your app globally  
✅ **Auto-deploy** — Push to GitHub = instant update  
✅ **Free SSL** — HTTPS automatically  
✅ **Mobile app** — Install on Android/iPhone as native app  
✅ **Offline support** — Works without internet after first load  
✅ **Real-time sync** — Data syncs across all devices  
✅ **Professional PDF** — One-page A4 contracts in 1 second  
✅ **GST verification** — Auto-fetch company details  
✅ **Zero maintenance** — No server to manage ever  

---

**Your App URL**: `https://mahalaxmi-contracts.vercel.app`

**Questions?** Check Firebase/Vercel documentation or contact support.
