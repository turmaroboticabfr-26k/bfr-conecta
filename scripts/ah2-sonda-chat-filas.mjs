// Prolongamento da sonda de forma: «chat-interno vazio» só é defeito da vista se as contas vizinhas
// estiverem inscritas. Esta varredura cruza as 15 contas de teste com `internal_chat_room_members`
// (coluna real: profile_id, descoberta por leitura do schema cache) e diz quantas filas cada uma tem.
// 0 escrita, 0 DDL, 0 browser. Uso: node scripts/ah2-sonda-chat-filas.mjs
import { readFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const ANON = (await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text())
  .match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
const SERVICE = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const H = { apikey: ANON, Authorization: `Bearer ${SERVICE}`, Accept: 'application/json' };
const get = async (rota, params = '') => {
  const r = await fetch(`${HOST}/rest/v1/${rota}?${params}`, { headers: H, signal: AbortSignal.timeout(60000) });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const uj = await (await fetch(`${HOST}/auth/v1/admin/users?page=1&per_page=1000`, { headers: H, signal: AbortSignal.timeout(60000) })).json();
const figs = ((uj.audited_users?.length ? uj.audited_users : uj.users) || []).filter((u) => String(u.email || '').endsWith('@bfr-conecta.test'));
const por_id = new Map(figs.map((u) => [u.id, u.email.replace('ah2-', '').replace(/-[0-9a-f]{6}@bfr-conecta\.test$/, '')]));
const total = await get('internal_chat_room_members', 'select=profile_id,room_id');
const linhas = Array.isArray(total.json) ? total.json : [];
const inscritos = new Map();
for (const m of linhas) inscritos.set(m.profile_id, (inscritos.get(m.profile_id) || 0) + 1);
const salas = await get('internal_chat_threads', 'select=id,kind,title&limit=50');
console.log('LINHAS DE MEMBRO NA BASE: ' + linhas.length + ' (perfis distintos: ' + inscritos.size + ')');
console.log('THREADS/SALAS: HTTP ' + salas.status + ' ' + (Array.isArray(salas.json) ? salas.json.length + ' linhas: ' + salas.json.map((t) => `${t.kind}:${(t.title || '?').slice(0, 28)}`).join(' | ').slice(0, 400) : JSON.stringify(salas.json).slice(0, 200)));
for (const [id, papel] of por_id) console.log(`  ${papel.padEnd(22)} filas_de_sala=${inscritos.get(id) || 0}`);
for (const pid of inscritos.keys()) if (!por_id.has(pid)) console.log('  (perfil não-fixture inscrito: ' + pid + ')');
const sem = [...por_id.values()].filter((p) => !inscritos.has(figs.find((f) => f.email.includes('-' + p + '-'))?.id));
console.log('\nCONTAS DE TESTE SEM QUALQUER INSCRIÇÃO EM SALA: ' + (sem.length ? sem.join(' ') : 'nenhuma'));
console.log('SONDA_CHAT_FILAS_FEITA');
