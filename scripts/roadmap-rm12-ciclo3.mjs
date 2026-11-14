// RM-1.2 — prova comportamental da aprovação administrativa de contas (passo 2).
// Faz as chamadas HTTP exatas do painel "Contas e cargos" (index.html:9092 updateProfileRole, :9040 registerAccountRole, :9081 lista).
// Passos 1 corrigidos: o e-mail do solicitante usa o domínio visível @bfr-admin.test; os oráculos de contagem são derivados
// do predicado RESTRICTIVO real (profiles_hide_test_accounts), não de suposições; e entra a pré-cadastro handle_new_user.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { DIR, sql, admin, jwtFetch, criarGates } from './s19-lib.mjs';

const CICLO = 'rm12';
const OUT = `${DIR}/evidence/${CICLO}-ciclo3.json`;
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} já existe — ciclo sujo`);

const PRE = JSON.parse(readFileSync(`${DIR}/evidence/roadmap-rm12-baseline.json`, 'utf8'));
const OCULTO = "(email !~~ '%@bfr-conecta.test' AND email !~~ 'bfr.qa.email.%')";
const DIRECTÓRIO = "array['pedagogical','aee','coordinator','director','secretary','developer']";

const { gate, resumo } = criarGates();
const reg = { ciclo: 'RM-1.2 pass3', em: new Date().toISOString(), portoes: [], contas: [], fixture: [] };
const log = (nome, dado, esperado) => { gate(nome, dado, esperado); reg.portoes.push({ nome, dado, esperado }); };

const um = async (q) => (await sql(q))[0];

console.log('[0] Preflight — nenhuma conta deste ciclo pode existir');
const sujas = await um(`select count(*)::int as n from public.profiles where split_part(email,'@',1) like '${CICLO}-%';`);
log('preflight: 0 perfis rm12-* vivos', sujas.n, 0);
if (sujas.n !== 0) throw new Error('ciclo sujo — aborta antes de escrever');

const mint = async (rotulo, dominio, login = true, emailFixo = null) => {
  const uid = randomUUID();
  const email = emailFixo ?? `${CICLO}-${rotulo}-${randomBytes(3).toString('hex')}@${dominio}`;
  const senha = randomBytes(18).toString('base64url');
  const criado = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ id: uid, email, password: senha, email_confirm: true, data: { full_name: `RM12 ${rotulo} Sintético` } }),
  });
  log(`mint ${rotulo} → 200/201`, [200, 201].includes(criado.status), true);
  if (![200, 201].includes(criado.status)) throw new Error(`mint ${rotulo} HTTP ${criado.status}`);
  const conta = { rotulo, uid, email, token: null };
  if (login) {
    const tok = await admin('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: senha }) });
    log(`login real ${rotulo} → access_token`, typeof tok.j?.access_token === 'string', true);
    if (!tok.j?.access_token) throw new Error(`login ${rotulo} HTTP ${tok.status}`);
    conta.token = tok.j.access_token;
  }
  reg.contas.push({ rotulo, uid, email });
  return conta;
};

console.log('\n[1] Solicitante visível (@bfr-admin.test) — o que handle_new_user realmente escreve');
const app = await mint('app', 'bfr-admin.test');
const perfilApp = await um(`select role::text as role, full_name from public.profiles where id='${app.uid}'::uuid;`);
log('trigger handle_new_user criou o perfil', !!perfilApp.role, true);
log('role de nascimento é parent, NUNCA pending', perfilApp.role, 'parent');
const defColuna = await um(`select column_default as d from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role';`);
log("schema espera pending: default da coluna role = 'pending'", defColuna.d, "'pending'::account_role");
const fallback = await um(`select (position('coalesce(assigned_role' in pg_get_functiondef(p.oid)) > 0) as tem from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='handle_new_user';`);
log('mas handle_new_user sobrepõe com coalesce(assigned_role, ...)', fallback.tem, true);
const temPending = await um(`select count(*)::int as n from pg_type t join pg_enum e on e.enumtypid=t.oid where t.typname='account_role' and e.enumlabel='pending';`);
log('pending existe no enum account_role', temPending.n, 1);
const pendingVivo = await um(`select count(*)::int as n from public.profiles where role::text='pending';`);
log('mas nenhuma conta viva tem role pending', pendingVivo.n, 0);

console.log('\n[2] Developer — quem aprova (fica no domínio oculto, não polui directórios reais)');
const dev = await mint('dev', 'bfr-conecta.test');
await sql(`update public.profiles set role='developer'::account_role where id='${dev.uid}'::uuid;`);
const perfilDev = await um(`select role::text as role from public.profiles where id='${dev.uid}'::uuid;`);
log('developer role = developer', perfilDev.role, 'developer');

console.log('\n[3] Conta de controlo no domínio OCULTO — serve para provar a policy RESTRICTIVE');
const ctl = await mint('ctl', 'bfr-conecta.test');
const ctlOulta = await um(`select count(*)::int as n from public.profiles where not ${OCULTO} and split_part(email,'@',1) like '${CICLO}-ctl-%';`);
log('a conta de controlo caiu no conjunto oculto pelo domínio', ctlOulta.n, 1);

console.log('\n[4] ANTES: o parent enxerga só a própria linha');
const antes = await jwtFetch(app.token, '/rest/v1/profiles?select=id,role');
log('GET profiles como parent → HTTP 200', antes.status, 200);
log('linhas visíveis antes da aprovação = 1', Array.isArray(antes.j) ? antes.j.length : antes.j, 1);
log('a única linha visível é a própria', antes.j?.[0]?.id, app.uid);

console.log('\n[5] Negativos — ninguém se autoaprova');
const self = await jwtFetch(app.token, '/rest/v1/rpc/set_profile_role', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ target_profile_id: app.uid, target_role: 'developer', target_full_name: null }),
});
log('parent chama set_profile_role em si mesmo → 4xx', self.status >= 400 && self.status < 500, true);
log('o guard é o do developer', String(self.j?.message || '').includes('developer'), true);
const intacto = await um(`select role::text as role from public.profiles where id='${app.uid}'::uuid;`);
log('e a tentativa não mudou nada (role segue parent)', intacto.role, 'parent');
const ctlSelf = await jwtFetch(ctl.token, '/rest/v1/rpc/set_profile_role', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ target_profile_id: ctl.uid, target_role: 'director', target_full_name: null }),
});
log('NEGATIVO: uma segunda conta não-developer também é barrada', ctlSelf.status >= 400 && ctlSelf.status < 500, true);

console.log('\n[6] O painel do developer LISTA a conta (a query real de index.html:9081)');
const listaDev = await jwtFetch(dev.token, '/rest/v1/profiles?select=id,full_name,email,role&order=full_name.asc');
const oraculoLista = await um(`select count(*)::int as n from public.profiles where ${OCULTO} or id='${dev.uid}'::uuid;`);
log('GET profiles como developer → HTTP 200', listaDev.status, 200);
log('linhas devolvidas = oráculo SQL (não-ocultas + a própria)', Array.isArray(listaDev.j) ? listaDev.j.length : listaDev.j, oraculoLista.n);
const idsDev = new Set(Array.isArray(listaDev.j) ? listaDev.j.map(r => r.id) : []);
log('POSITIVO: o solicitante visível está na lista do painel', idsDev.has(app.uid), true);
log('RESTRICTIVE: a conta de controlo oculta NÃO aparece na mesma lista', idsDev.has(ctl.uid), false);
log('o developer vê a PRÓPRIA linha apesar do domínio oculto (id = auth.uid())', idsDev.has(dev.uid), true);

console.log('\n[7] Caminho B da UI (updateProfileRole) — rpc set_profile_role pelo JWT do developer');
const aprova = await jwtFetch(dev.token, '/rest/v1/rpc/set_profile_role', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ target_profile_id: app.uid, target_role: 'pedagogical', target_full_name: null }),
});
log('rpc → HTTP 200 e true', [aprova.status, aprova.j], [200, true]);
const depoisRole = await um(`select role::text as role, full_name from public.profiles where id='${app.uid}'::uuid;`);
log('role passou de parent → pedagogical', depoisRole.role, 'pedagogical');
const listaDepois = await jwtFetch(dev.token, '/rest/v1/profiles?select=id,role');
const naLista = Array.isArray(listaDepois.j) && listaDepois.j.some(r => r.id === app.uid && r.role === 'pedagogical');
log('o painel lista a conta já aprovada com o novo papel', naLista, true);

console.log('\n[8] DEPOIS: o novo papel abriu o directório de staff para a própria conta');
const depois = await jwtFetch(app.token, '/rest/v1/profiles?select=id,role');
const oraculoStaff = await um(`select count(*)::int as n from public.profiles where ${OCULTO} and role::text = any(${DIRECTÓRIO});`);
log('GET profiles como pedagogical → HTTP 200', depois.status, 200);
log('linhas visíveis = oráculo SQL (staff do directório, sem ocultas)', Array.isArray(depois.j) ? depois.j.length : depois.j, oraculoStaff.n);
log('delta > 0 (antes era 1 linha)', depois.j.length > 1, true);
log('todas as linhas devolvidas pertencem aos 6 papéis do directório', Array.isArray(depois.j) && depois.j.every(r => ['pedagogical', 'aee', 'coordinator', 'director', 'secretary', 'developer'].includes(r.role)), true);

console.log('\n[9] Caminho A da UI (registerAccountRole) — pré-cadastro approved, papel aplicado no 1º login');
const preMail = `${CICLO}-pre-${randomBytes(3).toString('hex')}@bfr-admin.test`;
const pre = await jwtFetch(dev.token, '/rest/v1/access_requests', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({ email: preMail, requested_role: 'monitor', approved_role: 'monitor', status: 'approved', reviewed_by: dev.uid, reviewed_at: new Date().toISOString() }),
});
log('developer insere approved com approved_role = requested_role → 201', pre.status, 201);
if (pre.status === 201) reg.fixture.push(pre.j[0].id);
const rejeitado = await jwtFetch(dev.token, '/rest/v1/access_requests', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: `${CICLO}-ruim-${randomBytes(3).toString('hex')}@bfr-admin.test`, requested_role: 'monitor', approved_role: 'secretary', status: 'approved', reviewed_by: dev.uid }),
});
log('NEGATIVO: approved_role ≠ requested_role é barrado', rejeitado.status >= 400, true);
const preConta = await mint('pre', 'bfr-admin.test', false, preMail);
const perfilPre = await um(`select role::text as role from public.profiles where id='${preConta.uid}'::uuid;`);
log('handle_new_user leu approved_role e nasceu monitor', perfilPre.role, 'monitor');
const rejeitadaNoBanco = await um(`select count(*)::int as n from public.access_requests where split_part(email,'@',1) like '${CICLO}-ruim-%';`);
log('NEGATIVO: a linha rejeitada não ficou no banco', rejeitadaNoBanco.n, 0);

console.log('\n[10] Auto-solicitação do próprio e-mail e o PATCH de aprovação');
const ped = await jwtFetch(app.token, '/rest/v1/access_requests', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({ email: app.email, requested_role: 'parent', status: 'pending' }),
});
log('solicitante insere o PRÓPRIO e-mail como pending → 201', ped.status, 201);
if (ped.status === 201) reg.fixture.push(ped.j[0].id);
const intruso = await jwtFetch(app.token, '/rest/v1/access_requests', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: `${CICLO}-alheio-${randomBytes(3).toString('hex')}@bfr-admin.test`, requested_role: 'parent', status: 'pending' }),
});
log('NEGATIVO: inserir solicitação por e-mail alheio é barrado', intruso.status >= 400, true);
const patch = await jwtFetch(dev.token, `/rest/v1/access_requests?id=eq.${ped.j?.[0]?.id}`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({ status: 'approved', approved_role: 'parent', reviewed_by: dev.uid, reviewed_at: new Date().toISOString() }),
});
log('developer PATCH pendente → approved (access_requests_manage)', patch.status, 200);
const leDeVolta = await jwtFetch(app.token, `/rest/v1/access_requests?id=eq.${ped.j?.[0]?.id}&select=status,approved_role`);
log('o próprio solicitante lê a resposta como approved', leDeVolta.j?.[0]?.status, 'approved');

console.log('\n[11] Limpeza FK-safe (linhas fixture + as 4 contas)');
if (reg.fixture.length) {
  const ids = reg.fixture.map((x) => `'${x}'`).join(',');
  await sql(`delete from public.access_requests where id in (${ids});`);
}
for (const c of [app, dev, ctl, preConta]) {
  let d = await admin(`/auth/v1/admin/users/${c.uid}`, { method: 'DELETE' });
  if (![200, 204, 404].includes(d.status)) {
    await sql(`delete from public.profiles where id='${c.uid}'::uuid;`);
    d = await admin(`/auth/v1/admin/users/${c.uid}`, { method: 'DELETE' });
  }
  log(`DELETE auth ${c.rotulo}`, [200, 204].includes(d.status), true);
  const leitura = await admin(`/auth/v1/admin/users/${c.uid}`, { method: 'GET' });
  log(`conta ${c.rotulo} fora do auth (GET ${leitura.status})`, leitura.status, 404);
}
const sobrasP = await um(`select count(*)::int as n from public.profiles where split_part(email,'@',1) like '${CICLO}-%';`);
log('0 perfis do ciclo restando', sobrasP.n, 0);
const sobrasA = await um(`select count(*)::int as n from public.access_requests where split_part(email,'@',1) like '${CICLO}-%';`);
log('0 solicitações do ciclo restando', sobrasA.n, 0);

console.log('\n[12] BASELINE_RESTAURADA (contagem E md5 iguais ao pré)');
for (const t of ['profiles', 'access_requests']) {
  const rows = await um(`select count(*)::int as n from public.${t};`);
  const hash = await um(`select md5(string_agg(x::text, ',' order by x::text)) as h from (select * from public.${t}) x;`);
  log(`baseline ${t}: n igual`, rows.n, PRE.tabelas[t].n);
  log(`baseline ${t}: md5 igual`, hash.h, PRE.tabelas[t].md5);
}

const { portoes, falhas } = resumo();
writeFileSync(OUT, JSON.stringify({ ...reg, portoes, falhas }, null, 2) + '\n');
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'RM12_CICLO3_PAROU' : 'RM12_CICLO3_OK');
if (falhas.length) process.exit(1);
