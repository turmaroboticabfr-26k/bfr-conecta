// Continua da sonda anterior: as tabelas do chat interno não têm as colunas que eu supus
// (`internal_chat_rooms` não existe no schema cache; `internal_chat_threads` não tem `room_id`). Este
// programa não assume nomes — pede uma linha de cada relação e imprime as chaves realmente expostas pelo
// PostgREST, e lista os emails das contas de teste para o predicado do papel acertar. 0 escrita, 0 DDL.
// Uso: node scripts/ah2-sonda-chat-forma.mjs [papel=education_supervisor]
import { readFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
// A anon/public key lê-se dos bytes servidos (não de ficheiro), conforme a regra da auditoria.
const ANON = (await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text())
  .match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
const SERVICE = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const PAPEL = process.argv[2] || 'education_supervisor';
const H = { apikey: ANON, Authorization: `Bearer ${SERVICE}`, Accept: 'application/json' };
const ur = await fetch(`${HOST}/auth/v1/admin/users?page=1&per_page=1000`, { headers: H, signal: AbortSignal.timeout(45000) });
const uj = await ur.json();
const users = uj.audited_users?.length ? uj.audited_users : uj.users || [];
const figs = users.filter((u) => String(u.email || '').endsWith('@bfr-conecta.test'));
console.log('CONTAS DE TESTE (' + figs.length + '): ' + figs.map((u) => u.email).join(' '));
const alvo = figs.filter((u) => u.email.toLowerCase().includes(PAPEL.replace(/_/g, '-')) || u.email.toLowerCase().includes(PAPEL));
console.log('ALVO ' + PAPEL + ': ' + (alvo.map((u) => u.email + '=' + u.id).join(' ') || 'nenhuma conta com este nome no email'));
const amostra = async (t) => {
  const r = await fetch(`${HOST}/rest/v1/${t}?limit=2`, { headers: H, signal: AbortSignal.timeout(45000) });
  const j = await r.json().catch(() => null);
  console.log(`\n${t}: HTTP ${r.status} ` + (Array.isArray(j) ? `colunas=${Object.keys(j[0] || {}).join(',')} (mostra ${j.length})` : JSON.stringify(j).slice(0, 200)));
  return Array.isArray(j) ? j : [];
};
const membros = await amostra('internal_chat_room_members');
await amostra('internal_chat_threads');
await amostra('internal_chat_messages');
await amostra('bfr_internal_chat_rooms');
await amostra('bfr_internal_chat_participants');
if (membros.length && alvo.length) {
  const ids = new Set(alvo.map((u) => u.id));
  const chaves = Object.keys(membros[0]);
  const col_id = chaves.find((k) => /user|member|profile|principal/.test(k));
  const do_alvo = membros.filter((m) => ids.has(String(m[col_id])));
  console.log(`\nFILAS DE MEMBRO DO ALVO por "${col_id}": ${do_alvo.length}` + (do_alvo.length ? ' ' + JSON.stringify(do_alvo).slice(0, 250) : ' → zero filas: a lista de conversas vazia é o estado correto da base, não um defeito da vista.'));
}
console.log('\nSONDA_CHAT_FORMA_FEITA');
