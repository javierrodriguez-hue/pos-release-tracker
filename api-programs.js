const KV_KEY = 'pos_programs';

async function kvGet(url, token) {
  const res = await fetch(`${url}/get/${KV_KEY}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(url, token, value) {
  const res = await fetch(`${url}/set/${KV_KEY}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
  return res.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: 'Upstash credentials not configured' });
  }

  // GET — load programs
  if (req.method === 'GET') {
    try {
      const programs = await kvGet(url, token);
      return res.status(200).json({ programs: programs || [] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — save programs
  if (req.method === 'POST') {
    try {
      const { programs } = req.body;
      if (!Array.isArray(programs)) return res.status(400).json({ error: 'Invalid data' });
      const ok = await kvSet(url, token, JSON.stringify(programs));
      if (!ok) throw new Error('Upstash write failed');
      return res.status(200).json({ ok: true, count: programs.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
