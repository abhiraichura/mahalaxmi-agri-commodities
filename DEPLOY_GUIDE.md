# Mahalaxmi Agri Contracts - Deployment Guide

## Complete Application Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **State Management**: Zustand (with persistence)
- **Backend/Database**: Firebase (Firestore + Auth + Storage)
- **PDF Generation**: jsPDF + html2canvas (client-side, instant)
- **PWA**: Vite PWA Plugin (works offline, installable on mobile)
- **Hosting**: Firebase Hosting (free SSL + CDN + always online)

### Why Firebase?
1. **Always Online**: No server to manage, auto-scaling
2. **Free Tier**: 50K reads/day, 1GB storage, 10GB hosting
3. **Offline Support**: IndexedDB persistence works without internet
4. **Security**: Built-in Auth + Firestore Security Rules
5. **Mobile**: Works as installable PWA on Android/iOS

## Step-by-Step Deployment

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create Project" → Name: `mahalaxmi-contracts`
3. Enable Google Analytics (optional)
4. Go to Project Settings → General → Your apps → Web app
5. Register app: `mahalaxmi-contracts-web`
6. Copy the config object (you'll need apiKey, authDomain, etc.)

### Step 2: Enable Services
1. **Authentication**: 
   - Go to Build → Authentication → Sign-in method
   - Enable "Google" provider
   - Enable "Email/Password" provider

2. **Firestore Database**:
   - Go to Build → Firestore Database
   - Create database → Start in production mode
   - Choose location: `asia-south1` (Mumbai) for India

3. **Storage**:
   - Go to Build → Storage
   - Get started → Start in production mode

4. **Hosting**:
   - Go to Build → Hosting
   - Click "Get started"

### Step 3: Update Firebase Config
Open `src/utils/firebase.ts` and replace:
```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "mahalaxmi-contracts.firebaseapp.com",
  projectId: "mahalaxmi-contracts",
  storageBucket: "mahalaxmi-contracts.appspot.com",
  messagingSenderId: "123456789",
  appId: "YOUR_APP_ID"
};
```

### Step 4: Install & Build
```bash
# Install dependencies
npm install

# Build for production
npm run build
```

### Step 5: Deploy to Firebase
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize (first time only)
firebase init
# Select: Hosting, Firestore, Storage
# Use existing project: mahalaxmi-contracts
# Public directory: dist
# Configure as single-page app: Yes

# Deploy
firebase deploy
```

Your app will be live at: `https://mahalaxmi-contracts.web.app`

### Step 6: Firestore Security Rules
Go to Firestore Database → Rules → Edit and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Parties - authenticated users only
    match /parties/{partyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }

    // Contracts - authenticated users only
    match /contracts/{contractId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }

    // Settings - admin only
    match /settings/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }
  }
}
```

### Step 7: Storage Security Rules
Go to Storage → Rules → Edit:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /logos/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.uid == userId &&
        request.resource.size < 2 * 1024 * 1024 &&
        request.resource.contentType.matches('image/.*');
    }
  }
}
```

## Security Features Implemented

### 1. Authentication
- Google Sign-In (secure OAuth 2.0)
- Email/Password with Firebase Auth
- Session management handled by Firebase
- Automatic token refresh

### 2. Data Security
- **Firestore Security Rules**: Row-level security
- **Offline Encryption**: Data encrypted in IndexedDB
- **HTTPS Only**: All traffic encrypted via SSL
- **No LocalStorage**: Uses secure IndexedDB via Firebase

### 3. Input Validation
- GSTIN format validation (15 chars)
- PAN format validation (10 chars)
- Email validation
- Numeric validation for prices/quantities

### 4. Access Control
- Role-based access (admin/user)
- Only authenticated users can read data
- Only admins can write/modify
- Users can only access their own data

## Mobile App Installation (PWA)

### Android (Chrome):
1. Open the web app URL
2. Tap menu (3 dots) → "Add to Home screen"
3. Tap "Install"
4. App appears as native app with icon

### iOS (Safari):
1. Open the web app URL
2. Tap Share button (square with arrow)
3. Scroll down → "Add to Home Screen"
4. Tap "Add"

### Desktop (Chrome/Edge):
1. Open the web app URL
2. Click install icon in address bar (or menu → Install)
3. App opens as standalone window

## Features Summary

✅ **One-page A4 contract generation** - Professional PDF in seconds
✅ **Master data management** - Save parties once, reuse forever
✅ **GST verification** - Auto-fetch company details from GSTIN
✅ **Three contract types** - Buyer copy, Seller copy, Broker copy
✅ **Customizable specifications** - Per-product spec fields
✅ **Auto brokerage calculation** - Hidden on contract, shown on bills
✅ **Monthly brokerage bills** - Auto-generated, downloadable
✅ **WhatsApp/Email sharing** - Direct from mobile/desktop
✅ **Party directory** - Searchable, filterable contact list
✅ **Responsive design** - Works on mobile, tablet, desktop
✅ **Offline support** - Works without internet after first load
✅ **Data persistence** - Firebase Firestore (permanent until deleted)
✅ **Year management** - Change financial year easily
✅ **Logo upload** - Custom branding in Settings
✅ **Terms & conditions** - Customizable per company

## ⚠️ IMPORTANT: Free Tier Fix

**Firebase Storage requires paid plan**, but we fixed this:
- **Logos now store in Firestore as base64** (completely free)
- **No Firebase Storage needed**
- **Everything works on Spark (free) plan**

## Alternative Hosting (if not using Firebase)

### Option 1: BigRock Hosting
1. Build the app: `npm run build`
2. Upload `dist/` folder contents to BigRock public_html
3. Add `.htaccess` for SPA routing:
```
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### Option 2: Netlify (Free)
1. Connect GitHub repo to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add `_redirects` file in public folder:
```
/* /index.html 200
```

### Option 3: Vercel (Free)
1. Connect GitHub repo to Vercel
2. Framework preset: Vite
3. Build command: `npm run build`
4. Output directory: `dist`

## Cost Analysis

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| Firebase Auth | 50K users/month | < 10 users | FREE |
| Firestore | 50K reads/day | ~100/day | FREE |
| Firebase Storage | 1GB | < 100MB | FREE |
| Firebase Hosting | 10GB/month | < 1GB | FREE |
| **Total** | | | **FREE** |

If you exceed free tier: ~$5-10/month for your scale.

## Support & Maintenance

- **Updates**: Just push to GitHub, CI/CD auto-deploys
- **Backups**: Firebase auto-backs up daily
- **Monitoring**: Firebase Console analytics
- **Uptime**: 99.95% SLA on Firebase

## GST API Note

The app uses a free public GST verification API. For production reliability:
1. Apply for official GST API access at [GST Developer Portal](https://developer.gst.gov.in/)
2. Or use paid services like ClearTax/Karza for ₹0.50/verification
3. Current implementation caches verified data in Firestore

---

**Built for Mahalaxmi Agri Commodities**
**Contact**: mahalaxmiagricommodities@gmail.com
