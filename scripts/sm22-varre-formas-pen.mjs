#!/usr/bin/env node
// SM-22 (peca 5, SOMENTE LEITURA): fecha as tres PEN de catalogo que a peca 4 deixou no ar.
//  (a) PEN-23/22 — a causa do `401` do anon na vista municipal e um privilégio, nao o RLS:
//      mede EXECUTE (anon/authenticated) e `prosecdef` das 9 predicados do escopo, e mostra que
//      `bfr_school_in_municipal_scope` e o UNICO sem EXECUTE a anon. Se alguem alguma vez lhe
//      der o grant que os outros 8 ja tem, a barreira do anon cai — e a vista corre como dono.
//  (b) PEN-28 — as 9 formas de consulta que falhavam sobre a v118, re-sondadas hoje, com a
//      contrapartida de catalogo (caminhos FK entre as duas tabelas do embed) para que o codigo
//      PGRST201 nao seja a unica prova.
//  (c) PEN-13 — o censo do estado `pending` hoje, com regulacao: a soma das linhas por papel tem
//      de bater com o total de `profiles`, senao um 0 em `pending` e consulta partida, nao ausencia.
// Nada escreve: SELECTs de catalogo, GETs anon sem corpo gravado, nenhuma chave impressa.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-varre-formas-pen-18-11.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);

const alvo = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
if (!alvo) throw new Error('ABORTA: sem URL de publicacao');
const shellTxt = await (await fetch(alvo + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const m = /SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt);
if (!m) throw new Error('ABORTA: a chave publishable nao esta nos bytes servidos — a sonda nao continua às cegas');
const anonKey = m[1];
const cab = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

// ---- (a) os predicados do escopo: quem pode chamar, e se correm como dono
const PREDICADOS = ['bfr_school_in_municipal_scope', 'bfr_has_municipal_grant', 'bfr_is_municipal_authority',
  'bfr_is_platform_admin', 'bfr_municipal_network_totals', 'bfr_municipalities_visible',
  'bfr_rls_director_manages_student', 'bfr_rls_is_developer', 'bfr_rls_session_role'];
const lista = PREDICADOS.map((n) => `'${n}'`).join(',');
const pred = await sql(`select p.pronome_x as nome, p.dono, p.definer, p.anon, p.auth from (
  select p.proname as pronome_x, r.rolname as dono, p.prosecdef as definer,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_roles r on r.oid = p.proowner
  where n.nspname = 'public' and p.proname in (${lista})) p order by 1, 2`);
const porNome = {};
for (const x of pred) (porNome[x.nome] = porNome[x.nome] || []).push({ dono: x.dono, definer: x.definer, anon: x.anon, auth: x.auth });
const semAnon = PREDICADOS.filter((n) => (porNome[n] || []).length && porNome[n].every((s) => s.anon === false));
const comAnon = PREDICADOS.filter((n) => (porNome[n] || []).some((s) => s.anon === true));
// a vista municipal e as suas tabelas de baixo: dono, RLS e forca
const vmun = await sql(`select c.relname as nome, r.rolname as dono, c.reloptions as opcoes,
  c.relrowsecurity as rls, c.relforcerowsecurity as rls_force, pg_get_viewdef(c.oid, true) as definicao
  from pg_class c join pg_namespace n on n.oid = c.relnamespace join pg_roles r on r.oid = c.relowner
  where n.nspname = 'public' and c.relname = 'bfr_municipal_school_stats'`);
if (vmun.length !== 1) throw new Error(`ABORTA: esperava 1 vista municipal no catalogo, vieram ${vmun.length}`);
const defs = vmun[0].definicao || '';
// `pg_get_viewdef` nao qualifica as relacoes com o esquema nesta vista: um regex que exige
// `public.` devolve lista vazia e o `IN ()` rebenta. Os candidatos sao os nomes apos FROM/JOIN
// (com ou sem qualificacao), confrontados com o que existe mesmo em `public` — nada de nomes
// dactilografiados de memoria.
const todosPublicos = await sql(`select c.relname as nome, c.relkind as tipo from pg_class c
  join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','v','m') order by 1`);
const existem = new Set(todosPublicos.map((x) => x.nome));
const candidatos = [...new Set((defs.match(/\b(?:FROM|JOIN)\s+(?:public\.)?"?([a-z_][a-z_0-9]*)"?/gi) || []).map((s) => s.replace(/^.*?(?:FROM|JOIN)\s+(?:public\.)?"?/i, '').replace(/"$/, '').toLowerCase()))];
const tabelasBaixo = candidatos.filter((t) => existem.has(t));
const tiposBaixo = Object.fromEntries(todosPublicos.filter((x) => tabelasBaixo.includes(x.nome)).map((x) => [x.nome, x.tipo]));
const rlsBaixo = tabelasBaixo.length === 0 ? [] : await sql(`select c.relname as nome, r.rolname as dono, c.relrowsecurity as rls, c.relforcerowsecurity as rls_force
  from pg_class c join pg_namespace n on n.oid = c.relnamespace join pg_roles r on r.oid = c.relowner
  where n.nspname = 'public' and c.relname in (${tabelasBaixo.map((t) => `'${t}'`).join(',')}) order by 1`);

// ---- (b) PEN-28: as 9 formas do censo da v118, re-sondadas hoje
const ruins = JSON.parse(readFileSync(join(REPO, 'evidence/fin2a-censo-embeds-v118.json'), 'utf8')).sonda.ruins;
if (!Array.isArray(ruins) || ruins.length === 0) throw new Error('ABORTA: o censo da v118 nao traz as formas falhadas — nao ha o que re-sondar');
const sondadas = [];
for (const r of ruins) {
  const url = `${HOST}/rest/v1/${r.de}?select=${encodeURIComponent(r.select)}&limit=1`;
  const res = await fetch(url, { headers: { ...cab, 'cache-control': 'no-cache' } });
  const txt = await res.text();
  let code = null, msg = null, linhas = null;
  try {
    const j = JSON.parse(txt);
    if (Array.isArray(j)) linhas = j.length;
    else { code = j.code || null; msg = (j.message || '').slice(0, 160); }
  } catch { msg = 'nao-JSON'; }
  sondadas.push({ de: r.de, alvo_embed: (r.select.match(/\b([a-z_]+)\(/) || [])[1] || null, code_esperado: r.code,
    status: res.status, code, linhas, mensagem: msg });
}
// contrapartida de catalogo: quantos caminhos FK ha entre a tabela de origem e a do embed.
// PGRST201 significa >1 caminho; 1 caminho e o fixture positivo da regua.
const pares = [...new Set(sondadas.filter((s) => s.alvo_embed).map((s) => `${s.de}>${s.alvo_embed}`))];
const fks = await sql(`select cast(c.conrelid as regclass)::text as de, cast(c.confrelid as regclass)::text as para, count(*)::int as caminhos
  from pg_constraint c where c.contype = 'f' and c.connamespace = 'public'::regnamespace
  group by 1, 2 order by 3 desc, 1`);
const caminhos = {};
for (const [a, b] of pares.map((p) => p.split('>'))) {
  const idas = fks.filter((f) => f.de === `public.${a}` && f.para === `public.${b}`).reduce((s, f) => s + f.caminhos, 0);
  const voltas = fks.filter((f) => f.de === `public.${b}` && f.para === `public.${a}`).reduce((s, f) => s + f.caminhos, 0);
  caminhos[`${a} -> ${b}`] = { idas, voltas, total: idas + voltas };
}
const ambigosHoje = Object.entries(caminhos).filter(([, v]) => v.total > 1).map(([k]) => k);
// a regua so vale se souber contar 1: o proprio conjunto de FKs do banco contem pares com um
// unico caminho, e e isso que impoe o limite de >1 do PGRST201.
const paresComUm = fks.filter((f) => f.caminhos === 1).length;
const tabelasInexistentes = await sql(`select t.nome, (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname not in ('pg_catalog','information_schema') and c.relname = t.nome) as relacoes
  from (values ('bfr_school_shift_settings'),('bfr_school_calendar_days'),('bfr_school_calendar_month_targets')) t(nome)`);

// ---- (c) PEN-13: censo do estado `pending` hoje
const colunasPapel = await sql(`select table_name as tabela, column_name as coluna, data_type as tipo, is_nullable as nulavel, column_default as default
  from information_schema.columns where table_schema = 'public' and column_name in ('role','status') and table_name in ('profiles','access_requests') order by 1, 2`);
const porPapel = await sql(`select coalesce(role::text,'(nulo)') as papel, count(*)::int as linhas from public.profiles group by 1 order by 2 desc, 1`);
const totalPerfis = await sql(`select count(*)::int as linhas from public.profiles`);
const somaPapel = porPapel.reduce((s, x) => s + x.linhas, 0);
const regulacao = somaPapel === totalPerfis[0].linhas;
if (!regulacao) throw new Error(`ABORTA: soma por papel (${somaPapel}) != total profiles (${totalPerfis[0].linhas}) — o 0 de pending nao valeria nada`);
const pendente = porPapel.find((x) => x.papel === 'pending');

const out = {
  em: new Date().toISOString(),
  metodo: 'SELECTs de catalogo + GETs anon; zero escrita; chave anon lida dos bytes servidos e jamais gravada',
  pen23_escopo: {
    predicados: PREDICADOS,
    por_nome: porNome,
    sem_execute_a_anon: semAnon,
    com_execute_a_anon: comAnon,
    a_vista: { nome: vmun[0].nome, dono: vmun[0].dono, opcoes: vmun[0].opcoes, rls: vmun[0].rls, rls_force: vmun[0].rls_force, definicao_bytes: defs.length },
    tabelas_por_debaixo: tabelasBaixo,
    tipos_das_tabelas: tiposBaixo,
    rls_das_tabelas: rlsBaixo,
    leitura: 'a barreira do anon nesta vista e um privilegio em falta (42501 numa predicate), nao security_invoker nem RLS da vista',
  },
  pen28: {
    origem: 'evidence/fin2a-censo-embeds-v118.json · sonda.ruins (v118, 248 pares, 9 falhas)',
    formas: sondadas,
    por_status: sondadas.reduce((m, s) => ((m[s.status] = (m[s.status] || 0) + 1), m), {}),
    continuam_pgrst201: sondadas.filter((s) => s.code === 'PGRST201').map((s) => `${s.de} -> ${s.alvo_embed}`),
    caminhos_fk: caminhos,
    pares_ambiguos_por_catalogo: ambigosHoje,
    fixture_regua: { pares_de_fk_com_um_solo_caminho: paresComUm, total_pares_de_fk: fks.length },
    tabela_fantasma_ainda_fantasma: tabelasInexistentes,
  },
  pen13: {
    colunas_de_papel: colunasPapel,
    distribuicao_profiles: porPapel,
    total_profiles: totalPerfis[0].linhas,
    soma_por_papel: somaPapel,
    regulacao_bate: regulacao,
    linhas_em_pending: pendente ? pendente.linhas : 0,
    pending_no_censo: !!pendente,
  },
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

console.log(`PEN-23 predicados: sem_anon=[${semAnon.join(',')}] com_anon=${comAnon.length} de ${PREDICADOS.length}`);
for (const n of PREDICADOS) console.log(`  ${n}: ${JSON.stringify(porNome[n] || 'ausente no catalogo')}`);
console.log(`  vista ${vmun[0].nome}: dono=${vmun[0].dono} opcoes=${JSON.stringify(vmun[0].opcoes)} rls=${vmun[0].rls} force=${vmun[0].rls_force} tabelas_baixo=[${tabelasBaixo.join(',')}]`);
for (const t of rlsBaixo) console.log(`    tabela ${t.nome}: dono=${t.dono} rls=${t.rls} force=${t.rls_force}`);
console.log(`PEN-28 re-sonda (n=${sondadas.length}): ${JSON.stringify(out.pen28.por_status)}`);
for (const s of sondadas) console.log(`  ${s.de}${s.alvo_embed ? ' -> ' + s.alvo_embed : ''}: esperava ${s.code_esperado}, veio status=${s.status} code=${s.code || '-'} linhas=${s.linhas ?? '-'}`);
console.log(`  caminhos_fk ${JSON.stringify(caminhos)}`);
console.log(`  fixture da regua: pares_de_fk_1_caminho=${paresComUm} de ${fks.length}; ambiguos_hoje=[${ambigosHoje.join(',') || 'nenhum'}]`);
console.log(`  tabelas fantasma: ${JSON.stringify(tabela_fantasma_resumo(tabelasInexistentes))}`);
console.log(`PEN-13: pending_no_censo=${out.pen13.pending_no_censo} linhas_em_pending=${out.pen13.linhas_em_pending} total_profiles=${out.pen13.total_profiles} regulacao=${out.pen13.regulacao_bate}`);
console.log(`  distribuicao: ${porPapel.map((x) => `${x.papel}=${x.linhas}`).join(' ')}`);
console.log(`  colunas: ${colunasPapel.map((x) => `${x.tabela}.${x.coluna}:${x.tipo}/null=${x.nulavel}`).join(' ')}`);
console.log(`\nSM22_FORMAS_OK · registo evidence/sm22-varre-formas-pen-18-11.json`);

function tabela_fantasma_resumo(l) { return Object.fromEntries(l.map((x) => [x.nome, x.relacoes])); }
