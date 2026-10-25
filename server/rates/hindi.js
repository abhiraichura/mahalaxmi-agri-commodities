// "Quick Outlook" text in Hinglish: mostly Hindi (Devanagari), with the everyday English words that traders in the
// market really use (market, open, close, level, support, buying, selling, expiry ...) written in English letters.
// It is not textbook Hindi, and it is not English either: the sentence frame is Hindi and the market words are English.
//
// What it says (3 to 4 short sentences per commodity, worded differently every update and for each commodity):
//   1. how the day is trading against its own opening (opened above / below yesterday's close, and whether the price is
//      holding above or below the opening level) - a technical reading of the board, not a repeat of the rupee change
//   2. then, depending on the update, some of: how big today's move is, how the two spices compare with each other,
//      where the contract stands before its expiry, and what the market usually watches at this time of the year
//
// What it never says: anything about the previous update (the Movement section is separate), predictions, targets,
// buy / sell advice, or news that cannot be known from the board (for example "export demand rose today").
// The "time of year" sentences are general background ("आमतौर पर ..."), not claims about today.
// The wording is chosen from the date and the update time, so the same update always gives the same text (editing the
// movement does not change it) and consecutive updates of a day use different wording.
//
// The English words are a small fixed set (see ENGLISH_WORDS). The tests check that nothing outside this set slips in,
// so the text stays "more Hindi, some English" and never turns into long English phrases.

export const NAMES_HI = { jeera: 'जीरा', dhaniya: 'धनिया', turmeric: 'हल्दी' };
export const MONTHS_HI = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

// every English word the outlook may use (lower case)
export const ENGLISH_WORDS = [
  'market', 'open', 'close', 'level', 'support', 'trend', 'buying', 'selling', 'buyers', 'pressure', 'profit', 'booking',
  'trading', 'range', 'direction', 'gap', 'flat', 'strong', 'positive', 'mood', 'volatility', 'normal', 'active',
  'strength', 'demand', 'supply', 'domestic', 'export', 'stock', 'production', 'weather', 'season', 'traders',
  'contract', 'expiry', 'expire', 'settlement', 'settle', 'rollover', 'demand-supply',
];

// ---- 1. the day against its opening. ("भाव" is always the subject so the grammar fits जीरा, धनिया and हल्दी.)
const OPEN = {
  up_hold: [ // opened above yesterday's close and is still above the opening level
    (n) => `आज ${n} के भाव कल के close से ऊपर open हुए और अभी तक open level के ऊपर टिके हुए हैं, जो buying support का संकेत माना जाता है।`,
    (n) => `${n} की शुरुआत कल के close से ऊपर हुई थी और भाव अब भी open level के ऊपर कायम हैं, यानी तेजी का trend बना हुआ है।`,
    (n) => `ऊपर open होने के बाद भी ${n} के भाव open level के ऊपर टिके हैं, जिससे buyers की पकड़ मजबूत दिखती है।`,
    (n) => `${n} में आज की शुरुआत strong रही और भाव open level से नीचे नहीं आए हैं, जो market के भरोसे को दिखाता है।`,
    (n) => `${n} में buyers का सहारा बना हुआ है: भाव कल के close से ऊपर open हुए थे और अभी तक open level के ऊपर ही चल रहे हैं।`,
  ],
  up_fade: [ // opened above, now below the opening level
    (n) => `${n} के भाव कल के close से ऊपर open हुए थे, पर अब open level से नीचे आ गए हैं; ऊंचे भाव पर profit booking का असर दिख रहा है।`,
    (n) => `ऊंचे open के बाद ${n} के भाव open level से फिसल गए हैं, यानी ऊपरी level पर selling आई है।`,
    (n) => `${n} में आज ऊपर open होकर भाव कमजोर पड़े हैं और अब open level के नीचे हैं, जिससे तेजी की रफ्तार थमती दिख रही है।`,
    (n) => `strong शुरुआत के बावजूद ${n} के भाव open level के नीचे लौट आए हैं, इसलिए ऊपर के भाव पर profit booking दिख रही है।`,
    (n) => `${n} के भाव ऊपर open होकर open level से नीचे आ गए हैं, जिससे लगता है कि ऊंचे भाव पर buyers कम हुए हैं।`,
  ],
  down_hold: [ // opened below yesterday's close and is still at or below the opening level
    (n) => `${n} के भाव कल के close से नीचे open हुए और अब भी open level के नीचे चल रहे हैं, जिससे selling का pressure बना हुआ दिखता है।`,
    (n) => `कमजोर शुरुआत के बाद ${n} के भाव open level से ऊपर नहीं निकल पाए हैं, यानी market में सावधानी बनी हुई है।`,
    (n) => `${n} की शुरुआत नरम रही और भाव अभी तक open level के नीचे ही हैं, जो selling के असर की ओर इशारा करता है।`,
    (n) => `नीचे open होने के बाद ${n} में buying का कोई खास support नहीं दिखा है और भाव open level से नीचे टिके हैं।`,
    (n) => `${n} में नीचे open होने के बाद भी भाव open level के नीचे ही हैं, यानी selling का असर अभी कम नहीं हुआ है।`,
  ],
  down_recover: [ // opened below, now above the opening level
    (n) => `${n} के भाव कल के close से नीचे open हुए थे, पर अब open level से ऊपर लौट आए हैं; निचले भाव पर buying का support मिलता दिख रहा है।`,
    (n) => `नरम शुरुआत के बाद ${n} में निचले level से सुधार आया है और भाव open level के ऊपर आ गए हैं।`,
    (n) => `${n} में नीचे open होकर भाव संभले हैं और अब open level से ऊपर हैं, यानी गिरावट पर buyers की दिलचस्पी दिखी है।`,
    (n) => `कमजोर शुरुआत के बावजूद ${n} के भाव open level के ऊपर टिके हैं, जो निचले level पर support का संकेत है।`,
    (n) => `${n} की शुरुआत नीचे हुई थी, पर भाव open level से ऊपर निकल आए हैं, जो निचले भाव पर demand आने का संकेत है।`,
  ],
  flat_up: [ // opened near yesterday's close, now above the opening level
    (n) => `${n} के भाव कल के close के आसपास open हुए थे और अब open level से ऊपर हैं, यानी दिन में धीरे-धीरे भाव को support मिला है।`,
    (n) => `flat शुरुआत के बाद ${n} के भाव open level से ऊपर निकले हैं, जिससे हल्का buying का रुख बनता दिख रहा है।`,
    (n) => `${n} में आज की शुरुआत बिना बड़े बदलाव के हुई, लेकिन अब भाव open level के ऊपर चल रहे हैं।`,
    (n) => `कल के close के पास open होने के बाद ${n} के भाव धीरे-धीरे ऊपर सरके हैं।`,
    (n) => `${n} में आज बिना किसी खास gap के शुरुआत हुई और बाद में भाव open level के ऊपर चले गए, यानी धीरे-धीरे buying आई है।`,
  ],
  flat_down: [
    (n) => `${n} के भाव कल के close के आसपास open हुए थे और अब open level से नीचे हैं, यानी दिन में हल्का pressure आया है।`,
    (n) => `flat शुरुआत के बाद ${n} के भाव open level से नीचे सरके हैं, जिससे हल्का selling का रुख बनता दिख रहा है।`,
    (n) => `${n} में आज की शुरुआत बिना बड़े बदलाव के हुई, लेकिन अब भाव open level के नीचे चल रहे हैं।`,
    (n) => `कल के close के पास open होने के बाद ${n} के भाव धीरे-धीरे नीचे खिसके हैं।`,
    (n) => `${n} में आज बिना किसी खास gap के शुरुआत हुई और बाद में भाव open level के नीचे चले गए, यानी धीरे-धीरे selling आई है।`,
  ],
  flat_flat: [
    (n) => `${n} के भाव कल के close के आसपास open हुए और open level के करीब ही टिके हैं, यानी trading सीमित range में चल रही है।`,
    (n) => `आज ${n} में शुरुआत से अब तक भाव लगभग एक ही level पर बने हुए हैं, जो market में direction का इंतजार दिखाता है।`,
    (n) => `${n} के भाव open level के आसपास घूम रहे हैं, इसलिए फिलहाल कोई साफ trend नहीं बन पाया है।`,
    (n) => `flat शुरुआत के बाद भी ${n} के भाव में ठहराव है और trading एक range में सिमटी है।`,
    (n) => `${n} में आज न ऊपर और न नीचे कोई बड़ा gap बना और भाव open level के आसपास ही घूम रहे हैं।`,
  ],
};

// when the opening price is not known (it was not sent): only the side of yesterday's close can be said
const NO_OPEN = {
  up: [
    (n) => `आज ${n} के भाव कल के close से ऊपर चल रहे हैं और market का रुख मजबूती वाला है।`,
    (n) => `${n} में दिन की चाल ऊपर की ओर है और भाव कल के close के ऊपर टिके हैं।`,
    (n) => `कल के close के ऊपर trading कर रहे ${n} में buying का रुख दिख रहा है।`,
    (n) => `${n} के भाव कल के level से ऊपर हैं, जिससे market का mood positive बना हुआ है।`,
    (n) => `${n} के भाव कल के close से ऊपर बने हुए हैं, यानी आज buyers का पलड़ा भारी दिख रहा है।`,
  ],
  down: [
    (n) => `आज ${n} के भाव कल के close से नीचे चल रहे हैं और market का रुख नरमी वाला है।`,
    (n) => `${n} में दिन की चाल नीचे की ओर है और भाव कल के close के नीचे टिके हैं।`,
    (n) => `कल के close के नीचे trading कर रहे ${n} में selling का रुख दिख रहा है।`,
    (n) => `${n} के भाव कल के level से नीचे हैं, जिससे market में सावधानी का माहौल बना हुआ है।`,
    (n) => `${n} के भाव कल के close से नीचे बने हुए हैं, यानी आज selling करने वालों का पलड़ा भारी दिख रहा है।`,
  ],
  flat: [
    (n) => `${n} के भाव कल के close के आसपास ही चल रहे हैं और market का रुख संतुलित है।`,
    (n) => `${n} में दिन की चाल flat है और भाव कल के level के करीब टिके हैं।`,
    (n) => `कल के close के पास trading कर रहे ${n} में फिलहाल कोई साफ trend नहीं दिख रहा है।`,
    (n) => `${n} के भाव में ठहराव है और trading कल के level के आसपास सिमटी है।`,
    (n) => `${n} के भाव कल के close के आसपास टिके हैं, यानी buyers और selling करने वाले दोनों संतुलन में दिख रहे हैं।`,
  ],
};

// ---- 2a. how big is today's move (by the board's change %, sign does not matter)
const SIZE = {
  tiny: [
    () => 'आज की चाल बहुत सीमित है, इसलिए भाव किसी नए trend की बजाय एक range में घूमते दिख रहे हैं।',
    () => 'volatility कम है और market फिलहाल किसी साफ direction का इंतजार करता दिखता है।',
    () => 'भाव में हलचल बहुत कम है, जिससे trading शांत ढंग से चल रही है।',
    () => 'भाव की range बहुत छोटी है, इसलिए आज market में जल्दबाजी जैसा माहौल नहीं दिखता।',
  ],
  normal: [
    () => 'आज की चाल normal range में है और trading संतुलित ढंग से चल रही है।',
    () => 'volatility normal है, इसलिए market में अचानक बदलाव जैसी स्थिति नहीं दिखती।',
    () => 'भाव की चाल नपी-तुली है और market में कोई असामान्य हलचल नहीं है।',
    () => 'भाव normal range में चल रहे हैं, यानी आज की trading सधी हुई दिखती है।',
  ],
  fast: [
    () => 'आज की चाल normal से तेज है और भाव में उतार-चढ़ाव ज्यादा दिख रहा है।',
    () => 'भाव में अच्छी हलचल है, यानी market की चाल आज सामान्य दिनों से तेज है।',
    () => 'volatility बढ़ी हुई है, इसलिए भाव में तेज चाल देखने को मिल रही है।',
    () => 'भाव की range सामान्य से बड़ी है, इसलिए traders को आज चाल पर करीबी नजर रखनी पड़ रही है।',
  ],
  sharp: [
    () => 'आज भाव में बड़ी हलचल है और volatility सामान्य से काफी ज्यादा है।',
    () => 'market में आज तेज चाल है, इसलिए भाव में बड़ा उतार-चढ़ाव दिख रहा है।',
    () => 'भाव में काफी तेज बदलाव आया है, जिससे आज का दिन सामान्य से ज्यादा active है।',
    () => 'आज की range काफी बड़ी है, इसलिए भाव में तेज हलचल बनी हुई है और market में सक्रियता ज्यादा है।',
  ],
};

// ---- 2b. the two spices against each other (only for the second and third commodity in the message)
const CROSS = {
  both_up: [
    (n, r) => `${r} के साथ ${n} में भी strength है, यानी तेजी का रुख दोनों मसालों में दिख रहा है।`,
    (n, r) => `${r} की तरह ${n} में भी buying का रुख है, जिससे market का माहौल एक जैसा दिखता है।`,
    (n, r) => `${r} और ${n} दोनों में आज बढ़त है, इसलिए मसाला market में मजबूती का माहौल है।`,
    (n, r) => `${r} के साथ ${n} को भी support मिला है, इसलिए दोनों मसालों में buying का रुख एक जैसा है।`,
  ],
  both_down: [
    (n, r) => `${r} के साथ ${n} में भी नरमी है, यानी pressure दोनों मसालों में दिख रहा है।`,
    (n, r) => `${r} की तरह ${n} में भी selling का रुख है, जिससे market का माहौल एक जैसा दिखता है।`,
    (n, r) => `${r} और ${n} दोनों में आज गिरावट है, इसलिए मसाला market में नरमी का माहौल है।`,
    (n, r) => `${r} के साथ ${n} पर भी pressure है, इसलिए दोनों मसालों में selling का रुख एक जैसा है।`,
  ],
  opposite: [
    (n, r) => `${r} और ${n} की चाल अलग-अलग direction में है, यानी market में एकतरफा रुख नहीं है।`,
    (n, r) => `${r} के मुकाबले ${n} की चाल उलटी है, इसलिए दोनों में अलग-अलग रुख दिख रहा है।`,
    (n, r) => `आज ${r} और ${n} एक साथ नहीं चल रहे, यानी हर मसाले का अपना अलग trend है।`,
    (n, r) => `${r} और ${n} में आज एक जैसा रुख नहीं है, इसलिए हर मसाले को अलग से देखना ठीक रहेगा।`,
  ],
};

// ---- 2c. where the contract stands before its expiry (the month name stays in Hindi: "नवंबर contract")
const EXPIRY = {
  today: [
    (n, m) => `आज ${m} contract की expiry का दिन है, इसलिए सौदों के settlement का असर भाव पर दिख सकता है।`,
    (n, m) => `${m} contract की expiry आज है, इसलिए traders की नजर सौदे settle करने पर बनी हुई है।`,
    (n, m) => `${m} contract आज expire हो रहा है, इसलिए आखिरी समय के settlement के कारण भाव में अचानक उतार-चढ़ाव आ सकता है।`,
  ],
  days: [ // (name, month, days left)
    (n, m, d) => `${m} contract की expiry में अब ${d} दिन बचे हैं, इसलिए सौदों के settlement और rollover का असर भावों में दिख सकता है।`,
    (n, m, d) => `expiry में ${d} दिन शेष होने से ${m} contract में सौदे आगे बढ़ाने (rollover) की हलचल रह सकती है।`,
    (n, m, d) => `${m} contract expiry के करीब है (${d} दिन शेष), इसलिए traders की नजर सौदे settle करने या आगे बढ़ाने पर रहती है।`,
  ],
  this_month: [ // only the month is known and it is the running month
    (n, m) => `यह चालू माह (${m}) का contract है, इसलिए expiry नजदीक आने पर सौदों के rollover पर market की नजर रहती है।`,
    (n, m) => `${m} contract चालू माह का है और expiry की ओर बढ़ रहा है, इसलिए settlement का असर बीच-बीच में भाव पर दिख सकता है।`,
    (n, m) => `चालू माह का contract होने से ${m} में expiry से पहले सौदे आगे बढ़ाने की हलचल रह सकती है।`,
  ],
  far: [
    (n, m) => `${m} contract की expiry में अभी समय है, इसलिए settlement की हलचल की बजाय market की नजर demand और supply के संकेतों पर रहती है।`,
    (n, m) => `expiry दूर होने से ${m} contract में settlement की हलचल अभी कम रहती है और भाव market की सामान्य चाल के हिसाब से चल रहे हैं।`,
    (n, m) => `${m} contract की expiry दूर है, इसलिए rollover की हलचल अभी नहीं दिख रही और market demand-supply के हिसाब से चल रहा है।`,
  ],
};

// ---- 2d. what the market usually watches at this time of the year (general background, not news)
// rabi crops (jeera, dhaniya): sown Oct-Dec, harvested Feb-Apr.  turmeric: planted Apr-Jul, harvested Jan-Apr.
const SEASON = {
  rabi: {
    sow: [ // Oct - Dec
      () => 'इन दिनों आमतौर पर रबी की बुवाई का दौर रहता है, इसलिए market की नजर रकबे और weather पर बनी रहती है।',
      () => 'बुवाई के इस season में market आमतौर पर रकबे के अनुमान और weather की स्थिति पर नजर रखता है।',
      () => 'त्योहार और शादियों के season में मसालों की domestic demand पर आमतौर पर market की नजर रहती है।',
    ],
    crop: [ // Jan - Mar
      () => 'फसल पकने के इस दौर में market की नजर production के अनुमान और नई आवक की तैयारी पर रहती है।',
      () => 'नई फसल की आवक नजदीक होने से market आमतौर पर production के अनुमान पर नजर रखता है।',
    ],
    arrivals: [ // Apr - Jun
      () => 'नई फसल की आवक के बाद आमतौर पर market की नजर stock की स्थिति और export demand पर रहती है।',
      () => 'इस समय market में stock की स्थिति और export की demand पर चर्चा ज्यादा रहती है।',
    ],
    stock: [ // Jul - Sep
      () => 'इस season में market आमतौर पर बचे हुए stock और domestic व export demand पर नजर रखता है।',
      () => 'मानसून के दिनों में market की नजर stock की उपलब्धता और demand पर बनी रहती है।',
    ],
  },
  turmeric: {
    sow: [ // Oct - Dec: the crop is growing
      () => 'फसल की बढ़वार के इस दौर में market की नजर weather और पुराने stock पर रहती है।',
      () => 'त्योहार और शादियों के season में मसालों की domestic demand पर आमतौर पर market की नजर रहती है।',
    ],
    crop: [ // Jan - Mar: harvest
      () => 'नई फसल की खुदाई और आवक के दौर में market की नजर production और आवक पर रहती है।',
      () => 'नई फसल की आवक शुरू होने के समय market आमतौर पर production के अनुमान पर नजर रखता है।',
    ],
    arrivals: [ // Apr - Jun
      () => 'नई आवक के बाद market की नजर stock की स्थिति और demand पर रहती है।',
      () => 'इस समय market आमतौर पर stock और नई बुवाई के आंकड़ों पर नजर रखता है।',
    ],
    stock: [ // Jul - Sep
      () => 'बुवाई के बाद के इन दिनों में market की नजर फसल पर weather के असर और stock पर रहती है।',
      () => 'मानसून के दिनों में market आमतौर पर फसल की स्थिति और stock पर नजर रखता है।',
    ],
  },
};
const seasonOf = (month) => (month >= 10 ? 'sow' : month >= 7 ? 'stock' : month >= 4 ? 'arrivals' : 'crop');

// ---- status word shown in the heading (from the board's own change against yesterday's close)
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
const dir = (v, tol = 0) => (v > tol ? 'up' : v < -tol ? 'down' : 'flat');
const inr = (n) => Number(n).toLocaleString('en-IN');

/** whole days from the date key `a` to the date key `b` (both "YYYY-MM-DD") */
function daysBetween(a, b) {
  const t = (k) => Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)));
  return Math.round((t(b) - t(a)) / 86400000);
}

/** the contract's position before expiry -> { kind, month, days } or null */
export function expiryInfo(expiry, today) {
  if (!expiry || !today || !/^\d{4}-\d{2}/.test(expiry)) return null;
  const em = Number(expiry.slice(5, 7));
  const ey = Number(expiry.slice(0, 4));
  const ty = Number(today.slice(0, 4));
  const tm = Number(today.slice(5, 7));
  const month = MONTHS_HI[em - 1];
  const known = /^\d{4}-\d{2}-\d{2}$/.test(expiry) && !expiry.endsWith('-01'); // "-01" only marks "this month"
  if (known) {
    const d = daysBetween(today, expiry);
    if (d < 0) return null;
    if (d === 0) return { kind: 'today', month };
    if (d <= 10) return { kind: 'days', month, days: d };
    return { kind: 'far', month };
  }
  const gap = (ey - ty) * 12 + (em - tm);
  if (gap === 0) return { kind: 'this_month', month };
  if (gap > 0) return { kind: 'far', month };
  return null;
}

/**
 * One commodity. Everything comes from the board's own numbers.
 *   key, ltp, prev (yesterday's close), open, change, changePct, expiry ("YYYY-MM-DD", "-01" = only the month is known)
 *   dateKey (today, IST), rot (0..4 = which update of the day; makes consecutive updates differ), index (0 = first commodity)
 *   ref: { key, changePct } of the first commodity in the message (for the second and third one), or null
 */
export function outlook({ key, ltp, prev, open, change, changePct, expiry, dateKey, rot = 0, index = 0, ref = null }) {
  const n = NAMES_HI[key];
  const status = statusFor(change, ltp);
  const base = hash(`${dateKey}|${key}`) + rot;
  const pick = (arr, off) => arr[(base + off + index * 2) % arr.length];

  // 1. the day against its opening
  const openKnown = open != null && prev > 0 && open > 0 && open !== prev;
  let first;
  if (openKnown) {
    const gap = dir((open - prev) / prev * 100, 0.15);
    const k = gap === 'up' ? (ltp < open ? 'up_fade' : 'up_hold')
      : gap === 'down' ? (ltp > open ? 'down_recover' : 'down_hold')
        : `flat_${dir((ltp - open) / ltp * 100, 0.05)}`;
    first = pick(OPEN[k], 0)(n);
  } else {
    first = pick(NO_OPEN[dir(Math.round(change))], 0)(n);
  }

  // 2. the extra sentences available for this commodity, in the order they are shown
  const pct = Math.abs(changePct || 0);
  const size = pct < 0.25 ? 'tiny' : pct < 0.8 ? 'normal' : pct < 1.6 ? 'fast' : 'sharp';
  const extra = { size: pick(SIZE[size], 1)() };
  if (ref && Math.abs(ref.changePct || 0) >= 0.1 && pct >= 0.1) {
    const same = Math.sign(ref.changePct) === Math.sign(changePct);
    const k = !same ? 'opposite' : changePct > 0 ? 'both_up' : 'both_down';
    extra.cross = pick(CROSS[k], 2)(n, NAMES_HI[ref.key]);
  }
  const ex = expiryInfo(expiry, dateKey);
  if (ex) {
    const arr = EXPIRY[ex.kind];
    extra.expiry = ex.kind === 'days' ? pick(arr, 3)(n, ex.month, ex.days) : pick(arr, 3)(n, ex.month);
  }
  const month = Number(dateKey.slice(5, 7));
  const crop = key === 'turmeric' ? 'turmeric' : 'rabi';
  extra.season = pick(SEASON[crop][seasonOf(month)], 4)();

  // 3. how many to use (3 or 4 sentences in all) and which ones: the choice rotates with the update
  const pool = ['expiry', 'cross', 'size', 'season'].filter((k) => extra[k]);
  const start = pool.length ? (base + index) % pool.length : 0;
  const rotated = pool.map((_, i) => pool[(start + i) % pool.length]);
  const want = 3 + (((base >>> 2) + index) % 2); // 3 or 4 sentences in all
  const chosen = new Set(rotated.slice(0, want - 1));
  const sentences = [first, ...['size', 'cross', 'expiry', 'season'].filter((k) => chosen.has(k)).map((k) => extra[k])];
  return { status, text: sentences.join(' '), parts: sentences };
}

// kept for callers that format rupee amounts in Hindi text
export { inr };
