#!/usr/bin/env node
// SM.23 peca 4 — CONFERENCIA POS-FACTO, SO LEITURA, do DDL do calendario (peca (a) do OK de 18/11).
// Porque existe um `-VERMELHO.json` da aplicacao: o DDL correu limpo (`erro_aplicacao: null`, 3 tabelas,
// 6 politicas, RLS forcada, 12 grants) e o unico vermelho foi o MEU portao, que exigia que
// `information_schema.role_table_grants` devolvesse exatamente os quatro privilegios que a candidata
// GRANTA. Medido: devolve sete (DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE) porque o
// projecte da Supabase tem PRIVILEGIOS POR OMISSAO para `anon` e `authenticated` sobre tabelas novas —
// logo «sao quatro» era um limiar lembrado, nao uma propriedade observavel. A predicate certa e de
// inclusao (os quatro pedidos estao la) e o que interessa para a seguranca e medido a parte: com o
// privilegio de SELECT a `anon`, a UNICA barreira e a RLS, por isso este instrumento prova também que
// anon ve ZERO linhas nas tres mesas. Fecha PEN-29 por executo, nao por contagem de nomes.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
const APLICACAO = join(REPO, 'evidence/sm23-aplicacao-calendario-18-11-VERMELHO.json');
const PRE = join(REPO, 'evidence/sm23-preflight-ddl-18-11.json');
const OUT = join(REPO, `evidence/sm23-conferencia-calendario-18-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com SM23_SUF=novo, nao por cima');
for (const f of [APLICACAO, PRE]) if (!existsSync(f)) throw new Error('ABORTA: falta ' + f);
const apl = JSON.parse(readFileSync(APLICACAO, 'utf8'));
const pre = JSON.parse(readFileSync(PRE, 'utf8'));

const md5_lee = (f) => createHash('md5').update(readFileSync(f, 'utf8'), 'utf8').digest('hex');
const TABELAS = ['bfr_school_shift_settings', 'bfr_school_calendar_days', 'bfr_school_calendar_month_targets'];
const alvoUrl = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
const shellTxt = await (await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem chave publishable nos bytes servidos');

// O que o front realmente pede, extraído por varredura de índices (sem regex, para que o `(` de
// `.select(` não tenha de ser escapado em string de linha de comando).
const Extrai = (tabela) => {
  const alvo = `.from('${tabela}')`;
  const selects = [], conflitos = [], filtros = [];
  let i = 0;
  while ((i = shellTxt.indexOf(alvo, i)) >= 0) {
    const jato = shellTxt.slice(i, i + 900);
    const k = jato.indexOf('.select(');
    if (k >= 0) { const abre = jato.indexOf("'", k + 8); const fecha = abre >= 0 ? jato.indexOf("'", abre + 1) : -1; if (fecha > abre) selects.push(jato.slice(abre + 1, fecha)); }
    const c = jato.indexOf('onConflict');
    if (c >= 0) { const abre = jato.indexOf("'", c); const fecha = abre >= 0 ? jato.indexOf("'", abre + 1) : -1; if (fecha > abre) conflitos.push(jato.slice(abre + 1, fecha)); }
    i += alvo.length;
  }
  return { selects, conflitos, filtros, chamadas: (shellTxt.split(alvo).length - 1) };
};
const pedidos = Object.fromEntries(TABELAS.map((t) => [t, Extrai(t)]));

const colunasCatalogo = await sql(`select table_name as tabela, column_name as coluna, data_type as tipo, is_nullable as nulable
  from information_schema.columns where table_schema='public' and table_name in (${TABELAS.map((x) => `'${x}'`).join(',')}) order by 1, ordinal_position`);
const porTabela = TABELAS.map((t) => {
  const tem = new Set(colunasCatalogo.filter((c) => c.tabela === t).map((c) => c.coluna));
  const pedidosCols = [...new Set(pedidos[t].selects.flatMap((s) => s.split(',').map((x) => x.trim().split(/\s+/).pop())).filter((x) => x && x !== '*'))];
  return { tabela: t, colunas_no_catalogo: [...tem],_select_do_front: pedidos[t].selects, colunas_pedidas: pedidosCols,
    faltam_no_catalogo: pedidosCols.filter((c) => !tem.has(c)), on_conflict: pedidos[t].conflitos };
});
const chavesBrutas = await sql(`select t.relname as tabela, pg_get_constraintdef(k.oid) as definicao from pg_constraint k
  join pg_class t on t.oid=k.conrelid join pg_namespace n on n.oid=t.relnamespace and n.nspname='public'
  where k.contype='p' and t.relname in (${TABELAS.map((x) => `'${x}'`).join(',')}) order by 1`);
const chaves = chavesBrutas.map((x) => ({ tabela: x.tabela, chave: x.definicao.replace(/^PRIMARY KEY \((.*)\)$/, '$1').replace(/"/g, '') }));
const politicas = await sql(`select p.polname as nome, t.relname as tabela, case p.polcmd when 'r' then 'SELECT' when 'a' then 'ALL' when 'w' then 'UPDATE' when 'd' then 'DELETE' when 'i' then 'INSERT' else p.polcmd::text end as comando,
  (select string_agg(r.rolname, ',' order by r.rolname) from unnest(p.polroles) rid join pg_roles r on r.oid=rid) as papeis,
  p.polpermissive as permissiva, pg_get_expr(p.polqual, p.polrelid) as using_txt, coalesce(pg_get_expr(p.polwithcheck, p.polrelid),'') as check_txt
  from pg_policy p join pg_class t on t.oid=p.polrelid join pg_namespace n on n.oid=t.relnamespace and n.nspname='public'
  where t.relname in (${TABELAS.map((x) => `'${x}'`).join(',')}) order by 2, 1`);
const privilegios = await sql(`select table_name as tabela, grantee as papel, string_agg(privilege_type, ',' order by privilege_type) as privilegios
  from information_schema.role_table_grants where table_schema='public' and table_name in (${TABELAS.map((x) => `'${x}'`).join(',')})
    and grantee in ('anon','authenticated','service_role') group by 1,2 order by 1,2`);
const especies = await sql(`select c.relname as tabela, c.relrowsecurity as rls, c.relforcerowsecurity as forcada, c.relpersistence as persistente, r.rolname as dono,
  (select count(*)::int from pg_indexes ix where ix.schemaname='public' and ix.tablename=c.relname) as indices
  from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public' join pg_roles r on r.oid=c.relowner
  where c.relname in (${TABELAS.map((x) => `'${x}'`).join(',')}) and c.relkind in ('r','p') order by 1`);
const vazias = await sql(TABELAS.map((t) => `select '${t}' as tabela, count(*)::int as linhas from public.${t}`).join(' union all '));
const baselines = await sql(`select
  (select count(*)::int from public.schools) as schools, (select count(*)::int from public.students) as students,
  (select count(*)::int from public.profiles) as profiles, (select count(*)::int from public.announcements) as announcements,
  (select count(*)::int from public.bfr_municipal_access_grants) as grants, (select count(*)::int from public.supervision_requests) as supervision_requests`);

const getJson = async (path, access) => {
  const r = await fetch(HOST + path, { headers: { apikey: anonKey, Authorization: `Bearer ${access}`, Accept: 'application/json' } });
  const corpo = await r.text(); let linhas = null, code = null;
  try { const j = JSON.parse(corpo); linhas = Array.isArray(j) ? j.length : null; if (!Array.isArray(j)) code = j.code || null; } catch {}
  return { status: r.status, linhas, code, bytes: Buffer.byteLength(corpo) };
};
const s = JSON.parse(readFileSync(join(FORA, 'ah2-sessions.json'), 'utf8'));
const tokenVivo = async (nome) => {
  const p = s[nome];
  if (Number(p.expires_at) * 1000 > Date.now() + 30_000) return p.access_token;
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ refresh_token: p.refresh_token }) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.access_token) throw new Error('refresh HTTP ' + r.status);
  return j.access_token;
};
const porSessao = {};
for (const nome of ['coordinator', 'secretary', 'student', 'parent']) {
  try { const tk = await tokenVivo(nome); porSessao[nome] = Object.fromEntries(await Promise.all(TABELAS.map(async (t) => [t, await getJson(`/rest/v1/${t}?select=*&limit=5`, tk)]))); }
  catch (e) { porSessao[nome] = { erro: String(e.message).slice(0, 140) }; }
}
const semSessao = Object.fromEntries(await Promise.all([...TABELAS, 'bfr_school_calendar_week_targets'].map(async (t) => [t, await getJson(`/rest/v1/${t}?select=*&limit=5`, anonKey)])));

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 260)}`); return { nome, verde: !!cond, detalhe }; };
const QUATRO = ['DELETE', 'INSERT', 'SELECT', 'UPDATE'];
const temOsQuatro = (papel) => TABELAS.every((t) => { const trow = privilegios.find((x) => x.tabela === t && x.papel === papel); return trow && QUATRO.every((p) => trow.privilegios.split(',').includes(p)); });
const portoes = [
  g('regua_de_front_dispara_nos_tres_nomes', TABELAS.every((t) => pedidos[t].chamadas >= 1), Object.fromEntries(TABELAS.map((t) => [t, pedidos[t].chamadas]))),
  g('o_front_pede_selects_concretos', TABELAS.every((t) => pedidos[t].selects.length >= 1), Object.fromEntries(TABELAS.map((t) => [t, pedidos[t].selects]))),
  g('nenhuma_coluna_pedida_falta_no_catalogo', porTabela.every((x) => x.faltam_no_catalogo.length === 0), porTabela.map((x) => `${x.tabela}: faltam ${x.faltam_no_catalogo.join('|') || 'nenhuma'}`)),
  g('on_conflict_bate_com_a_chave_primaria', porTabela.every((x) => x.on_conflict.length === 0 || x.on_conflict.every((c) => chaves.some((k) => k.tabela === x.tabela && c.split(',').map((y) => y.trim()).sort().join(',') === k.chave.split(',').map((y) => y.trim()).sort().join(',')))), { on_conflict: porTabela.map((x) => x.on_conflict), chaves: chaves.map((k) => `${k.tabela}=${k.chave}`) }),
  g('tabelas_as_tres_e_sao_persistente_de_postgres', especies.length === 3 && especies.every((x) => x.persistente === 'p' && x.dono === 'postgres'), especies),
  g('rls_ligada_e_forcada_as_tres', especies.every((x) => x.rls === true && x.forcada === true), especies.map((x) => `${x.tabela}:${x.rls}/${x.forcada}`)),
  g('politicas_as_seis_com_papeis_de_authenticated', politicas.length === 6 && politicas.every((x) => x.papeis === 'authenticated'), politicas.map((x) => `${x.nome}:${x.comando}:${x.papeis}`)),
  g('politicas_chamam_o_predicado_de_sessao', politicas.every((x) => (x.using_txt + x.check_txt).includes('bfr_rls_session_role')), politicas.map((x) => `${x.nome}:${(x.using_txt + x.check_txt).slice(0, 40)}`)),
  g('as_seis_sao_permissivas', politicas.every((x) => x.permissiva === true), politicas.map((x) => `${x.nome}:${x.permissiva}`)),
  g('authenticated_tem_os_quatro_privilegios_pedidos', temOsQuatro('authenticated'), privilegios),
  g('anon_tem_select_por_privilegio_por_omissao_e_so_a_rls_barra', TABELAS.every((t) => { const row = privilegios.find((x) => x.tabela === t && x.papel === 'anon'); return row && row.privilegios.includes('SELECT'); }) && TABELAS.every((t) => semSessao[t].status === 200 && semSessao[t].linhas === 0), { privilegios_anon: privilegios.filter((x) => x.papel === 'anon').map((x) => `${x.tabela}:${x.privilegios}`), anon_rest: Object.fromEntries(TABELAS.map((t) => [t, semSessao[t]])) }),
  g('anon_ve_zero_linhas_nas_tres', TABELAS.every((t) => semSessao[t].status === 200 && semSessao[t].linhas === 0), Object.fromEntries(TABELAS.map((t) => [t, semSessao[t]]))),
  g('controle_negativo_continua_404_pgrst205', semSessao['bfr_school_calendar_week_targets'].status === 404 && semSessao['bfr_school_calendar_week_targets'].code === 'PGRST205', semSessao['bfr_school_calendar_week_targets']),
  g('staff_le_com_sessao', ['coordinator', 'secretary'].every((n) => !porSessao[n].erro && TABELAS.every((t) => porSessao[n][t].status === 200 && porSessao[n][t].linhas === 0)), porSessao),
  g('aluno_e_responsavel_ve_zero_linhas', ['student', 'parent'].every((n) => !porSessao[n].erro && TABELAS.every((t) => porSessao[n][t].status === 200 && porSessao[n][t].linhas === 0)), Object.fromEntries(['student', 'parent'].map((n) => [n, TABELAS.map((t) => `${t.slice(-6)}=${porSessao[n][t].status}/${porSessao[n][t].linhas}`).join(' ')]))),
  g('mesas_nascem_vazias', vazias.length === 3 && vazias.every((x) => x.linhas === 0), vazias),
  g('baselines_iguais_as_do_preflight', JSON.stringify(baselines[0]) === JSON.stringify(pre.baselines), { agora: baselines[0], preflight: pre.baselines }),
  g('candidata_aplicada_e_a_mesma_que_esta_em_disco', apl.candidata_md5 === md5_lee(join(REPO, 'scripts/ah2-ddl-calendario-candidata.sql')), { na_aplicacao: apl.candidata_md5, em_disco: md5_lee(join(REPO, 'scripts/ah2-ddl-calendario-candidata.sql')) }),
  g('aplicacao_nao_rebentou_no_canal', apl.erro_aplicacao === null, apl.erro_aplicacao),
];
const out = {
  programa: 'scripts/sm23-conferir-calendario-18-11.mjs',
  em: new Date().toISOString(),
  ok_nomeado: pre.ok_nomeado,
  metodo: 'information_schema + pg_policy + pg_class + GET ao REST com e sem sessão; zero escrita; chave nunca gravada',
  aplicacao_confere: { ficheiro: APLICACAO.replace(REPO + '/', ''), em: apl.em, erro_aplicacao: apl.erro_aplicacao, antes: apl.antes, depois: apl.depois, portoes_verdes_na_aplicacao: apl.portoes.filter((p) => p.verde).length, portoes_da_aplicacao: apl.portoes.length, unicos_vermelhos: apl.portoes.filter((p) => !p.verde).map((p) => p.nome) },
  front_pede: pedidos,
  colunas_por_tabela: porTabela,
  chaves_primarias: chaves,
  politicas, privilegios, especies, mesas_vazias: vazias, baselines: baselines[0],
  rest_sem_sessao: semSessao, rest_por_sessao: porSessao,
  privilegios_por_omissao_do_projecte: 'a tabela nova herda os GRANT default do projecte Supabase (anon e authenticated levam SELECT/INSERT/UPDATE/DELETE/REFERENCES/TRIGGER/TRUNCATE); a candidata só acrescentou os que precisava, e é por isso que «são exatamente quatro» não era observável — a barreira medida é a RLS com FORCE, não o privilégio',
  portoes,
};
out.veredito = falhas.length === 0 ? 'CAL_CONFERIDO_VERDE' : `VERMELHO: ${falhas.length}`;
out.falhas = falhas;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`SM23_CAL_CONFERIDO_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const p of out.portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(JSON.stringify({ colunas: porTabela.map((x) => `${x.tabela}: pede ${x.colunas_pedidas.join('|') || 'nenhuma'} | faltam ${x.faltam_no_catalogo.join('|') || 'nenhuma'}`), chaves: chaves.map((k) => `${k.tabela}=${k.chave}`), conflitos: Object.fromEntries(TABELAS.map((t) => [t, pedidos[t].conflitos])), rest: Object.fromEntries(TABELAS.map((t) => [t, `${semSessao[t].status}/${semSessao[t].linhas}`])), controle: semSessao['bfr_school_calendar_week_targets'] }, null, 1));
console.log(`SM23_CAL_CONFERIDO_OK · registo ${OUT}`);
