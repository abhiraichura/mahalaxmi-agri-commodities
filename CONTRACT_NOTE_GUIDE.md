# Contract Notes (exact format) + iPhone app

## What this update does

1. **Exact-format Contract Notes.** Buyer copy and Seller copy are now made from your own Canva design (Verdana, header, footer, T&C, lines, colours untouched). Only the values in the middle section change. Each is a one-page vector PDF.
2. **iPhone app.** The website installs on the iPhone home screen and opens full-screen like an app. The iPhone and the website use the same Firebase database, so they are always the same data.
3. **Data now lives in Firebase, not in the browser.** Brokerage-bill payments and adjustments used to be stored only in the browser they were typed in. They now go to Firebase and are copied up automatically from whatever browser already has them (once). Clearing the browser cache can no longer lose them.
4. Settings now load from Firebase on every device (before, a second device could show old company details).
5. When you bring the app back to the front, it refreshes contracts, parties, products and notes.

## Put it online (same as your earlier updates)

1. Unzip the file you were given.
2. On GitHub open your repo, **Add file → Upload files**, and drag in **everything inside the unzipped folder** (the folders `public`, `src` and the loose files). Files with the same name are replaced.
3. Commit. Vercel builds and deploys by itself (about 2 minutes). `package.json` changed, so Vercel installs two new libraries (`pdf-lib`, `@pdf-lib/fontkit`) on its own.

Nothing needs to be added to Firebase settings. If you ever limited your Firestore rules to specific collections, also allow `appFiles` and `billRecords` (the rules in DEPLOY_GUIDE.md already allow everything for signed-in users).

## One-time: add your Verdana font (do this once, on a computer)

The font is licensed, so it is not in the public code. You add it once and it is stored privately in your own Firebase.

1. Open the website on a computer → **Settings → Contract Note font (Verdana) → Add Verdana font**.
2. Pick regular `Verdana.ttf` (Windows: `C:\Windows\Fonts\verdana.ttf`; Mac: Font Book → right-click Verdana → Show in Finder).
3. The app checks it against the design font. If it says the widths differ, you picked another Verdana version or style.

After that, every device (iPhone included) has the font.

## Install on the iPhone

1. Open your website in **Safari** (not inside another app).
2. Tap **Share → Add to Home Screen → Add**.
3. Open the new "Mahalaxmi" icon. Sign in once.

Tips: **Share PDF** opens the iPhone share sheet (WhatsApp, Mail, Print, Save to Files). Contract Notes work offline after they have been opened once on that device.

## Making a Contract Note

Open a contract. The **Buyer Copy** and **Seller Copy** cards prepare the PDFs by themselves. Then **Share PDF**, **Print** or **Download**.

**Preview & edit text** opens a screen with every value:
- Everything comes from the contract. Edit anything and the PDF updates.
- **Save edits** keeps your wording for that contract only. **Reset** goes back to the contract's own values.
- Red field = the text does not fit its box or the font has no such character. The buttons stay off until you fix it. Amber = a warning (for example a GSTIN that is not 15 characters).

How the values are built from your contract data:

| On the note | Comes from |
|---|---|
| Names | Party legal name (or name) |
| Address lines | Party address (a long buyer address wraps onto 2 lines by itself; seller address is 1 line) |
| City line | City, State, Pincode |
| Specification | Quality name + specs, written like `SEMI BLACK - EXPORT CONDITION (2% OTHER COLOUR AND 1.5/2% FFA)` (label FFA, value 1.5/2, unit %) |
| Quantity | MT is converted to KG (5 MT → 5,000 KG) |
| Price | `₹ 202.00 Per Kg` |
| Brokerage | Product brokerage: buyer's % on the buyer copy, seller's % on the seller copy |
| Payment | The contract's payment terms, on both copies (change one copy in Preview & edit text) |
| Other terms | The contract's "Other terms", or `AS PER GOVERMENT RULE, "5% GST" EXTRA.` |

## Not moved yet

NCDEX / Telegram bot settings and the Message Generator history are still stored in the browser of each device. Gulfood directory was already in Firebase.
