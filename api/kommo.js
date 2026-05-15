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
  const url = `https://${account}.kommo.com/api/v4/${endp
