// "Quick Outlook" text in plain Hindi.
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

export const NAMES_HI = { jeera: 'जीरा', dhaniya: 'धनिया', turmeric: 'हल्दी' };
export const MONTHS_HI = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

// ---- 1. the day against its opening. ("भाव" is always the subject so the grammar fits जीरा, धनिया and हल्दी.)
const OPEN = {
  up_hold: [ // opened above yesterday's close and is still above the opening level
    (n) => `आज ${n} के भाव कल के बंद भाव से ऊपर खुले और अब तक खुले स्तर से ऊपर टिके हुए हैं, जो खरीदारी के समर्थन का संकेत माना जाता है।`,
    (n) => `${n} की शुरुआत कल के बंद भाव से ऊपर हुई थी और भाव अब भी खुले स्तर के ऊपर कायम हैं, यानी तेजी का रुख बना हुआ है।`,
    (n) => `ऊपर खुलने के बाद भी ${n} के भाव खुले स्तर के ऊपर टिके हैं, जिससे खरीदारों की पकड़ मजबूत दिखाई देती है।`,
    (n) => `${n} में आज की शुरुआत मजबूत रही और भाव खुले स्तर से नीचे नहीं आए हैं, जो बाजार के भरोसे को दर्शाता है।`,
    (n) => `${n} में खरीदारों का सहारा बना हुआ है: भाव कल के बंद भाव से ऊपर खुले थे और अब तक खुले स्तर के ऊपर ही चल रहे हैं।`,
  ],
  up_fade: [ // opened above, now below the opening level
    (n) => `${n} के भाव कल के बंद भाव से ऊपर खुले थे, पर अब खुले स्तर से नीचे आ गए हैं; ऊंचे भाव पर मुनाफावसूली का असर दिख रहा है।`,
    (n) => `ऊंची शुरुआत के बाद ${n} के भाव खुले स्तर से फिसल गए हैं, यानी ऊपरी स्तर पर बिकवाली आई है।`,
    (n) => `${n} में आज ऊपर खुलकर भाव कमजोर पड़े हैं और अब खुले स्तर के नीचे हैं, जिससे तेजी की रफ्तार थमती दिख रही है।`,
    (n) => `मजबूत शुरुआत के बावजूद ${n} के भाव खुले स्तर के नीचे लौट आए हैं, इसलिए ऊपर के भाव पर मुनाफा कमाने की प्रवृत्ति दिख रही है।`,
    (n) => `${n} के भाव ऊपर खुलकर खुले स्तर से नीचे आ गए हैं, जिससे लगता है कि ऊंचे भाव पर खरीदार कम हुए हैं।`,
  ],
  down_hold: [ // opened below yesterday's close and is still at or below the opening level
    (n) => `${n} के भाव कल के बंद भाव से नीचे खुले और अब भी खुले स्तर के नीचे चल रहे हैं, जिससे बिकवाली का दबाव बना हुआ दिखता है।`,
    (n) => `कमजोर शुरुआत के बाद ${n} के भाव खुले स्तर से ऊपर नहीं निकल पाए हैं, यानी बाजार में सतर्कता बनी हुई है।`,
    (n) => `${n} की शुरुआत नरम रही और भाव अब तक खुले स्तर के नीचे ही हैं, जो बिकवाली के असर की ओर इशारा करता है।`,
    (n) => `नीचे खुलने के बाद ${n} में खरीदारी का कोई खास सहारा नहीं दिखा है और भाव खुले स्तर से नीचे टिके हैं।`,
    (n) => `${n} में नीचे खुलने के बाद भी भाव खुले स्तर के नीचे ही हैं, यानी बिकवाली का असर अब तक कम नहीं हुआ है।`,
  ],
  down_recover: [ // opened below, now above the opening level
    (n) => `${n} के भाव कल के बंद भाव से नीचे खुले थे, पर अब खुले स्तर से ऊपर लौट आए हैं; निचले भाव पर खरीदारी का सहारा मिलता दिख रहा है।`,
    (n) => `नरम शुरुआत के बाद ${n} में निचले स्तर से सुधार आया है और भाव खुले स्तर के ऊपर आ गए हैं।`,
    (n) => `${n} में नीचे खुलकर भाव संभले हैं और अब खुले स्तर से ऊपर हैं, यानी गिरावट पर खरीदारों की दिलचस्पी दिखी है।`,
    (n) => `कमजोर शुरुआत के बावजूद ${n} के भाव खुले स्तर के ऊपर टिके हैं, जो निचले स्तर पर समर्थन का संकेत है।`,
    (n) => `${n} की शुरुआत नीचे हुई थी, पर भाव खुले स्तर से ऊपर निकल आए हैं, जो निचले भाव पर मांग आने का संकेत है।`,
  ],
  flat_up: [ // opened near yesterday's close, now above the opening level
    (n) => `${n} के भाव कल के बंद के आसपास खुले थे और अब खुले स्तर से ऊपर हैं, यानी दिन में धीरे-धीरे भाव को सहारा मिला है।`,
    (n) => `सपाट शुरुआत के बाद ${n} के भाव खुले स्तर से ऊपर निकले हैं, जिससे खरीदारी का हल्का रुख बनता दिख रहा है।`,
    (n) => `${n} में आज की शुरुआत बिना बड़े बदलाव के हुई, लेकिन अब भाव खुले स्तर के ऊपर चल रहे हैं।`,
    (n) => `कल के बंद भाव के पास खुलने के बाद ${n} के भाव धीरे-धीरे ऊपर सरके हैं।`,
    (n) => `${n} में आज खास गैप के बिना शुरुआत हुई और बाद में भाव खुले स्तर के ऊपर चले गए, यानी धीरे-धीरे खरीदारी आई है।`,
  ],
  flat_down: [
    (n) => `${n} के भाव कल के बंद के आसपास खुले थे और अब खुले स्तर से नीचे हैं, यानी दिन में हल्का दबाव आया है।`,
    (n) => `सपाट शुरुआत के बाद ${n} के भाव खुले स्तर से नीचे सरके हैं, जिससे बिकवाली का हल्का रुख बनता दिख रहा है।`,
    (n) => `${n} में आज की शुरुआत बिना बड़े बदलाव के हुई, लेकिन अब भाव खुले स्तर के नीचे चल रहे हैं।`,
    (n) => `कल के बंद भाव के पास खुलने के बाद ${n} के भाव धीरे-धीरे नीचे खिसके हैं।`,
    (n) => `${n} में आज खास गैप के बिना शुरुआत हुई और बाद में भाव खुले स्तर के नीचे चले गए, यानी धीरे-धीरे बिकवाली आई है।`,
  ],
  flat_flat: [
    (n) => `${n} के भाव कल के बंद के आसपास खुले और खुले स्तर के करीब ही टिके हैं, यानी कारोबार सीमित दायरे में चल रहा है।`,
    (n) => `आज ${n} में शुरुआत से अब तक भाव लगभग एक ही स्तर पर बने हुए हैं, जो बाजार में दिशा का इंतजार दिखाता है।`,
    (n) => `${n} के भाव खुले स्तर के आसपास घूम रहे हैं, इसलिए फिलहाल कोई स्पष्ट रुख नहीं बन पाया है।`,
    (n) => `सपाट शुरुआत के बाद भी ${n} के भाव में ठहराव है और कारोबार एक दायरे में सिमटा है।`,
    (n) => `${n} में आज न ऊपर और न नीचे कोई बड़ा गैप बना और भाव खुले स्तर के आसपास ही घूम रहे हैं।`,
  ],
};

// when the opening price is not known (it was not sent): only the side of yesterday's close can be said
const NO_OPEN = {
  up: [
    (n) => `आज ${n} के भाव कल के बंद भाव से ऊपर चल रहे हैं और बाजार का रुख मजबूती वाला है।`,
    (n) => `${n} में दिन की चाल ऊपर की ओर है और भाव कल के बंद भाव के ऊपर टिके हैं।`,
    (n) => `कल के बंद भाव के ऊपर कारोबार कर रहे ${n} में खरीदारी का रुख दिख रहा है।`,
    (n) => `${n} के भाव कल के स्तर से ऊपर हैं, जिससे बाजार का माहौल सकारात्मक बना हुआ है।`,
    (n) => `${n} के भाव कल के बंद से ऊपर बने हुए हैं, यानी आज खरीदारों का पलड़ा भारी दिख रहा है।`,
  ],
  down: [
    (n) => `आज ${n} के भाव कल के बंद भाव से नीचे चल रहे हैं और बाजार का रुख नरमी वाला है।`,
    (n) => `${n} में दिन की चाल नीचे की ओर है और भाव कल के बंद भाव के नीचे टिके हैं।`,
    (n) => `कल के बंद भाव के नीचे कारोबार कर रहे ${n} में बिकवाली का रुख दिख रहा है।`,
    (n) => `${n} के भाव कल के स्तर से नीचे हैं, जिससे बाजार में सतर्कता का माहौल बना हुआ है।`,
    (n) => `${n} के भाव कल के बंद से नीचे बने हुए हैं, यानी आज बिकवाली करने वालों का पलड़ा भारी दिख रहा है।`,
  ],
  flat: [
    (n) => `${n} के भाव कल के बंद भाव के आसपास ही चल रहे हैं और बाजार का रुख संतुलित है।`,
    (n) => `${n} में दिन की चाल सपाट है और भाव कल के स्तर के करीब टिके हैं।`,
    (n) => `कल के बंद भाव के पास कारोबार कर रहे ${n} में फिलहाल कोई साफ रुख नहीं दिख रहा है।`,
    (n) => `${n} के भाव में ठहराव है और कारोबार कल के स्तर के आसपास सिमटा है।`,
    (n) => `${n} के भाव कल के बंद के आसपास टिके हैं, यानी खरीदार और बिकवाल दोनों संतुलन में दिख रहे हैं।`,
  ],
};

// ---- 2a. how big is today's move (by the board's change %, sign does not matter)
const SIZE = {
  tiny: [
    () => 'आज की चाल बहुत सीमित है, इसलिए भाव किसी नए रुख की बजाय एक दायरे में घूमते दिख रहे हैं।',
    () => 'उतार-चढ़ाव कम है और बाजार फिलहाल किसी साफ दिशा की प्रतीक्षा में दिखता है।',
    () => 'भाव में हलचल बहुत कम है, जिससे कारोबार शांत ढंग से चल रहा है।',
    () => 'भाव का दायरा बहुत छोटा है, इसलिए आज बाजार में जल्दबाजी जैसा माहौल नहीं दिखता।',
  ],
  normal: [
    () => 'आज की चाल सामान्य दायरे में है और कारोबार संतुलित ढंग से चल रहा है।',
    () => 'उतार-चढ़ाव सामान्य सीमा में है, इसलिए बाजार में अचानक बदलाव जैसी स्थिति नहीं दिखती।',
    () => 'भाव की चाल नपी-तुली है और बाजार में कोई असामान्य हलचल नहीं है।',
    () => 'भाव सामान्य दायरे में चल रहे हैं, यानी आज का कारोबार सधा हुआ दिखता है।',
  ],
  fast: [
    () => 'आज की चाल सामान्य से तेज है और भाव में उतार-चढ़ाव ज्यादा दिख रहा है।',
    () => 'भाव में अच्छी हलचल है, यानी बाजार की चाल आज सामान्य दिनों से तेज है।',
    () => 'उतार-चढ़ाव बढ़ा हुआ है, इसलिए भाव में तेज चाल देखने को मिल रही है।',
    () => 'भाव का दायरा सामान्य से बड़ा है, इसलिए कारोबारियों को आज चाल पर करीबी नजर रखनी पड़ रही है।',
  ],
  sharp: [
    () => 'आज भाव में बड़ी हलचल है और उतार-चढ़ाव सामान्य से काफी ज्यादा है।',
    () => 'बाजार में आज तेज चाल है, इसलिए भाव में बड़ा उतार-चढ़ाव दिख रहा है।',
    () => 'भाव में काफी तेज बदलाव आया है, जिससे आज का दिन सामान्य से ज्यादा सक्रिय है।',
    () => 'आज का दायरा काफी बड़ा है, इसलिए भाव में तेज हलचल बनी हुई है और बाजार में सक्रियता ज्यादा है।',
  ],
};

// ---- 2b. the two spices against each other (only for the second and third commodity in the message)
const CROSS = {
  both_up: [
    (n, r) => `${r} के साथ ${n} में भी मजबूती है, यानी तेजी का रुख दोनों मसालों में दिख रहा है।`,
    (n, r) => `${r} की तरह ${n} में भी खरीदारी का रुख है, जिससे बाजार का माहौल एक जैसा दिखता है।`,
    (n, r) => `${r} और ${n} दोनों में आज बढ़त है, इसलिए मसाला बाजार में मजबूती का माहौल है।`,
    (n, r) => `${r} के साथ ${n} को भी सहारा मिला है, इसलिए दोनों मसालों में खरीदारी का रुख एक जैसा है।`,
  ],
  both_down: [
    (n, r) => `${r} के साथ ${n} में भी नरमी है, यानी दबाव दोनों मसालों में दिख रहा है।`,
    (n, r) => `${r} की तरह ${n} में भी बिकवाली का रुख है, जिससे बाजार का माहौल एक जैसा दिखता है।`,
    (n, r) => `${r} और ${n} दोनों में आज गिरावट है, इसलिए मसाला बाजार में नरमी का माहौल है।`,
    (n, r) => `${r} के साथ ${n} पर भी दबाव है, इसलिए दोनों मसालों में बिकवाली का रुख एक जैसा है।`,
  ],
  opposite: [
    (n, r) => `${r} और ${n} की चाल अलग-अलग दिशा में है, यानी बाजार में एकतरफा रुख नहीं है।`,
    (n, r) => `${r} के मुकाबले ${n} की चाल उलटी है, इसलिए दोनों में अलग-अलग रुख दिख रहा है।`,
    (n, r) => `आज ${r} और ${n} एक साथ नहीं चल रहे, यानी हर मसाले में अपना अलग रुख है।`,
    (n, r) => `${r} और ${n} में आज एक जैसा रुख नहीं है, इसलिए हर मसाले को अलग से देखना ठीक रहेगा।`,
  ],
};

// ---- 2c. where the contract stands before its expiry
const EXPIRY = {
  today: [
    (n, m) => `आज ${m} अनुबंध की समाप्ति का दिन है, इसलिए सौदों के निपटान का असर भाव पर दिख सकता है।`,
    (n, m) => `${m} अनुबंध की समाप्ति आज है, इसलिए कारोबारियों की नजर सौदे निपटाने पर बनी हुई है।`,
    (n, m) => `${m} अनुबंध आज समाप्त हो रहा है, इसलिए अंतिम समय के निपटान के कारण भाव में अचानक उतार-चढ़ाव आ सकता है।`,
  ],
  days: [ // (name, month, days left)
    (n, m, d) => `${m} अनुबंध की समाप्ति में अब ${d} दिन बचे हैं, इसलिए सौदों के निपटान और रोलओवर का असर भावों में दिख सकता है।`,
    (n, m, d) => `समाप्ति में ${d} दिन शेष होने से ${m} अनुबंध में सौदे आगे बढ़ाने (रोलओवर) की हलचल रह सकती है।`,
    (n, m, d) => `${m} अनुबंध समाप्ति के करीब है (${d} दिन शेष), इसलिए कारोबारियों की नजर सौदे निपटाने या आगे बढ़ाने पर रहती है।`,
  ],
  this_month: [ // only the month is known and it is the running month
    (n, m) => `यह चालू माह (${m}) का अनुबंध है, इसलिए समाप्ति नजदीक आने पर सौदों के रोलओवर पर बाजार की नजर रहती है।`,
    (n, m) => `${m} अनुबंध चालू माह का है और समाप्ति की ओर बढ़ रहा है, इसलिए सौदों के निपटान का असर बीच-बीच में भाव पर दिख सकता है।`,
    (n, m) => `चालू माह का अनुबंध होने से ${m} में समाप्ति से पहले सौदे आगे बढ़ाने की हलचल रह सकती है।`,
  ],
  far: [
    (n, m) => `${m} अनुबंध की समाप्ति में अभी समय है, इसलिए निपटान की हलचल की बजाय बाजार की नजर मांग और आपूर्ति के संकेतों पर रहती है।`,
    (n, m) => `समाप्ति दूर होने से ${m} अनुबंध में निपटान की हलचल अभी कम रहती है और भाव बाजार की सामान्य चाल के हिसाब से चल रहे हैं।`,
    (n, m) => `${m} अनुबंध की समाप्ति दूर है, इसलिए रोलओवर की हलचल अभी नहीं दिख रही और बाजार मांग-आपूर्ति के हिसाब से चल रहा है।`,
  ],
};

// ---- 2d. what the market usually watches at this time of the year (general background, not news)
// rabi crops (jeera, dhaniya): sown Oct-Dec, harvested Feb-Apr.  turmeric: planted Apr-Jul, harvested Jan-Apr.
const SEASON = {
  rabi: {
    sow: [ // Oct - Dec
      () => 'इन दिनों आमतौर पर रबी की बुवाई का दौर रहता है, इसलिए बाजार की नजर रकबे और मौसम पर बनी रहती है।',
      () => 'बुवाई के इस मौसम में बाजार आमतौर पर रकबे के अनुमान और मौसम की स्थिति पर नजर रखता है।',
      () => 'त्योहार और शादियों के सीजन में मसालों की घरेलू मांग पर आमतौर पर बाजार की नजर रहती है।',
    ],
    crop: [ // Jan - Mar
      () => 'फसल पकने के इस दौर में बाजार की नजर पैदावार के अनुमान और नई आवक की तैयारी पर रहती है।',
      () => 'नई फसल की आवक नजदीक होने से बाजार आमतौर पर पैदावार के अनुमान पर नजर रखता है।',
    ],
    arrivals: [ // Apr - Jun
      () => 'नई फसल की आवक के बाद आमतौर पर बाजार की नजर स्टॉक की स्थिति और निर्यात मांग पर रहती है।',
      () => 'इस समय बाजार में स्टॉक की स्थिति और निर्यात की मांग पर चर्चा ज्यादा रहती है।',
    ],
    stock: [ // Jul - Sep
      () => 'इस मौसम में बाजार आमतौर पर बचे हुए स्टॉक और घरेलू व निर्यात मांग पर नजर रखता है।',
      () => 'मानसून के दिनों में बाजार की नजर स्टॉक की उपलब्धता और मांग पर बनी रहती है।',
    ],
  },
  turmeric: {
    sow: [ // Oct - Dec: the crop is growing
      () => 'फसल की बढ़वार के इस दौर में बाजार की नजर मौसम और पुराने स्टॉक पर रहती है।',
      () => 'त्योहार और शादियों के सीजन में मसालों की घरेलू मांग पर आमतौर पर बाजार की नजर रहती है।',
    ],
    crop: [ // Jan - Mar: harvest
      () => 'नई फसल की खुदाई और आवक के दौर में बाजार की नजर पैदावार और आवक पर रहती है।',
      () => 'नई फसल की आवक शुरू होने के समय बाजार आमतौर पर पैदावार के अनुमान पर नजर रखता है।',
    ],
    arrivals: [ // Apr - Jun
      () => 'नई आवक के बाद बाजार की नजर स्टॉक की स्थिति और मांग पर रहती है।',
      () => 'इस समय बाजार आमतौर पर स्टॉक और नई बुवाई के आंकड़ों पर नजर रखता है।',
    ],
    stock: [ // Jul - Sep
      () => 'बुवाई के बाद के इन दिनों में बाजार की नजर फसल पर मौसम के असर और स्टॉक पर रहती है।',
      () => 'मानसून के दिनों में बाजार आमतौर पर फसल की स्थिति और स्टॉक पर नजर रखता है।',
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
