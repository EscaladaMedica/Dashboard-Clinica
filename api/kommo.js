const https = require('https');

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

  const ALLOWED = ['leads', 'contacts', 'account'];
  if (!ALLOWED.some((e) => endpoint.startsWith(e))) {
    return res.status(403).json({ error: 'Endpoint não permitido.' });
  }

  const qs  = new URLSearchParams(params).toString();
  const path = `/api/v4/${endpoint}${qs ? '?' + qs : ''}`;

  return new Promise((resolve) => {
    const options = {
      hostname: `${account}.kommo.com`,
      path: path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    console.log('Chamando:', `https://${account}.kommo.com${path}`);

    const req2 = https.request(options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        console.log('Status:', resp.statusCode);
        console.log('Body:', data.slice(0, 300));
        if (resp.statusCode >= 400) {
          res.status(resp.statusCode).json({ error: data });
          resolve();
          return;
        }
        try {
          res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
          res.status(200).json(JSON.parse(data));
        } catch (e) {
          res.status(500).json({ error: 'JSON inválido: ' + data.slice(0, 100) });
        }
        resolve();
      });
    });

    req2.on('error', (e) => {
      console.error('Erro https:', e.message);
      res.status(500).json({ error: e.message });
      resolve();
    });

    req2.end();
  });
};
