# Brokerage Bills, Invoices and per-contract brokerage

## What changed

1. **Brokerage is editable on every contract.** Pick the product and its default brokerage fills in (buyer and seller). Below Quantity and Price you will see **Brokerage for this contract**: change the number, or switch between **% of value** and **Rs. fixed**, for the buyer and the seller separately. It only changes that contract. **Reset to default** brings back the product's rate. The Contract Note prints the rate of that contract.
2. **The amount is worked out from quantity and price correctly**, whatever the price unit: 10 MT at Rs. 100 per KG at 0.5% = Rs. 5,000. A price written "per MT" or "per Quintal" is also understood (write the unit as KG, MT or Quintal; the form warns if it does not recognise the unit).
3. **Brokerage Bills page rebuilt.** One bill per party for the period you choose (month, quarter, half year, financial year or any dates). The bill lists every contract where that party bought and/or sold (Buy / Sell column), like your reference bill.
4. **Two documents per party**, both on your letterhead (header, lotus watermark and footer stay as in the Contract Note, only the middle changes):
   - **Brokerage Bill** (Cont.No, Date, Party Name & City, Particulars, Type, Quantity, Rate per M.TONES, Total Brok., amount in words, E. & O. E., jurisdiction, signature)
   - **Invoice** (To, Invoice No., Invoice Date, grid table, amount in words, Bank Details, signature)
   The Brokerage Bill and the Invoice of a party share one invoice number.
5. **Generate for everyone at once.** Tick the parties (or **Select all**), press **Generate**, choose Brokerage Bills / Invoices / Both, and either a **ZIP with a separate file per party** (to send each party their own) or **one PDF with every party** (to print).
6. Payments and adjustments are kept in Firebase. Payments you recorded earlier on the old monthly bills appear automatically on any bill whose period contains that whole month.

## Put it online

Upload the files in the zip to GitHub (Add file > Upload files, keep the same folders). Replace files with the same name. Vercel deploys by itself. `package.json` changed (one library added, `fflate`, for ZIP files), so Vercel installs it on its own.

## One-time setup in Settings

- **PAN** (Company Details): this is the PAN printed on the bills. Change it any time.
- **Bank details** (Company Details) and the new **Brokerage Bills & Invoices** card: account holder name, branch, the invoice number to start from, jurisdiction city, and GST % on brokerage (leave empty if you do not charge GST).
- **Signature**: the picture you already upload is used on the bills.
- **Verdana font**: the same font as the Contract Note. If you already added it, nothing to do. Optional: add **Verdana Bold** (`verdanab.ttf`) in the same card for the headings. Without it the headings use a slightly thickened regular font.
- If you limited your Firestore rules to specific collections, also allow `appFiles` and `billRecords` (the rules in DEPLOY_GUIDE.md already allow everything for signed-in users).

## Using the Brokerage Bills page

- Choose the period at the top. Bill date defaults to the end of the period (or today if the period is not over). GST % starts from Settings and can be changed for this run.
- **Brokerage Bill** / **Invoice** on a party's card makes that PDF straight away (iPhone: share sheet with WhatsApp, Mail, Save to Files, Print; computer: download).
- **Details** shows every contract line with the rate used, lets you change the invoice number, add an adjustment (discount with a minus sign, or extra) that is printed on both documents, and has Download / Share / Preview / Print for each document, plus the payments list.
- **Payment** records money received. Status (Pending / Partial / Paid) and the balance update by themselves.
- Invoice numbers are given the first time a PDF is made for a party and period, in party order, and stay the same if you make it again. They continue from the highest number used (or the start number in Settings, whichever is higher).
- A yellow note "changed since the last PDF" means contracts or amounts changed after you made the PDF. Make it again before sending.
- A blue note means some of those contracts are already on another invoice (for example a month you already billed, shown again inside a quarter). Nothing is blocked, it is only a reminder.

## Tips

- Each PDF is about 3 MB because it carries your full letterhead. For many parties, the **one PDF with every party** option is small and quick. A ZIP of more than about 12 parties can be heavy for a phone, so do it in batches there.
- Names in Gujarati/Hindi cannot be printed in Verdana. The page warns you and prints "?", so type an English spelling of the party name for the bill.
- Contracts you saved before this update keep the brokerage amounts they were saved with. If you open one and press Update, its brokerage is recalculated with the corrected unit handling.
