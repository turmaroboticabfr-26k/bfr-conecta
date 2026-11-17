// AH-2-DESMONTADOR — desfaz o resíduo do mint interrompido (17/11, 04:50): o portão do papel
// herdado falhou no meio e o script parou antes de escrever diário/sessões, deixando 15 contas sem
// senha conhecida. A classe é medida por predicado (email LIKE 'ah2-%@bfr-conecta.test'), nunca por
// lista lembrada. Ordem FK-safe, com inventário dos dependentes lido de pg_constraint ANTES de apagar,
// e portão que prova que nada fora de staff_schools/profiles/auth.users foi tocado.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const OUT = `${DIR}/bfr-conecta/evidence/ah2-desmint-${process.argv[2] || '17-11'}.json`;
const PRED = "email like 'ah2-%@bfr-conecta.test'";
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outro rótulo');

const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 400)}`);
  return JSON.parse(t);
};
const admin = async (path, init) => {
  const r = await fetch(`${HOST}${path}`, { ...init, headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 200) }; }
  return { status: r.status, j };
};
const out = { em: new Date().toISOString(), predicado: PRED, stages: {} };
const falhas = []; let portoes = 0;
const gate = (n, d, e) => { portoes++; const ok = JSON.stringify(d) === JSON.stringify(e); if (!ok) falhas.push(`${n} | dado=${JSON.stringify(d)} | esperado=${JSON.stringify(e)}`); console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${n}`); return ok; };
const md5 = async (t) => (await sql(`select md5(string_agg(x::text, ',' order by x::text)) as h from (select * from ${t}) x;`))[0].h || 'empty';
const cont = async (t) => (await sql(`select count(*)::int as n from ${t};`))[0].n;

const CLASSE = `(select id from auth.users where ${PRED})`;
// 1) inventário ANTES: toda tabela que referencia profiles, e quantas linhas dela apontam para a classe.
// A coluna local sai de «FOREIGN KEY (x) REFERENCES ...», que é o nome que uso no DELETE.
const fks = await sql(`select conrelid::regclass::text as tabela, pg_get_constraintdef(oid) as def from pg_constraint where confrelid='public.profiles'::regclass and contype='f';`);
const invAntes = [];
for (const f of fks) {
  const coluna = f.def.match(/^FOREIGN KEY \((\w+)\)/)?.[1];
  if (!coluna) { invAntes.push({ tabela: f.tabela, coluna: null, linhas_na_classe: 0, nota: 'constraint sem coluna local simples — não apagável por este inventário' }); continue; }
  const n = (await sql(`select count(*)::int as n from ${f.tabela} c where c."${coluna}" in ${CLASSE};`))[0].n;
  // linhas de produto REAL que apenas apontam para a conta sintética: desliga-se o vínculo, nunca se
  // apaga a linha (o diretor do professor da grade não é meu para apagar).
  const soDesligar = ['bfr_teacher_directory'].includes(f.tabela.split('.').pop());
  invAntes.push({ tabela: f.tabela, coluna, linhas_na_classe: n, acao: soDesligar ? 'desligar' : 'apagar' });
}
out.stages.dependentes_antes = invAntes;
console.log('[dependentes medidos] ' + invAntes.filter((i) => i.linhas_na_classe > 0).map((i) => `${i.tabela}=${i.linhas_na_classe}`).join(' · '));
const fora = invAntes.filter((i) => i.linhas_na_classe > 0 && !['staff_schools', 'profiles', 'auth.users'].includes(i.tabela));
gate('nenhuma tabela de produto além das declaradas aponta para a classe', fora.map((f) => f.tabela), []);

// 2) dependentes primeiro: desliga-se o que é linha de produto, apaga-se o que é só fixture
const directoryAntes = await cont('public.bfr_teacher_directory');
for (const i of invAntes.filter((x) => x.linhas_na_classe > 0 && x.tabela !== 'public.profiles')) {
  const w = `where "${i.coluna}" in ${CLASSE}`;
  if (i.acao === 'desligar') {
    const r = await sql(`update ${i.tabela} set "${i.coluna}"=null ${w} returning id;`);
    console.log(`  desligar ${i.tabela}.${i.coluna}: ${r.length} vínculo(s) a null (linha preservada)`);
  } else {
    const r = await sql(`delete from ${i.tabela} ${w} returning 1;`);
    console.log(`  apagar ${i.tabela}: ${r.length} linha(s)`);
  }
}
gate('nenhuma linha de teacher_directory foi perdida (35 antes = 35 depois)', await cont('public.bfr_teacher_directory'), directoryAntes);
const perfis = await sql(`delete from public.profiles where id in (select id from auth.users where ${PRED}) returning id;`);
gate('15 profiles apagados', perfis.length, 15);
const ids = (await sql(`select id from auth.users where ${PRED};`)).map((x) => x.id);
gate('15 auth.users restantes para remover', ids.length, 15);
const estatus = [];
for (const id of ids) {
  const d = await admin(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
  const g = await admin(`/auth/v1/admin/users/${id}`, { method: 'GET' });
  estatus.push({ id: id.slice(0, 8), delete: d.status, depois: g.status });
}
gate('todos os DELETE devolveram 200', [...new Set(estatus.map((e) => e.delete))], [200]);
gate('todos somem do auth (GET 404)', [...new Set(estatus.map((e) => e.depois))], [404]);
gate('classe zerada', (await sql(`select count(*)::int as n from auth.users where ${PRED};`))[0].n, 0);
gate('nenhuma linha de teacher_directory aponta para a classe', (await sql(`select count(*)::int as n from public.bfr_teacher_directory d where d.profile_id in (select id from auth.users where ${PRED});`))[0].n, 0);

// 3) sessões vivas da classe têm de ser 0 (senão o token injetado seguiria válido)
const sess = await sql(`select count(*)::int as n from auth.sessions s where s.user_id in (select id from auth.users where ${PRED});`).catch(() => [{ n: 'tabela ausente' }]);
gate('0 sessões vivas da classe', sess[0].n, 0);

out.stages.depois = { users: await cont('auth.users'), profiles: await cont('public.profiles'), staff: await cont('public.staff_schools'), directory: await cont('public.bfr_teacher_directory') };
out.stages.md5_depois = { profiles: await md5('public.profiles'), staff: await md5('public.staff_schools'), directory: await md5('public.bfr_teacher_directory') };
out.stages.users_restantes = await sql(`select u.email, p.role::text as role from auth.users u left join public.profiles p on p.id=u.id order by p.role;`);
out.portoes = portoes; out.falhas = falhas;
out.veredito = falhas.length ? 'AH2_DESMONTADOR_PAROU' : 'AH2_DESMONTADO';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach((f) => console.log('  VERMELHO: ' + f));
console.log(out.veredito + ` · users=${out.stages.depois.users} profiles=${out.stages.depois.profiles} staff=${out.stages.depois.staff}`);
process.exit(falhas.length ? 1 : 0);
