// Vercel Serverless: adiciona tag a um contato existente no ActiveCampaign.
// Endpoint: POST /api/tag
// Body JSON: { email, tag }
//
// Usado pras páginas /live e /presente marcarem o contato com ações do funil
// (assistiu live, clicou no presente, etc) sem recriar lead.
//
// Env vars no Vercel:
//   AC_API_KEY - ActiveCampaign API key (mesma já configurada pro /api/lead)

const AC_BASE = 'https://brunogc18.activehosted.com/admin/api.php';

// Whitelist de tags permitidas (segurança contra abuso do endpoint público)
const ALLOWED_TAGS = new Set([
  '[TDL] Assistiu Live',
  '[TDL] Clicou Presente',
  '[TDL] Viu Aula Warmup',
  '[TDL] Abandonou Checkout',
  '[TDL] Clicou Checkout',
]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.AC_API_KEY;
  if (!apiKey) {
    console.error('AC_API_KEY env var not configured');
    return res.status(500).json({ ok: false, error: 'Server misconfigured' });
  }

  const body = req.body || {};
  const email = (body.email || '').toString().trim().toLowerCase();
  const tag = (body.tag || '').toString().trim();

  if (!email || !tag) {
    return res.status(400).json({ ok: false, error: 'email e tag são obrigatórios' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'email inválido' });
  }

  if (!ALLOWED_TAGS.has(tag)) {
    return res.status(400).json({ ok: false, error: 'tag não permitida' });
  }

  const qs = new URLSearchParams();
  qs.append('api_action', 'contact_tag_add');
  qs.append('api_key', apiKey);
  qs.append('api_output', 'json');

  const formBody = new URLSearchParams();
  formBody.append('email', email);
  formBody.append('tags', tag);

  try {
    const acResp = await fetch(AC_BASE + '?' + qs.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString()
    });
    const data = await acResp.json();

    if (data.result_code === 1 || data.result_code === '1') {
      return res.status(200).json({ ok: true, tag, email });
    }

    // result_code 0 com mensagem "Contact does not exist" = contato não existe ainda
    // Nesse caso, devolvemos 200 mas indicamos que não foi taggeado
    console.warn('AC tag not added', { email, tag, result: data.result_message });
    return res.status(200).json({ ok: false, reason: data.result_message || 'contact not found' });
  } catch (err) {
    console.error('AC tag fetch failed', err);
    return res.status(502).json({ ok: false, error: 'Falha de conexão com AC' });
  }
}
