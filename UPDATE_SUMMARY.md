# Mahalaxmi Agri Commodities - Major Update Summary

## Files Changed (10 files)

### 1. src/types/index.ts
- Added separate buyer/seller brokerage fields (percent + fixed + amount)
- Added private Party fields: contactPerson, altPhone, altEmail, remarks, notes, bankName, bankAccount, bankIfsc
- Added BrokerageBill type with status, paidAmount, paymentDate, paymentNotes
- Added nextContractNumber to CompanySettings

### 2. src/hooks/useAuthStore.ts
- Added nextContractNumber to default settings
- Auto-increments contract number on addContract

### 3. src/components/Layout.tsx
- Added "All Contracts" to sidebar navigation

### 4. src/pages/ContractForm.tsx
- Separate buyer & seller brokerage sections
- Auto-generated contract number (editable)
- Contract number field added at top
- Fixed brokerage calculation for both parties
- New party modal includes private fields

### 5. src/pages/ContractView.tsx
- Shows brokerage % only (not amount)
- Separate buyer/seller brokerage display
- Cleaner layout

### 6. src/pages/BrokerageBills.tsx
- Separate bills for buyers AND sellers
- Editable payment status (pending/partial/paid)
- Payment date and notes tracking
- Correct brokerage calculation
- Status color coding

### 7. src/utils/pdfGenerator.ts
- Professional header with logo support
- Company details centered, within borders
- Decorative rose-colored lines
- Color-coded seller (green) / buyer (blue) boxes
- Brokerage % shown on contract (amount hidden)
- Proper footer with signature area
- Brokerage bill PDF with payment details

### 8. src/pages/PartyDirectory.tsx
- Added Eye icon for "View Details" on each party card
- Modal shows public + private details separately
- Private details marked as "Not on Contract"

### 9. src/pages/PartyForm.tsx
- Toggle to show/hide private details section
- All private fields: contactPerson, altPhone, altEmail, remarks, notes, bank details
- Clean amber-colored private section

### 10. src/pages/AllContracts.tsx (NEW)
- Full contracts table with search
- Filters: status, month, year
- Quick actions: view, edit, delete

### 11. src/App.tsx
- Added /contracts route for AllContracts page
- AppInitializer loads all data on mount

### 12. src/pages/Dashboard.tsx
- Stats cards are clickable (navigate to respective pages)
- Shows only recent 5 contracts
- "View All" link to All Contracts page

## How to Apply
1. Copy each file from this output folder to your repo
2. Run `npm install` if any new dependencies needed
3. Run `npm run dev` to test
4. Clear browser localStorage if old data conflicts with new types
