// A grelha mediu «chat-interno» vazio para `education_supervisor` em todas as bandas corridas. Há duas
// explicações e só uma é defeito da vista: (1) a vista não sabe mostrar; (2) o papel não tem fila — nenhum
// `internal_chat_room_members` para o utilizador, logo a lista de conversas está correta ao estar vazia.
// Este programa distingue as duas por leitura direta da base (service role só para LER, com apikey lida dos
// bytes servidos), e responde também quantas salas existem e que papéis têm membros. 0 escrita, 0 DDL.
// Uso: node scripts/ah2-sonda-chat-supervisor.mjs
import { readFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const SERVICE = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const ANON = shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
const q = async (rota, params = '') => {
  const r = await fetch(`${HOST}/rest/v1/${rota}?${params}`, { headers: { apikey: ANON, Authorization: `Bearer ${SERVICE}`, Accept: 'application/json' }, signal: AbortSignal.timeout(45000) });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j, texto: t.slice(0, 160) };
};
// O email vive em auth.users, não em public.profiles (a prova é o JOIN do desmontador), por isso o id se
// consegue pelo Admin API do GoTrue e só depois se procura na tabela de membros.
const ALVO = process.argv[2] || 'education_supervisor';
const AUTH = `https://${REF}.supabase.co/auth/v1/admin/users?page=1&per_page=1000`;
const ur = await fetch(AUTH, { headers: { apikey: ANON, Authorization: `Bearer ${SERVICE}` }, signal: AbortSignal.timeout(45000) });
const uj = await ur.json();
const alvo = (uj.audited_users?.length ? uj.audited_users : uj.users || []).filter((u) => String(u.email || '').toLowerCase().startsWith(`ah2-${ALVO}@`));
const ids = alvo.map((u) => u.id);
console.log('contas-alvo: ' + alvo.map((u) => u.email + ' ' + u.id).join(' | '));
const sem_fila = await q('internal_chat_room_members', 'select=room_id&limit=1');
console.log('a tabela de membros existe para o REST? HTTP ' + sem_fila.status + ' ' + (sem_fila.json?.code || '') + ' ' + sem_fila.texto);
const salas = await q('internal_chat_rooms', 'select=id,name,room_type&limit=20');
console.log('salas existentes: HTTP ' + salas.status + ' ' + JSON.stringify(salas.json).slice(0, 300));
const membros = await q('internal_chat_room_members', 'select=room_id,user_id,role&limit=200');
console.log('linhas de membros: HTTP ' + membros.status + ' total lido=' + (Array.isArray(membros.json) ? membros.json.length : 'n/a'));
if (Array.isArray(membros.json)) {
  const por_papel = {};
  for (const m of membros.json) por_papel[m.role || '(sem role)'] = (por_papel[m.role || '(sem role)'] || 0) + 1;
  console.log('membros por papel declarado na sala: ' + JSON.stringify(por_papel));
  const alvos = membros.json.filter((m) => ids.includes(m.user_id));
  console.log(`membros do papel ${ALVO}: ${alvos.length}` + (alvos.length ? ' → ' + JSON.stringify(alvos).slice(0, 220) : ' → NENHUMA FILA: a lista de conversas vazia está correta, não é a vista.'));
}
const threads = await q('internal_chat_threads', 'select=id,room_id&limit=20');
console.log('threads: HTTP ' + threads.status + ' ' + JSON.stringify(threads.json).slice(0, 220));
console.log('SONDA_CHAT_SUPERVISOR_FEITA');
