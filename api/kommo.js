module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token   = process.env.KOMMO_TOKEN;
  const account = process.env.KOMMO_ACCOUNT;

  if (!token || !account) {
    return res.status(500).json({ error: 'KOMMO_TOKEN ou KOMMO_ACCOUNT não configurados.' });
  }

  const { endpoint, ...params } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Parâmetro endpoint obrigatório.' });
  }

  const ALLOWED = ['leads', 'pipelines', 'contacts', 'account'];
  if (!ALLOWED.some((e) => endpoint.startsWith(e))) {
    return res.status(403).json({ error: 'Endpoint não permitido.' });
  }

  const qs  = new URLSearchParams(params).toString();
  const url = `https://${account}.kommo.com/api/v4/${endpoint}${qs ? '?' + qs : ''}`;

  console.log('Chamando:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();
    console.log('Status Kommo:', response.status);
    console.log('Body Kommo:', text.slice(0, 500));

    if (!response.ok) {
      return res.status(response.status).json({ error: text });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(JSON.parse(text));
  } catch (err) {
    console.error('Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
