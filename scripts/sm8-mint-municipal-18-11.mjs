// SM-8-MINT — contas de teste em falta para os testes do §10 por perfil (MÓDULO 2, municipal).
// Autorização: seleção explícita do utilizador «Mintar contas em falta» (18/11, ferramenta de escolha).
// Escopo: (0) prova medida de que a conta do Professor já existe (papel do shell «teacher» = alias
// viewRole do enum `pedagogical`; há perfis pedagógicos e sessão no registo mestre) — logo nada se
// minta para ela; (1) mint de 1 conta por cada rótulo de `municipal_role` que não tinha conta
// (secretario_municipal, secretario_adjunto, gestor_autorizado, equipe_administrativa) — são as
// personas municipais do §5, e nenhuma existia; (2) fixture declarada e removível: 1 município
// (`bfr_municipalities`) + 4 concessões (`bfr_municipal_access_grants`), porque sem município não há
// concessão (FK) e sem concessão a persona não existe. granted_by = perfil de teste do admin
// (`ah2-developer-54e9d1`), nunca um perfil real. 0 DDL, 0 deploy, 0 publicação. Tokens só em ficheiro
// fora do repo (sm8-municipal-sessions.json, apagado na limpeza); senhas nunca escritas em disco.
// Cada persona tem um papel-base do enum que NÃO abre a área municipal, e o portão de cada etapa
// prova as duas metades do §5: RPC `bfr_is_municipal_authority()` = false ANTES da concessão
// (§5.377 — secretário escolar não herda municipal) e = true DEPOIS (§5.379 — a concessão do admin
// é o mecanismo), com o cargo-base intacto (§6.408 — alternar sem perder o contexto).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { sql, admin, HOST } from './c2-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SESSOES = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/sm8-municipal-sessions.json';
const ARQUIVO = `${DIR}/evidence/sm8-mint-municipal-18-11.json`;
const AH2_SESSOES = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessions.json';
const ADMIN_TESTE = '49753880-f7fc-4f0a-bbbb-c3883c37a29d'; // ah2-developer-54e9d@bfr-conecta.test

const PERSONAS = [
  { label: 'secretario_municipal', base: 'secretary' },    // §6.408: mantém a área escolar
  { label: 'secretario_adjunto',  base: 'secretary' },
  { label: 'gestor_autorizado',   base: 'coordinator' },
  { label: 'equipe_administrativa', base: 'pending' },     // §5.367: a concessão não é cargo
];

for (const f of [ARQUIVO, SESSOES]) if (existsSync(f)) throw new Error(`ABORTA: ${f} já existe — ciclo sujo`);

const diario = {
  ciclo: 'SM-8', ok_literal: 'Mintar contas em falta', started: new Date().toISOString(),
  escritas_em_tabelas_de_produto: 0, stages: {},
};
const falhas = [];
let portoes = 0;
const gate = (nome, dado, esperado) => {
  portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
  return ok;
};
const rpc = async (accessToken) => {
  const r = await admin('/rest/v1/rpc/bfr_is_municipal_authority', {
    method: 'POST', body: JSON.stringify({}),
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (r.status !== 200) throw new Error(`rpc HTTP ${r.status}: ${JSON.stringify(r.j).slice(0, 240)}`);
  return r.j;
};

// ═══ STAGE 0: o Professor já tem conta (prova, não mint) ═══
console.log('\n[S0] professor = teacher = pedagogical (alias viewRole do shell)');
const ped = await sql(`select count(*)::int as n from public.profiles where role='pedagogical'::account_role;`);
gate('há perfil pedagogical (o papel que renderiza como Professor)', ped[0].n >= 1, true);
const mestre = JSON.parse(readFileSync(AH2_SESSOES, 'utf8'));
const temSessaoPed = typeof mestre.pedagogical?.access_token === 'string' && mestre.pedagogical.access_token.length > 100;
gate('registo mestre tem sessão pedagogical viva', temSessaoPed, true);
const emailPed = mestre.pedagogical?.user?.email ?? mestre.pedagogical?.email;
const pedNoAuth = emailPed ? (await sql(`select count(*)::int as n from auth.users where email='${emailPed.replace(/'/g, "''")}';`))[0].n : 0;
gate('email da sessão pedagogical existe no auth.users', pedNoAuth, 1);
diario.stages.professor = { veredito: 'CONTA_JA_EXISTE_NENHUM_MINT', perfis_pedagogical: ped[0].n, email_sessao: emailPed, nota: 'teacher é o alias viewRole do enum; o enum não tem rótulo teacher (medido em SM.12)' };
if (!(ped[0].n >= 1 && temSessaoPed && pedNoAuth === 1)) throw new Error('ABORTA: professor sem prova de existência — resolver antes de mintar municipal');

// ═══ STAGE 1: baseline pré ═══
console.log('\n[S1] baseline pré');
const TABELAS = ['auth.users', 'public.profiles', 'public.bfr_municipalities', 'public.bfr_municipal_access_grants'];
const SENTINELAS = ['public.staff_schools', 'public.schools', 'public.students', 'public.bfr_school_key_map'];
const baseline = {};
for (const t of [...TABELAS, ...SENTINELAS]) {
  const rows = await sql(`select count(*)::int as n from ${t};`);
  const hash = await sql(`select md5(string_agg(x::text, ',' order by x::text)) as h from (select * from ${t}) x;`);
  baseline[t] = { n: rows[0].n, md5: hash[0].h || 'empty' };
}
diario.stages.baseline_pre = { em: new Date().toISOString(), tabelas: baseline };
console.log('  ' + Object.entries(baseline).map(([k, v]) => `${k.split('.').pop()}=${v.n}`).join(' · '));
gate('municipios nasceram vazios (DDL) e continuam vazios', baseline['public.bfr_municipalities'].n, 0);
gate('concessões nasceram vazias (DDL) e continuam vazias', baseline['public.bfr_municipal_access_grants'].n, 0);

// ═══ STAGE 2: município de fixture (FK das concessões exige um) ═══
console.log('\n[S2] município fixture');
await sql(`insert into public.bfr_municipalities (name, uf) values ('Sao Paulo (SM8 fixture — apagar)', 'SP');`);
const muni = (await sql(`select id::text as id, name, uf from public.bfr_municipalities order by created_at desc limit 1;`))[0];
gate('município fixture criado (1 linha, SP)', [muni.name, muni.uf], ['Sao Paulo (SM8 fixture — apagar)', 'SP']);
diario.stages.municipio = { id: muni.id, name: muni.name, uf: muni.uf, nota: 'fixture declarada — removida na limpeza SM-8-L' };
diario.escritas_em_tabelas_de_produto += 1;

// ═══ STAGE 3: 4 contas municipais (mint + login real + papel-base) ═══
console.log('\n[S3] mint das 4 personas');
const sessoes = {};
diario.stages.contas = [];
for (const p of PERSONAS) {
  const email = `sm8-${p.label}-${randomBytes(3).toString('hex')}@bfr-conecta.test`;
  const senha = randomBytes(18).toString('base64url');
  const UID = randomUUID();
  const criado = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ id: UID, email, password: senha, email_confirm: true, data: { full_name: `SM8 ${p.label} Sintética (apagar)` } }),
  });
  if (![200, 201].includes(criado.status)) throw new Error(`mint ${p.label} HTTP ${criado.status}: ${JSON.stringify(criado.j).slice(0, 240)}`);
  const uid = criado.j?.id || criado.j?.user?.id || UID;

  const tok = await admin('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: senha }) });
  if (!tok.j?.access_token) throw new Error(`login ${p.label} falhou HTTP ${tok.status}: ${JSON.stringify(tok.j).slice(0, 240)}`);
  const accessToken = tok.j.access_token;

  const perfilAntes = await sql(`select role::text as r from public.profiles where id='${uid}'::uuid;`);
  gate(`${p.label}: trigger criou profile (1 linha)`, perfilAntes.length, 1);
  await sql(`update public.profiles set role='${p.base}'::account_role, full_name='SM8 ${p.label} Sintética' where id='${uid}'::uuid;`);
  const perfilDepois = await sql(`select role::text as r from public.profiles where id='${uid}'::uuid;`);
  gate(`${p.label}: cargo-base = ${p.base}`, perfilDepois[0].r, p.base);

  const antes = await rpc(accessToken);
  gate(`${p.label}: RPC autoridade municipal = false ANTES da concessão (§5.377)`, antes, false);

  sessoes[p.label] = {
    id: uid, email, role: p.base, access_token: accessToken, refresh_token: tok.j.refresh_token,
    expires_at: tok.j.expires_at, user: tok.j.user,
  };
  diario.stages.contas.push({ label: p.label, id: uid, email, cargo_base: p.base, papel_do_trigger: perfilAntes[0]?.r ?? null, http_mint: criado.status, http_login: tok.status, rpc_antes: antes });
  console.log(`  ${p.label}: ${email} (base ${p.base}, rpc_antes=${antes})`);
}
writeFileSync(SESSOES, JSON.stringify(sessoes, null, 2) + '\n');

// ═══ STAGE 4: 4 concessões (o mecanismo do §5.379) ═══
console.log('\n[S4] concessões');
diario.stages.grants = [];
for (const p of PERSONAS) {
  const s = sessoes[p.label];
  await sql(`insert into public.bfr_municipal_access_grants (profile_id, municipality_id, municipal_role, granted_by)
             values ('${s.id}'::uuid, '${muni.id}'::uuid, '${p.label}', '${ADMIN_TESTE}'::uuid);`);
  const g = (await sql(`select id::text as id, municipal_role from public.bfr_municipal_access_grants
                        where profile_id='${s.id}'::uuid and revoked_at is null;`))[0];
  gate(`${p.label}: concessão ativa criada`, g?.municipal_role, p.label);
  const cargo = (await sql(`select role::text as r from public.profiles where id='${s.id}'::uuid;`))[0].r;
  gate(`${p.label}: cargo-base intacto após a concessão (§6.408)`, cargo, p.base);
  diario.stages.grants.push({ id: g.id, label: p.label, profile_id: s.id, municipality_id: muni.id, granted_by: ADMIN_TESTE });
}
diario.escritas_em_tabelas_de_produto += 4; // 4 concessões + 1 município = 5, declaradas e removíveis

// ═══ STAGE 5: RPC depois + sentinelas ═══
console.log('\n[S5] prova de ponta a ponta');
for (const p of PERSONAS) {
  const depois = await rpc(sessoes[p.label].access_token);
  gate(`${p.label}: RPC autoridade municipal = true DEPOIS da concessão (§5.379)`, depois, true);
}
let controlToken = mestre.pedagogical.access_token;
const expPed = Number(mestre.pedagogical.expires_at ?? 0);
if (!(expPed - Math.floor(Date.now() / 1000) > 60)) {
  const fresca = await admin('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: mestre.pedagogical.refresh_token }) });
  if (!fresca.j?.access_token) throw new Error(`refresh pedagogical falhou HTTP ${fresca.status}`);
  controlToken = fresca.j.access_token;
  mestre.pedagogical = { ...mestre.pedagogical, access_token: fresca.j.access_token, refresh_token: fresca.j.refresh_token, expires_at: fresca.j.expires_at, user: fresca.j.user };
  writeFileSync(AH2_SESSOES, JSON.stringify(mestre, null, 2) + '\n');
}
const controlo = await rpc(controlToken);
gate('controlo: professor SEM concessão continua false (§5.377, lado negativo)', controlo, false);
const pos = {};
for (const t of [...TABELAS, ...SENTINELAS]) {
  const rows = await sql(`select count(*)::int as n from ${t};`);
  pos[t] = rows[0].n;
}
gate('delta de contas: +4 users', pos['auth.users'] - baseline['auth.users'].n, 4);
gate('delta de perfis: +4 profiles', pos['public.profiles'] - baseline['public.profiles'].n, 4);
gate('concessões ativas = 4', (await sql(`select count(*)::int as n from public.bfr_municipal_access_grants where revoked_at is null;`))[0].n, 4);
gate('sentinelas intocadas (staff/schools/students/ponte)',
  SENTINELAS.map((t) => pos[t] - baseline[t].n), [0, 0, 0, 0]);

diario.portoes_parciais = portoes;
diario.falhas_parciais = falhas.slice();
diario.stages.baseline_pos = { em: new Date().toISOString(), tabelas: pos };
diario.stages.session = { arquivo: 'sm8-municipal-sessions.json', nota: 'tokens só em ficheiro fora do repo; apagado na limpeza' };
diario.limpeza = {
  ordem: 'apagar as 4 concessões por id → apagar o município por id → apagar os 4 auth.users por id (cascade) → apagar o ficheiro de sessões',
  grants: diario.stages.grants.map((g) => g.id),
  municipio: muni.id,
  contas: diario.stages.contas.map((c) => ({ id: c.id, email: c.email })),
  granted_by: ADMIN_TESTE,
};
diario.veredito = falhas.length ? 'MINT_COM_VERMELHOS' : 'MINT_OK_4_PERSONAS_MUNICIPAIS';
writeFileSync(ARQUIVO, JSON.stringify(diario, null, 2) + '\n');

console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach((f) => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'SM8_PAROU' : 'SM8_MINT_OK (seguir para os testes §10 por perfil com sm7-navegador-municipal.mjs)');
if (falhas.length) process.exit(1);
