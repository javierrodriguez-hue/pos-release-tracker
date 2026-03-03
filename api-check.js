export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let url;
  try {
    url = req.body?.url;
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  if (!url) return res.status(400).json({ error: 'Missing url' });

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return res.status(200).json({ error: `Site returned HTTP ${response.status}`, hash: null });
    }

    const html = await response.text();

    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // djb2 hash
    let hash = 5381;
    for (let i = 0; i < cleaned.length; i++) {
      hash = ((hash << 5) + hash) ^ cleaned.charCodeAt(i);
      hash = hash >>> 0;
    }

    return res.status(200).json({ hash: hash.toString(16), length: cleaned.length });

  } catch (err) {
    return res.status(200).json({ error: err.message, hash: null });
  }
}
