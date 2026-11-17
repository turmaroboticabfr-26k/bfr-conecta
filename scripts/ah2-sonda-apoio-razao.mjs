// «apoio» saiu VAZIO nas bandas coerentes de coordinator/developer e OK nas de parent/student. A causa
// candidate está lida dos bytes servidos, não suposta: `openSupport()` des-esconde `#supportView` e só
// depois chama `render()`, e `render()` faz `root.innerHTML = supportHome()`. Se `supportHome()` lançar,
// a atribuição nunca acontece → vista visível com 0 caracteres, sem erro de ecrã. O lançamento candidato é
// `item.reason.slice(...)` (três ocorrências dentro de supportHome, ao serviço dos ramos de staff), que é o
// único acesso sem `?.` a uma coluna anulável. Este programa pergunta à base, como o próprio papel, se há
// linhas com `reason IS NULL` visíveis a esse papel. Não renova tokens (ler o access_token guardado e fazer
// um GET não roda a praga de refresh nem toca no ficheiro de sessão): 0 escrita, 0 DDL, 0 browser.
// Uso: node scripts/ah2-sonda-apoio-razao.mjs [papel=coordinator]
import { readFileSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PAPEL = process.argv[2] || 'coordinator';
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const ANON = (await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text())
  .match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
const sess = JSON.parse(readFileSync(`${DIR}/ah2-sessao-${PAPEL}.json`, 'utf8'));
const token = (sess[PAPEL] || sess)?.access_token;
if (typeof token !== 'string' || !token) throw new Error('ABORTA: sem access_token guardado para ' + PAPEL);
const H = { apikey: ANON, Authorization: `Bearer ${token}`, Accept: 'application/json' };
const get = async (rota, params) => {
  const r = await fetch(`${HOST}/rest/v1/${rota}?${params}`, { headers: H, signal: AbortSignal.timeout(45000) });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j, texto: t.slice(0, 180) };
};
console.log(`\n=== como ${PAPEL} (token lido do ficheiro de sessão, sem renovar) ===`);
for (const [tabela, cols] of [['support_requests', 'id,status,source'], ['support_appointments', 'id,status'], ['support_messages', 'id'], ['support_professionals', 'id,full_name'], ['support_services', 'id,name']]) {
  const r = await get(tabela, `select=${cols}&limit=200`);
  console.log(`${tabela}: HTTP ${r.status} linhas=${Array.isArray(r.json) ? r.json.length : 'n/a ' + r.texto}`);
}
const tudo = await get('support_requests', 'select=id,reason,status&limit=500');
if (Array.isArray(tudo.json)) {
  const nulas = tudo.json.filter((x) => x.reason === null || x.reason === undefined);
  console.log(`\nsupport_requests visíveis: ${tudo.json.length} · com reason NULL: ${nulas.length}`);
  console.log('  -> ' + (nulas.length
    ? `RAZÃO ENCONTRADA: ${nulas.length} linha(s) sem 'reason' matam supportHome() no ramo de staff (\`${item.reason.slice(0,55)}\`), e o painel fica visível e vazio.`
    : 'nenhuma linha NULL — o `.slice` não é a causa deste papel; a causa está noutro ponto e precisa de browser.'));
  const vistas = await get('support_requests', 'select=id,reason&reason=is.null&limit=3');
  console.log('  confirmação pelo predicado do servidor: HTTP ' + vistas.status + ' ' + JSON.stringify(vistas.json).slice(0, 160));
} else console.log('\nleitura de support_requests negada ao papel: HTTP ' + tudo.status + ' ' + tudo.texto);
const msgs = await get('support_messages', 'select=id,body&limit=500');
if (Array.isArray(msgs.json)) console.log('support_messages com body NULL: ' + msgs.json.filter((m) => m.body == null).length + ' de ' + msgs.json.length);
console.log('SONDA_APOIO_RAZAO_FEITA');
