// AE5-K — ciclo (d): limpeza do resíduo s17.
// OK nomeado: «(d) Limpar resíduo» — 4 contas s17-*@test.local (auth + profiles, cascade)
// e 9 linhas de supervision_audit (6 de perfis s17 + 3 da conta real pc.maceedo@gmail.com,
// perfil cc005f8c-..., que NÃO é tocada — só as linhas de audit, autorizadas).
// Ordem FK-safe: audit primeiro (referencia profiles), depois contas via Admin API
// (cascade profiles_id_fkey), com filtro de email do lado do cliente — lição do ciclo AE5
// (o parâmetro ?email= da Admin API é ignorado).
// Verificação: baseline de 14 tabelas pré/pós — as 3 tabelas-alvo têm deltas esperados
// (13→9, 13→9, 9→0) e as outras 11 têm md5 intacto.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/ae5k-s17-cleanup-16-11.json`;
const PRE = `${DIR}/evidence/ae5k-s17-baseline-pre-16-11.json`;
const POS = `${DIR}/evidence/ae5k-s17-baseline-pos-16-11.json`;
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

const admin = async (path, init) => {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, j };
};

const adminUsersPorEmail = async (email) => {
  if (!/^s17-[\w.+-]+@test\.local$/.test(email)) throw new Error(`guard: ${email} não é s17-*@test.local`);
  const r = await admin('/auth/v1/admin/users?per_page=200');
  if (r.status !== 200) throw new Error(`lista admin falhou HTTP ${r.status}`);
  const alvos = (r.j.users ?? []).filter((u) => u.email === email);
  for (const u of alvos) if (u.email !== email) throw new Error(`guard: ${u.id} tem email ${u.email} ≠ ${email}`);
  return alvos;
};

const gates = { portoes: 0, falhas: [] };
const gate = (nome, dado, esperado) => {
  gates.portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) gates.falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
};

const EMAILS_S17 = ['s17-coordinator@test.local', 's17-developer@test.local', 's17-director@test.local', 's17-secretary@test.local'];
const PERFIL_REAL = 'cc005f8c-fa2c-414f-8b04-73e828ec8216'; // pc.maceedo@gmail.com — só linhas de audit

async function main() {
  // ── 0. pré-condições ──
  console.log('[0] Pré-condições...');
  const authPre = await sql(`select id, email from auth.users where email ilike 's17%' order by email;`);
  gate('pré: 4 contas s17 no auth', authPre.map((u) => u.email), EMAILS_S17);
  const auditPre = await sql(`select count(*)::int as n from public.supervision_audit;`);
  gate('pré: 9 linhas de supervision_audit', auditPre[0].n, 9);
  const auditS17Pre = await sql(`select count(*)::int as n from public.supervision_audit where profile_id in ('${authPre.map((u) => u.id).join("','")}');`);
  gate('pré: 6 linhas de audit de perfis s17', auditS17Pre[0].n, 6);
  const auditRealPre = await sql(`select count(*)::int as n from public.supervision_audit where profile_id = '${PERFIL_REAL}';`);
  gate('pré: 3 linhas de audit da conta real', auditRealPre[0].n, 3);

  // ── 1. baseline pré (14 tabelas) ──
  console.log('[1] Baseline pré...');
  execFileSync('node', ['scripts/ae5-rm68-baseline.mjs', 'capture', PRE], { cwd: DIR, stdio: 'inherit' });

  // ── 2. audit primeiro (referencia profiles) ──
  console.log('[2] DELETE supervision_audit (6 s17 + 3 da conta real)...');
  const delAudit = await sql(`DELETE FROM public.supervision_audit
    WHERE profile_id = '${PERFIL_REAL}' OR profile_id IN ('${authPre.map((u) => u.id).join("','")}')
    RETURNING id;`);
  gate('audit: 9 linhas apagadas', delAudit.length, 9);
  const auditPos = await sql(`select count(*)::int as n from public.supervision_audit;`);
  gate('audit: 0 linhas restantes', auditPos[0].n, 0);
  const perfilRealVivo = await sql(`select count(*)::int as n from public.profiles where id = '${PERFIL_REAL}';`);
  gate('audit: perfil da conta real intocado', perfilRealVivo[0].n, 1);

  // ── 3. contas s17 via Admin API (cascade profiles_id_fkey) ──
  console.log('[3] DELETE das 4 contas s17 (filtro de email client-side + guarda)...');
  for (const email of EMAILS_S17) {
    const vivos = await adminUsersPorEmail(email);
    for (const u of vivos) {
      const del = await admin(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' });
      if (![200, 204].includes(del.status)) throw new Error(`DELETE ${email} falhou HTTP ${del.status}: ${JSON.stringify(del.j).slice(0, 400)}`);
    }
    const restantes = await adminUsersPorEmail(email);
    gate(`conta ${email} re-consultada = 0`, restantes.length, 0);
  }

  // ── 4. perfis s17 (o cascade deve ter apagado; se não, DELETE explícito seguro) ──
  console.log('[4] Perfis s17...');
  const perfisS17 = await sql(`select count(*)::int as n from public.profiles where email ilike 's17%';`);
  if (perfisS17[0].n > 0) {
    await sql(`DELETE FROM public.profiles WHERE email ilike 's17%';`);
  }
  const perfisS17Pos = await sql(`select count(*)::int as n from public.profiles where email ilike 's17%';`);
  gate('perfis s17 = 0 após limpeza', perfisS17Pos[0].n, 0);
  const authS17Pos = await sql(`select count(*)::int as n from auth.users where email ilike 's17%';`);
  gate('auth s17 = 0 após limpeza', authS17Pos[0].n, 0);

  // ── 5. baseline pós + verificação programática ──
  console.log('[5] Baseline pós + comparativo...');
  execFileSync('node', ['scripts/ae5-rm68-baseline.mjs', 'capture', POS], { cwd: DIR, stdio: 'inherit' });
  const pre = JSON.parse(readFileSync(PRE, 'utf8')).tabelas;
  const pos = JSON.parse(readFileSync(POS, 'utf8')).tabelas;
  gate('auth.users: 13 → 9', [pre['auth.users'].n, pos['auth.users'].n], [13, 9]);
  gate('public.profiles: 13 → 9', [pre['public.profiles'].n, pos['public.profiles'].n], [13, 9]);
  gate('supervision_audit: 9 → 0', [pre['supervision_audit'].n, pos['supervision_audit'].n], [9, 0]);
  const intatas = Object.keys(pre).filter((t) => !['auth.users', 'public.profiles', 'supervision_audit'].includes(t))
    .every((t) => pre[t].h === pos[t].h);
  gate('outras 11 tabelas com md5 intacto', intatas, true);

  // ── 6. fecho ──
  const veredito = gates.falhas.length === 0 ? 'AE5K_S17_CLEANUP_VERDE' : 'AE5K_S17_CLEANUP_VERMELHO';
  const out = {
    em: new Date().toISOString(),
    ok_nomeado: '(d) Limpar resíduo — seleção do usuário, 16/11',
    escopo: '4 contas s17-*@test.local + 9 linhas supervision_audit (6 s17 + 3 da conta real pc.maceedo@gmail.com)',
    contas_apagadas: EMAILS_S17,
    linhas_audit_apagadas: delAudit.length,
    perfil_real_intocado: true,
    baseline_pre: PRE,
    baseline_pos: POS,
    deltas_esperados: { 'auth.users': '13→9', 'public.profiles': '13→9', supervision_audit: '9→0' },
    portoes: gates.portoes,
    falhas: gates.falhas,
    veredito,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`\n=== ${veredito} | portões ${gates.portoes} | falhas ${gates.falhas.length} ===`);
  if (gates.falhas.length) { for (const f of gates.falhas) console.log('VERMELHO  ' + f); process.exit(1); }
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
