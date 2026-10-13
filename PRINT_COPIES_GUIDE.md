# Update: two-line seller address, "Without letterhead" print copies, bottom-pinned bill footer

## What is new

1. **Seller address is now two lines, just like the buyer.**
   Both boxes (Buyer and Seller) now show 5 lines: name, address line 1, address line 2, city, GSTIN.
   This is the same on the Buyer copy and the Seller copy.
   - If you type a short address (one line) it sits directly under the name.
   - If one line is too long for the box it is wrapped onto two lines automatically.
   - If you type three lines, the app shows a red message ("at most 2 lines fit") and does not make a wrong PDF.

2. **"Without letterhead" copies for printing on your own printed letterhead.**
   Contract Notes, Brokerage Bills and Invoices now have a switch called **Without letterhead**.
   - OFF (default): the full digital copy, exactly as before (header, lotus, footer).
   - ON: the same document with no header, no footer and no lotus. All text, lines and boxes are in exactly the same place, so it lands perfectly on your printed letterhead.
   - The switch is remembered on your device. File names get `_print` at the end (for example `Contract_1234_B_print.pdf`) so you never mix them up.
   - Where to find it: on the Contract page, inside the Contract Note window, and on the Brokerage Bills page (also in the "download all" window).

3. **Bills and Invoices: closing block at the bottom.**
   "E. & O. E. THANK YOU / Subject To RAJKOT Jurisdiction / For, MAHALAXMI AGRI COMMODITIES" (bill) and "BANK DETAILS ... FOR, MAHALAXMI AGRI COMMODITIES" (invoice) now sit at the bottom of the last page, just above the address line in the footer, instead of floating over the lotus. If a bill has many rows and runs to a second page, the totals and this block go on the last page.

4. The letterhead used by Bills and Invoices (`L.pdf`) was rebuilt so it also carries the small logo dots.

## Files in this zip (upload all, same folders, replace when asked)

```
public/contract-templates/B.pdf
public/contract-templates/S.pdf
public/contract-templates/B-print.pdf      (new)
public/contract-templates/S-print.pdf      (new)
public/contract-templates/L.pdf
src/contractNote/data.ts
src/contractNote/engine.ts
src/contractNote/service.ts
src/contractNote/types.ts
src/contractNote/useContractNote.ts
src/components/ContractNoteModal.tsx
src/components/LetterheadToggle.tsx        (new)
src/utils/usePlainCopy.ts                  (new)
src/pages/ContractView.tsx
src/pages/BrokerageBills.tsx
src/billing/pdf.ts
src/billing/assets.ts
```

## How to upload (GitHub website)

1. Unzip the file on your computer. You will see the folders `public` and `src`.
2. Open your repository on GitHub, click **Add file > Upload files**.
3. Drag the `public` and `src` folders from the unzipped folder into the page. GitHub keeps the folder paths.
4. Write a message such as "Seller 2-line address, print copies" and click **Commit changes**.
5. Vercel builds automatically. When it shows "Ready", open the app and refresh once (on iPhone: close and reopen the app).

The PDF templates are about 3 MB each, so the first open after the update may take a few extra seconds to load them. After that they are stored on the device.

## Please check once

- I tested the layout with a stand-in font. Your real Verdana (uploaded in Settings) is slightly different in width, so print **one** "Without letterhead" contract on a printed letterhead sheet and check that the lines sit where you expect. If anything is a millimetre off, tell me which way and I will adjust.
- Most printers need "Actual size" / "100%" (not "Fit to page") for the print copies to line up.
