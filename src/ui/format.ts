// Small formatting helpers shared by the screens.

/** ₹1.25 Cr / ₹60.5 L / ₹45,000 */
export function inrShort(n: number): string {
  const v = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (v >= 1e7) return `${sign}₹${(v / 1e7).toFixed(v >= 1e8 ? 1 : 2).replace(/\.?0+$/, '')} Cr`;
  if (v >= 1e5) return `${sign}₹${(v / 1e5).toFixed(v >= 1e6 ? 1 : 2).replace(/\.?0+$/, '')} L`;
  return `${sign}₹${Math.round(v).toLocaleString('en-IN')}`;
}
export const inrFull = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** "20 MT" */
export const qtyText = (q: number, unit: string) => `${Number(q || 0).toLocaleString('en-IN')} ${unit || ''}`.trim();

/** "Good morning" for the hour in India */
export function greeting(now = new Date()): string {
  const h = Number(new Date(now.getTime() + 330 * 60000).toISOString().slice(11, 13));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** "12:05 PM" in India time */
export function clockIST(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
}
