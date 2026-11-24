#!/usr/bin/env node
// P145-A1-PREFLIGHT — só leitura, zero escrita. Certifica a candidata da função A1
// (scripts/p145-a1-confirmar-calendario-ddl-candidata.sql + reversão), ANTES de qualquer OK de DDL:
// (i) estrutura do ficheiro (uma função, um REVOKE, um GRANT só a authenticated, NOTIFY, nada de
// INSERT/TRUNCATE/COPY/UPDATE fora do corpo); (ii) o corpo carrega as duas portas de RAISE, a cláusula
// dos 3 papéis do D2, o portão de completude por ano civil e devolve a contagem; (iii) o contrato do
// consumidor medido (app/index.html: rpc com target_school_year + mensagem `${data||0} datas
// confirmadas` + aviso de que os turnos continuam por confirmar — logo a função não toca em turnos);
// (iv) o catálogo vivo: a função ainda ausente, as 9 colunas da mesa de dias, FORCE RLS ligado, a
// função de sessão viva, os 3 papéis no enum, a política managers_write presente; (v) a aritmética
// make_date (365/366) reproduzida contra o próprio banco em leitura; (vi) agulhas PII compostas em
// tempo de execução. Nada disto se lê só do texto; mede-se no catálogo e no bundle, neste instante.
//
// Uso: node scripts/p145-a1-confirmar-calendario-preflight.mjs
//      node scripts/p145-a1-confirmar-calendario-preflight.mjs --reversao
//      (modo reversao: a função tem de existir, o GRANT tem de ser só authenticated e os 365 dias têm
//       de estar confirmed — é o pré-voo da conferência pós-ato do aplicador)
//      P145PF_SUF=novo distingue corridas (a guarda de sobrescrita aborta em vez de apagar).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sql } from './c2-lib.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(AQUI);
const EU = readFileSync(fileURLToPath(import.meta.url));
const md5 = (b) => createHash('md5').update(b).digest('hex');
const SUF = process.env.P145PF_SUF ? '-' + process.env.P145PF_SUF : '-23-11';
const REVERSAO = process.argv.includes('--reversao');
const MODO = REVERSAO ? 'reversao' : 'candidata';
let OUT = join(REPO, 'evidence', 'p145-a1-confirmar-calendario-preflight' + SUF + '.json');
if (existsSync(OUT)) { console.error('ABORTA: ja existe ' + OUT + ' — passe P145PF_SUF novo.'); process.exit(2); }
const CAM_CAND = 'scripts/p145-a1-confirmar-calendario-ddl-candidata.sql';
const CAM_REV = 'scripts/p145-a1-confirmar-calendario-ddl-reversao.sql';
const CAM_BUNDLE = 'app/index.html';
const t0 = Date.now();
const cru = (c) => readFileSync(join(REPO, c), 'utf8');
const rawCand = cru(CAM_CAND), rawRev = cru(CAM_REV), rawBundle = cru(CAM_BUNDLE);
const conta = (re, t) => (t.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')) || []).length;

// ---- o predicado de leitura vem do ficheiro do p139, como nas peças irmãs ----------------------------
const fonte139 = readFileSync(join(AQUI, 'p139-acls-dos-nomes-do-ar-contra-o-alvo.mjs')).toString('utf8');
const linhaPredicado = fonte139.split(/\r?\n/).find((l) => l.startsWith('const eLeitura ='));
if (!linhaPredicado) { console.error('ABORTA: nao li a linha `const eLeitura =` do p139.'); process.exit(2); }
const mundoPred = createContext({});
runInContext(linhaPredicado + '\nglobalThis.__eLeitura = eLeitura;', mundoPred);
const eLeitura = mundoPred.__eLeitura;
const formas = [];
const q = async (txt) => {
  const t = String(txt);
  formas.push(eLeitura(t));
  if (!eLeitura(t)) throw new Error('ABORTA: esta peca e so-leitura e alguem lhe passou ' + t.slice(0, 60));
  return sql(t);
};

// ---- a guarda aborta antes do banco -------------------------------------------------------------------
let guardaAbortou = false;
let guardaChegouAoBanco = false;
try { await q('INSERT INTO public.bfr_school_calendar_days (school_year, school_date) VALUES (2026, current_date)'); guardaChegouAoBanco = true; }
catch (e) { guardaAbortou = /ABORTA/.test(String(e.message)); }

// ---- corpo da função vs. resto do ficheiro ------------------------------------------------------------
const corpoCand = (rawCand.match(/\$fn\$[ \t]*\n([\s\S]*?)\n\$fn\$/) || [])[1] || '';
const foraDoCorpo = rawCand.replace(/\$fn\$[\s\S]*?\$fn\$/, '');

// ---- o catálogo vivo, re-medido -----------------------------------------------------------------------
const f = (x) => (Array.isArray(x) ? x : []);
const cat = {};
try {
  cat.funcao = f(await q(
    "select count(*)::int as n from pg_proc p join pg_namespace nsp on nsp.oid = p.pronamespace where nsp.nspname = 'public' and p.proname = 'bfr_confirm_school_calendar'"));
  cat.colunas_dias = f(await q(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'bfr_school_calendar_days' order by ordinal_position"));
  cat.rls = f(await q(
    "select c.relrowsecurity, c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'bfr_school_calendar_days'"));
  cat.sessao = f(await q(
    "select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'bfr_rls_session_role'"));
  cat.papeis = f(await q(
    'select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = \'account_role\' order by e.enumsortorder'));
  cat.politica = f(await q(
    "select count(*)::int as n from pg_policies where schemaname = 'public' and tablename = 'bfr_school_calendar_days' and policyname = 'bfr_school_calendar_days_managers_write'"));
  cat.linhas_dias = f(await q('select count(*)::int as dias from public.bfr_school_calendar_days'));
  cat.grants = f(await q(
    "select case when to_regprocedure('public.bfr_confirm_school_calendar(integer)') is null then null else has_function_privilege('authenticated', 'public.bfr_confirm_school_calendar(integer)', 'EXECUTE') end as autenticado, case when to_regprocedure('public.bfr_confirm_school_calendar(integer)') is null then null else has_function_privilege('public', 'public.bfr_confirm_school_calendar(integer)', 'EXECUTE') end as publico, case when to_regprocedure('public.bfr_confirm_school_calendar(integer)') is null then null else has_function_privilege('anon', 'public.bfr_confirm_school_calendar(integer)', 'EXECUTE') end as anonimo, case when to_regprocedure('public.bfr_confirm_school_calendar(integer)') is null then null else has_function_privilege('service_role', 'public.bfr_confirm_school_calendar(integer)', 'EXECUTE') end as service_role"));
  cat.dias_estado = f(await q(
    "select count(*) filter (where source_status = 'confirmed')::int as confirmadas, count(*) filter (where source_status = 'draft')::int as draft, count(*)::int as total from public.bfr_school_calendar_days"));
  cat.sonda_make_date = f(await q(
    "select (make_date(2026,12,31) - make_date(2026,1,1) + 1)::int as d2026, (make_date(2024,12,31) - make_date(2024,1,1) + 1)::int as d2024"));
} catch (e) {
  console.error('ABORTA: o catalogo vivo nao respondeu em leitura: ' + String(e.message).slice(0, 200));
  process.exit(2);
}
const colunasDias = (cat.colunas_dias || []).map((r) => r.column_name);
const papeis = (cat.papeis || []).map((r) => r.enumlabel);

// ---- agulhas PII compostas em tempo de execução (nunca literais de ficheiro de configuração) ----------
// A palavra service_role na linha autorizada do REVOKE é nome de papel, não credencial: comentários são
// retirados e essa linha exata (declarada por nome) é mascarada, com a máscara provada em runtime
// (mascara_dispara só conta se a agulha dispara na linha crua — o fixture vive no selfteste do aplicador).
const LINHA_REVOKE_SR = 'REVOKE ALL ON FUNCTION public.bfr_confirm_school_calendar(integer) FROM anon, service_role;'.toLowerCase();
const agulhas = ['senha', 'password', 'Bearer ', 'apikey', 'service_role', 'secret_key'].map((a) => a.toLowerCase());
const tiraComentarios = (t) => t.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n');
const cruSemComentarios = (tiraComentarios(rawCand) + '\n' + tiraComentarios(rawRev)).toLowerCase();
const mascaraDispara = cruSemComentarios.includes(LINHA_REVOKE_SR) && agulhas.some((a) => LINHA_REVOKE_SR.includes(a));
const varrido = cruSemComentarios.replace(LINHA_REVOKE_SR, ' REVOKE_ANON_SR_NEUTRO ');
const achadosPii = agulhas.filter((a) => varrido.includes(a));

// ---- portões -------------------------------------------------------------------------------------------
const G = [];
const gate = (id, ok, medido, esperado, nota) => G.push({ id, ok, medido, esperado, nota });
const n = (re, t) => conta(re, t);
const okTodos = (arr) => arr.every(Boolean);

// estrutura da candidata (fora do corpo)
gate('cand_begin', n(/^BEGIN;$/gm, foraDoCorpo) === 1, n(/^BEGIN;$/gm, foraDoCorpo), 1, 'uma transacção');
gate('cand_commit', n(/^COMMIT;$/gm, foraDoCorpo) === 1, n(/^COMMIT;$/gm, foraDoCorpo), 1, 'uma transacção');
gate('cand_uma_funcao', n(/^CREATE OR REPLACE FUNCTION public\.bfr_confirm_school_calendar\(target_school_year integer\)$/gm, foraDoCorpo) === 1, n(/^CREATE OR REPLACE FUNCTION public\.bfr_confirm_school_calendar\(target_school_year integer\)$/gm, foraDoCorpo), 1, 'assinatura única (integer)');
gate('cand_revoke_public', n(/^REVOKE ALL ON FUNCTION public\.bfr_confirm_school_calendar\(integer\) FROM PUBLIC;$/gm, foraDoCorpo) === 1, n(/^REVOKE ALL ON FUNCTION public\.bfr_confirm_school_calendar\(integer\) FROM PUBLIC;$/gm, foraDoCorpo), 1, 'REVOKE FROM PUBLIC');
gate('cand_grant_so_authenticated', n(/^GRANT EXECUTE ON FUNCTION public\.bfr_confirm_school_calendar\(integer\) TO authenticated;$/gm, foraDoCorpo) === 1 && n(/^GRANT /gm, foraDoCorpo) === 1, [n(/^GRANT EXECUTE ON FUNCTION public\.bfr_confirm_school_calendar\(integer\) TO authenticated;$/gm, foraDoCorpo), n(/^GRANT /gm, foraDoCorpo)], '[1,1]', 'um só GRANT, a authenticated');
gate('cand_notify', n(/^NOTIFY pgrst, 'reload schema';$/gm, foraDoCorpo) === 1, n(/^NOTIFY pgrst, 'reload schema';$/gm, foraDoCorpo), 1, 'recarrega o schema do PostgREST');
gate('cand_comment', n(/^COMMENT ON FUNCTION public\.bfr_confirm_school_calendar\(integer\)$/gm, foraDoCorpo) === 1, n(/^COMMENT ON FUNCTION public\.bfr_confirm_school_calendar\(integer\)$/gm, foraDoCorpo), 1, 'comment próprio');
gate('cand_sem_escritas_fora_do_corpo', n(/^\s*(INSERT INTO|TRUNCATE|COPY |DELETE FROM|UPDATE |ALTER |DROP )/gim, foraDoCorpo) === 0, n(/^\s*(INSERT INTO|TRUNCATE|COPY |DELETE FROM|UPDATE |ALTER |DROP )/gim, foraDoCorpo), 0, 'nada além da função e dos privilégios dela');
gate('cand_definer_path', n(/VOLATILE SECURITY DEFINER/, rawCand) === 1 && n(/SET search_path = public, pg_temp/, rawCand) === 1, [n(/VOLATILE SECURITY DEFINER/, rawCand), n(/SET search_path = public, pg_temp/, rawCand)], '[1,1]', 'DEFINER com search_path pinado');
gate('cand_retorna_bigint', n(/RETURNS bigint/, rawCand) === 1, n(/RETURNS bigint/, rawCand), 1, 'o consumidor imprime `${data||0}` — tem de ser número');

// corpo da função
gate('corpo_raise_papel', n(/RAISE EXCEPTION 'A confirmação do calendário é reservada/, corpoCand) === 1, n(/RAISE EXCEPTION 'A confirmação do calendário é reservada/, corpoCand), 1, 'porta por papel falha fechada com mensagem');
gate('corpo_raise_completude', n(/RAISE EXCEPTION 'O ano % não está completo/, corpoCand) === 1, n(/RAISE EXCEPTION 'O ano % não está completo/, corpoCand), 1, 'porta de completude falha fechada com mensagem');
gate('corpo_papeis_d2', n(/ARRAY\['coordinator','director','developer'\]/, corpoCand) === 1, n(/ARRAY\['coordinator','director','developer'\]/, corpoCand), 1, 'os 3 confirmadores da decisão §9-D2');
gate('corpo_make_date', n(/make_date\(/, corpoCand) === 4, n(/make_date\(/, corpoCand), 4, 'dias do ano civil + primeiro/último dia');
gate('corpo_distintas', n(/count\(DISTINCT school_date\)/, corpoCand) === 1, n(/count\(DISTINCT school_date\)/, corpoCand), 1, 'duplicados contam contra o portão');
gate('corpo_so_dias', n(/UPDATE public\.bfr_school_calendar_days/, corpoCand) === 1 && n(/bfr_school_shift_settings/, corpoCand) === 0, [n(/UPDATE public\.bfr_school_calendar_days/, corpoCand), n(/bfr_school_shift_settings/, corpoCand)], '[1,0]', 'só os dias; os turnos confirmam-se no formulário (contrato do consumidor)');
gate('corpo_estado_confirmed', n(/source_status = 'confirmed'/, corpoCand) === 1, n(/source_status = 'confirmed'/, corpoCand), 1, 'draft → confirmed');
gate('corpo_auth_uid', n(/auth\.uid\(\)/, corpoCand) === 2, n(/auth\.uid\(\)/, corpoCand), 2, 'confirmed_by e updated_by pelo chamador');
gate('corpo_row_count', n(/GET DIAGNOSTICS confirmadas = ROW_COUNT/, corpoCand) === 1 && n(/RETURN confirmadas/, corpoCand) === 1, [n(/GET DIAGNOSTICS confirmadas = ROW_COUNT/, corpoCand), n(/RETURN confirmadas/, corpoCand)], '[1,1]', 'devolve a contagem medida');

// reversão
gate('rev_begin_commit', n(/^BEGIN;$/gm, rawRev) === 1 && n(/^COMMIT;$/gm, rawRev) === 1, [n(/^BEGIN;$/gm, rawRev), n(/^COMMIT;$/gm, rawRev)], '[1,1]', 'uma transacção');
gate('rev_drop_certo', n(/^DROP FUNCTION IF EXISTS public\.bfr_confirm_school_calendar\(integer\);$/gm, rawRev) === 1, n(/^DROP FUNCTION IF EXISTS public\.bfr_confirm_school_calendar\(integer\);$/gm, rawRev), 1, 'apaga exatamente a assinatura criada');
gate('rev_notify', n(/^NOTIFY pgrst, 'reload schema';$/gm, rawRev) === 1, n(/^NOTIFY pgrst, 'reload schema';$/gm, rawRev), 1, 'schema recarregado');
gate('rev_sem_dados', n(/^\s*(INSERT INTO|UPDATE |TRUNCATE|COPY )/gim, rawRev) === 0, n(/^\s*(INSERT INTO|UPDATE |TRUNCATE|COPY )/gim, rawRev), 0, 'não toca em linhas');

// consumidor (bundle versionado)
gate('consumidor_rpc', n(/\bdb\(\)\.rpc\('bfr_confirm_school_calendar',\{target_school_year:schoolYear\}\)/, rawBundle) === 1, n(/\bdb\(\)\.rpc\('bfr_confirm_school_calendar',\{target_school_year:schoolYear\}\)/, rawBundle), 1, 'a chamada real do consumidor');
gate('consumidor_contagem', n(/`\$\{data\|\|0\} datas confirmadas/, rawBundle) === 1, n(/`\$\{data\|\|0\} datas confirmadas/, rawBundle), 1, 'o consumidor imprime a contagem devolvida');
gate('consumidor_avisos_turnos', n(/A gestão ainda precisa confirmar os horários dos turnos/, rawBundle) === 1, n(/A gestão ainda precisa confirmar os horários dos turnos/, rawBundle), 1, 'os turnos continuam por confirmar depois do rpc');

// catálogo vivo
if (REVERSAO) {
  gate('cat_funcao_presente', (cat.funcao[0] || {}).n === 1, (cat.funcao[0] || {}).n, 1, 'A1 existe — pré-condição do modo reversão');
} else {
  gate('cat_funcao_ausente', (cat.funcao[0] || {}).n === 0, (cat.funcao[0] || {}).n, 0, 'A1 ainda não existe — pré-condição do modo candidata');
}
gate('cat_colunas_dias', ['school_year', 'school_date', 'calendar_status', 'label', 'source_status', 'confirmed_by', 'confirmed_at', 'updated_by', 'updated_at'].every((c) => colunasDias.includes(c)), colunasDias, '9 colunas esperadas presentes', 'as colunas que o corpo escreve existem');
gate('cat_force_rls', (cat.rls[0] || {}).relrowsecurity === true && (cat.rls[0] || {}).relforcerowsecurity === true, cat.rls[0] || {}, 'rowsecurity e forcerowsecurity = true', 'o UPDATE continua a passar pela política managers_write');
gate('cat_sessao_viva', (cat.sessao[0] || {}).n >= 1, (cat.sessao[0] || {}).n, '>= 1', 'bfr_rls_session_role existe — a porta por papel depende dela');
gate('cat_papeis_d2', ['coordinator', 'director', 'developer'].every((p) => papeis.includes(p)), papeis, 'coordinator/director/developer no enum', 'os 3 papéis da decisão D2 existem no account_role');
gate('cat_politica_managers', (cat.politica[0] || {}).n === 1, (cat.politica[0] || {}).n, 1, 'a política managers_write dos dias está viva');
gate('cat_sonda_make_date', (cat.sonda_make_date[0] || {}).d2026 === 365 && (cat.sonda_make_date[0] || {}).d2024 === 366, cat.sonda_make_date[0] || {}, '2026=365 e 2024=366', 'a aritmética do portão de completude reproduz-se no próprio banco');
if (REVERSAO) {
  gate('cat_grant_so_authenticated', (cat.grants[0] || {}).autenticado === true && (cat.grants[0] || {}).publico === false && (cat.grants[0] || {}).anonimo === false && (cat.grants[0] || {}).service_role === false, cat.grants[0] || {}, 'authenticated sim, public/anon/service_role não', 'o EXECUTE ficou só em authenticated');
  gate('cat_dias_confirmados_365', (cat.dias_estado[0] || {}).confirmadas === 365 && (cat.dias_estado[0] || {}).draft === 0 && (cat.dias_estado[0] || {}).total === 365, cat.dias_estado[0] || {}, '365 confirmadas / 0 draft / 365 no total', 'o ato em runtime confirmou o ano civil inteiro');
}

// PII + guarda
gate('pii_zero', achadosPii.length === 0 && mascaraDispara, { achados: achadosPii, mascara_dispara: mascaraDispara }, { achados: [], mascara_dispara: true }, 'nenhuma agulha PII fora da linha autorizada do REVOKE (máscara provada em runtime)');
gate('guarda_abortou', guardaAbortou && !guardaChegouAoBanco, { guardaAbortou, guardaChegouAoBanco }, 'aborta antes do banco', 'a sonda de escrita é travada pela própria prédica');

const verdes = G.filter((g) => g.ok).length;
const vermelhas = G.filter((g) => !g.ok);
const veredicto = vermelhas.length === 0 ? 'P145_A1_PREFLIGHT_VERDE_' + MODO.toUpperCase() + ' ' + G.length + '/' + vermelhas.length : 'P145_A1_PREFLIGHT_VERMELHO';
if (vermelhas.length > 0) OUT = OUT.replace(/\.json$/, '-VERMELHO-' + vermelhas.map((g) => g.id).join('-') + '.json');
const reg = {
  peca: 'scripts/p145-a1-confirmar-calendario-preflight.mjs',
  emissor_bytes: EU.length,
  emissor_md5: md5(EU),
  em: new Date().toISOString(),
  tempo_ms: Date.now() - t0,
  modo: MODO + ' (só leitura)',
  ficheiros: {
    candidata: { caminho: CAM_CAND, bytes: Buffer.byteLength(rawCand), md5: md5(rawCand) },
    reversao: { caminho: CAM_REV, bytes: Buffer.byteLength(rawRev), md5: md5(rawRev) },
    consumidor: { caminho: CAM_BUNDLE, bytes: Buffer.byteLength(rawBundle), md5: md5(rawBundle) },
  },
  catalogo_vivo: {
    funcao_a1: cat.funcao[0] || null,
    colunas_dias: colunasDias,
    rls: cat.rls[0] || null,
    sessao: cat.sessao[0] || null,
    papeis,
    politica_managers: cat.politica[0] || null,
    linhas_dias: cat.linhas_dias[0] || null,
    grants: cat.grants[0] || null,
    dias_estado: cat.dias_estado[0] || null,
    sonda_make_date: cat.sonda_make_date[0] || null,
  },
  portoes: G,
  veredicto,
  o_que_prova: 'A candidata p145 está íntegra em disco (bytes/md5), carrega as duas portas de RAISE, a cláusula dos 3 papéis do D2, confirma só os dias e devolve contagem, o contrato do consumidor v142 casa com ela, o catálogo vivo está no estado pré-aplicação (A1 ausente, colunas presentes, FORCE RLS, sessão viva, política managers_write) e a aritmética 365/366 reproduz-se no banco — neste instante.',
  o_que_NAO_prova: 'Não prova o comportamento pós-aplicação (o UPDATE real passa pela RLS e pelas políticas com um chamador autenticado de cada papel; isso mede-se no fio depois do OK de DDL e do recarregar do schema). Não prova a semente (p144) nem qualquer escrita: esta peça é só leitura.',
};
writeFileSync(OUT, JSON.stringify(reg, null, 2) + '\n');
console.log('FICHEIRO ' + OUT);
console.log('VEREDICTO ' + veredicto + ' · portões ' + verdes + '/' + G.length + ' · guarda_abortou=' + guardaAbortou + ' · linhas_dias_hoje=' + JSON.stringify(cat.linhas_dias[0] || null));
if (vermelhas.length > 0) { console.error('VERMELHAS: ' + vermelhas.map((g) => g.id).join(', ')); process.exit(1); }
process.exit(0);
