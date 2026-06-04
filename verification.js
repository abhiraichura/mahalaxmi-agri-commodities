// verification.js - Run this in browser console on your deployed app
// to check if updates are actually deployed

console.log("=== VERIFICATION ===");

// Check 1: Does Notes page exist?
fetch('/notes').then(r => console.log("Notes route:", r.status === 200 ? "✓" : "✗"));

// Check 2: Does PartyLedger exist?
fetch('/ledger').then(r => console.log("Ledger route:", r.status === 200 ? "✓" : "✗"));

// Check 3: Check if App.tsx was updated
// Look at the page source for "PartyLedger" or "Notes"
const html = document.documentElement.innerHTML;
console.log("Has PartyLedger:", html.includes('PartyLedger') ? "✓" : "✗");
console.log("Has Notes:", html.includes('Notes') ? "✓" : "✗");

// Check 4: Check build timestamp
console.log("Page loaded at:", new Date().toISOString());
