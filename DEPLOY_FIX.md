# Mahalaxmi Agri Commodities - Deployment Guide

## Quick Fix Checklist (If Updates Not Showing)

### Step 1: Verify Files Were Replaced
Open these files in your code editor and check they contain the new code:

**Check `src/App.tsx` - should have these lines:**
```tsx
import Notes from './pages/Notes';
import PartyLedger from './pages/PartyLedger';
import AllContracts from './pages/AllContracts';
```

**Check `src/components/Layout.tsx` - should have these nav items:**
```tsx
{ path: '/ledger', label: 'Party Ledger', icon: BookOpen },
{ path: '/notes', label: 'Notes', icon: StickyNote },
```

**Check `src/pages/PartyForm.tsx` - should have:**
```tsx
placeholder="GSTIN (optional)"
```

If these are NOT present, the files were NOT replaced correctly.

---

### Step 2: Clear Everything & Re-Deploy

Run these commands in your terminal (in project folder):

```bash
# 1. Delete old build cache
rm -rf node_modules
rm -rf dist
rm -rf .vercel

# 2. Reinstall dependencies
npm install

# 3. Clear browser cache (IMPORTANT!)
# Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) to hard reload

# 4. Build locally first to check for errors
npm run build

# 5. If build succeeds, deploy
vercel --prod
```

---

### Step 3: If Using GitHub + Vercel Auto-Deploy

```bash
# Make sure all changes are committed
git add .
git commit -m "Add all new features"
git push origin main

# Then force Vercel to rebuild
# Go to https://vercel.com/dashboard → Your Project → Deployments
# Click the latest deployment → "Redeploy" button
```

---

### Step 4: Check Vercel Build Logs

1. Go to https://vercel.com/dashboard
2. Click your project
3. Click the latest deployment
4. Click "Build Logs"
5. Look for RED error messages

**Common errors to look for:**
- `Module not found` → Missing file
- `Cannot find module` → Import path wrong
- `Syntax error` → TypeScript issue
- `Build failed` → Check the error line number

---

### Step 5: Browser Cache Issues

Even after successful deploy, your browser may show old version:

**Chrome:**
1. Press `Ctrl+Shift+R` (hard reload)
2. Or: DevTools (F12) → Network tab → Check "Disable cache" → Reload
3. Or: Settings → Privacy → Clear browsing data → Cached images/files

**Mobile (PWA):**
1. Uninstall the app from home screen
2. Reinstall from browser

---

### Step 6: Check If Build Actually Succeeded

After `npm run build`, check:
- Does `dist/` folder exist?
- Does `dist/index.html` exist?
- File size should be > 100KB

```bash
ls -la dist/
```

---

## Most Likely Causes & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| No new sidebar items | App.tsx or Layout.tsx not updated | Re-copy those 2 files |
| Old contract PDF | pdfGenerator.ts not updated | Re-copy that file |
| GST still required | PartyForm.tsx not updated | Re-copy that file |
| No CSV buttons | PartyDirectory.tsx not updated | Re-copy that file |
| Build fails | TypeScript error | Check `npm run build` output |
| Works locally but not on Vercel | Vercel using old deployment | Click "Redeploy" in Vercel dashboard |

---

## Nuclear Option (100% Clean Slate)

If nothing works, do this:

```bash
# 1. Backup your .env file
cp .env .env.backup

# 2. Delete everything except .git and .env
cd your-project-folder
ls | grep -v ".git" | grep -v ".env" | xargs rm -rf

# 3. Extract the new zip file here
# (Replace all files with the updated ones)

# 4. Restore .env
mv .env.backup .env

# 5. Install and build
npm install
npm run build

# 6. Deploy
vercel --prod
```

---

## Need Help?

If still not working, send me:
1. Screenshot of your `src/` folder file list
2. The error message from `npm run build`
3. Screenshot of Vercel build logs
