#!/usr/bin/env node
// SM-22 (peca 20, SOMENTE LEITURA): distingue, para cada funcao que anon pode EXECUTAR, QUAL o motivo
// desse grant — e o unico modo de saber se um REVOKE fecha uma porta ou parte a RLS.
// A licao vem do sm10 (18/11): quando o escopo municipal ficou verde, o que estava em falta era
// EXECUTE a `anon` num predicado de policy, nao RLS. Portanto «tiro o anon de cima desta funcao» so se
// escreve com uma das duas provas feitas nos fatos: (a) a funcao NAO aparece em nenhuma `pg_policy`, ou
// (b) aparece, e ai o REVOKE e uma regressao de politica. A `bfr_municipal_network_totals` e o caso que
// motiva a peca: devolve contagens da rede inteira a um pedido anon (peca 8), e o ledger vai pedir a
// sua revogacao — que so e segura se a funcao nao for predicado.
// Regua com fixture positivo obrigatorios: os wrappers `bfr_rls_*` do RM-6.8 e `bfr_has_municipal_grant`
// do sm4 tem de dar >0 em policies; se der 0 a regex esta cega e nada se afirma.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-motivo-do-grant-anon-18-11b.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);

const rpc = JSON.parse(readFileSync(join(REPO, 'evidence/sm22-varre-rpc-anon-18-11.json'), 'utf8')).pen22_rpc_anon;
const formas = rpc.formas;
if (!Array.isArray(formas) || !formas.length) throw new Error('ABORTA: a peca 8 nao traz as formas das funcoes anon-executaveis');

// (a) todo o texto de toda a policy de `public`, por funcao. DUAS reguas independentes sobre as
// MESMAS linhas e o portao e a igualdade delas: a contagem em SQL (`strpos` sobre pg_get_expr) e a
// contagem em JS (regex sobre o texto ja baixado). A primeira versao desta peca tinha so a via JS e
// usava uma regex com a bandeira `g` dentro de `.test()`, que e com estado: o `lastIndex` ficava
// depois do primeiro acerto e as seguintes policies eram lidas a meio, pelo que a regua se declarava
// cega contra fixtures que ela propria nao sabia contar. As duas vias lado a lado matam a classe.
const policies = await sql(`select pol.polname as politica, cast(pol.polrelid as regclass)::text as tabela,
  pol.polcmd as comando, coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') as usando, coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') as controle
  from pg_policy pol join pg_class c on c.oid = pol.polrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' order by 2, 1`);
if (!policies.length) throw new Error('ABORTA: zero policies em `public` — nao ha o que contar e nenhuma recomendacao de REVOKE sai daqui');
const NOMES = formas.map((f) => f.nome);
const porSql = await sql('select ' + NOMES.map((n, i) =>
  `(select count(*)::int from pg_policy pol join pg_class c on c.oid = pol.polrelid join pg_namespace ns on ns.oid = c.relnamespace
     where ns.nspname = 'public' and strpos(coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') || ' ' || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), ''), '${n}(') > 0) as n${i}`).join(', ') + ', 1 as um');
const porJs = NOMES.map((n) => policies.filter((p) => (p.usando + ' ' + p.controle).includes(n + '(')).length);
const emPolicies = {};
NOMES.forEach((n, i) => { emPolicies[n] = { policies_que_citam_na_via_js: porJs[i], policies_que_citam_na_via_sql: porSql[0]['n' + i],
  ocorrencias_no_texto_das_policies: policies.reduce((s, p) => s + ((p.usando + ' ' + p.controle).match(new RegExp(n + '\\(', 'g')) || []).length, 0),
  total_policies_public: policies.length }; });
const batem = NOMES.every((n, i) => emPolicies[n].policies_que_citam_na_via_js === emPolicies[n].policies_que_citam_na_via_sql);
const cego = Object.entries(emPolicies).filter(([, v]) => v.ocorrencias_no_texto_das_policies === 0).map(([k]) => k);
// fixture OBRIGATORIO: os tres wrappers `bfr_rls_*` foram escritos PARA as policies no DDL do RM-6.8
// (15/11, PEN-25) — factos de outra fonte, nao desta contagem. Se a regua os der como 0, esta cega.
const FIXTURES_DENTRO = ['bfr_rls_session_role', 'bfr_rls_is_developer', 'bfr_rls_director_manages_student'];
const reguaDiscrimina = FIXTURES_DENTRO.every((n) => (emPolicies[n] || {}).ocorrencias_no_texto_das_policies > 0);
const dentro = Object.fromEntries(Object.entries(emPolicies).filter(([k]) => k !== '(vazio)').filter(([, v]) => v.ocorrencias_no_texto_das_policies > 0).map(([k, v]) => [k, v]));
const fora = Object.fromEntries(Object.entries(emPolicies).filter(([, v]) => v.ocorrencias_no_texto_das_policies === 0).map(([k, v]) => [k, v]));

// (b) o bundle servido: quem chama por /rpc e com que nome
const alvo = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
if (!alvo) throw new Error('ABORTA: sem URL de publicacao');
const shell = await (await fetch(alvo + '/', { headers: { 'cache-control': 'no-cache' } })).text();
if (shell.length < 100000) throw new Error(`ABORTA: shell com ${shell.length} caracteres nao e o bundle`);
const noBundle = {};
for (const f of formas) {
  const re = new RegExp(`\\.rpc\\(\\s*['"\`]${f.nome}['"\`]`, 'g');
  noBundle[f.nome] = (shell.match(re) || []).length;
}
const rpcChamadasNoBundle = (shell.match(/\.rpc\(\s*['"`]/g) || []).length;
// a regua tem de saber contar um RPC que o bundle usa: fixture positivo retirado do proprio bundle
const nomesRpcNoBundle = [...new Set((shell.match(/\.rpc\(\s*['"`]([a-z_][a-z0-9_]*)['"`]/g) || []).map((s) => s.replace(/.*["'`]([a-z_][a-z0-9_]*)["'`].*/, '$1')))];

// (c) o terceiro sitio onde um grant a anon pode ser necessario: a DEFINICAO das views. Uma view com
// `security_invoker=false` corre como dono e nao precisa de EXECUTE ao papel que consulta; uma view
// invocadora precisa. Contar nas definicoes e o que falta para a recomendacao de REVOKE ser prova e
// nao argumento — todas as views de `public` entram no censo, com dono, opcoes e bytes de definicao.
const views = await sql(`select c.relname as nome, r.rolname as dono, c.reloptions as opcoes,
  pg_get_viewdef(c.oid, true) as definicao
  from pg_class c join pg_namespace n on n.oid = c.relnamespace join pg_roles r on r.oid = c.relowner
  where n.nspname = 'public' and c.relkind = 'v' order by 1`);
if (!views.length) throw new Error('ABORTA: zero views em `public` no catalogo — a via das definicoes nao pode ser contada');
// identidade de censo com a peca 6: se o meu filtro `relkind='v'` nao estivesse a contar as mesmas
// views do censo que alimentou o PEN-23, a ausencia numa definicao nao provaria nada.
const viewsCenso = JSON.parse(readFileSync(join(REPO, 'evidence/sm22-varre-view-municipal-18-11.json'), 'utf8')).pen23;
if (viewsCenso.total_views !== views.length) throw new Error(`ABORTA: censo de views diferente entre a peca 6 (${viewsCenso.total_views}) e esta peca (${views.length}) — nao ha identidade de corpus`);
const nasViews = {};
for (const f of formas) {
  const hits = views.map((v) => ({ view: v.nome, invoker: /security_invoker/.test(String(v.opcoes || '')),
    ocorrencias: ((v.definicao || '').match(new RegExp(f.nome + '\\(', 'g')) || []).length })).filter((x) => x.ocorrencias > 0);
  nasViews[f.nome] = { views_que_citam: hits.length, quais: hits, total_views: views.length };
}

// por que razao cada funcao tem (ou nao) EXECUTE a anon — a uniao das tres vias medidas
const motivoPorFuncao = Object.fromEntries(formas.map((f) => {
  const emPolicy = emPolicies[f.nome].ocorrencias_no_texto_das_policies > 0;
  const emViewQueInvoca = (nasViews[f.nome].quais || []).some((x) => x.invoker === true);
  return [f.nome, { anon_execute: f.anon, em_policy: emPolicy, em_view_com_invoker: emViewQueInvoca,
    rpc_no_bundle: noBundle[f.nome], em_view: nasViews[f.nome].views_que_citam,
    preciso_para_anon: emPolicy || emViewQueInvoca || noBundle[f.nome] > 0,
    motivo: emPolicy ? 'predicado de policy' : emViewQueInvoca ? 'citada em view security_invoker' : noBundle[f.nome] > 0 ? 'chamada pelo bundle via /rpc' : 'NENHUMA das tres vias — o grant a anon nao e necessario a nada do que foi medido' }];
}));
const soPorNada = Object.entries(motivoPorFuncao).filter(([k, v]) => v.anon_execute && !v.preciso_para_anon).map(([k]) => k);

const out = {
  em: new Date().toISOString(),
  metodo: 'pg_policy/pg_get_expr + pg_get_viewdef de `public` + GET do shell; zero escrita; zero segredo impresso',
  total_policies_public: policies.length,
  views: { total_nas_definicoes: views.length, por_nome: views.map((v) => ({ nome: v.nome, dono: v.dono, opcoes: v.opcoes,
    definicao_bytes: Buffer.byteLength(v.definicao || '') })), citadas_na_peca6: viewsCenso },
  duas_reguas_batem: batem,
  regua_discrimina_fixture: { esperados_dentro_das_policies: FIXTURES_DENTRO, medidos: Object.fromEntries(FIXTURES_DENTRO.map((n) => [n, (emPolicies[n] || {}).ocorrencias_no_texto_das_policies ?? 'ausente_da_lista'])), discriminate: reguaDiscrimina },
  dentro_das_policies: dentro,
  fora_das_policies: fora,
  nas_definicoes_das_views: nasViews,
  motivo_por_funcao: motivoPorFuncao,
  revoke_seguro_para_anon: soPorNada,
  probe_anon_ja_medido_na_peca8: rpc.chamadas,
  bundle: { chamadas_rpc_no_shell: rpcChamadasNoBundle, nomes_rpc_no_shell: nomesRpcNoBundle, chamadas_por_funcao: noBundle },
  n_com_anon_execute: formas.filter((f) => f.anon === true).length,
  leitura: `das ${formas.length} funcoes desta lista, ${formas.filter((f) => f.anon === true).length} tem EXECUTE a anon; dessas, ${Object.keys(dentro).filter((k) => (formas.find((f) => f.nome === k) || {}).anon).length} tambem sao citadas em policies de public (REVOKE a anon partiria a RLS, foi o que o sm10 ensinou) e ${Object.keys(fora).filter((k) => (formas.find((f) => f.nome === k) || {}).anon).length} nao aparecem em nenhuma policy`,
};
if (!batem) throw new Error(`ABORTA: as duas reguas de contagem de policies dao valores diferentes por funcao — nenhuma recomendacao de REVOKE sai desta peca`);
if (!reguaDiscrimina) throw new Error(`ABORTA: a regua das policies nao colocou os fixtures [${FIXTURES_DENTRO.join(',')}] dentro delas — esta cega e nenhuma recomendacao de REVOKE sai desta peca`);
if (!cego.length) throw new Error('ABORTA: nenhuma funcao da lista esta fora das policies — a contagem estaria a casar em tudo');
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

console.log(`policies em public: ${policies.length}`);
for (const [n, v] of Object.entries(emPolicies)) console.log(`  ${n}: citam_js=${v.policies_que_citam_na_via_js} citam_sql=${v.policies_que_citam_na_via_sql} ocorrencias=${v.ocorrencias_no_texto_das_policies} rpc_no_bundle=${noBundle[n]} corpo=${(formas.find((f) => f.nome === n) || {}).corpo_bytes}B definer=${(formas.find((f) => f.nome === n) || {}).definer} volatil=${(formas.find((f) => f.nome === n) || {}).volatil} args=${(formas.find((f) => f.nome === n) || {}).argumentos}`);
console.log(`fixtures dentro: ${JSON.stringify(out.regua_discrimina_fixture.medidos)} discriminate=${reguaDiscrimina}`);
console.log(`dentro=[${Object.keys(dentro).join(',')}] fora=[${Object.keys(fora).join(',')}] cegos=[${cego.join(',')}]`);
console.log(`views: ${views.length} (censo da peca 6: ${viewsCenso.total_views}) ${JSON.stringify(out.views.por_nome)}`);
for (const [n, v] of Object.entries(motivoPorFuncao)) console.log(`  ${n}: anon=${v.anon_execute} policy=${v.em_policy} view_invoker=${v.em_view_com_invoca ?? v.em_view_com_invoker} views=${v.em_view} rpc=${v.rpc_no_bundle} -> ${v.motivo}`);
console.log(`REVOKE seguro a anon (sem consequencia medida em policy, view invocadora ou /rpc do bundle): [${soPorNada.join(',')}]`);
console.log(`bundle: ${rpcChamadasNoBundle} chamadas .rpc( | nomes=${nomesRpcNoBundle.length} [${nomesRpcNoBundle.join(',')}]`);
console.log(out.leitura);
console.log(`\nSM22_MOTIVO_OK · registo evidence/sm22-motivo-do-grant-anon-18-11b.json`);
