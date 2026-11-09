// P1 item 1 — rodar a senha das 8 combinações que ainda destrancam conta hoje.
// Sem flag: PREFLIGHT somente-leitura. Com --rodar: escreve.
// Canais distintos, medidos em seg-p1-admin-route-probe.mjs:
//   GoTrue-listada (GET admin 200)  -> PUT /auth/v1/admin/users/:id (canonico; SQL direto o GoTrue ignora)
//   linha-fantasma (GET admin 404)  -> UPDATE auth.users SET encrypted_password=<hash bcrypt novo>
//     (o GoTrue não conhece a linha, logo não há cache a contradizer; só se mata a senha em claro)
// Nada de credencial impressa: senhas novas só em C:/Users/pcmac/.bfr-rotacao-senhas.json (fora do repo).
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { admin, sql } from './s19-lib.mjs';

const RODAR = process.argv.includes('--rodar');
const ESPERA = Number(process.argv.find((a) => /^--alvos=/.test(a))?.split('=')[1] || 8);
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const NOVAS = 'C:/Users/pcmac/.bfr-rotacao-senhas.json';
const DIARIO = `${DIR}/evidence/p1-rotacao-8${RODAR ? '' : '-preflight'}.json`;

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const RX = /password\s*[:=]\s*["']([^"'\n]{4,})["']/gi;
// `encrypted_password='${hash}'` casa o RX mas e interpolacao de codigo, nao senha em claro
const senhaReal = (s) => !s.includes('${');
const mask = (e) => {
  const [local, dom] = String(e || '').split('@');
  return /^(test|bfr|synth|audit|seed|demo|supervis)/i.test(local) ? `${local}@${dom}` : `<${local.length} chars>@${dom}`;
};

// [1] corpus do portao: tracking + ignorados do disco (mesmo predicado do seg-p1-senha-viva.mjs)
const senhas = new Map();
let lidos = 0;
const colhe = (rel, p) => {
  let txt;
  try { txt = fs.readFileSync(p, 'latin1'); } catch { return; }
  lidos++;
  for (const m of txt.matchAll(RX)) if (senhaReal(m[1]) && !senhas.has(m[1])) senhas.set(m[1], rel);
};
const walk = (dir, depth) => {
  if (depth < 0 || !fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, depth - 1);
    else if (/\.(mjs|js|sql|md|json)$/.test(e.name)) colhe(path.relative(DIR, p).replace(/\\/g, '/'), p);
  }
};
walk(DIR, 3);
if (!senhas.size) { console.log('INSTRUMENTO CEGO: zero senhas colhidas — nada a rodar'); process.exit(1); }
console.log(`[1] senhas em claro no corpus (tracking + disco): ${senhas.size}, ficheiros lidos: ${lidos}`);

// [2] hashes vivos + controlo positivo
const rows = await sql(`select id, email, role, created_at, last_sign_in_at, encrypted_password from auth.users order by created_at`);
if (!Array.isArray(rows) || !rows.length) { console.log('INSTRUMENTO CEGO: auth.users devolveu zero linhas'); process.exit(1); }
const ctrl = await sql(`select count(*)::int as n from auth.users`);
if (ctrl[0].n !== rows.length) throw new Error(`portão de controlo: count=${ctrl[0].n} vs linhas=${rows.length}`);
console.log(`[2] contas em auth.users: ${rows.length} (controlo count(*) = ${ctrl[0].n})`);

// [3] cruza senha x hash
const alvos = new Map();
for (const [senha, origem] of senhas) {
  for (const u of rows) {
    if (!u.encrypted_password || !/^\$2/.test(u.encrypted_password)) continue;
    if (await bcrypt.compare(senha, u.encrypted_password)) {
      if (!alvos.has(u.id)) alvos.set(u.id, { u, senha, origens: [] });
      alvos.get(u.id).origens.push(origem);
    }
  }
}
const lista = [...alvos.values()];
console.log(`[3] combinações senha-conta vivas por bcrypt: ${lista.length}`);

const sessoes = async (id) => {
  const s = await sql(`select count(*)::int as n from auth.sessions where user_id = '${id}'`);
  const r = await sql(`select count(*)::int as total, count(*) filter (where revoked is distinct from true)::int as vivas from auth.refresh_tokens where user_id = '${id}'::text`);
  return { sessoes: s[0].n, refresh: r[0].total, refreshVivas: r[0].vivas };
};
const visivel = async (id) => (await admin(`/auth/v1/admin/users/${id}`, { method: 'GET' })).status;

for (const a of lista) {
  a.http = await visivel(a.u.id);
  a.canal = a.http === 200 ? 'admin-put' : a.http === 404 ? 'sql-hash' : `DESCONHECIDO-${a.http}`;
  const m = await sessoes(a.u.id);
  Object.assign(a, m);
  const p = await sql(`select role::text as r from public.profiles where id = '${a.u.id}'::uuid`);
  console.log(`   ${a.u.id.slice(0, 8)} | ${mask(a.u.email)} | profiles=${p[0]?.r ?? 'SEM LINHA'} | GoTrue HTTP ${a.http} → ${a.canal} | senha md5=${md5(a.senha).slice(0, 12)} len=${a.senha.length} | sessões=${m.sessoes} refresh=${m.refresh} (vivas=${m.refreshVivas}) | ultimo_login=${a.u.last_sign_in_at ?? 'NULL'}`);
}

// [3b] prova comportamental da linhafantasma: 1 tentativa de login com a senha em claro (espera 400;
// falhar não escreve sessão). Só roda numa conta sem sessões nem último login.
const fantasma = lista.find((a) => a.canal === 'sql-hash' && a.sessoes === 0 && !a.u.last_sign_in_at);
let probe = null;
if (fantasma) {
  const r = await admin('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: fantasma.u.email, password: fantasma.senha }) });
  probe = { id: fantasma.u.id, status: r.status, code: r.j?.error_code ?? r.j?.code ?? null, token: typeof r.j?.access_token === 'string' };
  console.log(`[3b] login com a senha vazada na fantasma ${fantasma.u.id.slice(0, 8)} → HTTP ${r.status} (error_code=${probe.code ?? '—'}, access_token=${probe.token})`);
  const m2 = await sessoes(fantasma.u.id);
  console.log(`[3b] sessões dessa conta depois da tentativa: ${m2.sessoes} (antes ${fantasma.sessoes})`);
}

// [4] portões antes de qualquer escrita
const gmail = lista.filter((a) => String(a.u.email || '').endsWith('@gmail.com'));
const semHash = lista.filter((a) => !/^\$2/.test(a.u.encrypted_password || ''));
const gates = [];
const gate = (nome, passou, detalhe) => {
  gates.push({ nome, passou, detalhe });
  console.log(`${passou ? 'VERDE' : 'VERMELHO'}  ${nome}${detalhe !== undefined ? ` | ${JSON.stringify(detalhe)}` : ''}`);
};
gate(`alvos == ${ESPERA}`, lista.length === ESPERA, { encontrados: lista.length });
gate('nenhum alvo sem hash bcrypt', semHash.length === 0, semHash.length);
gate('nenhum alvo é @gmail.com (OAuth-only, não se toca)', gmail.length === 0, gmail.length);
gate('todo alvo tem canal conhecido', lista.every((a) => a.canal === 'admin-put' || a.canal === 'sql-hash'), lista.map((a) => a.canal));
if (gates.some((g) => !g.passou)) throw new Error('ABORTA: portão vermelho — nada foi escrito');
if (!RODAR) {
  fs.writeFileSync(DIARIO, JSON.stringify({ modo: 'preflight', em: new Date().toISOString(), senhasColhidas: senhas.size, contas: rows.length, alvos: lista.map((a) => ({ id: a.u.id, email: mask(a.u.email), canal: a.canal, gotrue_http: a.http, sessoes: a.sessoes, refresh: a.refresh, refreshVivas: a.refreshVivas, senha_md5: md5(a.senha).slice(0, 12), senha_len: a.senha.length, origem: a.origens })), probe, gates }, null, 2) + '\n');
  console.log(`\nPREFLIGHT somente-leitura completo. Nada escrito. Rode com --rodar.\ndiário: ${DIARIO}`);
  process.exit(0);
}

// [5] rotação
console.log(`\n[5] rotação de ${lista.length} contas`);
const novas = fs.existsSync(NOVAS) ? JSON.parse(fs.readFileSync(NOVAS, 'utf8')) : {};
const resultado = [];
for (const a of lista) {
  const nova = crypto.randomBytes(24).toString('base64url');
  let escrita;
  if (a.canal === 'admin-put') {
    const r = await admin(`/auth/v1/admin/users/${a.u.id}`, { method: 'PUT', body: JSON.stringify({ password: nova }) });
    escrita = r.status;
    if (r.status !== 200 || r.j?.id !== a.u.id) throw new Error(`ABORTA: PUT ${a.u.id} HTTP ${r.status}: ${JSON.stringify(r.j).slice(0, 200)}`);
  } else {
    const hash = await bcrypt.hash(nova, 10);
    const upd = await sql(`update auth.users set encrypted_password='${hash}' where id='${a.u.id}'::uuid; select count(*)::int as n from auth.users where id='${a.u.id}'::uuid and left(encrypted_password,2)='$2';`);
    escrita = upd[0]?.n === 1 ? 200 : `SQL-${upd[0]?.n}`;
    if (upd[0]?.n !== 1) throw new Error(`ABORTA: UPDATE SQL não confirmado em ${a.u.id}: ${JSON.stringify(upd)}`);
    const g = await visivel(a.u.id);
    if (g !== a.http) throw new Error(`ABORTA: a escrita SQL mudou a visibilidade no GoTrue (${a.http} → ${g})`);
  }
  const hash = (await sql(`select encrypted_password as h from auth.users where id = '${a.u.id}'`))[0]?.h || '';
  const antigaDestrava = !!hash && await bcrypt.compare(a.senha, hash);
  const novaDestrava = !!hash && await bcrypt.compare(nova, hash);
  const depois = await sessoes(a.u.id);
  console.log(`   VERDE ${a.u.id.slice(0, 8)} | ${mask(a.u.email)} | ${a.canal} escrita ${escrita} (GoTrue ${a.http}) | vazada→${antigaDestrava ? 'AINDA DESTRANCA' : 'bloqueada'} | nova→${novaDestrava ? 'OK' : 'FALHA'} | sessões ${a.sessoes}→${depois.sessoes} | refresh ${a.refresh}→${depois.refresh} (vivas ${a.refreshVivas}→${depois.refreshVivas}) | nova len=${nova.length} md5=${md5(nova).slice(0, 12)}`);
  if (antigaDestrava || !novaDestrava) throw new Error(`ABORTA: rotação de ${a.u.id} não provada por bcrypt`);
  novas[a.u.id] = { email: mask(a.u.email), dominio: String(a.u.email).split('@')[1], senha: nova, md5: md5(nova), canal: a.canal, em: new Date().toISOString() };
  resultado.push({ id: a.u.id, email: mask(a.u.email), canal: a.canal, escrita, gotrue_http: a.http, novaDestrava, antigaDestrava, md5_nova: md5(nova).slice(0, 12), ...depois, antes: { sessoes: a.sessoes, refresh: a.refresh, refreshVivas: a.refreshVivas } });
}
fs.writeFileSync(NOVAS, JSON.stringify(novas, null, 2) + '\n', { mode: 0o600 });
console.log(`[5] senhas novas persistidas só fora do repo: ${NOVAS} (${Object.keys(novas).length} entradas)`);

// [6] prova final: nenhuma senha do corpus destranca conta alguma
const rows2 = await sql(`select id, email, encrypted_password from auth.users`);
let restantes = 0;
for (const [senha] of senhas) {
  for (const u of rows2) {
    if (!u.encrypted_password || !/^\$2/.test(u.encrypted_password)) continue;
    if (await bcrypt.compare(senha, u.encrypted_password)) {
      restantes++;
      console.log(`   AINDA DESTRANCA: ${u.id.slice(0, 8)} | ${mask(u.email)} | senha md5=${md5(senha).slice(0, 12)}`);
    }
  }
}
const ids = lista.map((a) => `'${a.u.id}'`).join(',');
const totSess = await sql(`select count(*)::int as n from auth.sessions where user_id in (${ids})`);
const totRefresh = await sql(`select count(*)::int as n, count(*) filter (where revoked is distinct from true)::int as vivas from auth.refresh_tokens where user_id in (${ids})`);
const oauthOk = await sql(`select count(*)::int as n from auth.users where email like '%@gmail.com'`);
console.log(`[6] combinações vivas depois da rotação: ${restantes}`);
console.log(`[6] sessões dos alvos: ${totSess[0].n} (antes ${lista.reduce((s, a) => s + a.sessoes, 0)}) | refresh dos alvos: ${totRefresh[0].n} vivas=${totRefresh[0].vivas} (antes ${lista.reduce((s, a) => s + a.refresh, 0)} vivas=${lista.reduce((s, a) => s + a.refreshVivas, 0)})`);
console.log(`[6] contas @gmail.com intactas: ${oauthOk[0].n}`);

fs.writeFileSync(DIARIO, JSON.stringify({ modo: 'rotacao', em: new Date().toISOString(), senhasColhidas: senhas.size, contas: rows.length, probe, gates, alvos: resultado, restantes, sessoesAlvos: totSess[0].n, refreshAlvos: totRefresh[0], gmailIntactas: oauthOk[0].n }, null, 2) + '\n');
console.log(`diário: ${DIARIO}`);
if (restantes !== 0) throw new Error('ABORTA: sobraram combinações vivas');
console.log('ROTACAO_8_OK');
