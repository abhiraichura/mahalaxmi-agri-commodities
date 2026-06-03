# Mahalaxmi Agri Contracts - Complete Deployment Guide

## FREE TIER - No Paid Plans Needed

Firebase Spark (Free) includes:
- Authentication: 50,000 users/month
- Firestore: 50,000 reads/day, 20,000 writes/day  
- Hosting: 10GB/month bandwidth (we use Vercel instead)
- All features: FREE

---

## Step 1: Create GitHub Repository

1. Go to github.com and sign in
2. Click "+" (top right) → "New repository"
3. Name: `mahalaxmi-contracts`
4. Select **Private**
5. Check "Add a README file"
6. Click "Create repository"

---

## Step 2: Upload Code to GitHub

### Method A: Web Upload (Easiest)

1. Extract the zip file on your computer
2. In your GitHub repo → "Add file" → "Upload files"
3. Drag ALL files from extracted folder (src/, public/, all config files)
4. Commit message: `Initial commit`
5. Click "Commit changes"

### Method B: Git Command Line

```bash
cd mahalaxmi-contract-app-v2
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/mahalaxmi-contracts.git
git branch -M main
git push -u origin main
```

---

## Step 3: Set Up Firebase (Free Account)

### 3.1 Create Firebase Project

1. Go to console.firebase.google.com
2. Sign in with your Gmail
3. Click "Create a project" → Name: `mahalaxmi-contracts`
4. Disable Google Analytics
5. Click "Create project"

### 3.2 Register Web App

1. In Firebase dashboard, click "</>" (Web icon)
2. App nickname: `mahalaxmi-web`
3. Click "Register app"
4. Copy the config values (apiKey, authDomain, projectId, appId)

### 3.3 Enable Authentication

1. Left sidebar → Build → Authentication
2. Click "Get started"
3. Sign-in method tab → Click "Email/Password"
4. Toggle to **Enable**
5. Click "Save"

### 3.4 Add Yourself as User

1. Authentication → Users tab
2. Click "Add user"
3. Enter your email and password
4. Click "Add user"

### 3.5 Create Firestore Database

1. Left sidebar → Build → Firestore Database
2. Click "Create database"
3. Start in **production mode**
4. Location: asia-south1 (Mumbai)
5. Click "Enable"

### 3.6 Set Security Rules

1. Firestore Database → Rules tab
2. Replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click "Publish"

---

## Step 4: Deploy to Vercel

### 4.1 Connect GitHub to Vercel

1. Go to vercel.com
2. Click "Sign Up" → "Continue with GitHub"
3. Authorize Vercel
4. Click "Add New Project"
5. Select `mahalaxmi-contracts` repository → "Import"

### 4.2 Configure Build Settings

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | npm run build |
| Output Directory | dist |
| Install Command | npm install |

### 4.3 Add Environment Variables

Expand "Environment Variables" and add:

| Name | Value (from Firebase config) |
|------|------------------------------|
| VITE_FIREBASE_API_KEY | Your apiKey |
| VITE_FIREBASE_AUTH_DOMAIN | Your authDomain |
| VITE_FIREBASE_PROJECT_ID | Your projectId |
| VITE_FIREBASE_APP_ID | Your appId |

Click "Deploy"

Wait 2-3 minutes. Your app is live!

---

## Step 5: Add Vercel Domain to Firebase

1. In Firebase Console → Authentication → Settings → Authorized domains
2. Click "Add domain"
3. Enter: your-vercel-url.vercel.app
4. Click "Add"

---

## How to Use the App

### First Time Setup

1. Open your Vercel URL
2. Log in with the email/password you created in Firebase
3. Go to Settings
4. Upload your company logo
5. Upload your digital signature (scanned signature image)
6. Fill company details
7. Save

### Daily Workflow

1. **Add Parties** (one-time per party):
   - Go to Parties → Add Party
   - Enter GSTIN → Click Verify (auto-fills details)
   - Save

2. **Add Products** (one-time per product):
   - Go to Products → Add Product
   - Enter name and specifications
   - Save

3. **Create Contract**:
   - Click "New Contract" or Dashboard shortcut
   - Select Seller (search by name, auto-fills)
   - Select Buyer (search by name, auto-fills)
   - Select Product (specs auto-load)
   - Enter quantity and price
   - Click "Save Contract"
   - You'll be taken to Contract View page

4. **Download Contract Copies**:
   - On Contract View page, click:
     - "Download Broker Copy"
     - "Download Buyer Copy" 
     - "Download Seller Copy"
   - Each PDF is properly formatted for A4

5. **View Brokerage Bills**:
   - Go to Brokerage
   - Select month/year
   - View bill breakdown per party
   - Click "View" to preview
   - Click "Download PDF" to download
   - Click "Share" to send via WhatsApp

6. **Delete Anything**:
   - Contracts: Dashboard → click trash icon
   - Parties: Parties page → hover card → click trash
   - Products: Products page → click trash

---

## Features Summary

✅ Save contract first, then download any copy
✅ View contracts before downloading
✅ Edit contracts anytime
✅ Delete contracts, parties, products
✅ View brokerage bills with breakdown
✅ Download brokerage bills as PDF
✅ Share via WhatsApp
✅ Upload logo (shows on contract)
✅ Upload digital signature (shows on contract footer)
✅ GST verification (auto-fills party details)
✅ All data stored in Firebase (permanent)
✅ Works offline after first load
✅ Install as mobile app (PWA)
✅ Responsive on all devices

---

## Cost: FREE

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| GitHub | Unlimited repos | 1 repo | FREE |
| Vercel | 100GB bandwidth | < 1GB | FREE |
| Firebase Auth | 50K users/month | 1 user | FREE |
| Firestore | 50K reads/day | ~100/day | FREE |
| **TOTAL** | | | **₹0** |

---

## Support

For issues, check browser console (F12) for error messages.

Mahalaxmi Agri Commodities
Rajkot, Gujarat
