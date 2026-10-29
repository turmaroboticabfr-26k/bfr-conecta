// Limpeza FK-safe do ciclo THROTTLE + prova de baseline restaurada (contagem E md5).
// Ordem: posicoes -> carimbos -> sharing -> alunos -> turma 2099. Nao toca na tabela
// nova, na funcao com throttle, no gatilho, no segredo nem na conta-aparelho.
// Artefato: pf-throttle-limpeza.json
import { readFileSync, writeFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const fx = JSON.parse(readFileSync('pf-throttle-fixture.json', 'utf8'));
const base = JSON.parse(readFileSync('pf-throttle-baseline.json', 'utf8'));
const CLASSE = fx.ids.turma;
const IDS = [fx.ids.alunoA, fx.ids.alunoB, fx.ids.alunoC].join("','");

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (r.status !== 201) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 900)}`);
  try { return JSON.parse(t); } catch { return []; }
}

const TABELAS = ['classes', 'students', 'guardian_students', 'student_location_sharing',
  'student_locations', 'student_location_report_throttle', 'student_location_notify_throttle'];

const medeSql = `
select * from (
  ${TABELAS.map(t => `
  select 'public.${t}' as tabela,
         (select count(*)::int from public.${t}) as linhas,
         (select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.${t} x) as md5
  `).join(' union all ')}
  union all
  select 'net._http_response', (select count(*)::int from net._http_response),
         (select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from net._http_response x)
  union all
  select 'vault.secrets', (select count(*)::int from vault.secrets),
         (select md5(coalesce(string_agg(x.id::text, '|' order by x.id::text), '')) from vault.secrets x)
  union all
  select 'auth.users', (select count(*)::int from auth.users), '(somente contagem)'
  union all
  select 'public.profiles', (select count(*)::int from public.profiles),
         (select md5(coalesce(string_agg(x.id::text, '|' order by x.id::text), '')) from public.profiles x)
  union all
  select 'public.push_subscriptions', (select count(*)::int from public.push_subscriptions),
         '(somente contagem: linha do aparelho-alvo fica viva de proposito)'
) x order by tabela
`;

const antes = await sql(medeSql);

await sql(`
begin;
delete from public.student_locations where student_id in ('${IDS}');
delete from public.student_location_notify_throttle where student_id in ('${IDS}');
delete from public.student_location_sharing where student_id in ('${IDS}');
delete from public.students where id in ('${IDS}');
delete from public.classes where id = '${CLASSE}';
commit;
`);

const depois = await sql(medeSql);
const catalogo = await sql(`
select 'trigger' as tipo, tgname as nome, tgtype::text || '/' || tgenabled::text as detalhe
from pg_trigger where tgrelid = 'public.student_locations'::regclass and not tgisinternal
union all
select 'funcao', 'bfr_pf_notify_location', md5(pg_get_functiondef('public.bfr_pf_notify_location()'::regprocedure))
union all
select 'tabela_throttle', 'student_location_notify_throttle',
       coalesce(to_regclass('public.student_location_notify_throttle')::text, 'ausente')
order by tipo, nome
`);
const sobra = await sql(`
select (select count(*)::int from public.students where id in ('${IDS}')) as alunos,
       (select count(*)::int from public.classes where id = '${CLASSE}') as turma,
       (select count(*)::int from public.student_location_sharing) as sharing_total,
       (select count(*)::int from public.student_locations) as posicoes_total,
       (select count(*)::int from public.student_location_notify_throttle) as carimbos_total
`);

const portoes = {};
function gate(nome, ok, detalhe) { portoes[nome] = { ok, detalhe }; if (!ok) throw new Error('PORTAO FALHO: ' + nome + ' :: ' + detalhe); }

const porNome = Object.fromEntries(depois.map(r => [r.tabela, r]));
const porBase = Object.fromEntries(base.base.map(r => [r.tabela, r]));
// net._http_response cresce de proposito (cada envio deixa evidência); não é comparável.
const EXCETUADAS = new Set(['net._http_response']);
const restauradas = [];
for (const r of base.base) {
  const atual = porNome[r.tabela];
  if (!atual || atual.md5 === '(somente contagem: linha do aparelho-alvo fica viva de proposito)'
      || atual.md5 === '(somente contagem)') { restauradas.push({ tabela: r.tabela, comparavel: false }); continue; }
  if (EXCETUADAS.has(r.tabela)) { restauradas.push({ tabela: r.tabela, comparavel: false, nota: 'evidencia do pg_net' }); continue; }
  restauradas.push({ tabela: r.tabela, comparavel: true, esperado: r.md5, obtido: atual.md5,
    igual: atual.md5 === r.md5 && atual.linhas === r.linhas, linhas_esperadas: r.linhas, linhas_obtidas: atual.linhas });
}
gate('L1_zero_linhas_da_fixture', sobra[0].alunos === 0 && sobra[0].turma === 0, JSON.stringify(sobra[0]));
gate('L2_tabelas_de_posicao_vazias', sobra[0].posicoes_total === 0 && sobra[0].carimbos_total === 0
  && sobra[0].sharing_total === 0, JSON.stringify(sobra[0]));
for (const r of restauradas) {
  if (r.comparavel) gate('L3_md5_restaurado_' + r.tabela, r.igual, JSON.stringify(r));
}
gate('L4_emissor_continua_no_ar', catalogo.some(c => c.tipo === 'trigger' && c.detalhe === '21/O')
  && catalogo.some(c => c.tipo === 'funcao' && c.detalhe === base.catalogo.find(x => x.tipo === 'funcao').detalhe),
  JSON.stringify(catalogo));
gate('L5_tabela_do_throttle_continua_existindo',
  catalogo.some(c => c.tipo === 'tabela_throttle' && c.detalhe === 'student_location_notify_throttle'),
  JSON.stringify(catalogo));
gate('L6_conta_aparelho_viva', porNome['public.push_subscriptions'].linhas === 1
  && porNome['auth.users'].linhas === base.base.find(b => b.tabela === 'auth.users').linhas,
  JSON.stringify({ subs: porNome['public.push_subscriptions'], users: porNome['auth.users'] }));

const quando = new Date().toISOString();
writeFileSync('pf-throttle-limpeza.json', JSON.stringify({ quando, antes, depois, catalogo, sobra: sobra[0],
  baseline_restaurada: restauradas, portoes,
  ok: Object.values(portoes).every(p => p.ok) }, null, 2) + '\n');
console.log(`${quando} | portoes ${Object.keys(portoes).length} ok=${Object.values(portoes).every(p => p.ok)}`);
for (const [k, v] of Object.entries(portoes)) console.log(`  ${v.ok ? 'OK  ' : 'FAIL'} ${k}`);
console.log('sobra:', JSON.stringify(sobra[0]));
console.log(Object.values(portoes).every(p => p.ok) ? 'PF_THROTTLE_LIMPEZA_OK' : 'PF_THROTTLE_LIMPEZA_FALHOU');
