# Mahalaxmi Agri Commodities - Updated App

## ⚠️ IMPORTANT: Before You Start

If your app is NOT updating after overwriting files, the most common causes are:

1. **Missing config files** (tsconfig.json, postcss.config.js)
2. **Browser cache** showing old version
3. **Vercel build cache** using old build
4. **Build errors** preventing deployment

---

## Step-by-Step Deployment

### Step 1: Download & Extract
1. Download the zip file
2. Extract it to a NEW folder (don't overwrite your old project yet)
3. Compare the file list - you should see 30+ files including tsconfig.json

### Step 2: Copy Your .env File
From your OLD project, copy `.env` to the new folder.
The .env file contains your Firebase credentials and MUST be preserved.

### Step 3: Install Dependencies
```bash
cd mahalaxmi-agri-commodities
npm install
```

### Step 4: Build Locally (CRITICAL STEP)
```bash
npm run build
```

**If this fails, STOP.** Read the error message and fix it before deploying.
Common errors:
- "Cannot find module" → Run `npm install` again
- "TypeScript error" → Check the file and line number mentioned
- "Missing tsconfig.json" → Make sure tsconfig.json is in the root

### Step 5: Test Locally
```bash
npm run dev
```
Open http://localhost:5173 and verify:
- [ ] Sidebar shows "Party Ledger" and "Notes"
- [ ] Dashboard shows "This Month's Brokerage" widget
- [ ] Party Form has "GSTIN (optional)"
- [ ] Party Form has product multi-select
- [ ] Party Directory has Import/Export CSV buttons
- [ ] Contract Form has "Loading Deadline" field
- [ ] Contract Form has Financial Year dropdown

### Step 6: Deploy to Vercel

**Option A: Using Vercel CLI**
```bash
vercel --prod
```

**Option B: Using GitHub**
```bash
git init
git add .
git commit -m "Update with all new features"
git push origin main
```

**Option C: Drag & Drop**
1. Run `npm run build`
2. Go to https://vercel.com/new
3. Drag the `dist/` folder

### Step 7: Clear Browser Cache
After deployment:
1. Press **Ctrl+Shift+R** (or Cmd+Shift+R on Mac) for hard reload
2. Or: DevTools → Network → Check "Disable cache" → Reload
3. On mobile: Uninstall PWA → Reinstall from browser

---

## File List (32 files total)

### Config Files (7)
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config ⭐ NEW
- `tsconfig.node.json` - TypeScript for Vite ⭐ NEW
- `vite.config.ts` - Vite config
- `tailwind.config.js` - Tailwind config
- `postcss.config.js` - PostCSS config ⭐ NEW
- `.env.example` - Environment variables template ⭐ NEW

### Source Files (22)
- `src/main.tsx` - Entry point
- `src/App.tsx` - Routes (added Notes, Ledger)
- `src/index.css` - Styles
- `src/types/index.ts` - Types (added Note, productIds, loadingDeadline, financialYear)
- `src/hooks/useAuthStore.ts` - Zustand store (added notes, financial years)
- `src/utils/firebase.ts` - Firebase (added NOTES collection)
- `src/utils/pdfGenerator.ts` - PDF generation (letterhead, copy labels)
- `src/components/Layout.tsx` - Sidebar (added Notes, Ledger nav)
- `src/components/LoadingScreen.tsx` - Loading screen
- `src/pages/Login.tsx` - Login page
- `src/pages/Dashboard.tsx` - Dashboard (brokerage widget, alerts)
- `src/pages/AllContracts.tsx` - All contracts (FY filter, alerts)
- `src/pages/ContractForm.tsx` - Contract form (deadline, FY dropdown)
- `src/pages/ContractView.tsx` - Contract view (print copies, alerts)
- `src/pages/PartyDirectory.tsx` - Party directory (CSV, clickable cards)
- `src/pages/PartyForm.tsx` - Party form (optional GST, products)
- `src/pages/ProductManager.tsx` - Product manager
- `src/pages/BrokerageBills.tsx` - Brokerage bills
- `src/pages/Settings.tsx` - Settings (letterhead, financial years)
- `src/pages/Notes.tsx` ⭐ NEW - Business notes
- `src/pages/PartyLedger.tsx` ⭐ NEW - Party account statement

### Documentation (3)
- `CHANGES.md` - Full changelog
- `DEPLOY_FIX.md` - Troubleshooting guide
- `verification.js` - Browser console verification script

---

## Quick Verification

After deployment, open your app and check:

1. **Sidebar** should show 8 items: Dashboard, Contracts, Parties, Products, Brokerage Bills, Party Ledger, Notes, Settings
2. **Dashboard** should show a red gradient card with "This Month's Brokerage"
3. **Party Form** → GSTIN field should say "(optional)"
4. **Party Form** → Should have a "Products" multi-select dropdown
5. **Party Directory** → Should have "Import CSV" and "Export CSV" buttons
6. **Contract Form** → Should have "Loading Deadline" date field
7. **Contract Form** → Should have "Financial Year" dropdown
8. **Contract View** → Should show 3 cards: Buyer Copy, Seller Copy, Broker Copy
9. **Settings** → Should have "Letterhead" upload section
10. **Settings** → Should have "Financial Years" section

---

## Troubleshooting

### "npm run build" fails
- Check error message carefully
- Make sure `tsconfig.json` exists in root
- Run `rm -rf node_modules && npm install`

### App deploys but shows old version
- Hard reload: Ctrl+Shift+R
- Check Vercel dashboard → Deployments → Is the latest one successful?
- Click "Redeploy without cache" in Vercel

### Missing sidebar items
- Check `src/App.tsx` has `import Notes from './pages/Notes'`
- Check `src/components/Layout.tsx` has Notes and Ledger in navItems

### Firebase data not loading
- Make sure `.env` file has correct Firebase credentials
- Check browser console for Firebase errors

---

## Support

If still not working, please share:
1. Screenshot of `npm run build` output (any red errors)
2. Screenshot of Vercel dashboard → Deployments → Latest build logs
3. Screenshot of your file explorer showing the project root
