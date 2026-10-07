// api/ncdex.js
export default async function handler(req, res) {
  try {
    const response = await fetch('https://www.ncdex.com/market-watch/live_quotes', {
      headers: {
        // Disguise the server request as a standard browser
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `NCDEX responded with ${response.status}` });
    }

    const html = await response.text();
    
    // Set permissive CORS headers for your frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/html');
    
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
