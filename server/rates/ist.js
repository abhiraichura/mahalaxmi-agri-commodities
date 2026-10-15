// Indian Standard Time helpers (the server runs in UTC, so everything is converted here).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_INDEX = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
});

/** Calendar parts of an instant, as seen on an Indian clock. */
export function istParts(d = new Date()) {
  const p = Object.fromEntries(fmt.formatToParts(d).map(x => [x.type, x.value]));
  const hour = Number(p.hour) % 24; // some engines print midnight as 24
  const year = Number(p.year), month = Number(p.month), day = Number(p.day);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  return {
    year, month, day, hour, minute: Number(p.minute), second: Number(p.second), weekday,
    dateKey: `${p.year}-${p.month}-${p.day}`,
    minutesOfDay: hour * 60 + Number(p.minute),
  };
}

/** "14 Oct 2026" */
export function fmtDate(parts) {
  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

/** "02:14 PM" */
export function fmtTime(parts) {
  const h12 = parts.hour % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')} ${parts.hour >= 12 ? 'PM' : 'AM'}`;
}

/** "12 PM" / "10 AM" for a slot hour */
export function hourLabel(h) {
  const h12 = h % 12 || 12;
  return `${h12} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Minutes since midnight (IST) -> epoch ms for the given IST date key. */
export function istToEpoch(dateKey, minutesOfDay) {
  const [y, m, d] = dateKey.split('-').map(Number);
  // IST = UTC + 5:30 (no daylight saving)
  return Date.UTC(y, m - 1, d, 0, 0, 0) + minutesOfDay * 60_000 - 330 * 60_000;
}

export function monthName(i) { return MONTHS[i]; }
