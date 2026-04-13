# Trade da Liberdade, Fabrício Gonçalvez

Página de captura e página de obrigado do lançamento Super Aula Trade da Liberdade, 20 de abril de 2026.

## Estrutura

- `index.html`, página de captura
- `obrigado.html`, página de confirmação pós-cadastro
- `api/lead.js`, Vercel Function que recebe o submit do form e envia pro ActiveCampaign
- `vercel.json`, config do deploy

## Deploy

Servido via Vercel em `tradedaliberdade.com.br`. Conectar o projeto Vercel a este repositório no GitHub para deploy automático em cada push.

### Env vars (configurar no Vercel)

- `AC_API_KEY`: API Key do ActiveCampaign (account `brunogc18`)

### GitHub Pages (mirror)

Tambem servido em `brunoguerrab.github.io/lpcapturafabricio/` como backup. O GitHub Pages nao roda Vercel Functions, entao o form so funciona em produção via Vercel.
