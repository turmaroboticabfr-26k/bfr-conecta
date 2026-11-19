#!/usr/bin/env node
// SM.23 peça (b)+(c) — PREFLIGHT só-leitura do par de DDL municipais, com DRY-RUN TRANSACCIONAL.
// OK que autoriza: selecção do utilizador 18/11 «DDL municipal + calendário» (evidência em
// evidence/sm23-preflight-ddl-18-11.json, campo ok_nomeado). Nada é persistido aqui: cada escrita é
// feita dentro de BEGIN … ROLLBACK e o catálogo é relido antes e depois do rollback.
//
// O que este preflight corrige na prosa anterior (registro datado, não opinião):
//   1. A fuga anónima medida às 17:04 não mostra números. Medido de novo, três vezes, GET e POST:
//      200, 1 linha, 59 B, `[{"schools":0,"students":0,"classes":0,"municipalities":0}]`. O que está
//      exposto a anon é a EXISTÊNCIA da rota e a forma do agregado; os contadores dão zero porque a
//      função é DEFINER mas filtra pelo claim de sessão, que anon não tem. Com sessão de developer a
//      mesma rota devolve 6/848/27/0. Logo o REVOKE fecha superfície e oráculo booleano, não uma
//      fuga de valores — a auditoria tem de dizer isto, não «anon lia os totais».
//   2. Um 404 meu, não do produto: a sonda de rotas pediu `HOST + '/rpc/…'` sem o prefixo `/rest/v1`
//      e devolveu «requested path is invalid» três vezes, o que parecia dizer que a rota tinha sumido.
//      Registo da corrida partida: .g-sm23-rpc-ANTERIOR-caminho-sem-rest-v1.txt.
//   3. `REVOKE … FROM anon` a solo NÃO fecha nada: o ACL das duas funções tem `=X/postgres`, que é
//      EXECUTE concedido a PUBLIC, e anon é membro de PUBLIC. O remédio tem de nomear os dois.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
const OUT = join(REPO, `evidence/sm23-preflight-view-funcoes-18-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar SM23_SUF=novo, não por cima');
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');

const VISTA = 'bfr_municipal_school_stats';
const FUNCOES = ['bfr_municipal_network_totals', 'bfr_has_municipal_grant'];
const ASSINATURAS = { bfr_municipal_network_totals: '()', bfr_has_municipal_grant: '(uuid)' };
// Fixture da régua de modos: estas cinco vistas já estão `invoker` desde o ciclo AE — se o CASE não as
// ler como invoker, a régua está cega e o resto do preflight não vale nada.
const FIXTURE_INVOKER = ['sports_public_athletes', 'sports_public_matches', 'sports_public_schools', 'sports_public_teams', 'sports_public_match_events'];
// Fixture da régua de policies: esta função aparece em 7 políticas (medido no preflight das mesas).
const FIXTURE_POLICIES = 'bfr_rls_session_role';

const alvoUrl = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
const shell = await (await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shell) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem chave publishable nos bytes servidos');
const cabAnon = { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'content-type': 'application/json', Accept: 'application/json' };

const pre18 = JSON.parse(readFileSync(join(REPO, 'evidence/sm23-preflight-ddl-18-11.json'), 'utf8'));
const sondaAntes = JSON.parse(readFileSync(join(REPO, 'evidence/sm23-sonda-com-sessao-antes-18-11.json'), 'utf8'));
const municipioReal = JSON.stringify(sondaAntes).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0] || null;

// ── 1) catálogo da vista, com a régua de modos sobre fixture ────────────────
const REGUA = `case when c.reloptions::text like '%security_invoker=true%' then 'invoker'
     when c.reloptions::text like '%security_invoker=false%' then 'definer'
       else 'sem-opcao-null' end`;
const vistas = await sql(`select c.relname as nome, ${REGUA} as modo, array_to_string(c.reloptions,',') as reloptions,
  r.rolname as dono, ro.rolbypassrls as dono_bypassrls, array_to_string(c.relacl,' | ') as acl,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_sel, has_table_privilege('authenticated', c.oid, 'SELECT') as auth_sel,
  pg_get_viewdef(c.oid, true) as def
  from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  join pg_roles r on r.oid=c.relowner join pg_roles ro on ro.oid=c.relowner
  where c.relkind='v' and (${[VISTA, ...FIXTURE_INVOKER].map((x) => `c.relname='${x}'`).join(' or ')}) order by 1`);
const alvoV = vistas.find((v) => v.nome === VISTA);
const defVista = alvoV.def;
const baseRel = await sql(`select distinct dep.refobjid::regclass::text as relacao, rel.relrowsecurity as rls,
  has_table_privilege('anon', rel.oid, 'SELECT') as anon_sel, has_table_privilege('authenticated', rel.oid, 'SELECT') as auth_sel
  from pg_depend dep join pg_rewrite rw on rw.oid=dep.objid and rw.ev_class='public.${VISTA}'::regclass
  join pg_class rel on rel.oid=dep.refobjid
  where dep.classid='pg_rewrite'::regclass and dep.refclassid='pg_class'::regclass and dep.refobjid<>'public.${VISTA}'::regclass
    and rel.relkind in ('r','p') order by 1`);

// ── 2) catálogo das duas funções + fixture negativo ─────────────────────────
const funcoes = await sql(`select p.proname as nome, pg_get_function_arguments(p.oid) as argumentos, p.prosecdef as definer,
  array_to_string(p.proacl,' | ') as acl, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec, has_function_privilege('service_role', p.oid, 'EXECUTE') as svc_exec,
  r.rolname as dono
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public' join pg_roles r on r.oid=p.proowner
  where (${[...FUNCOES, 'bfr_school_in_municipal_scope', 'bfr_is_platform_admin'].map((x) => `p.proname='${x}'`).join(' or ')})
  order by 1, 2`);
const porAlvo = FUNCOES.map((f) => funcoes.find((x) => x.nome === f));
const policiesTxt = await sql(`select pol.polname as nome, pg_get_expr(pol.polqual,pol.polrelid) as using_txt,
  coalesce(pg_get_expr(pol.polwithcheck,pol.polrelid),'') as check_txt from pg_policy pol
  join pg_class p on p.oid=pol.polrelid join pg_namespace n on n.oid=p.relnamespace and n.nspname='public'`);
const emPolicies = (nome) => policiesTxt.filter((r) => (r.using_txt || '').includes(nome) || (r.check_txt || '').includes(nome)).length;
const emViews = await sql(`select v.viewname as nome, v.definition as def from pg_views v where v.schemaname='public'`);
const emDefinicoesDeViews = (nome) => emViews.filter((v) => (v.def || '').includes(nome)).map((v) => v.nome);
const rpcNoBundle = (nome) => shell.split(".rpc('" + nome).length - 1;
const nomeNoShell = (nome) => shell.split(nome).length - 1;

// ── 3) estado ANTES, lido com sessões reais ─────────────────────────────────
const fichas = { ...JSON.parse(readFileSync(join(FORA, 'ah2-sessions.json'), 'utf8')), ...JSON.parse(readFileSync(join(FORA, 'sm8-municipal-sessions.json'), 'utf8')) };
const PERSONAS = ['developer', 'secretary', 'coordinator', 'secretario_municipal', 'gestor_autorizado', 'student'];
const tokenVivo = async (nome) => {
  const p = fichas[nome];
  if (!p || !p.access_token) throw new Error('sem ficha');
  if (Number(p.expires_at) * 1000 > Date.now() + 30_000) return p.access_token;
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ refresh_token: p.refresh_token }) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.access_token) throw new Error('refresh HTTP ' + r.status);
  return j.access_token;
};
const ler = async (chave, path, corpo) => {
  const r = await fetch(HOST + '/rest/v1' + path, { headers: chave, ...(corpo ? { method: 'POST', body: corpo } : {}) });
  const t = await r.text(); let linhas = null, code = null, valores = null;
  try { const j = JSON.parse(t); if (Array.isArray(j)) { linhas = j.length; valores = j[0] || null; } else if (typeof j === 'boolean') { valores = j; } else if (j && typeof j === 'object') { code = j.code || null; valores = j.message || null; } } catch { if (t === 'true' || t === 'false') valores = t === 'true'; else valores = t.slice(0, 80); }
  return { status: r.status, linhas, code, valores, bytes: Buffer.byteLength(t) };
};
const antes = [];
for (const nome of PERSONAS) {
  const linha = { persona: nome };
  let tk;
  try { tk = await tokenVivo(nome); } catch (e) { linha.erro = String(e.message).slice(0, 90); antes.push(linha); continue; }
  const cab = { apikey: anonKey, Authorization: `Bearer ${tk}`, 'content-type': 'application/json', Accept: 'application/json' };
  linha.vista = await ler(cab, `/${VISTA}?select=school_id,school_name&limit=30`);
  linha.rpc_totals = await ler(cab, `/rpc/${FUNCOES[0]}`, '{}');
  linha.rpc_grant = municipioReal ? await ler(cab, `/rpc/${FUNCOES[1]}`, JSON.stringify({ p_municipality: municipioReal })) : { nao_chamado: 'sem municipio no registro' };
  antes.push(linha);
}
const anonAntes = {
  vista: await ler(cabAnon, `/${VISTA}?select=school_id,school_name&limit=30`),
  rpc_totals: await ler(cabAnon, `/rpc/${FUNCOES[0]}`, '{}'),
  rpc_grant: municipioReal ? await ler(cabAnon, `/rpc/${FUNCOES[1]}`, JSON.stringify({ p_municipality: municipioReal })) : { nao_chamado: 'sem municipio' },
  fixture_rota_que_deve_funcionar: await ler(cabAnon, '/bfr_municipal_access_grants?select=id&limit=1'),
};

// ── 4) DRY-RUN dentro de BEGIN … ROLLBACK: prova que as duas peças não rebentam ─
// Tudo num só pedido de texto: `BEGIN; …; SELECT …; ROLLBACK;`. Separar em pedidos dava transacções
// órfãs em pool a segurar ACCESS EXCLUSIVE sobre a vista (o ALTER View bloqueia leituras), por isso o
// SELECT do meio e o ROLLBACK viajam juntos e o estado pós-rollback é lido num pedido NOVO.
const REVOKE_TXT = FUNCOES.map((f) => `REVOKE EXECUTE ON FUNCTION public.${f}${ASSINATURAS[f]} FROM PUBLIC, anon;`).join('\n');
const ALTER_TXT = `ALTER VIEW public.${VISTA} SET (security_invoker = true);`;
const Medida = `select ${REGUA.replace(/\s+/g, ' ')} as modo, array_to_string(c.reloptions,',') as reloptions,
  (select md5(pg_get_viewdef(c.oid,true))) as def_md5,
  (select array_to_string(p.proacl,' | ') from pg_proc p where p.proname='${FUNCOES[0]}') as acl_totals,
  (select array_to_string(p.proacl,' | ') from pg_proc p where p.proname='${FUNCOES[1]}') as acl_grant,
  has_function_privilege('anon',(select oid from pg_proc where proname='${FUNCOES[0]}'),'EXECUTE') as anon_exec_totals,
  has_function_privilege('anon',(select oid from pg_proc where proname='${FUNCOES[1]}'),'EXECUTE') as anon_exec_grant,
  has_function_privilege('authenticated',(select oid from pg_proc where proname='${FUNCOES[0]}'),'EXECUTE') as auth_exec_totals,
  has_function_privilege('postgres',(select oid from pg_proc where proname='${FUNCOES[0]}'),'EXECUTE') as dono_exec_totals
  from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public' where c.relname='${VISTA}'`;
const dry = { antes_do_dry: null, depois_do_set_no_meio_da_transaccao: null, depois_do_rollback: null, erro: null };
try {
  dry.antes_do_dry = (await sql(Medida))[0];
  const meio = await sql(`BEGIN;\nSET LOCAL statement_timeout = '20s';\nSET LOCAL lock_timeout = '5s';\n${ALTER_TXT}\n${REVOKE_TXT}\n${Medida};\nROLLBACK;`);
  dry.depois_do_set_no_meio_da_transaccao = Array.isArray(meio) && meio.length ? meio[0] : { sem_linhas: true };
  dry.depois_do_rollback = (await sql(Medida))[0];
  dry.rollback_devolveu_identico = JSON.stringify(dry.antes_do_dry) === JSON.stringify(dry.depois_do_rollback);
} catch (e) {
  dry.erro = String(e.message).slice(0, 400);
}

// ── 5) portões ──────────────────────────────────────────────────────────────
const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 300)}`); return { nome, verde: !!cond, detalhe }; };
const modoDe = (n) => (vistas.find((v) => v.nome === n) || {}).modo;
const portoes = [
  g('regua_de_modos_lee_as_cinco_fixture_como_invoker', FIXTURE_INVOKER.every((n) => modoDe(n) === 'invoker'), FIXTURE_INVOKER.map((n) => `${n}=${modoDe(n)}`)),
  g('regua_de_modos_lee_a_alvo_sem_opcao', alvoV && alvoV.modo === 'sem-opcao-null' && alvoV.reloptions === null, { modo: alvoV && alvoV.modo, reloptions: alvoV && alvoV.reloptions }),
  g('dono_da_vista_tem_bypassrls', alvoV && alvoV.dono === 'postgres' && alvoV.dono_bypassrls === true, { dono: alvoV && alvoV.dono, bypassrls: alvoV && alvoV.dono_bypassrls }),
  g('definicao_igual_a_medida_no_preflight_anterior', md5(defVista) === pre18.vista.definicao_md5 && Buffer.byteLength(defVista) === pre18.vista.definicao_bytes, { agora_md5: md5(defVista), agora_bytes: Buffer.byteLength(defVista), no_registro: [pre18.vista.definicao_md5, pre18.vista.definicao_bytes] }),
  g('a_vista_chama_os_dois_predicados_no_where', defVista.includes('bfr_school_in_municipal_scope') && defVista.includes('bfr_is_platform_admin'), { contem_scope: defVista.includes('bfr_school_in_municipal_scope'), contem_admin: defVista.includes('bfr_is_platform_admin') }),
  g('as_relacoes_base_sao_todas_rls', baseRel.length >= 3 && baseRel.every((b) => b.rls === true), baseRel),
  g('anon_nao_tem_select_em_pelo_menos_uma_tabela_base', baseRel.some((b) => b.anon_sel === false), baseRel.map((b) => `${b.relacao}:anon_sel=${b.anon_sel}`)),
  g('a_fuga_anonima_de_hoje_e_de_rot_nao_de_numeros', anonAntes.rpc_totals.status === 200 && anonAntes.rpc_totals.linhas === 1 && anonAntes.rpc_totals.valores && Number(anonAntes.rpc_totals.valores.schools) === 0 && Number(anonAntes.rpc_totals.valores.municipalities) === 0, anonAntes.rpc_totals),
  g('com_sessao_a_mesma_rota_da_numeros_reais', antes.find((x) => x.persona === 'developer')?.rpc_totals?.status === 200 && Number(antes.find((x) => x.persona === 'developer')?.rpc_totals?.valores?.schools) === pre18.baselines.schools, antes.find((x) => x.persona === 'developer')?.rpc_totals),
  g('as_duas_funcoes_tem_execute_de_anon_hoje', porAlvo.every((f) => f && f.acl.includes('=X/') && f.anon_exec === true), porAlvo.map((f) => f && `${f.nome}:${f.acl}:anon_exec=${f.anon_exec}`)),
  g('controle_negativo_scope_predicate_ja_negado_a_anon', (funcoes.find((f) => f.nome === 'bfr_school_in_municipal_scope') || {}).anon_exec === false, (funcoes.find((f) => f.nome === 'bfr_school_in_municipal_scope') || {}).anon_exec),
  g('o_privilegio_que_abre_a_rota_e_de_PUBLIC_nao_so_de_anon', FUNCOES.every((nome) => { const f = funcoes.find((x) => x.nome === nome); return f.acl.split(' | ').some((parte) => parte.startsWith('=X/')); }), FUNCOES.map((n) => `${n}:${funcoes.find((x) => x.nome === n).acl}`)),
  g('nenhuma_das_duas_em_politicas_rls', FUNCOES.every((n) => emPolicies(n) === 0), FUNCOES.map((n) => `${n}:${emPolicies(n)}`)),
  g('nenhuma_das_duas_em_definicao_de_vista', FUNCOES.every((n) => emDefinicoesDeViews(n).length === 0), FUNCOES.map((n) => `${n}:${emDefinicoesDeViews(n).join('|') || 'nenhuma'}`)),
  g('nenhuma_das_duas_chamada_pela_bundle', FUNCOES.every((n) => rpcNoBundle(n) === 0 && nomeNoShell(n) === 0), FUNCOES.map((n) => `${n}:rpc=${rpcNoBundle(n)} nome=${nomeNoShell(n)}`)),
  g('regua_de_politics_dispara_na_fixture', emPolicies(FIXTURE_POLICIES) > 0, `${FIXTURE_POLICIES} aparece em ${emPolicies(FIXTURE_POLICIES)} policies`),
  g('a_vista_alvo_nao_usada_pela_bundle_como_nome', nomeNoShell(VISTA) >= 0 && (pre18.vista.uso_no_bundle?.nome_exato_no_shell ?? null) === 0, { hoje: nomeNoShell(VISTA), no_registro: pre18.vista.uso_no_bundle?.nome_exato_no_shell }),
  g('anon_le_a_vista_e_negado_antes', anonAntes.vista.status === 401 && anonAntes.vista.code === '42501', anonAntes.vista),
  g('regua_de_rota_dispara_na_fixture_de_rota', anonAntes.fixture_rota_que_deve_funcionar.status === 200, anonAntes.fixture_rota_que_deve_funcionar),
  g('dry_run_sem_erro', dry.erro === null, dry.erro || 'ok'),
  g('dry_run_mudou_o_estado_que_se_queria_mudar', dry.depois_do_set_no_meio_da_transaccao && dry.depois_do_set_no_meio_da_transaccao.modo === 'invoker' && dry.depois_do_set_no_meio_da_transaccao.anon_exec_totals === false && dry.depois_do_set_no_meio_da_transaccao.anon_exec_grant === false, dry.depois_do_set_no_meio_da_transaccao),
  g('dry_run_manteve_a_definicao_da_vista', dry.depois_do_set_no_meio_da_transaccao && dry.depois_do_set_no_meio_da_transaccao.def_md5 === dry.antes_do_dry?.def_md5, { antes: dry.antes_do_dry?.def_md5, depois: dry.depois_do_set_no_meio_da_transaccao?.def_md5 }),
  g('dry_run_manteve_o_dono_e_o_authenticated', dry.depois_do_set_no_meio_da_transaccao && dry.depois_do_set_no_meio_da_transaccao.auth_exec_totals === true && dry.depois_do_set_no_meio_da_transaccao.dono_exec_totals === true, dry.depois_do_set_no_meio_da_transaccao && { auth: dry.depois_do_set_no_meio_da_transaccao.auth_exec_totals, dono: dry.depois_do_set_no_meio_da_transaccao.dono_exec_totals }),
  g('rollback_devolveu_o_estado_exato', dry.depois_do_rollback && dry.depois_do_rollback.modo === 'sem-opcao-null' && dry.depois_do_rollback.anon_exec_totals === true && dry.rollback_devolveu_identico === true, { igual_ao_antes: dry.rollback_devolveu_identico, depois_do_rollback: dry.depois_do_rollback }),
  g('pessoas_com_sessao_puderam_ser_lidas', antes.filter((x) => x.erro).length <= 1, antes.map((x) => `${x.persona}:${x.erro || Object.entries(x).filter(([k]) => k !== 'persona').map(([k, v]) => `${k}=${v.status}/${v.linhas ?? (v.valores === true || v.valores === false ? v.valores : 'obj')}`).join(' ')}`)),
];
const out = {
  programa: 'scripts/sm23-preflight-view-funcoes-18-11.mjs',
  em: new Date().toISOString(),
  ok_nomeado: pre18.ok_nomeado,
  pecas: { b: ALTER_TXT, c: REVOKE_TXT },
  aviso_de_redacao: 'o REVOKE nomeia PUBLIC e anon; só `FROM anon` deixava o privilégio herdado de PUBLIC no sítio',
  reversao_planeada: { vista: `ALTER VIEW public.${VISTA} RESET (security_invoker); — RESET devolve reloptions a NULL, o estado medido antes; SET false deixaria {security_invoker=false} no catálogo`, funcoes: FUNCOES.map((f) => `GRANT EXECUTE ON FUNCTION public.${f}${ASSINATURAS[f]} TO PUBLIC, anon;`) },
  vista: alvoV, outras_vistas_com_a_regua: vistas.map((v) => `${v.nome}:${v.modo}`), relacoes_base: baseRel,
  funcoes, politicas_fixture: `${FIXTURE_POLICIES}=${emPolicies(FIXTURE_POLICIES)}`,
  uso_no_bundle: Object.fromEntries(FUNCOES.map((n) => [n, { rpc: rpcNoBundle(n), nome: nomeNoShell(n) }])),
  municipio_usado_na_sonda_de_oraculo: municipioReal,
  anon_antes: anonAntes, sessoes_antes: antes,
  dry_run: dry,
  baselines: pre18.baselines,
  portoes,
};
out.veredito = falhas.length === 0 ? 'PREFLIGHT_VF_VERDE_SE_APLICAR_NADA' : `VERMELHO: ${falhas.length}`;
out.falhas = falhas;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`PREFLIGHT_VF_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const p of out.portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(JSON.stringify({ vista_modo: alvoV.modo, def_md5: md5(defVista), base: baseRel.map((b) => `${b.relacao}:anon=${b.anon_sel}`), anon_antes: { vista: anonAntes.vista.status + '/' + anonAntes.vista.code, totals: anonAntes.rpc_totals.status + '/' + JSON.stringify(anonAntes.rpc_totals.valores), grant: anonAntes.rpc_grant.status + '/' + anonAntes.rpc_grant.valores }, dry: { meio: dry.depois_do_set_no_meio_da_transaccao, rollback_identico: dry.rollback_devolveu_identico, erro: dry.erro } }, null, 1));
console.log(`PREFLIGHT_VF_OK · registo ${OUT}`);
