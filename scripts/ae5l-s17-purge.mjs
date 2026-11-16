// AE5-L — follow-up do ciclo (d): purge FÍSICO das 4 contas s17.
// Diagnóstico (registrado no artefacto ae5k): a Admin API é cega para estas linhas —
// instance_id é NULL (as contas reais têm '00000000-...'), por isso a listagem não as
// mostra E o DELETE /admin/users/{id} é no-op (200 sem apagar). Perfis e linhas de audit
// já foram limpos pelo ae5k. O que resta são 4 linhas físicas em auth.users, invisíveis
// à Admin API — só SQL as alcança. Escopo idêntico ao OK «(d) Limpar resíduo».
// Verificação: baseline de 14 tabelas pré/pós — auth.users 13→9 e as outras 13 intactas.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/ae5l-s17-purge-16-11.json`;
const PRE = `${DIR}/evidence/ae5l-s17-baseline-pre-16-11.json`;
const POS = `${DIR}/evidence/ae5l-s17-baseline-pos-16-11.json`;
for (const p of [OUT, PRE, POS]) if (existsSync(p)) throw new Error(`Artefacto ${p} já existe — guard.`);

const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const sql = async (query, tentativas = 10) => {
  let ultimo = '';
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const t = await r.text();
    if (r.ok) return JSON.parse(t);
    ultimo = `sql HTTP ${r.status}: ${t.slice(0, 400)}`;
    if (!(r.status >= 500 || r.status === 401 || /Failed to/i.test(t))) throw new Error(ultimo);
    await new Promise((s) => setTimeout(s, 8000));
  }
  throw new Error(`sql esgotou as tentativas — ${ultimo}`);
};

const admin = async (path) => {
  const r = await fetch(`${HOST}${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, j };
};

const gates = { portoes: 0, falhas: [] };
const gate = (nome, dado, esperado) => {
  gates.portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) gates.falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
};

const EMAILS_S17 = ['s17-coordinator@test.local', 's17-developer@test.local', 's17-director@test.local', 's17-secretary@test.local'];

async function main() {
  // ── 0. pré-condições ──
  console.log('[0] Pré-condições...');
  const linhas = await sql(`select id, email, (deleted_at is null)::boolean as deleted_at_nulo, (instance_id is null)::boolean as instance_id_nulo
    from auth.users where email in ('${EMAILS_S17.join("','")}') order by email;`);
  gate('pré: 4 linhas físicas s17 em auth.users', linhas.length, 4);
  gate('pré: deleted_at nulo nas 4 (não é soft-delete)', linhas.every((l) => l.deleted_at_nulo), true);
  gate('pré: instance_id nulo nas 4 (cego da Admin API)', linhas.every((l) => l.instance_id_nulo), true);
  const listagem = await admin('/auth/v1/admin/users?per_page=200');
  const s17NaListagem = (listagem.j.users ?? []).filter((u) => EMAILS_S17.includes(u.email)).length;
  gate('pré: Admin API lista 9 usuários e nenhum s17', [listagem.j.users?.length, s17NaListagem], [9, 0]);
  const filhos = await sql(`select json_build_object(
    'identities', (select count(*)::int from auth.identities where user_id in ('${linhas.map((l) => l.id).join("','")}')),
    'sessions', (select count(*)::int from auth.sessions where user_id in ('${linhas.map((l) => l.id).join("','")}')),
    'refresh_tokens', (select count(*)::int from auth.refresh_tokens where user_id in ('${linhas.map((l) => l.id).join("','")}')),
    'mfa_factors', (select count(*)::int from auth.mfa_factors where user_id in ('${linhas.map((l) => l.id).join("','")}')),
    'one_time_tokens', (select count(*)::int from auth.one_time_tokens where user_id in ('${linhas.map((l) => l.id).join("','")}'))
  ) as j;`);
  const filhosS17 = filhos[0].j;
  console.log(`    filhos auth das contas s17: ${JSON.stringify(filhosS17)}`);
  const perfisS17 = await sql(`select count(*)::int as n from public.profiles where email ilike 's17%';`);
  gate('pré: perfis s17 = 0 (já limpos pelo ae5k)', perfisS17[0].n, 0);
  const auditN = await sql(`select count(*)::int as n from public.supervision_audit;`);
  gate('pré: supervision_audit = 0 (já limpo pelo ae5k)', auditN[0].n, 0);

  // ── 1. baseline pré (14 tabelas) ──
  console.log('[1] Baseline pré...');
  execFileSync('node', ['scripts/ae5-rm68-baseline.mjs', 'capture', PRE], { cwd: DIR, stdio: 'inherit' });

  // ── 2. purge físico via SQL (Admin API é cega aqui) ──
  console.log('[2] DELETE físico das 4 linhas s17 em auth.users...');
  const apagadas = await sql(`DELETE FROM auth.users WHERE email in ('${EMAILS_S17.join("','")}') RETURNING id;`);
  gate('purge: 4 linhas apagadas', apagadas.length, 4);
  const authS17Pos = await sql(`select count(*)::int as n from auth.users where email ilike 's17%';`);
  gate('purge: 0 linhas s17 em auth.users', authS17Pos[0].n, 0);
  const authTotal = await sql(`select count(*)::int as n from auth.users;`);
  gate('purge: auth.users total = 9 (contas reais intactas)', authTotal[0].n, 9);
  const listagemPos = await admin('/auth/v1/admin/users?per_page=200');
  gate('purge: Admin API continua com 9', listagemPos.j.users?.length, 9);

  // ── 3. baseline pós + comparativo ──
  console.log('[3] Baseline pós + comparativo...');
  execFileSync('node', ['scripts/ae5-rm68-baseline.mjs', 'capture', POS], { cwd: DIR, stdio: 'inherit' });
  const pre = JSON.parse(readFileSync(PRE, 'utf8')).tabelas;
  const pos = JSON.parse(readFileSync(POS, 'utf8')).tabelas;
  gate('auth.users: 13 → 9', [pre['auth.users'].n, pos['auth.users'].n], [13, 9]);
  const intatas = Object.keys(pre).filter((t) => t !== 'auth.users')
    .every((t) => pre[t].h === pos[t].h);
  gate('outras 13 tabelas com md5 intacto', intatas, true);

  // ── 4. fecho ──
  const veredito = gates.falhas.length === 0 ? 'AE5L_S17_PURGE_VERDE' : 'AE5L_S17_PURGE_VERMELHO';
  const out = {
    em: new Date().toISOString(),
    ok_nomeado: '(d) Limpar resíduo — seleção do usuário, 16/11 (follow-up do ae5k)',
    escopo: 'purge físico de 4 linhas auth.users s17-*@test.local invisíveis à Admin API (instance_id NULL)',
    diagnostico: 'Admin API lista e DELETE não alcançam linhas com instance_id NULL; o DELETE retorna 200 sem apagar. Purge via SQL (Management API) — mesmo escopo autorizado.',
    linhas_apagadas: apagadas.length,
    filhos_cascateados: filhosS17,
    baseline_pre: PRE,
    baseline_pos: POS,
    portoes: gates.portoes,
    falhas: gates.falhas,
    veredito,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`\n=== ${veredito} | portões ${gates.portoes} | falhas ${gates.falhas.length} ===`);
  if (gates.falhas.length) { for (const f of gates.falhas) console.log('VERMELHO  ' + f); process.exit(1); }
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
