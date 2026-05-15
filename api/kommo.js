// Vercel Function — proxy para Kommo API
// Compatível com token de longa duração gerado pela interface do Kommo

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token   = process.env.KOMMO_TOKEN;
  const account = process.env.KOMMO_ACCOUNT;

  if (!token || !account) {
    return res.status(500).json({
      error: 'KOMMO_TOKEN ou KOMMO_ACCOUNT não configurados no Vercel.',
    });
  }

  const { endpoint, ...params } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Parâmetro endpoint obrigatório.' });
  }

  // Whitelist de segurança
  const ALLOWED = ['leads', 'pipelines', 'contacts', 'account'];
  const allowed = ALLOWED.some((e) => endpoint.startsWith(e));
  if (!allowed) {
    return res.status(403).json({ error: 'Endpoint não permitido.' });
  }

  const qs  = new URLSearchParams(params).toString();
  const url = `https://${account}.kommo.com/api/v4/${endpoint}${qs ? '?' + qs : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
      },
    });

    console.log(`Kommo ${endpoint} → ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      console.error(`Kommo error body: ${text}`);
      return res.status(response.status).json({
        error: `Kommo retornou ${response.status}`,
        detail: text,
      });
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    console.error(`Fetch error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
}
