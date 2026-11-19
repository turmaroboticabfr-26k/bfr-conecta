#!/usr/bin/env node
// SM.23 peças (b)+(c) — APLICAÇÃO com portões, numa só transacção, + conferência depois.
// OK que autoriza: selecção do utilizador 18/11 «DDL municipal + calendário», peças (b) e (c), lidas do
// próprio preflight (campo ok_nomeado). Nada aqui é rememorado: os limiares vêm de
// evidence/sm23-preflight-view-funcoes-18-11.json.
// Modelos seguidos: scripts/ae4-vistas-aplicar.mjs (censo antes/depois com a régua de modos, definição
// byte-a-byte) e scripts/sm4-aplicar-ddl-municipal-18-11.mjs (portões antes, guard de não-sobreposição,
// corrida vermelha preservada, nada enviado ao canal se um portão estiver vermelho).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const APL = join(REPO, 'scripts/sm23-ddl-view-funcoes-candidata.sql');
const REV = join(REPO, 'scripts/sm23-ddl-view-funcoes-reversao.sql');
const PRE = join(REPO, 'evidence/sm23-preflight-view-funcoes-18-11.json');
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
const OUT = join(REPO, `evidence/sm23-aplicacao-view-funcoes-18-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar SM23_SUF=novo, não por cima');
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');
const md5f = (f) => md5(readFileSync(f, 'utf8'));

const VISTA = 'bfr_municipal_school_stats';
const FUNCOES = ['bfr_municipal_network_totals', 'bfr_has_municipal_grant'];
const TETO_ESPERA_MS = 90_000;

const pre = JSON.parse(readFileSync(PRE, 'utf8'));
const ddl = readFileSync(APL, 'utf8');
const rev = readFileSync(REV, 'utf8');
const alvoUrl = pre.url_servida || (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
const shell = await (await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shell) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem chave publishable nos bytes servidos');

const REGUA = `case when c.reloptions::text like '%security_invoker=true%' then 'invoker'
     when c.reloptions::text like '%security_invoker=false%' then 'definer'
       else 'sem-opcao-null' end`;
const Medida = `select ${REGUA.replace(/\s+/g, ' ')} as modo, array_to_string(c.reloptions,',') as reloptions,
  (select md5(pg_get_viewdef(c.oid,true))) as def_md5, array_to_string(c.relacl,' | ') as acl_vista,
  (select array_to_string(p.proacl,' | ') from pg_proc p where p.proname='${FUNCOES[0]}') as acl_totals,
  (select array_to_string(p.proacl,' | ') from pg_proc p where p.proname='${FUNCOES[1]}') as acl_grant,
  has_function_privilege('anon',(select oid from pg_proc where proname='${FUNCOES[0]}'),'EXECUTE') as anon_exec_totals,
  has_function_privilege('anon',(select oid from pg_proc where proname='${FUNCOES[1]}'),'EXECUTE') as anon_exec_grant,
  has_function_privilege('authenticated',(select oid from pg_proc where proname='${FUNCOES[0]}'),'EXECUTE') as auth_exec_totals,
  has_function_privilege('authenticated',(select oid from pg_proc where proname='${FUNCOES[1]}'),'EXECUTE') as auth_exec_grant,
  has_function_privilege('service_role',(select oid from pg_proc where proname='${FUNCOES[0]}'),'EXECUTE') as svc_exec_totals
  from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public' where c.relname='${VISTA}'`;
const baselines = async () => (await sql(`select
  (select count(*)::int from public.schools) as schools, (select count(*)::int from public.students) as students,
  (select count(*)::int from public.profiles) as profiles, (select count(*)::int from public.announcements) as announcements,
  (select count(*)::int from public.bfr_municipal_access_grants) as grants, (select count(*)::int from public.supervision_requests) as supervision_requests`))[0];

const fichas = { ...JSON.parse(readFileSync(join(FORA, 'ah2-sessions.json'), 'utf8')), ...JSON.parse(readFileSync(join(FORA, 'sm8-municipal-sessions.json'), 'utf8')) };
const PERSONAS = pre.sessoes_antes.map((x) => x.persona);
const municipio = pre.municipio_usado_na_sonda_de_oraculo;
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
  const t = await r.text(); let linhas = null, code = null, valores = null, mensagem = null;
  try {
    const j = JSON.parse(t);
    if (Array.isArray(j)) { linhas = j.length; valores = j[0] || (j.length === 0 ? [] : null); }
    else if (typeof j === 'boolean') valores = j;
    else if (j && typeof j === 'object') { code = j.code || null; mensagem = j.message || j.error || null; }
  } catch { if (t === 'true' || t === 'false') valores = t === 'true'; else mensagem = t.slice(0, 120); }
  return { status: r.status, linhas, code, valores, mensagem, bytes: Buffer.byteLength(t) };
};
const cabAnon = { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'content-type': 'application/json', Accept: 'application/json' };
const passarSessoes = async () => {
  const saida = [];
  for (const nome of PERSONAS) {
    const linha = { persona: nome };
    let tk;
    try { tk = await tokenVivo(nome); } catch (e) { linha.erro = String(e.message).slice(0, 90); saida.push(linha); continue; }
    const cab = { apikey: anonKey, Authorization: `Bearer ${tk}`, 'content-type': 'application/json', Accept: 'application/json' };
    linha.vista = await ler(cab, `/${VISTA}?select=school_id,school_name&limit=30`);
    linha.rpc_totals = await ler(cab, `/rpc/${FUNCOES[0]}`, '{}');
    linha.rpc_grant = municipio ? await ler(cab, `/rpc/${FUNCOES[1]}`, JSON.stringify({ p_municipality: municipio })) : { nao_chamado: 'sem municipio no registro' };
    saida.push(linha);
  }
  return saida;
};

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 300)}`); return { nome, verde: !!cond, detalhe }; };

// ── portões ANTES de abrir a escrita ────────────────────────────────────────
const antes = [
  g('preflight_existe_e_verde', pre.veredito === 'PREFLIGHT_VF_VERDE_SE_APLICAR_NADA', pre.veredito),
  g('portoes_do_preflight_todos_verdes', (pre.portoes || []).filter((p) => !p.verde).length === 0, (pre.portoes || []).filter((p) => !p.verde).map((p) => p.nome)),
  g('candidata_contem_a_peça_b_dry_runada', ddl.includes(pre.pecas.b), { no_preflight: pre.pecas.b, no_ficheiro: /ALTER VIEW[^\n]*/.exec(ddl)?.[0] }),
  g('candidata_contem_as_pecas_c_dry_runadas', pre.pecas.c.split('\n').every((linha) => ddl.includes(linha)), { esperadas: pre.pecas.c.split('\n'), no_ficheiro: ddl.split('\n').filter((l) => l.startsWith('REVOKE')) }),
  g('sem_cascade', /cascade/i.test(ddl), false),
  g('reversao_repoe_o_estado_medido', rev.includes('ALTER VIEW public.bfr_municipal_school_stats RESET (security_invoker);') && pre.reversao_planeada.funcoes.every((fr) => rev.includes(fr)), { reversao: rev.split('\n').filter((l) => /^(ALTER|GRANT)/.test(l)), planeado: pre.reversao_planeada }),
  g('transacao_completa', /^BEGIN;/m.test(ddl) && /^COMMIT;/m.test(ddl), true),
];
const depoisDeCommit = ddl.split(/^COMMIT;/m).pop().replace(/^\s*--[^\n]*(\n|$)/gm, '').replace(/^\s+$/gm, '').trim();
antes.push(g('nada_executavel_apos_commit', depoisDeCommit === '', { cauda: depoisDeCommit.slice(0, 200) }));
// estado lido AGORA, imediatamente antes de escrever (é também o guard de «não é a segunda aplicação»)
const catAntes = (await sql(Medida))[0];
antes.push(
  g('estado_ainda_o_mesmo_do_preflight', catAntes.modo === 'sem-opcao-null' && catAntes.anon_exec_totals === true && catAntes.anon_exec_grant === true, catAntes),
  g('definicao_ainda_a_mesma_do_preflight', catAntes.def_md5 === md5(pre.vista.def), { agora: catAntes.def_md5, no_preflight: md5(pre.vista.def), bytes_no_preflight: Buffer.byteLength(pre.vista.def) }),
  g('rota_anonima_ainda_aberta_antes', pre.anon_antes.rpc_totals.status === 200 && pre.anon_antes.rpc_grant.status === 200, { totals: pre.anon_antes.rpc_totals.status, grant: pre.anon_antes.rpc_grant.status }),
);
if (falhas.length) {
  writeFileSync(OUT.replace(/\.json$/, '-RECUSADA.json'), JSON.stringify({ programa: 'scripts/sm23-aplicar-view-funcoes-18-11.mjs', em: new Date().toISOString(), aplicado: false, portoes_antes: falhas, veredito: 'APLICACAO_RECUSADA_PELOS_PORTOES' }, null, 2) + '\n');
  console.log('RECUSADA — nada enviado ao canal:');
  for (const f of falhas) console.log('  VERMELHO ' + f);
  process.exit(1);
}

// ── aplicar (uma transacção) ────────────────────────────────────────────────
const em = new Date().toISOString();
let erro_aplicacao = null;
try { await sql(ddl); } catch (e) { erro_aplicacao = String(e.message).slice(0, 400); }

// ── espera activa pelo reload do cache (não dormir: perguntar ao servidor) ──
const t0 = Date.now(); let cache = null, esperas = 0;
while (Date.now() - t0 < TETO_ESPERA_MS) {
  cache = await ler(cabAnon, `/rpc/${FUNCOES[0]}`, '{}');
  esperas++;
  if (cache.code === '42501' || cache.status === 403 || cache.status === 401) break;
  await new Promise((s) => setTimeout(s, 2000));
}
const espera_ms = Date.now() - t0;

// ── conferência DEPOIS ──────────────────────────────────────────────────────
const catDepois = (await sql(Medida))[0];
const anonDepois = {
  rpc_totals: cache,
  rpc_grant: await ler(cabAnon, `/rpc/${FUNCOES[1]}`, JSON.stringify({ p_municipality: municipio })),
  vista: await ler(cabAnon, `/${VISTA}?select=school_id,school_name&limit=30`),
  fixture_rota_inocua: await ler(cabAnon, '/bfr_municipal_access_grants?select=id&limit=1'),
};
const sessoesDepois = await passarSessoes();
const linhasAntes = Object.fromEntries(pre.sessoes_antes.map((x) => [x.persona, x.vista?.linhas ?? null]));
const linhasDepois = Object.fromEntries(sessoesDepois.map((x) => [x.persona, x.vista?.linhas ?? null]));
const alargou = PERSONAS.filter((p) => (linhasDepois[p] ?? -1) > (linhasAntes[p] ?? -1));
const devAntes = pre.sessoes_antes.find((x) => x.persona === 'developer');
const devDepois = sessoesDepois.find((x) => x.persona === 'developer');
const baseAntes = await baselines();

const depois = [
  g('erro_de_aplicacao_nulo', erro_aplicacao === null, erro_aplicacao),
  g('vista_agora_invoker', catDepois.modo === 'invoker' && catDepois.reloptions === 'security_invoker=true', { modo: catDepois.modo, reloptions: catDepois.reloptions }),
  g('definicao_byte_a_byte_inalterada', catDepois.def_md5 === catAntes.def_md5, { antes: catAntes.def_md5, depois: catDepois.def_md5 }),
  g('acl_da_vista_inalterado', catDepois.acl_vista === catAntes.acl_vista, { antes: catAntes.acl_vista, depois: catDepois.acl_vista }),
  g('anon_perdeu_o_execute_das_duas', catDepois.anon_exec_totals === false && catDepois.anon_exec_grant === false, { totals: catDepois.anon_exec_totals, grant: catDepois.anon_exec_grant }),
  g('nenhum_acl_tem_beneficiario_publico', !catDepois.acl_totals.split(' | ').some((p) => p.startsWith('=X/')) && !catDepois.acl_grant.split(' | ').some((p) => p.startsWith('=X/')), { totals: catDepois.acl_totals, grant: catDepois.acl_grant }),
  g('authenticated_e_service_role_conservam_o_execute', catDepois.auth_exec_totals === true && catDepois.auth_exec_grant === true && catDepois.svc_exec_totals === true, { auth_totals: catDepois.auth_exec_totals, auth_grant: catDepois.auth_exec_grant, svc_totals: catDepois.svc_exec_totals }),
  g('oraculo_anonimo_de_grants_agora_negado', anonDepois.rpc_grant.code === '42501' || anonDepois.rpc_grant.status === 403 || anonDepois.rpc_grant.status === 401, anonDepois.rpc_grant),
  g('totals_anonimos_agora_negados', anonDepois.rpc_totals.code === '42501' || anonDepois.rpc_totals.status === 403 || anonDepois.rpc_totals.status === 401, anonDepois.rpc_totals),
  g('cache_recarregou_dentro_do_teto', anonDepois.rpc_totals.status !== 200 && espera_ms < TETO_ESPERA_MS, { espera_ms, tentativas: esperas, status: anonDepois.rpc_totals.status }),
  g('anon_continua_sem_ler_a_vista', anonDepois.vista.status >= 400, anonDepois.vista),
  g('superficie_anonima_inocua_continua_a_funcionar', anonDepois.fixture_rota_inocua.status === 200, anonDepois.fixture_rota_inocua),
  g('nenhuma_sessao_passou_a_ver_mais_linhas', alargou.length === 0, { alargou, linhasAntes, linhasDepois }),
  g('developer_continua_a_poder_chamar_as_funcoes', devDepois?.rpc_totals?.status === 200 && devDepois?.rpc_grant?.status === 200, { antes: devAntes && { totals: devAntes.rpc_totals.status, grant: devAntes.rpc_grant.status }, depois: devDepois && { totals: devDepois.rpc_totals.status, grant: devDepois.rpc_grant.status, mensagem: devDepois.rpc_totals.mensagem } }),
  g('pessoas_sem_sessao_puderam_ser_relidas', sessoesDepois.filter((x) => x.erro).length === 0, sessoesDepois.filter((x) => x.erro).map((x) => `${x.persona}:${x.erro}`)),
  g('baselines_nao_mexeram', JSON.stringify(baseAntes) === JSON.stringify(pre.baselines), { agora: baseAntes, preflight: pre.baselines }),
];
const todas = antes.concat(depois);
const veredito = falhas.length === 0 ? 'VF_APLICADO_E_CONFERIDO' : `VERMELHO: ${falhas.length}`;
const out = {
  programa: 'scripts/sm23-aplicar-view-funcoes-18-11.mjs',
  em,
  ok_nomeado: pre.ok_nomeado,
  candidata: 'scripts/sm23-ddl-view-funcoes-candidata.sql', candidata_md5: md5f(APL),
  reversao: 'scripts/sm23-ddl-view-funcoes-reversao.sql', reversao_md5: md5f(REV),
  preflight_usado: PRE.replace(REPO + '/', ''),
  preflight_md5: md5f(PRE),
  applied_statements: ddl.split('\n').filter((l) => /^(ALTER|REVOKE|NOTIFY|BEGIN|COMMIT)/.test(l)),
  espera_do_cache_ms: espera_ms, tentativas_de_espera: esperas,
  leitura_do_registro: { oraculo_anonimo_antes: pre.anon_antes.rpc_grant, totals_anonimos_antes: pre.anon_antes.rpc_totals, vista_developer_antes: devAntes?.vista },
  catalogo_antes: catAntes, catalogo_depois: catDepois,
  anon_depois: anonDepois, sessoes_depois: sessoesDepois,
  diff_linhas_da_vista: { antes: linhasAntes, depois: linhasDepois, alargou, estreitou: PERSONAS.filter((p) => (linhasDepois[p] ?? 0) < (linhasAntes[p] ?? 0)) },
  baselines_agora: baseAntes,
  portoes: todas,
  veredito,
  falhas,
};
if (falhas.length) {
  const p = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
  console.log('APLICADO COM CONFERÊNCIA VERMELHA — registo preservado em', p);
  for (const f of falhas) console.log('  VERMELHO ' + f);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const q of out.portoes) console.log(`  portao ${q.nome}: ${q.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(JSON.stringify({ espera_ms, catalogo_depois: { modo: catDepois.modo, anon_exec_totals: catDepois.anon_exec_totals, auth_exec_totals: catDepois.auth_exec_totals, acl_totals: catDepois.acl_totals }, anon_depois: { totals: anonDepois.rpc_totals.status + '/' + anonDepois.rpc_totals.code, grant: anonDepois.rpc_grant.status + '/' + anonDepois.rpc_grant.code, vista: anonDepois.vista.status + '/' + anonDepois.vista.mensagem }, diff: out.diff_linhas_da_vista, developer_depois: { rpc_totals: devDepois?.rpc_totals.status, valores: devDepois?.rpc_totals.valores, rpc_grant: devDepois?.rpc_grant.status, vista: devDepois?.vista.status + '/' + devDepois?.vista.linhas } }, null, 1));
console.log(`VF_OK · registo ${OUT}`);
