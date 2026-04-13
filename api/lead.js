// Vercel Serverless Function: proxy seguro pra ActiveCampaign
// Endpoint: POST /api/lead
// Body JSON: { nome, email, whatsapp, utm_source, utm_medium, utm_campaign, utm_content, utm_term }
//
// Bypassa adblockers (request vai pro proprio dominio) e esconde a API_KEY do frontend.
// API_KEY deve ser configurada como env var no Vercel: AC_API_KEY

const AC_BASE = 'https://brunogc18.activehosted.com/admin/api.php';
const AC_LIST_ID = '4';
const AC_TAG = '[TDL] Inscrito';

const FIELD_UTM_SOURCE = 2;
const FIELD_UTM_CAMPAIGN = 3;
const FIELD_UTM_MEDIUM = 4;
const FIELD_UTM_CONTENT = 6;
const FIELD_UTM_TERM = 7;
const FIELD_DATA_CADASTRO = 8;

function isoNow() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  // Forca timezone -03:00 Brasil (Vercel roda em UTC, sem DST no Brasil)
  const utc = now.getTime();
  const br = new Date(utc - 3 * 60 * 60 * 1000);
  return br.getUTCFullYear() + '-' + pad(br.getUTCMonth() + 1) + '-' + pad(br.getUTCDate())
    + 'T' + pad(br.getUTCHours()) + ':' + pad(br.getUTCMinutes()) + ':' + pad(br.getUTCSeconds())
    + '-03:00';
}

export default async function handler(req, res) {
  // CORS basico (mesmo dominio nao precisa, mas garante caso teste de outro origin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.AC_API_KEY;
  if (!apiKey) {
    console.error('AC_API_KEY env var not configured');
    return res.status(500).json({ ok: false, error: 'Server misconfigured' });
  }

  const body = req.body || {};
  const nome = (body.nome || '').toString().trim();
  const email = (body.email || '').toString().trim().toLowerCase();
  const whatsapp = (body.whatsapp || '').toString().trim();

  if (!nome || !email || !whatsapp) {
    return res.status(400).json({ ok: false, error: 'Campos obrigatorios faltando' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Email invalido' });
  }

  const parts = nome.split(/\s+/);
  const firstName = parts.shift();
  const lastName = parts.join(' ');

  // Query string: so params obrigatorios (autenticacao/roteamento)
  const qs = new URLSearchParams();
  qs.append('api_action', 'contact_sync');
  qs.append('api_key', apiKey);
  qs.append('api_output', 'json');

  // Body: dados do contato (form-urlencoded)
  const formBody = new URLSearchParams();
  formBody.append('email', email);
  formBody.append('first_name', firstName);
  if (lastName) formBody.append('last_name', lastName);
  formBody.append('phone', whatsapp);
  formBody.append('p[' + AC_LIST_ID + ']', AC_LIST_ID);
  formBody.append('status[' + AC_LIST_ID + ']', '1');
  formBody.append('tags', AC_TAG);

  formBody.append('field[' + FIELD_UTM_SOURCE + ',0]', (body.utm_source || '').toString());
  formBody.append('field[' + FIELD_UTM_CAMPAIGN + ',0]', (body.utm_campaign || '').toString());
  formBody.append('field[' + FIELD_UTM_MEDIUM + ',0]', (body.utm_medium || '').toString());
  formBody.append('field[' + FIELD_UTM_CONTENT + ',0]', (body.utm_content || '').toString());
  formBody.append('field[' + FIELD_UTM_TERM + ',0]', (body.utm_term || '').toString());
  formBody.append('field[' + FIELD_DATA_CADASTRO + ',0]', isoNow());

  try {
    const acResp = await fetch(AC_BASE + '?' + qs.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString()
    });
    const data = await acResp.json();

    if (data.result_code === 1 || data.result_code === '1') {
      return res.status(200).json({ ok: true, subscriber_id: data.subscriber_id });
    }
    console.error('AC error', data);
    return res.status(502).json({ ok: false, error: data.result_message || 'AC rejected' });
  } catch (err) {
    console.error('AC fetch failed', err);
    return res.status(502).json({ ok: false, error: 'Falha de conexao com o AC' });
  }
}
