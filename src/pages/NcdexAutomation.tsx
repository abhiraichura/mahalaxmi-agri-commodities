import React, { useState, useEffect } from 'react';

interface SpiceQuote {
  symbol: string;
  expiry: string;
  open: number;
  prevClose: number;
  ltp: number;
  change: string;
  changePct: string;
  oi: string;
}

interface HistoryStore {
  date: string;
  readings: Record<string, { jeera: number; dhaniya: number; turmeric: number }>;
}

export default function NcdexAutomation() {
  const [output, setOutput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [telegramStatus, setTelegramStatus] = useState<string>('');
  const [botToken, setBotToken] = useState<string>(() => localStorage.getItem('ncdex_tg_bot_token') || '');
  const [chatId, setChatId] = useState<string>(() => localStorage.getItem('ncdex_tg_chat_id') || '');
  const [bypassHourCheck, setBypassHourCheck] = useState<boolean>(false);

  const STORAGE_KEY = 'ncdex_spice_ltp_history';
  const TARGET_HOURS = [10, 12, 14, 16, 17];

  const TITLES: Record<number, string> = {
    10: 'NCDEX SPICE MARKET OPEN UPDATE',
    12: 'NCDEX SPICE MARKET MID MORNING UPDATE',
    14: 'NCDEX SPICE MARKET AFTERNOON UPDATE',
    16: 'NCDEX SPICE MARKET PRE-CLOSE UPDATE',
    17: 'NCDEX SPICE MARKET CLOSING UPDATE',
  };

  useEffect(() => {
    localStorage.setItem('ncdex_tg_bot_token', botToken);
  }, [botToken]);

  useEffect(() => {
    localStorage.setItem('ncdex_tg_chat_id', chatId);
  }, [chatId]);

  const getISTTime = (): Date => {
    const now = new Date();
    const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    return new Date(istString);
  };

  const formatISTDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month}${year}`;
  };

  const formatISTTime = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes}${ampm}`;
  };

  const parseShortExpiry = (rawExpiry: string): string => {
    if (!rawExpiry) return 'Oct';
    const match = rawExpiry.match(/[a-zA-Z]{3}/);
    if (match) {
      const month = match[0].toLowerCase();
      return month.charAt(0).toUpperCase() + month.slice(1);
    }
    return rawExpiry.trim();
  };

  const generateAnalysis = (jeeraMov: number, dhaniyaMov: number, turmericMov: number): string => {
    const items = [
      { name: 'Jeera', val: jeeraMov },
      { name: 'Dhaniya', val: dhaniyaMov },
      { name: 'Turmeric', val: turmericMov },
    ];

    const up = items.filter(i => i.val > 0).map(i => i.name);
    const down = items.filter(i => i.val < 0).map(i => i.name);
    const flat = items.filter(i => i.val === 0).map(i => i.name);

    if (up.length === 3) {
      return 'The spice complex displayed broad-based positive momentum since the previous update. Jeera, Dhaniya, and Turmeric all recorded gains across the board.';
    }
    if (down.length === 3) {
      return 'The spice complex faced widespread downward pressure since the previous update. Jeera, Dhaniya, and Turmeric all traded lower across the board.';
    }
    if (flat.length === 3) {
      return 'The spice complex remained in steady consolidation since the previous update. Prices across all three counters held unchanged.';
    }
    if (up.length === 2) {
      const lagging = down.length > 0 ? `${down[0]} witnessed downward movement` : `${flat[0]} remained flat`;
      return `The spice pack traded with an upward bias, led by positive movement in ${up.join(' and ')}. In contrast, ${lagging}.`;
    }
    if (down.length === 2) {
      const resilient = up.length > 0 ? `${up[0]} held in positive territory` : `${flat[0]} held steady`;
      return `The spice pack exhibited a softer tone, pressured by declines in ${down.join(' and ')}. Meanwhile, ${resilient}.`;
    }
    return `The spice complex showed mixed and divergent movement since the previous update. ${up[0]} advanced, ${down[0]} declined, and${flat[0]} remained unchanged.`;
  };

  const fetchBoardData = async (): Promise<{ jeera: SpiceQuote; dhaniya: SpiceQuote; turmeric: SpiceQuote }> => {
    const targetUrl = 'https://www.ncdex.com/market-watch/live_quotes';
    
    // Multi-proxy fallback strategy to bypass Cloudflare/CORS blocks
    const fetchMethods = [
      async () => {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
        if (!res.ok) throw new Error('AllOrigins Failed');
        const data = await res.json();
        return data.contents as string;
      },
      async () => {
        const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`);
        if (!res.ok) throw new Error('Codetabs Failed');
        return await res.text();
      },
      async () => {
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
        if (!res.ok) throw new Error('Corsproxy Failed');
        return await res.text();
      }
    ];

    let htmlText = '';
    let fetched = false;

    for (const method of fetchMethods) {
      try {
        const text = await method();
        if (text && (text.includes('JEERA') || text.includes('Jeera'))) {
          htmlText = text;
          fetched = true;
          break;
        }
      } catch (e) {
        console.warn('Proxy attempt failed, trying next...');
      }
    }

    if (!fetched) {
      throw new Error('All proxy networks blocked or NCDEX is unreachable.');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const tableRows = Array.from(doc.querySelectorAll('table tbody tr'));

    const extractCommodity = (keywords: string[], displayName: string): SpiceQuote => {
      const matchedRows = tableRows.filter(row => {
        const text = row.textContent?.toUpperCase() || '';
        return keywords.some(k => text.includes(k.toUpperCase()));
      });

      if (matchedRows.length === 0) {
        return {
          symbol: displayName,
          expiry: 'Oct',
          open: 0,
          prevClose: 0,
          ltp: 0,
          change: '0',
          changePct: '0.00%',
          oi: '0',
        };
      }

      const row = matchedRows[0];
      const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() || '');

      const rawExpiry = cells[1] || '';
      const expiry = parseShortExpiry(rawExpiry);
      const open = Math.round(parseFloat(cells[2]?.replace(/,/g, '') || '0'));
      const ltp = Math.round(parseFloat(cells[5]?.replace(/,/g, '') || '0'));
      const changeNum = parseFloat(cells[6]?.replace(/,/g, '') || '0');
      const prevClose = Math.round(ltp - changeNum);
      const change = cells[6] || '0';
      const changePct = cells[7] || '0.00%';
      const oi = cells[9] || cells[8] || '0';

      return {
        symbol: displayName,
        expiry,
        open,
        prevClose,
        ltp,
        change: change.startsWith('+') || change.startsWith('-') ? change : (changeNum > 0 ? `+${change}` : change),
        changePct: changePct.includes('%') ? changePct : `${changePct}%`,
        oi,
      };
    };

    return {
      jeera: extractCommodity(['JEERAUNJHA', 'JEERA'], 'Jeera'),
      dhaniya: extractCommodity(['DHANIYA', 'CORIANDER'], 'Dhaniya'),
      turmeric: extractCommodity(['TMCFGRNZM', 'TURMERIC'], 'Turmeric'),
    };
  };

  const sendTelegramAlert = async (text: string) => {
    if (!botToken || !chatId) return;
    setTelegramStatus('Sending Telegram alert...');
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
        }),
      });
      if (res.ok) {
        setTelegramStatus('Telegram notification sent successfully!');
      } else {
        setTelegramStatus('Telegram notification failed. Check Token and Chat ID.');
      }
    } catch {
      setTelegramStatus('Error dispatching Telegram message.');
    }
  };

  const handleRunAutomation = async () => {
    setLoading(true);
    setTelegramStatus('');
    try {
      const istNow = getISTTime();
      const currentHour = istNow.getHours();

      // STEP 1 - HOUR CHECK
      if (!TARGET_HOURS.includes(currentHour) && !bypassHourCheck) {
        setOutput('SKIP');
        setLoading(false);
        return;
      }

      const activeHour = TARGET_HOURS.includes(currentHour) ? currentHour : 17;
      const title = TITLES[activeHour] || 'NCDEX SPICE MARKET UPDATE';

      // STEP 2 - READ THE BOARD
      const { jeera, dhaniya, turmeric } = await fetchBoardData();

      // STEP 3 - READ HISTORY FILE
      const todayDateStr = `${istNow.getFullYear()}-${(istNow.getMonth() + 1).toString().padStart(2, '0')}-${istNow.getDate().toString().padStart(2, '0')}`;
      let history: HistoryStore = { date: todayDateStr, readings: {} };

      const storedHistory = localStorage.getItem(STORAGE_KEY);
      if (storedHistory) {
        try {
          const parsed = JSON.parse(storedHistory);
          if (parsed && parsed.date === todayDateStr && typeof parsed.readings === 'object') {
            history = parsed;
          }
        } catch {
          history = { date: todayDateStr, readings: {} };
        }
      }

      // STEP 4 - CALCULATE MOVEMENT
      const calculateMovement = (current: SpiceQuote, commodityKey: 'jeera' | 'dhaniya' | 'turmeric') => {
        if (activeHour === 10) {
          const movementVal = current.open - current.prevClose;
          return { val: Math.round(movementVal), label: '(open vs prev close)' };
        }

        const storedHours = Object.keys(history.readings)
          .map(Number)
          .filter(h => h < activeHour)
          .sort((a, b) => b - a);

        if (storedHours.length > 0) {
          const latestEarlierHour = storedHours[0];
          const storedLtp = history.readings[latestEarlierHour.toString()]?.[commodityKey];

          if (storedLtp !== undefined && storedLtp !== 0) {
            const movementVal = current.ltp - storedLtp;
            const hourDisplay = latestEarlierHour === 12 
              ? '12 PM' 
              : latestEarlierHour > 12 
                ? `${latestEarlierHour - 12} PM` 
                : `${latestEarlierHour} AM`;
            return { val: Math.round(movementVal), label: `(vs ${hourDisplay})` };
          }
        }

        const fallbackChange = parseFloat(current.change.replace(/[+,\s]/g, '')) || 0;
        return { val: Math.round(fallbackChange), label: '(vs prev close)' };
      };

      const mJeera = calculateMovement(jeera, 'jeera');
      const mDhaniya = calculateMovement(dhaniya, 'dhaniya');
      const mTurmeric = calculateMovement(turmeric, 'turmeric');

      const formatMovementString = (val: number): string => {
        if (val > 0) return `+₹${val}`;
        if (val < 0) return `−₹${Math.abs(val)}`;
        return `₹0`;
      };

      // STEP 5 - SAVE HISTORY
      if (jeera.ltp > 0 || dhaniya.ltp > 0 || turmeric.ltp > 0) {
        history.readings[activeHour.toString()] = {
          jeera: Math.round(jeera.ltp),
          dhaniya: Math.round(dhaniya.ltp),
          turmeric: Math.round(turmeric.ltp),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      }

      // STEP 6 - OUTPUT
      const dateText = formatISTDate(istNow);
      const timeText = formatISTTime(istNow);
      const analysisText = generateAnalysis(mJeera.val, mDhaniya.val, mTurmeric.val);

      const finalOutput = `\`\`\`text
${title}
*${dateText} | ${timeText}*

*Jeera ${jeera.expiry}* — ₹${jeera.ltp} | ${jeera.change} (${jeera.changePct}) | OI ${jeera.oi}
*Dhaniya ${dhaniya.expiry}* — ₹${dhaniya.ltp} | ${dhaniya.change} (${dhaniya.changePct}) | OI ${dhaniya.oi}
*Turmeric ${turmeric.expiry}* — ₹${turmeric.ltp} | ${turmeric.change} (${turmeric.changePct}) | OI ${turmeric.oi}

*Movement Since Previous Update*
Jeera ${formatMovementString(mJeera.val)} | Dhaniya ${formatMovementString(mDhaniya.val)} | Turmeric ${formatMovementString(mTurmeric.val)} ${mJeera.label}

*Analysis*
${analysisText}

Feel free to share your buy or sell requirement — we'll do our best to get you the best deal.

Mahalaxmi Agri Commodities, Rajkot
M: 90330 00032, 99099 71301
\`\`\``;

      setOutput(finalOutput);
      await sendTelegramAlert(finalOutput);
    } catch (error) {
      setOutput(`Error: ${(error as Error).message}. Verify network connectivity.`);
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <h1 className="text-xl font-bold text-gray-900">NCDEX Spices Automation</h1>
            <p className="text-sm text-gray-500 mt-1">
              Live updates for Jeera, Dhaniya, and Turmeric at 10 AM, 12 PM, 2 PM, 4 PM, and 5 PM IST.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunAutomation}
              disabled={loading}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Fetching Quotes...' : 'Run Automation Now'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="bypassHour"
            checked={bypassHourCheck}
            onChange={(e) => setBypassHourCheck(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
          />
          <label htmlFor="bypassHour" className="text-xs text-gray-600 cursor-pointer">
            Bypass hour restriction for testing (run anytime outside 10, 12, 14, 16, 17 IST)
          </label>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Telegram Bot Token (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 123456:ABC-DEF1234..."
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Telegram Chat ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 987654321"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        {telegramStatus && (
          <div className="mt-3 text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-md">
            {telegramStatus}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700">Automation Output</h2>
          {output && output !== 'SKIP' && (
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
            >
              {copied ? 'Copied!' : 'Copy Formatted Text'}
            </button>
          )}
        </div>

        <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs sm:text-sm text-gray-100 min-h-[360px] overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
          {output ? output : '// Output will render here upon clicking "Run Automation Now"'}
        </div>
      </div>
    </div>
  );
}
