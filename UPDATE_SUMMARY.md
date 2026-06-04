# Mahalaxmi Agri Commodities - Update Summary

## Files Updated (15 files)

### 1. index.html
- Added Google Fonts link for **Barlow** (weights: 400, 500, 600, 700)
- Font is now loaded from: `https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap`

### 2. src/index.css
- Updated `body` font-family to use `'Barlow', -apple-system, BlinkMacSystemFont, ...`
- All UI text now uses Barlow font

### 3. src/types/index.ts
- **Removed** `brokeragePercent` and `brokerageFixed` from `Party` type
- **Added** to `ProductSpec`:
  - `buyerBrokerageType: 'percent' | 'flat'`
  - `sellerBrokerageType: 'percent' | 'flat'`
  - `buyerBrokeragePercent: number`
  - `sellerBrokeragePercent: number`
  - `buyerBrokerageFixed: number`
  - `sellerBrokerageFixed: number`
- **Added** to `Contract`:
  - `buyerBrokerageFixed`, `sellerBrokerageFixed`
  - `buyerBrokerageAmount`, `sellerBrokerageAmount`, `totalBrokerageAmount`

### 4. src/pages/ProductManager.tsx
- **Added** Buyer Brokerage section with:
  - Dropdown: Percentage (%) or Fixed Amount (Rs.)
  - Input field that changes label based on selection
- **Added** Seller Brokerage section with same dropdown
- Product cards now display brokerage info
- Brokerage is now product-specific (e.g., Sesame: 0.5% seller, 0.25% buyer; Coriander: different rates)

### 5. src/pages/ContractForm.tsx
- **Removed** brokerage fields from party selection
- **Added** auto-population of brokerage when product is selected
- Product section now shows read-only brokerage display
- Contract saves both percentage and fixed brokerage values from product
- **Added** pincode auto-fetch in New Party modal:
  - Uses `https://api.postalpincode.in/pincode/{pincode}`
  - Auto-fills City and State when 6-digit pincode is entered
  - Fields remain editable after auto-fill

### 6. src/pages/ContractView.tsx
- **Removed** green/blue colors, now uses brand colors only
- Brokerage display updated to match new product-based model

### 7. src/pages/PartyForm.tsx
- **Removed** brokerage fields (percent and fixed) from party form
- **Added** pincode auto-fetch:
  - When 6 digits entered, fetches city/state from postal API
  - Shows loading spinner while fetching
  - City and State fields remain editable
- Updated colors to brand only (rose-600, gray)

### 8. src/pages/PartyDirectory.tsx
- **Removed** all green/blue/amber colors
- Now uses only: rose-600, gray-100, gray-600, gray-900
- Status badges updated to brand colors

### 9. src/pages/AllContracts.tsx
- **Removed** all green/blue colors from status badges and UI
- Status "confirmed" now uses `bg-rose-50 text-rose-700`
- Action buttons use rose-600 instead of blue/green

### 10. src/pages/BrokerageBills.tsx
- **Removed** all green/blue colors
- All buttons, badges, and highlights now use rose-600/rose-50
- Table headers use rose-600 background
- Total amounts highlighted in rose-600

### 11. src/pages/Dashboard.tsx
- **Removed** all green/blue/amber stat card colors
- Stats now use: gray-100 for neutral, rose-50 for primary
- Recent contract actions use rose-600 instead of blue/green
- Loading spinner uses rose colors

### 12. src/pages/Settings.tsx
- **Removed** blue/amber colors
- GST API key icon now uses rose-600
- All buttons and highlights use rose-600

### 13. src/components/Layout.tsx
- Sidebar active state uses rose-50/rose-700
- Logo area uses rose-600 background
- All navigation uses brand colors only

### 14. src/App.tsx
- Updated imports to match new file locations
- Routes preserved exactly as before

### 15. src/utils/pdfGenerator.ts (COMPLETE REWRITE)
- **Font**: Uses Helvetica (closest to Barlow in jsPDF built-in fonts)
- **Brand Colors Only**:
  - Primary: `#ed1879` (rose)
  - Primary Light: `#fce4ef` (light pink background)
  - Primary Mid: `#f8bbd0` (border color)
  - Black, Dark Gray, Gray, Light Gray, White
  - **NO green, NO blue anywhere**
- **Logo Fix**:
  - Top logo now appears in header (top-left) if uploaded in Settings
  - Footer logo positioned at bottom-right with proper spacing
  - Footer text ("For, Mahalaxmi...") positioned at bottom-left
  - Added `Math.min(y, pageHeight - 28)` to prevent overlap
- **Party Layout Swap**:
  - `buyer_copy`: Buyer on LEFT, Seller on RIGHT
  - `seller_copy`: Seller on LEFT, Buyer on RIGHT
  - `broker_copy`: Seller on LEFT, Buyer on RIGHT (default)
- **Brokerage Display**:
  - `buyer_copy`: Shows only "Brokerage" (not "Buyer Brokerage")
  - `seller_copy`: Shows only "Brokerage" (not "Seller Brokerage")
  - `broker_copy`: Shows both "Buyer Brokerage" and "Seller Brokerage"
  - Supports both percentage and flat amount display
- **Table Styling**:
  - Headers: rose-600 background, white text
  - Alternate rows: light pink background
  - Borders: rose mid-tone
  - Total Value row: bold, rose-600 color

## How to Apply These Updates

1. Download the ZIP file: `mahalaxmi-updates.zip`
2. Extract the files
3. Replace the corresponding files in your project:
   - `index.html` → root folder
   - `src/index.css` → src folder
   - `src/types/index.ts` → src/types folder
   - `src/utils/pdfGenerator.ts` → src/utils folder
   - `src/components/Layout.tsx` → src/components folder
   - All files in `src/pages/` → src/pages folder
   - `src/App.tsx` → src folder
4. Run `npm install` if needed (no new dependencies added)
5. Run `npm run dev` or `npm run build`

## Important Notes

- **Data Migration**: Since `brokeragePercent` and `brokerageFixed` were removed from `Party`, existing party data in Firebase/localStorage will still work (fields will be ignored). However, you should:
  1. Go to Products page
  2. Edit each product to set buyer/seller brokerage with type (percent/flat)
  3. New contracts will use product-based brokerage

- **Pincode API**: Uses free Indian Postal API (`api.postalpincode.in`). No API key needed.

- **Font**: Barlow is loaded from Google Fonts CDN. Ensure internet connectivity for the font to load.

- **Logo in PDF**: The logo must be uploaded in Settings page. The PDF generator uses the base64 image string stored in settings. If logo doesn't appear, re-upload it in Settings.

- **Brokerage Calculation**: 
  - If type is "percent": brokerage = (totalValue × percent) / 100
  - If type is "flat" and fixed > 0: brokerage = fixed amount
  - Otherwise falls back to percentage
