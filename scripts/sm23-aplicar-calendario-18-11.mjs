#!/usr/bin/env node
// SM.23 peca 3 — APLICA o DDL do calendario letivo (3 tabelas + RLS + grants + reload de cache), a peca
// (a) do OK por item do utilizador em 18/11 («DDL municipal + calendario», ferramenta de escolha). Fecha
// PEN-29, que e aberta por as tres relacoes nunca terem existido enquanto o front as seleciona.
// Portoes ANTES de abrir a escrita: preflight fresco VERDE, md5 da candidata e da reversao iguais aos que
// o preflight mediu, os nomes-alvo ainda a zero (re-medido AGORA, nao lembrado do artefacto), sintaxe da
// transaccao completa e as duas defesas de regressao do sm4 (nenhuma SETOF em expressao escalar, nenhum
// schema na cláusula de ALTER POLICY). Conferencia DEPOIS: objetos, RLS ligado E forcado, grants por papel,
// chaves primarias, indice, baselines intactas e o REST a responder — com controle negativo de um nome que
// tem de continuar a dar 404. Reversao completa em scripts/ah2-ddl-calendario-reversao.sql.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
const APL = join(REPO, 'scripts/ah2-ddl-calendario-candidata.sql');
const REV = join(REPO, 'scripts/ah2-ddl-calendario-reversao.sql');
const PRE = join(REPO, 'evidence/sm23-preflight-ddl-18-11.json');
const OUT = join(REPO, `evidence/sm23-aplicacao-calendario-18-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com SM23_SUF=novo, nao por cima');
if (!existsSync(PRE)) throw new Error('ABORTA: sem preflight ' + PRE);

const md5 = (b) => createHash('md5').update(b).digest('hex');
const ddl = readFileSync(APL, 'utf8');
const rev = readFileSync(REV, 'utf8');
const pre = JSON.parse(readFileSync(PRE, 'utf8'));

const alvoUrl = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
const shellTxt = await (await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem chave publishable nos bytes servidos');
const TABELAS = ['bfr_school_shift_settings', 'bfr_school_calendar_days', 'bfr_school_calendar_month_targets'];
const POLICIAS = ['bfr_school_shift_settings_staff_read', 'bfr_school_shift_settings_managers_write',
  'bfr_school_calendar_days_staff_read', 'bfr_school_calendar_days_managers_write',
  'bfr_school_calendar_month_targets_staff_read', 'bfr_school_calendar_month_targets_managers_write'];

// ── portões ANTES ────────────────────────────────────────────────────────────
const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 240)}`); return { nome, verde: !!cond, detalhe }; };
const censo = `select
  (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where c.relkind in ('r','p') and c.relname in ('bfr_school_shift_settings','bfr_school_calendar_days','bfr_school_calendar_month_targets')) as tabelas,
  (select count(*)::int from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where p.polname in (${POLICIAS.map((x) => `'${x}'`).join(',')})) as politicas,
  (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where c.relkind in ('r','p') and c.relname in ('bfr_school_shift_settings','bfr_school_calendar_days','bfr_school_calendar_month_targets')
       and c.relrowsecurity and c.relforcerowsecurity) as rls_ligada_e_forcada,
  (select count(*)::int from information_schema.role_table_grants g
     where g.grantee='authenticated' and g.table_schema='public'
       and g.table_name in ('bfr_school_shift_settings','bfr_school_calendar_days','bfr_school_calendar_month_targets')
       and g.privilege_type in ('SELECT','INSERT','UPDATE','DELETE')) as grants_auth,
  (select count(*)::int from information_schema.role_table_grants g
     where g.grantee='service_role' and g.table_schema='public'
       and g.table_name in ('bfr_school_shift_settings','bfr_school_calendar_days','bfr_school_calendar_month_targets')) as grants_service,
  (select count(*)::int from pg_index i join pg_class t on t.oid=i.indrelid join pg_namespace n on n.oid=t.relnamespace and n.nspname='public'
     where t.relname in ('bfr_school_shift_settings','bfr_school_calendar_days','bfr_school_calendar_month_targets') and i.indisprimary) as chaves_primarias,
  (select count(*)::int from pg_indexes where schemaname='public' and indexname='bfr_school_calendar_days_year_status_idx') as indice_novo,
  (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public' where c.relname='schools') as controle_schools,
  (select count(*)::int from information_schema.columns where table_schema='public'
     and table_name in ('bfr_school_shift_settings','bfr_school_calendar_days','bfr_school_calendar_month_targets')) as colunas`;
const agora = await sql(censo);
const portoesAntes = [
  g('preflight_verde', pre.veredito === 'PREFLIGHT_DDL_VERDE', pre.veredito),
  g('candidata_md5_igual_ao_preflight', md5(ddl), pre.candidatas_md5.calendario_aplicacao),
  g('reversao_md5_igual_ao_preflight', md5(rev), pre.candidatas_md5.calendario_reversao),
  g('nomes_alvo_ainda_a_zero_agora', [agora[0].tabelas, agora[0].politicas, agora[0].rls_ligada_e_forcada, agora[0].grants_auth, agora[0].grants_service, agora[0].chaves_primarias, agora[0].indice_novo].every((x) => x === 0) && agora[0].controle_schools === 1, agora[0]),
  g('transacao_completa', /^BEGIN;/m.test(ddl) && /^COMMIT;/m.test(ddl) && ddl.split(/^COMMIT;/m).pop().replace(/^\s*--[^\n]*(\n|$)/gm, '').trim() === '', { bytes: Buffer.byteLength(ddl) }),
  g('nenhuma_setof_em_expressao_escalar', !/=\s*ANY\s*\(\s*public\.bfr_[a-z_]+\s*\(/.test(ddl), true),
  g('alter_policy_sem_schema', !/ALTER\s+POLICY\s+public\./i.test(ddl), true),
  g('reversao_cobre_tabelas_e_politicas', TABELAS.every((t) => rev.includes('DROP TABLE IF EXISTS public.' + t)) && POLICIAS.every((p) => rev.includes('DROP POLICY IF EXISTS ' + p)), true),
];
if (falhas.length) {
  writeFileSync(OUT, JSON.stringify({ programa: 'scripts/sm23-aplicar-calendario-18-11.mjs', em: new Date().toISOString(), aplicado: false, portoes_antes: portoesAntes, falhas, veredito: 'APLICACAO_RECUSADA_PELOS_PORTOES' }, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log('SM23_CAL_RECUSADA');
  process.exit(1);
}

// ── aplicar ──────────────────────────────────────────────────────────────────
const em = new Date().toISOString();
let erroAplicacao = null;
try { await sql(ddl); } catch (e) { erroAplicacao = String(e.message).slice(0, 400); }

// ── conferência DEPOIS (inclui esperar pelo reload do cache do PostgREST) ────
const depois = await sql(censo);
const detalhe = await sql(`select c.relname as nome, c.relrowsecurity as rls, c.relforcerowsecurity as forcada,
  (select string_agg(distinct g.privilege_type, ',' order by g.privilege_type) from information_schema.role_table_grants g
     where g.table_schema='public' and g.table_name=c.relname and g.grantee='authenticated') as priv_auth,
  (select count(*)::int from information_schema.columns x where x.table_schema='public' and x.table_name=c.relname) as colunas,
  (select count(*)::int from pg_constraint k join pg_class t on t.oid=k.conrelid where k.contype='p' and t.relname=c.relname) as chaves,
  (select count(*)::int from pg_indexes ix where ix.schemaname='public' and ix.tablename=c.relname) as indices
  from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  where c.relname in (${TABELAS.map((x) => `'${x}'`).join(',')}) and c.relkind in ('r','p') order by 1`);
const baselines = await sql(`select
  (select count(*)::int from public.schools) as schools, (select count(*)::int from public.students) as students,
  (select count(*)::int from public.profiles) as profiles, (select count(*)::int from public.announcements) as announcements,
  (select count(*)::int from public.bfr_municipal_access_grants) as grants`);
// O cache do PostgREST: `NOTIFY pgrst, 'reload schema'` e assincrono. Em vez de um sleep fixo (que lê o
// cronómetro, não o estado), pergunta-se ao servidor ate o nome responder, com teto de 90 s.
const sondaRest = async () => {
  const saida = {};
  for (const t of [...TABELAS, 'bfr_school_calendar_week_targets']) {
    const r = await fetch(`${HOST}/rest/v1/${t}?select=*&limit=1`, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
    const corpo = await r.text(); let code = null; try { code = JSON.parse(corpo).code || null; } catch {}
    saida[t] = { status: r.status, code, bytes: Buffer.byteLength(corpo) };
  }
  return saida;
};
const tetoMs = 90_000; const inicio = Date.now();
let espera = 0, rest = await sondaRest();
while (Date.now() - inicio < tetoMs && TABELAS.some((t) => rest[t].status === 404)) { await new Promise((r) => setTimeout(r, 3000)); espera = Date.now() - inicio; rest = await sondaRest(); }
// Com sessão real de duas personas (staff que lê e aluno que a política exclui), porque o 401/403 de
// anon não distingue «sem grant» de «cache velho».
const s = JSON.parse(readFileSync(join(FORA, 'ah2-sessions.json'), 'utf8'));
const tokenVivo = async (nome) => {
  const p = s[nome];
  if (Number(p.expires_at) * 1000 > Date.now() + 30_000) return p.access_token;
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ refresh_token: p.refresh_token }) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.access_token) throw new Error('refresh HTTP ' + r.status);
  return j.access_token;
};
const sessaoProbe = {};
for (const nome of ['coordinator', 'student']) {
  try {
    const tk = await tokenVivo(nome);
    sessaoProbe[nome] = {};
    for (const t of TABELAS) {
      const r = await fetch(`${HOST}/rest/v1/${t}?select=*&limit=5`, { headers: { apikey: anonKey, Authorization: `Bearer ${tk}`, Accept: 'application/json' } });
      const corpo = await r.text(); let linhas = null, code = null;
      try { const j = JSON.parse(corpo); linhas = Array.isArray(j) ? j.length : null; if (!Array.isArray(j)) code = j.code || null; } catch {}
      sessaoProbe[nome][t] = { status: r.status, linhas, code };
    }
  } catch (e) { sessaoProbe[nome] = { erro: String(e.message).slice(0, 160) }; }
}

const portoesDepois = [
  g('tabelas_as_tres', depois[0].tabelas === 3, depois[0]),
  g('politicas_as_seis', depois[0].politicas === 6, depois[0]),
  g('rls_ligada_e_forcada_as_tres', depois[0].rls_ligada_e_forcada === 3, depois[0]),
  g('grants_de_authenticated_12', depois[0].grants_auth === 12, depois[0]),
  g('chaves_primarias_as_tres', depois[0].chaves_primarias === 3, depois[0]),
  g('indice_novo_existe', depois[0].indice_novo === 1, depois[0]),
  g('priv_auth_sao_quatro_por_tabela', detalhe.length === 3 && detalhe.every((x) => x.rls === true && x.forcada === true && (x.priv_auth || '').split(',').length === 4), detalhe),
  g('baselines_intactas', JSON.stringify(baselines[0]) === JSON.stringify(Object.fromEntries(Object.entries(pre.baselines).filter(([k]) => k in baselines[0]))), { depois: baselines[0], antes: pre.baselines }),
  g('os_tres_nomes_deixaram_de_ser_404', TABELAS.every((t) => rest[t].status !== 404), { rest, espera_ms: espera }),
  g('controle_negativo_continua_404', rest['bfr_school_calendar_week_targets'].status === 404, rest['bfr_school_calendar_week_targets']),
  g('staff_le_com_sessao', sessaoProbe.coordinator && TABELAS.every((t) => sessaoProbe.coordinator[t] && sessaoProbe.coordinator[t].status === 200 && sessaoProbe.coordinator[t].linhas === 0), sessaoProbe.coordinator),
  g('aluno_nao_le_com_sessao', sessaoProbe.student && TABELAS.every((t) => sessaoProbe.student[t] && (sessaoProbe.student[t].status === 200 && sessaoProbe.student[t].linhas === 0 || sessaoProbe.student[t].status === 401 || sessaoProbe.student[t].status === 403)), sessaoProbe.student),
  g('aplicacao_sem_erro', erroAplicacao === null, erroAplicacao),
];
const verdes = [...portoesAntes, ...portoesDepois].filter((p) => p.verde).length;
const veredito = falhas.length === 0 ? 'CAL_APLICADO_E_CONFERIDO' : (verdes === portoesAntes.length ? 'APLICADO_COM_CONFERENCIA_VERMELHA' : 'ERRO_INTERMEDIARIO');
const out = {
  programa: 'scripts/sm23-aplicar-calendario-18-11.mjs', em, aplicado: true,
  ok_nomeado: pre.ok_nomeado,
  candidata: 'scripts/ah2-ddl-calendario-candidata.sql', candidata_md5: md5(ddl),
  reversao: 'scripts/ah2-ddl-calendario-reversao.sql', reversao_md5: md5(rev),
  preflight_usado: PRE.replace(REPO + '/', ''),
  erro_aplicacao: erroAplicacao,
  cache_reload_espera_ms: espera,
  antes: agora[0], depois: depois[0], detalhe_por_tabela: detalhe,
  rest_anon: rest, rest_por_sessao: sessaoProbe,
  baselines_antes: pre.baselines, baselines_depois: baselines[0],
  portoes: [...portoesAntes, ...portoesDepois], falhas, veredito,
};
if (falhas.length) {
  const pv = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(pv, JSON.stringify(out, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log(`SM23_CAL_CONFERENCIA_VERMELHA · DDL aplicado, registo ${pv}`);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const p of out.portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(JSON.stringify({ antes: agora[0], depois: depois[0], rest, sessao: Object.fromEntries(Object.entries(sessaoProbe).map(([k, v]) => [k, TABELAS.map((t) => `${t.slice(-8)}=${v[t] && v[t].status}/${v[t] && v[t].linhas}`).join(' ')])), baselines: baselines[0], espera_ms: espera }, null, 1));
console.log(veredito, `| portoes ${verdes}/${out.portoes.length}`, `| registo ${OUT}`);
process.exit(falhas.length ? 1 : 0);
