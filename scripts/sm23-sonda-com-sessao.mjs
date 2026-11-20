#!/usr/bin/env node
// SM.23 peca 2 — SONDA COM SESSAO REAL, SOMENTE LEITURA. O preflight (`sm23-preflight-ddl-18-11.mjs`)
// mediu o catalogo e o modo anon; este instrumento mede o COMPORTAMENTO de cada superficie que o DDL
// autorizado mexe, sob sessao autenticada, porque e isso que um `set local role` nao reproduz: a RLS
// das tabelas por baixo da view municipal le as reclamaoes do JWT, e as 6 politicas novas do calendario
// chamam `bfr_rls_session_role()`. Corre-se ANTES e DEPOIS de cada peca, com o mesmo nome de ficheiro
// sufixado pela fase — o diff e a medicao, nao o veredicto isolado.
// Superficies por persona: (1) GET da vista municipal, (2) POST /rpc de `bfr_municipal_network_totals`
// (zero argumentos, a que a PEN-37 mediu 200 as 59 B como anon), (3) POST /rpc de
// `bfr_has_municipal_grant` com o NOME do argumento lido do catalogo, nunca dactilografado, e (4) GET
// as tres tabelas do calendario. 0 escrita em qualquer delas: so SELECT/GET e /rpc de funcao de
// leitura. Tokens so em memoria; nada de credencial vai para o artefacto.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const FASE = process.env.SM23_FASE || 'antes';
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
if (!/^(antes|depois)$/.test(FASE)) throw new Error('ABORTA: SM23_FASE tem de ser antes ou depois');
const OUT = join(REPO, `evidence/sm23-sonda-com-sessao-${FASE}-18-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com SM23_SUF=novo, nao por cima');

const alvoUrl = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
if (!alvoUrl) throw new Error('ABORTA: sem URL de publicacao');
const shellTxt = await (await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem chave publishable nos bytes servidos');

const PERSONAS_ESCOLA = ['secretary', 'coordinator', 'director', 'developer', 'monitor', 'education_supervisor', 'student', 'parent'];
const ah2 = JSON.parse(readFileSync(join(FORA, 'ah2-sessions.json'), 'utf8'));
const sm8 = JSON.parse(readFileSync(join(FORA, 'sm8-municipal-sessions.json'), 'utf8'));
const lista = [
  ...PERSONAS_ESCOLA.filter((p) => ah2[p]).map((p) => ({ origem: 'ah2-sessions', perfil: p, id: ah2[p].id, email: ah2[p].email, access: ah2[p].access_token, refresh: ah2[p].refresh_token, expira: ah2[p].expires_at })),
  ...Object.keys(sm8).map((p) => ({ origem: 'sm8-municipal-sessions', perfil: p, id: sm8[p].id, email: sm8[p].email, access: sm8[p].access_token, refresh: sm8[p].refresh_token, expira: sm8[p].expires_at })),
];

// Correção datada 18/11, depois da primeira corrida em que TODAS as personas deram 401: o instrumento
// usava o access token guardado, que vence ~2 h depois do mint, sem nunca o renovar. Medido: 12 das 12
// sessões locais estavam vencidas há 719–874 minutos (`viva_antes_do_get: false` em todas) e as 19
// contas continuavam vivas em `auth.users` com `last_sign_in_at` preenchido — logo o 401 era do meu
// token, não do produto. Agora: se o access token está vencido, troca-se o refresh token NO endpoint
// de auth e usa-se o novo; nada disto é impresso. (A variante que falhou no preflight era outra: li o
// ficheiro errado — `s20-sessions.json`, sessão de outubro — em vez dos dois ficheiros activos.)
let papelPorUid = {};
try { papelPorUid = Object.fromEntries((await sql(`select id::text as uid, role::text as papel from public.profiles`)).map((x) => [x.uid, x.papel])); }
catch (e) { console.log('AVISO papel_no_perfil indisponivel: ' + String(e.message).slice(0, 120)); }
const tokenVivo = async (p) => {
  if (Number(p.expira) * 1000 > Date.now() + 30_000) return { access: p.access, renovado: false };
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({ refresh_token: p.refresh }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.access_token) throw new Error(`refresh HTTP ${r.status} ${(j && (j.msg || j.error_description || j.error)) || ''}`.trim());
  return { access: j.access_token, renovado: true, expira_agora: Math.floor(Date.now() / 1000) + (j.expires_in || 3600) };
};

// O nome do argumento de bfr_has_municipal_grant, lido do catalogo (a mesma query pode devolver
// mais do que uma sobrecarga: registo todas e uso so as de um argumento uuid).
const grantForma = await sql(`select p.oid::regprocedure::text as assinatura, pg_get_function_arguments(p.oid) as argumentos
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public' where p.proname='bfr_has_municipal_grant' order by 1`);
const umArgs = grantForma.filter((f) => /^\s*[a-z_]+\s+uuid\s*$/i.test(f.argumentos));
if (umArgs.length !== 1) throw new Error('ABORTA: bfr_has_municipal_grant nao e uma funcao de um uuid — ' + JSON.stringify(grantForma));
const NOME_ARG = umArgs[0].argumentos.trim().split(/\s+/)[0];
// Um uuid que NAO tem concessao nenhuma (contraprova) e o municipio real das concessoes de fixture.
const [muniReal] = await sql(`select municipality_id::text as id, count(*)::int as concedidos from public.bfr_municipal_access_grants group by 1 order by 1`);
const uuidSemConcessao = await sql(`select gen_random_uuid()::text as id`);

const TABELAS_CAL = ['bfr_school_shift_settings', 'bfr_school_calendar_days', 'bfr_school_calendar_month_targets'];
const getJson = async (path, access, init) => {
  const headers = { apikey: anonKey, Authorization: `Bearer ${access}`, 'content-type': 'application/json', ...(init && init.headers || {}) };
  const r = await fetch(HOST + path, { ...init, headers });
  const corpo = await r.text();
  let linhas = null, colunas = null, code = null, valor = null;
  try { const j = JSON.parse(corpo); if (Array.isArray(j)) { linhas = j.length; colunas = j[0] ? Object.keys(j[0]) : []; } else if (j && typeof j === 'object') { if (j.code) code = j.code; else valor = typeof j === 'object' ? JSON.stringify(j).slice(0, 60) : null; } } catch {}
  return { status: r.status, linhas, colunas, code, valor, bytes: Buffer.byteLength(corpo) };
};
const porPersona = [];
for (const p of lista) {
  const linha = { perfil: p.perfil, origem: p.origem, uid: p.id, papel_no_perfil: papelPorUid[p.id] || 'SEM-PERFIL', expira_em_epoch: p.expira, viva_antes_do_get: Number(p.expira) * 1000 > Date.now() };
  try {
    const tk = await tokenVivo(p);
    linha.token_renovado = tk.renovado;
    const access = tk.access;
    linha.vista_municipal = await getJson('/rest/v1/bfr_municipal_school_stats?select=*&limit=20', access);
    linha.rpc_network_totals = await getJson('/rest/v1/rpc/bfr_municipal_network_totals', access, { method: 'POST', body: '{}' });
    linha.rpc_has_grant_sem_concessao = await getJson('/rest/v1/rpc/bfr_has_municipal_grant', access, { method: 'POST', body: JSON.stringify({ [NOME_ARG]: uuidSemConcessao[0].id }) });
    if (muniReal) linha.rpc_has_grant_com_municipio_real = await getJson('/rest/v1/rpc/bfr_has_municipal_grant', access, { method: 'POST', body: JSON.stringify({ [NOME_ARG]: muniReal.id }) });
    linha.calendario = {};
    for (const t of TABELAS_CAL) linha.calendario[t] = await getJson(`/rest/v1/${t}?select=*&limit=1`, access);
  } catch (e) { linha.erro = String(e.message).slice(0, 200); }
  porPersona.push(linha);
}
const anon = { perfil: 'anon', origem: 'sem sessao' };
anon.vista_municipal = await getJson('/rest/v1/bfr_municipal_school_stats?select=*&limit=20', anonKey);
anon.rpc_network_totals = await getJson('/rest/v1/rpc/bfr_municipal_network_totals', anonKey, { method: 'POST', body: '{}' });
anon.rpc_has_grant_sem_concessao = await getJson('/rest/v1/rpc/bfr_has_municipal_grant', anonKey, { method: 'POST', body: JSON.stringify({ [NOME_ARG]: uuidSemConcessao[0].id }) });
anon.calendario = {};
for (const t of TABELAS_CAL) anon.calendario[t] = await getJson(`/rest/v1/${t}?select=*&limit=1`, anonKey);

// Estado do catalogo no mesmo instante, para que a leitura de comportamento se possa amarrar ao modo.
const catalogo = await sql(`select
  (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where c.relname in ('bfr_school_shift_settings','bfr_school_calendar_days','bfr_school_calendar_month_targets')) as tabelas_calendario,
  (select case when x.reloptions::text like '%security_invoker=true%' then 'invoker' when x.reloptions::text like '%security_invoker=false%' then 'definer' else 'sem-opcao' end
     from pg_class x join pg_namespace nx on nx.oid=x.relnamespace and nx.nspname='public' where x.relname='bfr_municipal_school_stats') as vista_modo,
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
     where p.proname in ('bfr_municipal_network_totals','bfr_has_municipal_grant') and has_function_privilege('anon', p.oid, 'EXECUTE')) as anon_execute_das_duas`);

const out = {
  programa: 'scripts/sm23-sonda-com-sessao.mjs',
  fase: FASE,
  em: new Date().toISOString(),
  metodo: 'GET/POST de leitura com access token de cada persona local; zero escrita; nenhuma credencial gravada (so uid, perfil, status, contagens)',
  url_servida: alvoUrl,
  shell_md5: createHash('md5').update(Buffer.from(shellTxt)).digest('hex'),
  has_grant_argumento_lido_do_catalogo: umArgs[0].assinatura,
  has_grant_nome_do_argumento: NOME_ARG,
  municipio_real_das_concessoes: muniReal || null,
  catalogo_no_instante: catalogo[0],
  anon,
  por_persona: porPersona,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
const resumo = (l) => `${l.perfil}: vista=${l.vista_municipal && l.vista_municipal.status}/${l.vista_municipal && l.vista_municipal.linhas} rpc=${l.rpc_network_totals && l.rpc_network_totals.status}/${l.rpc_network_totals && l.rpc_network_totals.linhas} grant=${l.rpc_has_grant_com_municipio_real && l.rpc_has_grant_com_municipio_real.valor || (l.rpc_has_grant_sem_concessao && l.rpc_has_grant_sem_concessao.valor) || '?'} cal=${TABELAS_CAL.map((t) => l.calendario[t] && l.calendario[t].status).join(',')}`;
console.log(`FASE ${FASE} · catalogo ${JSON.stringify(catalogo[0])}`);
console.log('  ' + resumo(anon));
for (const l of porPersona) console.log('  ' + resumo(l));
console.log(`SM23_SONDA_${FASE.toUpperCase()}_OK · registo ${OUT}`);
