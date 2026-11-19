#!/usr/bin/env node
// SM.23 peca 1 — PREFLIGHT, SOMENTE LEITURA, das tres pecas de DDL que o utilizador autorizou por item
// em 18/11 (ferramenta de escolha): (a) calendario letivo `scripts/ah2-ddl-calendario-candidata.sql`;
// (b) `ALTER VIEW public.bfr_municipal_school_stats … security_invoker`; (c) `REVOKE EXECUTE … TO anon`
// das duas funcoes municipais que nenhuma policy, nenhuma definicao de view e nenhum /rpc do bundle cita.
// Este artefacto e o ANTES das tres pecas: sem ele a aplicacao nao tem diff, e um verde depois nao quer
// dizer nada. Nada aqui escreve: so SELECT de catalogo, has_*_privilege, GET/POST de leitura e disco.
// Chaves: a publishable e lida dos bytes servidos para uma variavel e morre ai; os access token de
// sessao vem de refresh guardado em ficheiro local. Nenhum dos dois e impresso nem gravado — o
// artefacto so contem nomes, numeros, md5, estados e contagens de linhas.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql, HOST, admin } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
const OUT = join(REPO, `evidence/sm23-preflight-ddl-18-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com SM23_SUF=novo, nao por cima');
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');

const CAL_SQL = join(REPO, 'scripts/ah2-ddl-calendario-candidata.sql');
const CAL_REV = join(REPO, 'scripts/ah2-ddl-calendario-reversao.sql');
const calTxt = readFileSync(CAL_SQL, 'utf8');
const revTxt = readFileSync(CAL_REV, 'utf8');
// O censo anterior, versionado, e a origem da expectativa sobre as views — nao um digito lembrado.
const CENSO_ANTERIOR = join(REPO, 'evidence/sm22-varre-view-municipal-18-11.json');
const censoAnt = JSON.parse(readFileSync(CENSO_ANTERIOR, 'utf8'));

const alvoUrl = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
if (!alvoUrl) throw new Error('ABORTA: sem URL de publicacao lida do diario da v134');
const shellTxt = await (await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: a chave publishable nao esta nos bytes servidos — a sonda nao continua as cegas');
const cab = { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' };
const conta = (t, agulha) => t.split(agulha).length - 1;

// ── (a) calendario: nomes-alvo, controle de disparo, o que o front pede, e o REST real ──
const TABELAS = ['bfr_school_shift_settings', 'bfr_school_calendar_days', 'bfr_school_calendar_month_targets'];
const POLICIAS = ['bfr_school_shift_settings_staff_read', 'bfr_school_shift_settings_managers_write',
  'bfr_school_calendar_days_staff_read', 'bfr_school_calendar_days_managers_write',
  'bfr_school_calendar_month_targets_staff_read', 'bfr_school_calendar_month_targets_managers_write'];
const absentes = await sql(`select
  (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where c.relname in ('bfr_school_shift_settings','bfr_school_calendar_days','bfr_school_calendar_month_targets')) as tabelas,
  (select count(*)::int from pg_policy p join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where p.polname in ('bfr_school_shift_settings_staff_read','bfr_school_shift_settings_managers_write','bfr_school_calendar_days_staff_read','bfr_school_calendar_days_managers_write','bfr_school_calendar_month_targets_staff_read','bfr_school_calendar_month_targets_managers_write')) as politicas,
  (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where c.relname='schools') as controle_schools,
  (select count(*)::int from pg_policy p join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where p.polname='supervision_requests_director_read') as controle_policy,
  (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where c.relkind in ('r','p')) as relacoes_public`);
// Correção datada 18/11, depois da primeira corrida vermelha
// (`evidence/sm23-preflight-ddl-18-11-VERMELHO.json`): a agulha original varria `pg_class` sem filtro
// de espécie, por isso apanhou índices e constraints (`…_pkey`, `bfr_schedule_entries_…_shift_…_key`),
// e apanhou `bfr_school_key_map` — que é uma relação REAL criada pelo DDL municipal (sm4) três dias
// depois de a PEN-29 ter medido «nenhuma pareada». O que quero provar é outro facto: nenhuma RELAÇÃO
// (mesa, particão, vista, materializada) tem nome parecido com as três-alvo. Índices continuam
// registados, mas como `pareadas_de_outras_especies` e não como falha.
const pareadasBrutas = await sql(`select c.relname as nome, c.relkind as especie from pg_class c
  join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  where c.relname like '%calendar%' or c.relname like '%shift%' or c.relname like 'bfr_school%' order by 1`);
const REL_KINDS = ['r', 'p', 'v', 'm'];
const pareadas = pareadasBrutas.filter((x) => REL_KINDS.includes(x.especie));
const pareadasForaDeRelacoes = pareadasBrutas.filter((x) => !REL_KINDS.includes(x.especie)).map((x) => `${x.nome}:${x.especie}`);
// O conjunto permitido lê-se do fonte do DDL já aplicado, não da memória: todos os CREATE TABLE da
// candidata municipal (sm4), cujos nomes estão em `evidence/sm4-aplicacao-18-11.json` como criados.
const sm4Txt = readFileSync(join(REPO, 'scripts/sm4-ddl-municipal-candidata.sql'), 'utf8');
const criadasPeloSm4 = [...sm4Txt.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?public\.([a-z_]+)/g)].map((m) => m[1]);
// As 6 politicas novas vao chamar `bfr_rls_session_role()`: se o grant nao existir, o RLS nasce
// negado para toda a gente e a candidata abre uma porta fechada em vez de uma mesa.
const predicado = await sql(`select p.oid::regprocedure::text as assinatura, p.prosecdef as definer,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
  where p.proname='bfr_rls_session_role'`);
const pedidosNoBundle = Object.fromEntries(TABELAS.map((t) => [t, conta(shellTxt, t)]));
const sondaRest = [];
for (const t of TABELAS) {
  const r = await fetch(`${HOST}/rest/v1/${t}?select=*&limit=1`, { headers: cab });
  const corpo = await r.text();
  let code = null; try { code = JSON.parse(corpo).code || null; } catch {}
  sondaRest.push({ tabela: t, status: r.status, code, bytes: Buffer.byteLength(corpo) });
}
const sondaControle = [];
for (const t of ['profiles', 'gate_checkins', 'schools']) {
  const r = await fetch(`${HOST}/rest/v1/${t}?select=*&limit=1`, { headers: cab });
  const corpo = await r.text();
  let linhas = null; try { linhas = Array.isArray(JSON.parse(corpo)) ? JSON.parse(corpo).length : null; } catch {}
  sondaControle.push({ tabela: t, status: r.status, linhas, bytes: Buffer.byteLength(corpo) });
}

// ── (b) a vista municipal: modo, dono, grants, definicao e quem a le de facto ──
const vistasCenso = await sql(`select c.relname as nome, r.rolname as dono,
  case when c.reloptions::text like '%security_invoker=true%' then 'invoker'
       when c.reloptions::text like '%security_invoker=false%' then 'definer'
       when c.reloptions is null then 'sem-opcao-null' else 'sem-opcao' end as modo,
  coalesce(c.reloptions::text,'NULL') as reloptions,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_sel,
  has_table_privilege('authenticated', c.oid, 'SELECT') as auth_sel
  from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles r on r.oid=c.relowner
  where n.nspname='public' and c.relkind='v' order by 1`);
const alvoVistas = vistasCenso.filter((v) => v.nome === 'bfr_municipal_school_stats');
if (alvoVistas.length !== 1) throw new Error('ABORTA: a vista-alvo nao e unica no censo — ' + JSON.stringify(alvoVistas.map((v) => v.nome)));
const vistaDetalhe = await sql(`select c.oid::regclass::text as nome, r.rolname as dono, rolob.rolbypassrls as dono_bypassrls,
  coalesce(c.reloptions::text,'NULL') as reloptions, pg_get_viewdef(c.oid, true) as definicao,
  (select count(*)::int from pg_policy pol join pg_class c2 on c2.oid=pol.polrelid
     join pg_namespace n2 on n2.oid=c2.relnamespace and n2.nspname='public'
     where strpos(pg_get_expr(pol.polqual,c2.oid),'bfr_municipal_school_stats')>0
        or strpos(pg_get_expr(pol.polwithcheck,c2.oid),'bfr_municipal_school_stats')>0) as em_policies
  from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  join pg_roles r on r.oid=c.relowner join pg_roles rolob on rolob.oid=c.relowner
  where c.relname='bfr_municipal_school_stats' and c.relkind='v'`);
const definicao = vistaDetalhe[0].definicao;
const definicaoMd5 = md5(definicao);

// Leitura da vista em QUATRO modos: anon por REST, service por REST, `set local role` nos dois
// papeis de JWT, e sessao real com token authenticado (o unico modo em que a RLS de origem ve
// reclamaoes a serio). Antes de qualquer escrita, para que o depois seja um diff e nao um palpite.
const vistaLeitura = [];
{
  const r = await fetch(`${HOST}/rest/v1/bfr_municipal_school_stats?select=*&limit=5`, { headers: cab });
  const corpo = await r.text(); let linhas = null, code = null;
  try { const j = JSON.parse(corpo); if (Array.isArray(j)) linhas = j.length; else code = j.code || null; } catch {}
  vistaLeitura.push({ modo: 'anon_http', status: r.status, linhas, code, bytes: Buffer.byteLength(corpo) });
}
{
  const { status, j } = await admin('/rest/v1/bfr_municipal_school_stats?select=*&limit=5', { headers: { Accept: 'application/json' } });
  vistaLeitura.push({ modo: 'service_http', status, linhas: Array.isArray(j) ? j.length : null, code: Array.isArray(j) ? null : (j && j.code) || null });
}
for (const papel of ['anon', 'authenticated']) {
  // Um `set local role` sobre a vista pode rebentar numa policy que chama um predicado sem EXECUTE
  // ao papel que invoco — isso é MEDIDA, não obstáculo: registo o erro e sigo para os modos reais.
  let saida = null, erro = null;
  try { saida = await sql(`begin; set local role ${papel}; select count(*)::int as n from public.bfr_municipal_school_stats; rollback;`); }
  catch (e) { erro = String(e.message).slice(0, 200); }
  vistaLeitura.push({ modo: `set_local_role_${papel}`, linhas: saida && Array.isArray(saida) && saida[0] ? saida[0].n : (erro ? null : 'NAO-LIDO'), erro });
}
const sessoes = JSON.parse(readFileSync(join(REPO, 's20-sessions.json'), 'utf8'));
const leituraSessao = [];
for (const nome of Object.keys(sessoes)) {
  const refresh = sessoes[nome] && sessoes[nome].refresh_token;
  if (!refresh) { leituraSessao.push({ perfil: nome, erro: 'sem refresh token no ficheiro local' }); continue; }
  const t = await admin('/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refresh_token: refresh }) });
  const access = t.j && t.j.access_token;
  if (!access) { leituraSessao.push({ perfil: nome, erro: 'token HTTP ' + t.status }); continue; }
  const r = await fetch(`${HOST}/rest/v1/bfr_municipal_school_stats?select=*&limit=20`, { headers: { apikey: anonKey, Authorization: `Bearer ${access}`, Accept: 'application/json' } });
  const corpo = await r.text(); let linhas = null, colunas = null, code = null;
  try { const j = JSON.parse(corpo); if (Array.isArray(j)) { linhas = j.length; colunas = j[0] ? Object.keys(j[0]) : []; } else code = (j && j.code) || null; } catch {}
  leituraSessao.push({ perfil: nome, status: r.status, linhas, colunas, code });
}
const usoVistaNoBundle = { nome_exato_no_shell: conta(shellTxt, 'bfr_municipal_school_stats') };

// ── (c) as duas funcoes: assinatura, grant, e as tres vias do motivo do grant ──
const ALVO2 = ['bfr_municipal_network_totals', 'bfr_has_municipal_grant'];
const FIXTURE = ['bfr_rls_session_role', 'bfr_rls_is_developer', 'bfr_rls_director_manages_student', 'bfr_is_municipal_authority'];
const funcoes = await sql(`select p.proname as nome, p.oid::regprocedure::text as assinatura, p.prosecdef as definer,
  p.provolatile as volatil, p.pronargs::int as argumentos, pg_get_function_result(p.oid) as resultado,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_execute,
  (select count(*)::int from pg_policy pol join pg_class c on c.oid=pol.polrelid
     join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where strpos(pg_get_expr(pol.polqual,c.oid), p.proname)>0
        or strpos(pg_get_expr(pol.polwithcheck,c.oid), p.proname)>0) as em_policies_sql,
  (select count(*)::int from pg_class v join pg_namespace n on n.oid=v.relnamespace and n.nspname='public'
     where v.relkind='v' and strpos(pg_get_viewdef(v.oid), p.proname)>0) as em_views_sql
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
  where p.proname in (${[...ALVO2, ...FIXTURE].map((x) => `'${x}'`).join(',')}) order by 1, 4`);
// Segunda regua sobre as policies: o texto ja baixado, contado em JS — tem de bater com a primeira.
const policiesTxt = await sql(`select pol.polname as nome, pg_get_expr(pol.polqual,pol.polrelid) as using_txt,
  coalesce(pg_get_expr(pol.polwithcheck,pol.polrelid),'') as check_txt
  from pg_policy pol join pg_class p on p.oid=pol.polrelid
  join pg_namespace n on n.oid=p.relnamespace and n.nspname='public'`);
const emPoliciesJs = (nome) => policiesTxt.filter((r) => (r.using_txt || '').includes(nome) || (r.check_txt || '').includes(nome)).length;
const rpcNoBundle = (nome) => conta(shellTxt, `.rpc('${nome}`);
const duasReguas = funcoes.map((f) => ({ nome: f.nome, policies_sql: f.em_policies_sql, policies_js: emPoliciesJs(f.nome), views_sql: f.em_views_sql, rpc_no_bundle: rpcNoBundle(f.nome) }));
const rpcProbe = [];
for (const f of funcoes.filter((x) => ALVO2.includes(x.nome))) {
  if (f.argumentos !== 0 || !/[is]/.test(f.volatil) || /trigger/.test(f.resultado || '')) { rpcProbe.push({ nome: f.nome, chamado: false, porque: 'nao chamavel as cegas por anon' }); continue; }
  const r = await fetch(`${HOST}/rest/v1/rpc/${f.nome}`, { method: 'POST', headers: cab, body: '{}' });
  const corpo = await r.text(); let tipo = null, linhas = null, colunas = null, code = null;
  try { const j = JSON.parse(corpo); if (Array.isArray(j)) { tipo = 'array'; linhas = j.length; colunas = j[0] ? Object.keys(j[0]) : []; } else if (j && typeof j === 'object') { tipo = 'objeto'; code = j.code || null; } } catch {}
  rpcProbe.push({ nome: f.nome, status: r.status, tipo, linhas, colunas, code, bytes: Buffer.byteLength(corpo), anon_execute: f.anon_execute });
}

const baselines = await sql(`select
  (select count(*)::int from public.schools) as schools,
  (select count(*)::int from public.students) as students,
  (select count(*)::int from public.profiles) as profiles,
  (select count(*)::int from public.announcements) as announcements,
  (select count(*)::int from public.bfr_municipal_access_grants) as grants,
  (select count(*)::int from public.supervision_requests) as supervision_requests`);

// ── portões ──────────────────────────────────────────────────────────────────
const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 260)}`); return { nome, verde: !!cond, detalhe }; };
const nomesAnteriores = censoAnt.pen23.views.map((v) => v.nome).sort();
const nomesHoje = vistasCenso.map((v) => v.nome).sort();
const portoes = [
  g('regua_de_nomes_dispara_no_controle', absentes[0].controle_schools === 1 && absentes[0].controle_policy === 1, absentes[0]),
  g('tabelas_calendario_ainda_0', absentes[0].tabelas === 0, absentes[0]),
  g('politicas_calendario_ainda_0', absentes[0].politicas === 0, absentes[0]),
  g('nenhuma_relacao_pareada_além_do_ddl_municipal', pareadas.every((x) => criadasPeloSm4.includes(x.nome)) && pareadas.filter((x) => /calendar/.test(x.nome)).length === 0, { pareadas: pareadas.map((x) => `${x.nome}:${x.especie}`), criadas_pelo_sm4_lidas_do_fonte: criadasPeloSm4, indices_e_constraints_fora_da_regua: pareadasForaDeRelacoes }),
  g('predico_existe_e_auth_tem_execute', predicado.length === 1 && predicado[0].auth_execute === true, predicado),
  g('bundle_pede_os_tres_nomes', TABELAS.every((t) => pedidosNoBundle[t] >= 1), pedidosNoBundle),
  g('os_tres_dao_404', sondaRest.length === 3 && sondaRest.every((s) => s.status === 404), sondaRest),
  g('controles_do_rest_nao_dao_404', sondaControle.every((s) => s.status !== 404), sondaControle),
  g('vista_alvo_existe_e_ainda_nao_e_invoker', alvoVistas[0].modo !== 'invoker', alvoVistas[0]),
  g('dono_da_vista_tem_bypassrls', vistaDetalhe[0].dono_bypassrls === true, { dono: vistaDetalhe[0].dono, bypass: vistaDetalhe[0].dono_bypassrls }),
  g('vista_nao_e_usada_por_policy', vistaDetalhe[0].em_policies === 0, { em_policies: vistaDetalhe[0].em_policies }),
  g('censo_de_views_bate_com_o_diario_anterior', JSON.stringify(nomesHoje) === JSON.stringify(nomesAnteriores), { hoje: nomesHoje, anterior: nomesAnteriores }),
  g('so_a_municipal_esta_sem_invoker', vistasCenso.filter((v) => v.modo !== 'invoker').map((v) => v.nome).join(',') === 'bfr_municipal_school_stats', vistasCenso.map((v) => `${v.nome}:${v.modo}`)),
  g('leitura_da_vista_registada_em_quatro_modos', vistaLeitura.length === 4, vistaLeitura),
  g('leitura_por_sessao_registada_em_todas_as_contas_locais', leituraSessao.length === Object.keys(sessoes).length && leituraSessao.every((x) => typeof x.status === 'number' || x.erro), leituraSessao),
  g('as_duas_funcoes_existem_e_tem_execute_a_anon', ALVO2.every((n) => funcoes.some((f) => f.nome === n && f.anon_execute === true)), funcoes.map((f) => `${f.nome}:${f.anon_execute}`)),
  g('as_duas_estao_fora_de_policies_e_rpc', ALVO2.every((n) => { const d = duasReguas.find((x) => x.nome === n); return d.policies_sql === 0 && d.policies_js === 0 && d.rpc_no_bundle === 0; }), duasReguas.filter((x) => ALVO2.includes(x.nome))),
  g('fixtures_da_regua_de_policies_sao_nao_zero', FIXTURE.every((n) => { const d = duasReguas.find((x) => x.nome === n); return d && d.policies_sql > 0 && d.policies_js > 0; }), duasReguas.filter((x) => FIXTURE.includes(x.nome))),
  g('as_duas_reguas_de_policy_batem', duasReguas.every((x) => x.policies_sql === x.policies_js), duasReguas),
  g('rpc_probe_registrado_ou_justificado', rpcProbe.length === ALVO2.length, rpcProbe),
  g('candidata_calendario_bem_formada', /^BEGIN;/m.test(calTxt) && /^COMMIT;/m.test(calTxt) && calTxt.split(/^COMMIT;/m).pop().replace(/^\s*--[^\n]*(\n|$)/gm, '').trim() === '', { bytes: Buffer.byteLength(calTxt) }),
  g('candidata_calendario_sem_srf_em_any_e_sem_schema_na_policy', !/=\s*ANY\s*\(\s*public\.bfr_municipal_municipalities\s*\(/.test(calTxt) && !/ALTER\s+POLICY\s+public\./i.test(calTxt), true),
  g('candidata_calendario_tem_reload_de_cache', calTxt.includes("NOTIFY pgrst, 'reload schema'"), true),
  g('reversao_calendario_cobre_as_tres_tabelas_e_as_seis_politicas', TABELAS.every((t) => revTxt.includes('DROP TABLE IF EXISTS public.' + t)) && POLICIAS.every((p) => revTxt.includes('DROP POLICY IF EXISTS ' + p)), { tabelas: TABELAS.length, politicas: POLICIAS.length }),
];

const out = {
  programa: 'scripts/sm23-preflight-ddl-18-11.mjs',
  em: new Date().toISOString(),
  ok_nomeado: 'selecao do utilizador 18/11: «DDL municipal + calendario» (ferramenta de escolha) — as tres pecas (a)(b)(c)',
  metodo: 'SELECT de pg_catalog + has_*_privilege + GET/POST de leitura + bytes servidos do shell + leitura de disco; zero escrita; nenhuma chave impressa',
  commit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim(),
  url_servida: alvoUrl,
  shell_bytes: Buffer.byteLength(shellTxt),
  shell_md5: md5(Buffer.from(shellTxt)),
  candidatas_md5: { calendario_aplicacao: md5(calTxt), calendario_reversao: md5(revTxt), origem: 'medidos neste preflight, lidos de scripts/ah2-ddl-calendario-*.sql' },
  calendario: { medido: absentes[0], pareadas_só_relacoes: pareadas, pareadas_de_índices_e_constraints: pareadasForaDeRelacoes, criadas_pelo_ddl_municipal_lidas_do_fonte: criadasPeloSm4, pedidos_no_bundle: pedidosNoBundle, sonda_rest: sondaRest, controles: sondaControle, predicado: predicado[0] },
  vista: { censo: vistasCenso, alvo: alvoVistas[0], dono: vistaDetalhe[0].dono, dono_bypassrls: vistaDetalhe[0].dono_bypassrls, em_policies: vistaDetalhe[0].em_policies, definicao_md5: definicaoMd5, definicao_bytes: Buffer.byteLength(definicao), leitura: vistaLeitura, leitura_por_sessao: leituraSessao, uso_no_bundle: usoVistaNoBundle },
  funcoes: { unidade_de_em_policies: 'número de POLÍTICAS cujo texto contém o nome, não número de ocorrências dentro do texto', unidade_de_rpc_no_bundle: "ocorrências da forma literal `.rpc('NOME` nos bytes servidos", alvo: funcoes.filter((f) => ALVO2.includes(f.nome)), fixtures: duasReguas.filter((x) => FIXTURE.includes(x.nome)), duas_reguas: duasReguas, probe: rpcProbe },
  baselines: baselines[0],
  relacoes_no_publico: absentes[0].relacoes_public,
  portoes,
};
out.veredito = falhas.length === 0 ? 'PREFLIGHT_DDL_VERDE' : `VERMELHO: ${falhas.length}`;
out.falhas = falhas;
if (falhas.length) {
  const p = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
  for (const f of falhas) console.log('  ' + f);
  console.log(`SM23_PREFLIGHT_VERMELHO · registo ${p}`);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const p of out.portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(JSON.stringify({ vista_modo: alvoVistas[0].modo, vista_def_md5: definicaoMd5, leitura: vistaLeitura, sessoes: leituraSessao.map((x) => `${x.perfil}:${x.status ?? 'x'}/${x.linhas ?? x.erro}`), alvo2: funcoes.filter((f) => ALVO2.includes(f.nome)).map((f) => `${f.assinatura} anon_execute=${f.anon_execute} policies=${f.em_policies_sql} rpc=${rpcNoBundle(f.nome)}`), rpc: rpcProbe, baselines: baselines[0], md5: out.candidatas_md5 }, null, 1));
console.log(`SM23_PREFLIGHT_OK · registo ${OUT}`);
