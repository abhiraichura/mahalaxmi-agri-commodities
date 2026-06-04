# Mahalaxmi Agri Commodities - Contract Manager v2.0

## Updated Features

### 1. Letterhead Printing
- PDF contract notes leave the top 45mm blank for your pre-printed letterhead
- No digital header is printed — just the contract details
- Professional spacing and typography

### 2. Party Products
- Each party can have multiple products associated
- Visual tags on party cards and detail view
- Easy multi-select in party form

### 3. Clickable Phone Numbers
- All phone numbers are split by `/`, `\`, `,`, `-` separators
- Each number is individually clickable and dialable
- Works on mobile devices with `tel:` links

### 4. Clickable Party Cards
- Entire party card is clickable to open detail modal
- Edit/Delete buttons appear on hover
- No need to click small icons

### 5. Professional Print/Download
- Unified modal for Print Buyer Copy, Print Seller Copy, Download, Share
- Clean A4 layout with proper margins
- Copy type badge (BUYER COPY / SELLER COPY / BROKER COPY)
- Total value hidden on shared copies (internal only)

### 6. CSV Import/Export
- Export all parties to CSV
- Import parties from CSV (structure ready)
- One-click download

### 7. Optional GST
- GSTIN field is no longer mandatory
- PAN field added
- GST verification still available but optional

### 8. Business Notes
- Quick searchable notes section
- Tag-based filtering
- Instant search across title, content, and tags
- No fluff — add, search, done

### 9. Financial Year Dropdown
- Add new financial years in Settings (e.g., 2026-2027)
- Dropdown in contract form
- Switch between years anytime

### 10. Hidden Total Value
- Total value shown only on internal contract view
- Hidden on PDF downloads, prints, and shares
- Amber-colored "Internal Use Only" badge

### 11. Party Ledger / Account Statement
- Monthly statement per party
- Shows all contracts, brokerage, running balance
- Export to CSV
- Click any row to view contract

### 12. Loading Deadline Alerts
- Set loading deadline when creating contract
- Red OVERDUE alert on Dashboard and contract view
- Amber "Due Tomorrow" warning
- Active contract filtering

### 13. Brokerage Summary Widget
- Dashboard shows: "This month: Rs. X from Y contracts"
- Gradient card design
- Auto-calculates from active contracts

## File Changes Summary

| File | Action | Reason |
|------|--------|--------|
| `src/types/index.ts` | **Replace** | Updated all types with new fields |
| `src/utils/pdfGenerator.ts` | **Replace** | Letterhead support, cleaner design, no total on share |
| `src/utils/firebase.ts` | **Replace** | Added NOTES and LEDGER collections |
| `src/hooks/useAuthStore.ts` | **Replace** | Added notes, ledger, financial years support |
| `src/App.tsx` | **Replace** | New routes for Notes and Ledger |
| `src/components/Layout.tsx` | **Replace** | Added Notes to navigation |
| `src/pages/ContractView.tsx` | **Replace** | Fixed types, print modal, clickable phones, overdue alerts |
| `src/pages/ContractForm.tsx` | **Replace** | Fixed types, loading deadline, financial year dropdown |
| `src/pages/PartyDirectory.tsx` | **Replace** | Fixed types, clickable cards, CSV export, product tags |
| `src/pages/PartyForm.tsx` | **Replace** | Fixed types, GST optional, product selection, all new fields |
| `src/pages/ProductManager.tsx` | **Replace** | Fixed types, brokerage fields |
| `src/pages/Settings.tsx` | **Replace** | Fixed unused imports, financial year management |
| `src/pages/BrokerageBills.tsx` | **Replace** | Fixed types |
| `src/pages/Dashboard.tsx` | **Replace** | Brokerage widget, overdue alerts |
| `src/pages/Notes.tsx` | **NEW** | Business notes with search |
| `src/pages/PartyLedger.tsx` | **NEW** | Party account statement |

## Installation

1. Replace all files above in your `src/` directory
2. Run `npm install` to ensure all dependencies are present
3. Run `npm run build` to verify no TypeScript errors
4. Deploy to Vercel

## Data Safety

- **No existing data is deleted** — all old fields remain in types as optional
- New fields have `?` (optional) so old Firestore documents work fine
- Financial years default to `['2024-2025', '2025-2026']` if not set
- Party productIds default to empty array if not set

## Build Fixes

All TypeScript errors from the original build have been resolved:
- `Contract` status changed to `'active' | 'completed' | 'cancelled'`
- `Party` type includes all fields used in forms
- `ProductSpec` includes all brokerage fields
- `CompanySettings` includes `nextContractNumber` and `financialYears`
- `SpecField` is properly exported
- Unused imports removed from all files
