const KV_KEY = 'pos_programs';

async function kvGet(baseUrl, token) {
  const res = await fetch(`${baseUrl}/get/${KV_KEY}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Upstash GET failed: ${res.status}`);
  const data = await res.json();
  // Upstash returns { result: "stringified JSON" } or { result: null }
  if (!data.result) return null;
  return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
}

async function kvSet(baseUrl, token, value) {
  // Upstash REST API: POST /set/<key> with the value as the raw body
  const res = await fetch(`${baseUrl}/set/${KV_KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(value)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upstash SET failed (${res.status}): ${txt}`);
  }
  const data = await res.json();
  // Upstash returns { result: "OK" } on success
  return data.result === 'OK';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const baseUrl = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '').replace(/^"|"$/g, '');
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"|"$/g, '');

  if (!baseUrl || !token) {
    return res.status(500).json({ error: 'Upstash credentials not configured' });
  }

  if (req.method === 'GET') {
    try {
      const programs = await kvGet(baseUrl, token);
      return res.status(200).json({ programs: programs || [] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { programs } = req.body;
      if (!Array.isArray(programs)) return res.status(400).json({ error: 'Invalid data — expected array' });
      const ok = await kvSet(baseUrl, token, programs);
      if (!ok) throw new Error('Upstash returned non-OK result');
      return res.status(200).json({ ok: true, count: programs.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
