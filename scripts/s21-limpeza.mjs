// S21-L — limpeza FK-safe da conta sintética do ciclo S21 + restauração da baseline.
// Escopo: remove SOMENTE o que o mint autorizado criou neste ciclo. 0 DDL, 0 deploy, 0 linha de produto.
// O uid/email são LIDOS do arquivo do ciclo (não dactilografados); a baseline é lida do diário.
import { readFileSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const DIARIO = `${DIR}/s21-diary.json`;
const ARQUIVO = `${DIR}/s21-contas-arquivo.json`;
const SESSAO = `${DIR}/s21-session.json`;
const OUT = `${DIR}/s21-limpeza.json`;

const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 400)}`);
  return JSON.parse(t);
};
const admin = async (path, init = {}) => {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 200) }; }
  return { status: r.status, j };
};

const out = { ciclo: 'S21-L', started: new Date().toISOString(), stages: {} };
const falhas = [];
let portoes = 0;
const gate = (nome, dado, esperado) => {
  portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
  return ok;
};

// ═══ L0: insumos lidos dos artefactos do ciclo ═══
const diario = JSON.parse(readFileSync(DIARIO, 'utf8'));
const BASE = diario.stages?.baseline?.tabelas;
if (!BASE) throw new Error('ABORTA: s21-diary.json não traz stages.baseline.tabelas');
const arquivo = JSON.parse(readFileSync(ARQUIVO, 'utf8'));
const conta = arquivo.contas?.[0];
if (!conta?.id) throw new Error('ABORTA: s21-contas-arquivo.json não traz a conta');
const UID = conta.id, EMAIL = conta.email;
const EMAIL_OK = /@bfr-conecta\.test$/.test(EMAIL);
gate(`conta sintética tem sufixo do domínio de teste (${EMAIL})`, EMAIL_OK, true);
if (!EMAIL_OK) throw new Error('ABORTA: email fora do domínio de teste — não apago conta alheia');
console.log(`  uid=${UID}  baseline de ${Object.keys(BASE).length} tabelas lida do diário`);
out.stages.insumos = { uid: UID, email: EMAIL, baseline_keys: Object.keys(BASE) };

// ═══ L1: inventário de FKs que apontam para profiles / auth.users ═══
console.log('\n[L1] inventário de FKs');
const fks = await sql(`select c.conrelid::regclass::text as tabela_origem, a.attname as coluna, c.confrelid::regclass::text as destino,
  case c.confdeltype when 'a' then 'NO ACTION' when 'p' then 'SET NULL' when 'r' then 'RESTRICT' when 'c' then 'CASCADE' when 'n' then 'NOTHING' else '?' end as onDelete
from pg_constraint c
join unnest(c.conkey) with ordinality k(attnum,ord) on true
join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum
where c.contype='f' and c.confrelid in ('public.profiles'::regclass,'auth.users'::regclass)
order by 1,2`);
out.stages.fks = { total: fks.length };
console.log(`  ${fks.length} FKs sobre profiles/auth.users`);

// ═══ L2: o que a minha conta deixou pendurado ═══
console.log('\n[L2] dependentes da conta');
const dependentes = [];
for (const f of fks) {
  const rows = await sql(`select count(*)::int as n from ${f.tabela_origem} where ${f.coluna}::text = '${UID}'::text;`);
  const n = rows[0].n;
  if (n > 0) {
    dependentes.push({ tabela: f.tabela_origem, coluna: f.coluna, destino: f.destino, onDelete: f.onDelete, n });
    console.log(`  ${f.tabela_origem}.${f.coluna} tem ${n} linha(s) [onDelete=${f.onDelete}]`);
  }
}
const sessoes = await sql(`select count(*)::int as n from auth.sessions where user_id::text = '${UID}'::text;`);
console.log(`  auth.sessions do uid: ${sessoes[0].n}`);
out.stages.dependentes = dependentes;
out.stages.sessoes_antes = sessoes[0].n;

const existeAntes = await sql(`select count(*)::int as n from auth.users where id::text='${UID}'::text;`);
const perfilAntes = await sql(`select role from public.profiles where id::text='${UID}'::text;`);
gate('a conta existe em auth.users antes da limpeza', existeAntes[0].n, 1);
gate('o perfil existe com o papel do ciclo', perfilAntes.length, 1);
out.stages.perfil_antes = { papel: perfilAntes[0]?.role ?? null };
console.log(`  papel antes: ${perfilAntes[0]?.role ?? '(sem perfil)'}`);

// ═══ L3: remoção FK-safe — dependentes, depois profiles, depois o utilizador ═══
console.log('\n[L3] remoção');
const removidas = [];
for (const d of dependentes) {
  if (d.onDelete === 'CASCADE') { removidas.push({ tabela: d.tabela, n: d.n, como: 'cascade do auth.users' }); continue; }
  const r = await sql(`delete from ${d.tabela} where ${d.coluna}::text = '${UID}'::text returning 1 as ok;`);
  removidas.push({ tabela: d.tabela, n: r.length, como: 'DELETE explícito' });
  console.log(`  delete de ${d.tabela}: ${r.length} linha(s)`);
}
const rPerfil = await sql(`delete from public.profiles where id::text = '${UID}'::text returning id;`);
console.log(`  delete de public.profiles: ${rPerfil.length} linha(s)`);
removidas.push({ tabela: 'public.profiles', n: rPerfil.length, como: 'DELETE explícito (antes do utilizador)' });
out.stages.removidas = removidas;

const del = await admin(`/auth/v1/admin/users/${UID}`, { method: 'DELETE' });
console.log(`  DELETE /auth/v1/admin/users → HTTP ${del.status}`);
out.stages.delete_usuario = { status: del.status, corpo: JSON.stringify(del.j).slice(0, 160) };
gate('Auth Admin API aceitou o DELETE', [200, 204].includes(del.status), true);

const pos = await admin(`/auth/v1/admin/users/${UID}`);
console.log(`  GET do utilizador removido → HTTP ${pos.status}`);
gate('a conta desapareceu do auth.users (HTTP 404)', pos.status, 404);

const sessoesPos = await sql(`select count(*)::int as n from auth.sessions where user_id::text = '${UID}'::text;`);
gate('nenhuma sessão viva ficou para trás', sessoesPos[0].n, 0);
const refPos = await sql(`select count(*)::int as n from auth.users where id::text='${UID}'::text;`);
gate('auth.users já não tem o uid', refPos[0].n, 0);
const porEmail = await sql(`select count(*)::int as n from auth.users where email = '${EMAIL}';`);
gate('auth.users já não tem o email do ciclo', porEmail[0].n, 0);

// ═══ L4: baseline restaurada por contagem E por md5 ═══
console.log('\n[L4] baseline antes == depois');
const depois = {};
for (const t of Object.keys(BASE)) {
  const rows = await sql(`select count(*)::int as n from ${t};`);
  const hash = await sql(`select md5(string_agg(x::text, ',' order by x::text)) as h from (select * from ${t}) x;`);
  depois[t] = { n: rows[0].n, md5: hash[0].h || 'empty' };
  gate(`${t} contagem`, depois[t].n, BASE[t].n);
  gate(`${t} md5`, depois[t].md5, BASE[t].md5);
}
out.stages.baseline_depois = depois;

// nenhum INSERT meu em tabela de produto: a régua é supervision_requests continuar vazia
gate('supervision_requests continua zerada (0 fixtures de produto)', depois['public.supervision_requests'].n, 0);

// ═══ L5: descasamento de ficheiros com credencial + perfis de Chrome ═══
console.log('\n[L5] ficheiros');
const md5SessaoAntes = existsSync(SESSAO) ? createHash('md5').update(readFileSync(SESSAO)).digest('hex') : null;
if (existsSync(SESSAO)) rmSync(SESSAO);
gate('s21-session.json retirado do disco', existsSync(SESSAO), false);
console.log(`  sessão removida (md5 pré ${md5SessaoAntes})`);
const perfis = ['.s21-chrome-profile', '.s21-chrome-profile-b', '.s21-chrome-profile-c'];
const limpezaPerfis = [];
for (const p of perfis) {
  const abs = `${DIR}/${p}`;
  if (existsSync(abs)) {
    const bytes = statSync(abs).size;
    rmSync(abs, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
    limpezaPerfis.push({ pasta: p, existia: true, removido: !existsSync(abs), bytes_entrada: bytes });
  } else limpezaPerfis.push({ pasta: p, existia: false, removido: true });
}
out.stages.perfis_chrome = limpezaPerfis;
for (const l of limpezaPerfis) console.log(`  ${l.pasta}: existia=${l.existia} removido=${l.removido}`);
gate('todos os perfis de Chrome do ciclo saíram', limpezaPerfis.every(l => l.removido), true);

arquivo.limpeza = `concluída ${new Date().toISOString()} — S21_L_LIMPO`;
arquivo.contas[0].removida = true;
writeFileSync(ARQUIVO, JSON.stringify(arquivo, null, 2) + '\n');

out.falhas = falhas;
out.veredito = falhas.length ? 'S21_L_LIMPEZA_PAROU' : 'S21_L_LIMPO';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(out.veredito);
process.exit(falhas.length ? 1 : 0);
