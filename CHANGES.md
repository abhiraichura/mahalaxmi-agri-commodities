# Mahalaxmi Agri Commodities - Updated

## All Changes Made

### 1. Letterhead Printing Support
- **File**: `src/pages/Settings.tsx`, `src/utils/pdfGenerator.ts`
- Added a **Letterhead upload** section in Settings
- PDFs now leave the **top 45mm blank** so you can print on your pre-printed letterhead
- The header (company name, address, GSTIN) is removed from the PDF output
- Only contract details appear below the blank area

### 2. Products per Party
- **Files**: `src/types/index.ts`, `src/pages/PartyForm.tsx`, `src/pages/PartyDirectory.tsx`
- Added `productIds: string[]` to Party type
- Party form now has a **multi-select dropdown** to choose products
- Selected products show as tags on party cards and in the view modal

### 3. Clickable Phone Numbers (India)
- **Files**: `src/pages/PartyDirectory.tsx`, `src/pages/ContractView.tsx`, `src/pages/PartyLedger.tsx`
- Phone numbers split by `/` or `,` into separate clickable links
- Each number links to `tel:+91XXXXXXXXXX` for direct calling
- Works in party cards, contract view, party ledger, and party detail modal

### 4. Clickable Party Cards
- **File**: `src/pages/PartyDirectory.tsx`
- Entire party card is now clickable to open the detail view
- Edit/Delete/View buttons still work without triggering card click

### 5. Professional Print/Download Copies
- **Files**: `src/pages/ContractView.tsx`, `src/utils/pdfGenerator.ts`
- Three unified action cards: **Buyer Copy**, **Seller Copy**, **Broker Copy**
- Each has **Print** and **Download** buttons with consistent design
- Print opens a new window with the PDF ready to print
- PDF design is cleaner: better spacing, fonts, borders, and layout
- Copy type label (BUYER COPY / SELLER COPY / BROKER COPY) at bottom right of each page

### 6. CSV Import/Export for Parties
- **File**: `src/pages/PartyDirectory.tsx`
- **Export**: Downloads all parties as CSV with all fields
- **Import**: Upload a CSV file to bulk import parties
- CSV format includes: ID, Legal Name, Display Name, GSTIN, Type, Address, City, State, Pincode, Phone, Email, PAN, Brokerage %, Brokerage Fixed, Products

### 7. GST Number Optional
- **File**: `src/pages/PartyForm.tsx`
- GSTIN field label changed from "GSTIN *" to "GSTIN (optional)"
- Removed required validation
- Verify button still works when 15 characters entered

### 8. Business Notes Section
- **New File**: `src/pages/Notes.tsx`
- Added to sidebar navigation
- Quick add/edit/delete notes
- Full-text search across title, content, and tags
- Tags support with # styling
- No fluff - instant search as you type

### 9. Financial Year Dropdown
- **Files**: `src/types/index.ts`, `src/hooks/useAuthStore.ts`, `src/pages/Settings.tsx`, `src/pages/ContractForm.tsx`, `src/components/Layout.tsx`, `src/pages/AllContracts.tsx`
- Settings now has a **Financial Years** section to add/remove years
- Contract form has a dropdown to select financial year
- Sidebar shows current financial year with quick switcher
- All contracts page can filter by financial year
- Default years: 2024-2025, 2025-2026
- Contract numbers auto-increment per financial year

### 10. Hide Total Value in Shared Contracts
- **Files**: `src/pages/ContractView.tsx`, `src/utils/pdfGenerator.ts`
- Total value is hidden from Buyer/Seller PDF copies
- Only shown in **Broker Copy** (internal use)
- Contract view page shows "(Internal only)" placeholder for total value

### 11. Party Ledger / Account Statement
- **New File**: `src/pages/PartyLedger.tsx`
- Added to sidebar as "Party Ledger"
- Select party + month/year
- Shows all contracts for that party in selected month
- Columns: Date, Description, Type (Sale/Purchase), Qty, Price, Total Value, Brokerage, Payments, Running Balance
- Export to CSV available
- Color-coded: Sale = amber, Purchase = blue

### 12. Loading Deadline Alerts
- **Files**: `src/pages/ContractForm.tsx`, `src/pages/ContractView.tsx`, `src/pages/Dashboard.tsx`, `src/pages/AllContracts.tsx`
- New "Loading Deadline" field when creating/editing contracts
- **Dashboard**: Shows red alert banner for overdue contracts
- **Dashboard**: Shows amber alert for contracts due tomorrow
- **Contract View**: Color-coded status badge (red=overdue, amber=tomorrow, green=ok)
- **All Contracts**: Alert column with badges
- **WhatsApp Reminder**: One-click button to send WhatsApp reminder when deadline is tomorrow

### 13. Brokerage Summary Widget
- **File**: `src/pages/Dashboard.tsx`
- Prominent gradient card showing: "This Month: Rs. XX,XXX brokerage earned from X contracts"
- Link to view brokerage bills
- Updates automatically based on current month's contracts

## Backward Compatibility
- All existing data is preserved - no fields removed
- New fields have sensible defaults:
  - `productIds: []` for existing parties
  - `financialYear: "${year}-${year+1}"` for existing contracts
  - `loadingDeadline: ""` for existing contracts
  - `payments: []` for existing contracts
- Existing settings will get default `financialYears: ["2024-2025", "2025-2026"]`

## New Files Added
- `src/pages/Notes.tsx` - Business notes
- `src/pages/PartyLedger.tsx` - Party account statement

## Files Modified
- `src/types/index.ts` - Added new fields
- `src/hooks/useAuthStore.ts` - Added notes, financial year state
- `src/utils/firebase.ts` - Added NOTES collection
- `src/utils/pdfGenerator.ts` - Letterhead support, copy labels, total value control
- `src/pages/PartyForm.tsx` - GST optional, product multi-select
- `src/pages/PartyDirectory.tsx` - Clickable cards, phone links, CSV import/export
- `src/pages/ContractForm.tsx` - Loading deadline, financial year dropdown
- `src/pages/ContractView.tsx` - Print copies, deadline alerts, WhatsApp reminder
- `src/pages/Dashboard.tsx` - Brokerage widget, deadline alerts
- `src/pages/AllContracts.tsx` - Financial year filter, deadline alerts
- `src/pages/Settings.tsx` - Letterhead upload, financial years
- `src/components/Layout.tsx` - New nav items, FY switcher
- `src/App.tsx` - New routes

## Deployment
1. Replace all files in your repo with these updated files
2. Run `npm install` (no new dependencies needed)
3. Run `npm run build`
4. Deploy to Vercel as usual
