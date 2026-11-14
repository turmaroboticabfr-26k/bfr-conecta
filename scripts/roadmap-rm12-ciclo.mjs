// RM-1.2 — prova comportamental da aprovação administrativa de contas (pending → papel).
// Faz EXATAMENTE as chamadas HTTP que o painel "Contas e cargos" faz (index.html:9092 updateProfileRole e :9040 registerAccountRole).
// Nada de credencial impressa: senhas geradas no processo, tokens só em memória, sessões nunca persistidas.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { DIR, sql, admin, jwtFetch, criarGates } from './s19-lib.mjs';

const CICLO = 'rm12';
const OUT = `${DIR}/evidence/${CICLO}-ciclo.json`;
for (const f of [OUT, `${DIR}/evidence/${CICLO}-veredito.json`]) {
  if (existsSync(f)) throw new Error(`ABORTA: ${f} já existe — ciclo sujo`);
}

const PRE = JSON.parse(readFileSync(`${DIR}/evidence/roadmap-rm12-baseline.json`, 'utf8'));

const { gate, resumo } = criarGates();
const reg = { ciclo: 'RM-1.2', em: new Date().toISOString(), portoes: [], contas: [], fixture: [] };
const log = (nome, dado, esperado) => { gate(nome, dado, esperado); reg.portoes.push({ nome, dado, esperado }); };

const papéisDoDirectório = ['pedagogical', 'aee', 'coordinator', 'director', 'secretary', 'developer'];

console.log('[0] Preflight — nenhuma conta deste ciclo pode existir');
const sujas = await sql(`select count(*)::int as n from public.profiles where email like '${CICLO}-%@bfr-conecta.test';`);
log('preflight: 0 contas rm12-* vivas', sujas[0].n, 0);
if (sujas[0].n !== 0) throw new Error('ciclo sujo — aborta antes de escrever');

const mint = async (rotulo) => {
  const uid = randomUUID();
  const email = `${CICLO}-${rotulo}-${randomBytes(3).toString('hex')}@bfr-conecta.test`;
  const senha = randomBytes(18).toString('base64url');
  const criado = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ id: uid, email, password: senha, email_confirm: true, data: { full_name: `RM12 ${rotulo} Sintético` } }),
  });
  log(`mint ${rotulo} → 200/201`, [200, 201].includes(criado.status), true);
  if (![200, 201].includes(criado.status)) throw new Error(`mint ${rotulo} HTTP ${criado.status}`);
  const tok = await admin('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: senha }) });
  log(`login real ${rotulo} → access_token`, typeof tok.j?.access_token === 'string', true);
  if (!tok.j?.access_token) throw new Error(`login ${rotulo} HTTP ${tok.status}`);
  const conta = { rotulo, uid, email, token: tok.j.access_token };
  reg.contas.push({ rotulo, uid, email });
  return conta;
};

console.log('\n[1] Conta solicitante — nasce pending sem tocar em papel');
const app = await mint('applicant');
const perfilPending = await sql(`select role::text as role, full_name from public.profiles where id='${app.uid}'::uuid;`);
log('trigger handle_new_user criou o profile', perfilPending.length, 1);
log('profile do solicitante role = pending (default da coluna)', perfilPending[0]?.role, 'pending');

console.log('\n[2] Conta developer — quem aprova');
const dev = await mint('developer');
await sql(`update public.profiles set role='developer'::account_role where id='${dev.uid}'::uuid;`);
const perfilDev = await sql(`select role::text as role from public.profiles where id='${dev.uid}'::uuid;`);
log('developer role = developer', perfilDev[0]?.role, 'developer');

console.log('\n[3] ANTES: o pending enxerga só a própria linha');
const antes = await jwtFetch(app.token, '/rest/v1/profiles?select=id,role');
log('GET profiles como pending → HTTP 200', antes.status, 200);
log('linhas visíveis ao pending = 1', Array.isArray(antes.j) ? antes.j.length : antes.j, 1);
log('a única linha visível é a própria', antes.j?.[0]?.id, app.uid);

console.log('\n[4] Negativos — o pending não se autoaprova');
const self = await jwtFetch(app.token, '/rest/v1/rpc/set_profile_role', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ target_profile_id: app.uid, target_role: 'developer', target_full_name: null }),
});
log('pending chama set_profile_role em si mesmo → 4xx', self.status >= 400 && self.status < 500, true);
log('o guard é o do developer', String(self.j?.message || '').includes('developer'), true);
const stillPending = await sql(`select role::text as role from public.profiles where id='${app.uid}'::uuid;`);
log('e a tentativa não mudou nada (role segue pending)', stillPending[0]?.role, 'pending');

console.log('\n[5] O developer VÊ o solicitante do domínio de teste (profiles_read OR profiles_hide_test_accounts)');
const totalVivo = await sql(`select count(*)::int as n from public.profiles;`);
const listaDev = await jwtFetch(dev.token, '/rest/v1/profiles?select=id,role');
log('GET profiles como developer → HTTP 200', listaDev.status, 200);
log('developer enxerga todas as linhas vivas', Array.isArray(listaDev.j) ? listaDev.j.length : listaDev.j, totalVivo[0].n);
const veApp = Array.isArray(listaDev.j) && listaDev.j.some(r => r.id === app.uid);
log('a linha do solicitante está na lista do painel', veApp, true);

console.log('\n[6] Caminho B da UI (updateProfileRole): rpc set_profile_role pelo JWT do developer');
const aprova = await jwtFetch(dev.token, '/rest/v1/rpc/set_profile_role', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ target_profile_id: app.uid, target_role: 'pedagogical', target_full_name: null }),
});
log('rpc → HTTP 200 e true', [aprova.status, aprova.j], [200, true]);
const depoisRole = await sql(`select role::text as role from public.profiles where id='${app.uid}'::uuid;`);
log('role passou de pending → pedagogical', depoisRole[0]?.role, 'pedagogical');

console.log('\n[7] DEPOIS: a mudança de papel sozinha abriu o directório de staff');
const depois = await jwtFetch(app.token, '/rest/v1/profiles?select=id,role');
log('GET profiles como pedagogical → HTTP 200', depois.status, 200);
const oraculo = await sql(`select count(*)::int as n from public.profiles where role::text = any(array['${papéisDoDirectório.join("','")}']);`);
const esperado = oraculo[0].n;
const visiveis = Array.isArray(depois.j) ? depois.j.length : depois.j;
log('linhas visíveis = oráculo SQL dos 6 papéis do directório', visiveis, esperado);
log('delta > 0 (antes 1 linha)', visiveis > 1, true);
const sóOSix = Array.isArray(depois.j) && depois.j.every(r => papéisDoDirectório.includes(r.role));
log('todas as linhas devolvidas pertencem aos papéis do directório', sóOSix, true);

console.log('\n[8] Caminho A da UI (registerAccountRole): pré-cadastro approved pelo developer');
const alvo = `${CICLO}-pre-${randomBytes(3).toString('hex')}@bfr-conecta.test`;
const pre = await jwtFetch(dev.token, '/rest/v1/access_requests', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({ email: alvo, requested_role: 'coordinator', approved_role: 'coordinator', status: 'approved', reviewed_by: dev.uid, reviewed_at: new Date().toISOString() }),
});
log('developer insere approved com approved_role = requested_role → 201', pre.status, 201);
if (pre.status === 201) reg.fixture.push(pre.j[0].id);
const rejeitado = await jwtFetch(dev.token, '/rest/v1/access_requests', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: `${CICLO}-ruim-${randomBytes(3).toString('hex')}@bfr-conecta.test`, requested_role: 'coordinator', approved_role: 'secretary', status: 'approved', reviewed_by: dev.uid }),
});
log('NEGATIVO: approved_role ≠ requested_role é barrado', rejeitado.status >= 400, true);

console.log('\n[9] Auto-solicitação do próprio e-mail e o PATCH de aprovação');
const ped = await jwtFetch(app.token, '/rest/v1/access_requests', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({ email: app.email, requested_role: 'parent', status: 'pending' }),
});
log('solicitante insere o PRÓPRIO e-mail como pending → 201', ped.status, 201);
if (ped.status === 201) reg.fixture.push(ped.j[0].id);
const intruso = await jwtFetch(app.token, '/rest/v1/access_requests', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: `${CICLO}-alheio-${randomBytes(3).toString('hex')}@bfr-conecta.test`, requested_role: 'parent', status: 'pending' }),
});
log('NEGATIVO: inserir solicitação por e-mail alheio é barrado', intruso.status >= 400, true);
const patch = await jwtFetch(dev.token, `/rest/v1/access_requests?id=eq.${ped.j?.[0]?.id}`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({ status: 'approved', approved_role: 'parent', reviewed_by: dev.uid, reviewed_at: new Date().toISOString() }),
});
log('developer PATCH pendente → approved (access_requests_manage)', patch.status, 200);
const leDeVolta = await jwtFetch(app.token, `/rest/v1/access_requests?id=eq.${ped.j?.[0]?.id}&select=status,approved_role`);
log('o próprio solicitante lê a resposta como approved', leDeVolta.j?.[0]?.status, 'approved');

console.log('\n[10] Limpeza FK-safe (linhas fixture + contas)');
if (reg.fixture.length) {
  const ids = reg.fixture.map((x) => `'${x}'`).join(',');
  await sql(`delete from public.access_requests where id in (${ids});`);
}
const sobras = await sql(`select count(*)::int as n from public.access_requests where email like '${CICLO}-%@bfr-conecta.test';`);
log('0 linhas fixture restando', sobras[0].n, 0);
for (const c of [app, dev]) {
  let d = await admin(`/auth/v1/admin/users/${c.uid}`, { method: 'DELETE' });
  if (![200, 204, 404].includes(d.status)) {
    await sql(`delete from public.profiles where id='${c.uid}'::uuid;`);
    d = await admin(`/auth/v1/admin/users/${c.uid}`, { method: 'DELETE' });
  }
  log(`DELETE auth ${c.rotulo}`, [200, 204].includes(d.status), true);
  const leitura = await admin(`/auth/v1/admin/users/${c.uid}`, { method: 'GET' });
  log(`conta ${c.rotulo} fora do auth (GET ${leitura.status})`, leitura.status, 404);
}
const perfisSobros = await sql(`select count(*)::int as n from public.profiles where email like '${CICLO}-%@bfr-conecta.test';`);
log('0 profiles do ciclo restando', perfisSobros[0].n, 0);

console.log('\n[11] BASELINE_RESTAURADA (contagem E md5 iguais ao pré)');
for (const t of ['profiles', 'access_requests']) {
  const rows = await sql(`select count(*)::int as n from public.${t};`);
  const hash = await sql(`select md5(string_agg(x::text, ',' order by x::text)) as h from (select * from public.${t}) x;`);
  log(`baseline ${t}: n igual`, rows[0].n, PRE.tabelas[t].n);
  log(`baseline ${t}: md5 igual`, hash[0].h, PRE.tabelas[t].md5);
}

const { portoes, falhas } = resumo();
writeFileSync(OUT, JSON.stringify({ ...reg, portoes, falhas }, null, 2) + '\n');
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'RM12_CICLO_PAROU' : 'RM12_CICLO_OK');
if (falhas.length) process.exit(1);
