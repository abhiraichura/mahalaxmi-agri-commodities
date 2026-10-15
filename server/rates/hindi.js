// "Quick Outlook" text in plain Hindi.
// Rules (same as the Grok prompt): only the movement and the board change are described; no predictions, targets,
// advice or invented reasons; no English words; each commodity gets 2-3 short sentences, and the commodities are
// worded differently from each other.

export const NAMES_HI = { jeera: 'जीरा', dhaniya: 'धनिया', turmeric: 'हल्दी' };

export const NO_MOVEMENT_HI = 'इस अपडेट के लिए इंट्राडे मूवमेंट की तुलना उपलब्ध नहीं है।';

// ---- sentence banks: (name, amount) -> sentence. "भाव" is always the subject so the grammar fits जीरा, धनिया and हल्दी.
const SINCE = {
  up: [
    (n, a) => `पिछली जानकारी के बाद ${n} के भाव ₹${a} बढ़े हैं।`,
    (n, a) => `${n} के भाव में पिछले भाव से ₹${a} की बढ़त दर्ज हुई।`,
    (n, a) => `बीते भाव के मुकाबले ${n} के भाव ₹${a} ऊपर चल रहे हैं।`,
    (n, a) => `पिछली बार से अब तक ${n} के भाव में ₹${a} की मजबूती आई है।`,
  ],
  down: [
    (n, a) => `पिछली जानकारी के बाद ${n} के भाव ₹${a} घटे हैं।`,
    (n, a) => `${n} के भाव में पिछले भाव से ₹${a} की गिरावट दर्ज हुई।`,
    (n, a) => `बीते भाव के मुकाबले ${n} के भाव ₹${a} नीचे चल रहे हैं।`,
    (n, a) => `पिछली बार से अब तक ${n} के भाव में ₹${a} की नरमी आई है।`,
  ],
  flat: [
    (n) => `पिछली जानकारी के बाद ${n} के भाव लगभग जस के तस बने हुए हैं।`,
    (n) => `${n} के भाव में पिछले भाव से कोई खास बदलाव नहीं हुआ।`,
    (n) => `बीते भाव के मुकाबले ${n} के भाव में स्थिरता बनी रही।`,
    (n) => `पिछली बार से अब तक ${n} के भाव एक ही स्तर के आसपास टिके हैं।`,
  ],
};

// first update of the day (or no earlier reading): the board change against yesterday's close is the movement
const PREV = {
  up: [
    (n, a) => `कल के बंद भाव की तुलना में ${n} के भाव ₹${a} ऊपर चल रहे हैं।`,
    (n, a) => `${n} के भाव कल के बंद भाव से ₹${a} बढ़े हुए हैं।`,
    (n, a) => `बीते कल के बंद भाव के मुकाबले ${n} में ₹${a} की बढ़त दिख रही है।`,
    (n, a) => `${n} के भाव में कल की तुलना में ₹${a} की मजबूती है।`,
  ],
  down: [
    (n, a) => `कल के बंद भाव की तुलना में ${n} के भाव ₹${a} नीचे चल रहे हैं।`,
    (n, a) => `${n} के भाव कल के बंद भाव से ₹${a} घटे हुए हैं।`,
    (n, a) => `बीते कल के बंद भाव के मुकाबले ${n} में ₹${a} की गिरावट दिख रही है।`,
    (n, a) => `${n} के भाव में कल की तुलना में ₹${a} की नरमी है।`,
  ],
  flat: [
    (n) => `${n} के भाव कल के बंद भाव के लगभग बराबर चल रहे हैं।`,
    (n) => `कल के बंद भाव की तुलना में ${n} के भाव में कोई खास बदलाव नहीं है।`,
    (n) => `${n} के भाव कल के स्तर के आसपास ही बने हुए हैं।`,
    (n) => `बीते कल के मुकाबले ${n} के भाव में स्थिरता है।`,
  ],
};

// second sentence (only when comparing with the previous update): where the day stands against yesterday's close
const DAY = {
  same_up: [
    (a) => `कल के बंद भाव से देखें तो भाव ₹${a} ऊपर हैं।`,
    (a) => `कल के बंद भाव की तुलना में कुल बढ़त ₹${a} की है।`,
  ],
  same_down: [
    (a) => `कल के बंद भाव से देखें तो भाव ₹${a} नीचे हैं।`,
    (a) => `कल के बंद भाव की तुलना में कुल गिरावट ₹${a} की है।`,
  ],
  against_up: [ // moved down since the last update, but still above yesterday's close
    (a) => `हालांकि कल के बंद भाव से देखें तो ये अब भी ₹${a} ऊपर हैं।`,
    (a) => `फिर भी कल के बंद भाव की तुलना में कुल बढ़त ₹${a} की बनी हुई है।`,
  ],
  against_down: [ // moved up since the last update, but still below yesterday's close
    (a) => `हालांकि कल के बंद भाव से देखें तो ये अब भी ₹${a} नीचे हैं।`,
    (a) => `फिर भी कल के बंद भाव की तुलना में कुल कमी ₹${a} की बनी हुई है।`,
  ],
  flat: [
    () => 'कल के बंद भाव के लगभग बराबर ही कारोबार चल रहा है।',
    () => 'कल के बंद भाव के आसपास ही कारोबार बना हुआ है।',
  ],
};

const TONE = {
  Strong: ['फिलहाल बाजार में मजबूती का माहौल दिखाई दे रहा है।', 'भाव में तेजी का रुख बना हुआ है।'],
  'Mild Strong': ['फिलहाल हल्की मजबूती का रुख है।', 'भाव में हल्की बढ़त का रुख दिखाई दे रहा है।'],
  Steady: ['फिलहाल भाव में ज्यादा हलचल नहीं है।', 'बाजार का रुख फिलहाल शांत बना हुआ है।'],
  'Mild Weak': ['फिलहाल हल्की नरमी का रुख है।', 'भाव में हल्की कमजोरी दिखाई दे रही है।'],
  Weak: ['फिलहाल भाव पर दबाव दिखाई दे रहा है।', 'बाजार में कमजोरी का रुख बना हुआ है।'],
};

export function statusFor(value, ltp) {
  const pct = ltp ? (value / ltp) * 100 : 0;
  const a = Math.abs(pct);
  if (a < 0.1) return 'Steady';
  if (a < 0.4) return pct > 0 ? 'Mild Strong' : 'Mild Weak';
  return pct > 0 ? 'Strong' : 'Weak';
}

function hash(str) {
  let h = 7;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
const dir = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : 'flat');
const inr = (n) => Number(n).toLocaleString('en-IN');

/**
 * movement:  number (rupees) compared with the previous update, or the board change when mode = 'prevclose'
 * mode:      'since' | 'prevclose' | 'unavailable'
 * boardChange: the board's own change against yesterday's close
 * index: 0,1,2 for jeera, dhaniya, turmeric (makes the wording differ)
 */
export function outlook({ key, movement, mode, boardChange, ltp, seed, index }) {
  const n = NAMES_HI[key];
  if (mode === 'unavailable') return { status: 'Steady', text: NO_MOVEMENT_HI };

  const mv = Math.round(movement);
  const bc = Math.round(boardChange);
  const status = statusFor(mv, ltp);
  const base = hash(`${seed}|${key}`) + index;
  const pick = (arr, k = 0) => arr[(base + k) % arr.length];

  const sentences = [];
  if (mode === 'since') {
    const d = dir(mv);
    sentences.push(pick(SINCE[d])(n, inr(Math.abs(mv))));
    const bd = dir(bc);
    let kind;
    if (bd === 'flat') kind = 'flat';
    else if (bd === d || d === 'flat') kind = bd === 'up' ? 'same_up' : 'same_down';
    else kind = bd === 'up' ? 'against_up' : 'against_down';
    sentences.push(pick(DAY[kind], 1)(inr(Math.abs(bc))));
  } else {
    const d = dir(mv);
    sentences.push(pick(PREV[d])(n, inr(Math.abs(mv))));
  }
  sentences.push(pick(TONE[status], 2));
  return { status, text: sentences.join(' ') };
}
