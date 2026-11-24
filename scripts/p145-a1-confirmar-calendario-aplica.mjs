#!/usr/bin/env node
// P145-A1-APLICA — aplicador do A1 (bfr_confirm_school_calendar). Padrão do p144: frase literal por modo,
// --selfteste offline, varredura de perigos por família DDL (comentários e corpos $fn$ neutralizados),
// pré-voo fresco do p145 antes E depois (candidata antes, reversao depois), pegadas conferidas contra as
// fichas do pré-voo, baselines das mesas de produto, ato em runtime com o mecanismo de sessão DECLARADO no
// registo, e veredicto. Nenhuma porta é alargada por esta peça; a recusa aborta antes do banco.
//
// Uso:
//   node scripts/p145-a1-confirmar-calendario-aplica.mjs --selfteste
//   node scripts/p145-a1-confirmar-calendario-aplica.mjs --ok "aplique o A1 no banco"
//   node scripts/p145-a1-confirmar-calendario-aplica.mjs --reaplica --ok "aplique o A1 no banco"
//     (re-aplica a candidata corrigida sobre estado já aplicado: pré-voo antes = modo reversao, aceitando
//      EXATAMENTE o vermelho cat_grant_so_authenticated que esta corrida vem corrigir; depois exige 37/0)
//   node scripts/p145-a1-confirmar-calendario-aplica.mjs --reverter --ok "reverta o A1 no banco"
//   P145_A1_SUF=novo distingue corridas (a guarda de sobrescrita aborta). --regista-recusa escreve o
//   registo da recusa pré-banco.
//
// O OK desta corrida (24/11) veio da escolha «Construir + aplicar o A1» (pergunta única de escopo), cujo
// texto autoriza: construir o aplicador, pré-voo, DDL e conferência, criando a função e confirmando os 365
// dias semeados. A reversão continua SEM OK (frase própria, não usada).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql, admin } from './c2-lib.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(AQUI);
const EU = readFileSync(fileURLToPath(import.meta.url));
const md5 = (b) => createHash('md5').update(b).digest('hex');
const PREF = 'scripts/p145-a1-confirmar-calendario-preflight.mjs';
const CAM_CAND = 'scripts/p145-a1-confirmar-calendario-ddl-candidata.sql';
const CAM_REV = 'scripts/p145-a1-confirmar-calendario-ddl-reversao.sql';
const FRASE = 'aplique o A1 no banco';
const FRASE_REV = 'reverta o A1 no banco';
const MESAS_DE_BASELINE = ['schools', 'students', 'classes', 'profiles', 'staff_schools'];
const RE_CREATE_A1 = /^\s*CREATE OR REPLACE FUNCTION public\.bfr_confirm_school_calendar\(target_school_year integer\)$/gm;
const RE_DROP_A1 = /^\s*DROP FUNCTION IF EXISTS public\.bfr_confirm_school_calendar\(integer\);$/gm;
const RE_REVOKE_PUBLIC = /^\s*REVOKE ALL ON FUNCTION public\.bfr_confirm_school_calendar\(integer\) FROM PUBLIC;$/gm;
const RE_REVOKE_ANON_SR = /^\s*REVOKE ALL ON FUNCTION public\.bfr_confirm_school_calendar\(integer\) FROM anon, service_role;$/gm;

const argv = process.argv.slice(2);
const tem = (f) => argv.some((a) => a === f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const REVERTER = tem('--reverter');
const REAPLICA = tem('--reaplica');
const MODO = REVERTER ? 'reversao' : (REAPLICA ? 'reaplicacao' : 'aplicacao');
const SELFTESTE = tem('--selfteste');
const OK = val('--ok');
const SUF = process.env.P145_A1_SUF ? '-' + process.env.P145_A1_SUF : '-24-11';
let OUT = join(REPO, 'evidence', 'p145-a1-confirmar-calendario-aplica' + SUF + '.json');

// ---- varredura de perigos por família (comentários fora, corpos de função neutralizados) --------------
const LINHA_REVOKE_ANON_SR = 'REVOKE ALL ON FUNCTION public.bfr_confirm_school_calendar(integer) FROM anon, service_role;';
const so_codigo = (t) => t
  .split('\n')
  .map((l) => (l.trim().startsWith('--') ? '' : l))
  .join('\n')
  .replace(/\$[A-Za-z0-9_]*\$[\s\S]*?\$[A-Za-z0-9_]*\$/g, ' CORPO_DE_FUNCAO ');
const RE_CREDENCIAL = /eyJ[\w-]{12,}|postgres:[^\s'"]{6,}|service_role|sk_live|Bearer\s+eyJ/gi;
const perigos = (t) => {
  const fora = so_codigo(t);
  const c = (re) => (fora.match(re) || []).length;
  return {
    drop_table: c(/^\s*DROP\s+TABLE/gim),
    drop_function: c(/^\s*DROP\s+FUNCTION/gim),
    drop_schema_database: c(/^\s*DROP\s+(DATABASE|SCHEMA)/gim),
    truncate: c(/^\s*TRUNCATE/gim),
    insert_into: c(/^\s*INSERT\s+INTO/gim),
    delete_from: c(/^\s*DELETE\s+FROM/gim),
    update_fora_de_funcao: c(/^\s*UPDATE\s+/gim),
    alter: c(/^\s*ALTER\s+/gim),
    create_function: c(/^\s*CREATE/gim),
    grant: c(/^\s*GRANT\s+/gim),
    revoke: c(/^\s*REVOKE\s+/gim),
    comment: c(/^\s*COMMENT\s+/gim),
    // a palavra service_role na linha autorizada do REVOKE é nome de papel, não credencial —
    // máscara SÓ dessa linha (declarada por nome), provada por fixture no selfteste
    credencial: (fora.replace(LINHA_REVOKE_ANON_SR, ' REVOKE_ANON_SR_NEUTRO ').match(RE_CREDENCIAL) || []).length,
    begin: c(/^BEGIN;$/gm),
    commit: c(/^COMMIT;$/gm),
    notify: c(/^NOTIFY pgrst, 'reload schema';$/gm),
    create_a1_exata: c(RE_CREATE_A1),
    drop_a1_exato: c(RE_DROP_A1),
    revoke_public: c(RE_REVOKE_PUBLIC),
    revoke_anon_sr: c(RE_REVOKE_ANON_SR),
  };
};
const ZERO_COMUM = ['drop_table', 'drop_schema_database', 'truncate', 'insert_into', 'delete_from', 'update_fora_de_funcao', 'alter', 'credencial'];
const ZERO_CANDIDATA = [...ZERO_COMUM, 'drop_function'];
const ZERO_REVERSAO = [...ZERO_COMUM, 'create_function', 'grant', 'revoke', 'comment'];

const estrutura = (p, modo) => {
  const g = [];
  g.push({ id: 'begin_commit', ok: p.begin === 1 && p.commit === 1, medido: [p.begin, p.commit], esperado: '[1,1]' });
  if (modo !== 'reversao') {
    g.push({ id: 'create_a1_unica', ok: p.create_function === 1 && p.create_a1_exata === 1, medido: [p.create_function, p.create_a1_exata], esperado: '[1,1]' });
    g.push({ id: 'grant_revoke_notify', ok: p.grant === 1 && p.revoke === 2 && p.revoke_public === 1 && p.revoke_anon_sr === 1 && p.notify === 1, medido: [p.grant, p.revoke, p.revoke_public, p.revoke_anon_sr, p.notify], esperado: '[1,2,1,1,1]' });
  } else {
    g.push({ id: 'drop_a1_unico', ok: p.drop_function === 1 && p.drop_a1_exato === 1, medido: [p.drop_function, p.drop_a1_exato], esperado: '[1,1]' });
    g.push({ id: 'notify_unico', ok: p.notify === 1, medido: p.notify, esperado: 1 });
  }
  return g;
};

// ---- validação do registo do pré-voo (veredicto + campos do modo) --------------------------------------
const preflightVerde = (j, modo) => {
  if (!j || !Array.isArray(j.portoes)) return false;
  const re = new RegExp('^P145_A1_PREFLIGHT_VERDE_' + modo.toUpperCase() + ' \\d+/0\\b');
  if (!re.test(String(j.veredicto || ''))) return false;
  const cat = j.catalogo_vivo || {};
  if (modo === 'candidata') return (cat.funcao_a1 || {}).n === 0;
  return (cat.funcao_a1 || {}).n === 1
    && (cat.dias_estado || {}).confirmadas === 365
    && (cat.grants || {}).autenticado === true
    && (cat.grants || {}).publico === false
    && (cat.grants || {}).anonimo === false
    && (cat.grants || {}).service_role === false;
};

const correPreflight = (modo, suf) => {
  const args = [join(REPO, PREF)];
  if (modo === 'reversao') args.push('--reversao');
  const r = spawnSync(process.execPath, args, {
    cwd: REPO,
    env: { ...process.env, P145PF_SUF: suf },
    encoding: 'utf8',
    timeout: 300000,
  });
  if (r.error) throw new Error('spawn do preflight: ' + r.error.message);
  const m = (r.stdout || '').match(/FICHEIRO (\S+\.json)/);
  if (r.status === 2 || !m) throw new Error('preflight abortou: ' + String(r.stderr || r.stdout || '').slice(0, 300));
  let j;
  try { j = JSON.parse(readFileSync(m[1], 'utf8')); } catch (e) { throw new Error('nao li o registo do preflight: ' + e.message); }
  return { ficha: m[1], j, exit: r.status };
};

const pegada = (caminho) => {
  const b = readFileSync(join(REPO, caminho));
  return { caminho, bytes: b.length, md5: md5(b) };
};

const f = (x) => (Array.isArray(x) ? x : []);

// pré-voo antes do modo reaplicacao: reversao, aceitando EXATAMENTE o vermelho do portão de grants que
// esta corrida vem corrigir (qualquer outro vermelho aborta — o mundo mudou e não é este o conserto)
const aceitaPreReaplica = (j) => {
  const reds = ((j && j.portoes) || []).filter((g) => !g.ok).map((g) => g.id);
  return reds.every((id) => id === 'cat_grant_so_authenticated');
};

// ---- selfteste offline ---------------------------------------------------------------------------------
const selfteste = () => {
  const T = [];
  const teste = (id, ok, nota) => { T.push({ id, ok, nota }); if (!ok) console.error('SELFTESTE VERMELHO ' + id + ': ' + nota); };
  teste('frases_disjuntas', FRASE !== FRASE_REV, FRASE + ' vs ' + FRASE_REV);
  const cand = readFileSync(join(REPO, CAM_CAND), 'utf8');
  const rev = readFileSync(join(REPO, CAM_REV), 'utf8');
  const pc = perigos(cand), pr = perigos(rev);
  for (const z of ZERO_CANDIDATA) teste('zero_candidata_' + z, pc[z] === 0, z + '=' + pc[z]);
  for (const z of ZERO_REVERSAO) teste('zero_reversao_' + z, pr[z] === 0, z + '=' + pr[z]);
  const ec = estrutura(pc, 'aplicacao');
  teste('estrutura_candidata', ec.every((g) => g.ok), JSON.stringify(ec));
  const er = estrutura(pr, 'reversao');
  teste('estrutura_reversao', er.every((g) => g.ok), JSON.stringify(er));
  const candSemCorpos = cand.replace(/\$fn\$[\s\S]*?\$fn\$/g, ' CORPO ');
  teste('update_so_no_corpo', /^\s*UPDATE\s+/gim.test(candSemCorpos) === false && /UPDATE\s+public\.bfr_school_calendar_days/.test(cand), 'o UPDATE da candidata vive dentro do corpo $fn$');
  teste('comentario_nao_conta', perigos('-- apagar DELETE FROM tudo\nSELECT 1;').delete_from === 0, 'DELETE FROM citado em comentário não é varrido');
  teste('credencial_fora_conta', perigos("select 'service_role';").credencial === 1, 'service_role fora de comentário conta');
  teste('credencial_comentada_nao_conta', perigos('-- senha: service_role\nSELECT 1;').credencial === 0, 'credencial em comentário não conta');
  teste('revoke_autorizado_nao_e_credencial', perigos(LINHA_REVOKE_ANON_SR).credencial === 0 && perigos(LINHA_REVOKE_ANON_SR).revoke_anon_sr === 1, 'a linha autorizada do REVOKE não é credencial e continua contada como estrutura');
  const mundoCand = { veredicto: 'P145_A1_PREFLIGHT_VERDE_CANDIDATA 35/0', portoes: [], catalogo_vivo: { funcao_a1: { n: 0 } } };
  const mundoRev = { veredicto: 'P145_A1_PREFLIGHT_VERDE_REVERSAO 37/0', portoes: [], catalogo_vivo: { funcao_a1: { n: 1 }, dias_estado: { confirmadas: 365 }, grants: { autenticado: true, publico: false, anonimo: false, service_role: false } } };
  teste('preflightVerde_candidata', preflightVerde(mundoCand, 'candidata') === true, 'mundo candidata verde');
  teste('preflightVerde_reversao', preflightVerde(mundoRev, 'reversao') === true, 'mundo reversao verde');
  teste('preflightVerde_candidata_vermelha', preflightVerde({ ...mundoCand, veredicto: 'P145_A1_PREFLIGHT_VERDE_CANDIDATA 34/1' }, 'candidata') === false, 'veredicto vermelho não passa');
  teste('preflightVerde_reversao_364', preflightVerde({ ...mundoRev, catalogo_vivo: { ...mundoRev.catalogo_vivo, dias_estado: { confirmadas: 364 } } }, 'reversao') === false, '364 confirmadas não passa o modo reversao');
  const portao = (id, ok) => ({ id, ok });
  teste('preReaplica_so_o_grants', aceitaPreReaplica({ portoes: [portao('cat_funcao_presente', true), portao('cat_grant_so_authenticated', false), portao('cat_dias_confirmados_365', true)] }) === true, 'só o vermelho de grants é aceite');
  teste('preReaplica_verde_aceite', aceitaPreReaplica({ portoes: [portao('cat_funcao_presente', true), portao('cat_grant_so_authenticated', true)] }) === true, 'tudo verde também passa');
  teste('preReaplica_outro_vermelho_recusado', aceitaPreReaplica({ portoes: [portao('cat_funcao_presente', false)] }) === false, 'vermelho que não é grants aborta');
  const p = pegada(CAM_CAND);
  teste('pegada_confere', p.bytes === Buffer.byteLength(cand) && p.md5 === md5(cand), 'pegada do disco bate');
  const vermelhas = T.filter((t) => !t.ok);
  console.log('SELFTESTE ' + T.length + '/' + vermelhas.length + (vermelhas.length ? ' VERMELHO' : ' VERDE'));
  return vermelhas.length === 0;
};
if (SELFTESTE) { process.exit(selfteste() ? 0 : 1); }

// ---- recusa --------------------------------------------------------------------------------------------
const fraseDoModo = () => (REVERTER ? FRASE_REV : FRASE);
const recusa = (motivo) => {
  const frase = fraseDoModo();
  console.error('ABORTA: ' + motivo + (OK === undefined ? ' (sem --ok)' : OK === frase ? '' : ' (--ok nao bate com a frase do modo)'));
  if (tem('--regista-recusa')) {
    OUT = OUT.replace(/\.json$/, '-recusa-' + Date.now() + '.json');
    writeFileSync(OUT, JSON.stringify({ peca: 'scripts/p145-a1-confirmar-calendario-aplica.mjs', em: new Date().toISOString(), modo: MODO, motivo, ok_usado: OK, frase_do_modo: frase, escreveu_banco: false }, null, 2) + '\n');
    console.error('FICHEIRO ' + OUT);
  }
  process.exit(2);
};
if (MODO === 'reversao') {
  console.error('AVISO: o modo reversao exige a frase "' + FRASE_REV + '" — esta peca foi construida sem esse OK.');
}
if (OK === undefined || OK !== fraseDoModo()) recusa('frase de autorização ausente ou divergente');

// ---- varredura e estrutura dos dois ficheiros ----------------------------------------------------------
const rawCand = readFileSync(join(REPO, CAM_CAND), 'utf8');
const rawRev = readFileSync(join(REPO, CAM_REV), 'utf8');
const pc = perigos(rawCand), pr = perigos(rawRev);
const zerosAlvo = { candidata: ZERO_CANDIDATA, reversao: ZERO_REVERSAO };
const ofensasAlvo = [];
for (const z of ZERO_CANDIDATA) if (pc[z] !== 0) ofensasAlvo.push('candidata.' + z);
for (const z of ZERO_REVERSAO) if (pr[z] !== 0) ofensasAlvo.push('reversao.' + z);
if (ofensasAlvo.length > 0) recusa('varredura de perigos: ' + ofensasAlvo.join(', '));
const estrut = estrutura(REVERTER ? pr : pc, MODO);
const estrutVermelhas = estrut.filter((g) => !g.ok);
if (estrutVermelhas.length > 0) recusa('estrutura: ' + JSON.stringify(estrutVermelhas));

// ---- fluxo ---------------------------------------------------------------------------------------------
const t0 = Date.now();
let escreveuBanco = false;
let erroDeEscrita = null;
let erroDeRuntime = null;
let erroPreflightAntes = null;
const reg = {
  peca: 'scripts/p145-a1-confirmar-calendario-aplica.mjs',
  emissor_bytes: EU.length,
  emissor_md5: md5(EU),
  em: new Date().toISOString(),
  modo: MODO,
  frase_usada: OK,
  ok_origem: REAPLICA
    ? 'escolha do utilizador 24/11: «Re-correr o aplicador» (re-aplica a candidata corrigida — REVOKE anon+service_role vivo + CREATE OR REPLACE idempotente — e re-executa o ato; a reversao continua sem OK)'
    : 'escolha do utilizador 24/11: «Construir + aplicar o A1» (pergunta única de escopo; autoriza DDL e ato em runtime; a reversao continua sem OK)',
  ficheiros: { candidata: pegada(CAM_CAND), reversao: pegada(CAM_REV) },
  varredura: { candidata: pc, reversao: pr, estrutura: estrut, zeros_exigidos: zerosAlvo },
};

try {
  // pré-voo antes
  let pfAntes;
  try {
    pfAntes = correPreflight(REVERTER ? 'reversao' : (REAPLICA ? 'reversao' : 'candidata'), 'a1apl' + (REVERTER ? 'r' : '') + Date.now());
  } catch (e) {
    erroPreflightAntes = String(e.message).slice(0, 300);
    recusa('preflight antes: ' + erroPreflightAntes);
  }
  if (REAPLICA) {
    if (!aceitaPreReaplica(pfAntes.j)) recusa('preflight antes do reaplica com vermelho que nao e o portao de grants: ' + pfAntes.j.veredicto);
  } else if (!preflightVerde(pfAntes.j, REVERTER ? 'reversao' : 'candidata')) {
    recusa('preflight antes nao verde: ' + pfAntes.j.veredicto);
  }
  const fichaAntes = pfAntes.j.ficheiros || {};
  for (const [k, cert] of Object.entries({ candidata: rawCand, reversao: rawRev })) {
    if (!fichaAntes[k]) recusa('preflight sem ficha de ' + k);
    if (fichaAntes[k].md5 !== md5(cert) || fichaAntes[k].bytes !== Buffer.byteLength(cert)) recusa('pegada divergente em ' + k);
  }
  reg.preflight_antes = { ficha: pfAntes.ficha, veredicto: pfAntes.j.veredicto, catalogo_vivo: pfAntes.j.catalogo_vivo };

  // baselines antes
  const baseAntes = {};
  for (const m of MESAS_DE_BASELINE) baseAntes[m] = (f(await sql('select count(*)::int as n from public.' + m))[0] || {}).n;
  reg.baselines_antes = baseAntes;

  // escrita
  try {
    if (REVERTER) await sql(rawRev); else await sql(rawCand);
    escreveuBanco = true;
  } catch (e) {
    erroDeEscrita = String(e.message).slice(0, 400);
  }

  if (escreveuBanco && !REVERTER) {
    // ato em runtime: (a) porta falha-fechada sem claims; (b) coordenador de teste; (c) chamada positiva
    const ato = { falha_fechada: { esperado: true, disparou: false, mensagem: '' }, coordenador: null, confirmadas: null };
    try {
      try {
        await sql('select public.bfr_confirm_school_calendar(2026);');
        ato.falha_fechada.disparou = false; // devolveu: a porta do papel está aberta — defeito
      } catch (e) {
        ato.falha_fechada.mensagem = String(e.message).slice(0, 300);
        ato.falha_fechada.disparou = /reservada a coordinator, director e developer/.test(String(e.message));
      }
      if (!ato.falha_fechada.disparou) throw new Error('a porta por papel nao fechou sem claims — o UPDATE teria corrido com auth.uid() nulo');
      const censo = f(await sql("select id::text as id, role::text as papel, coalesce(display_name_custom, '') as nome from public.profiles where role::text = 'coordinator' order by (display_name_custom is not null), id limit 1"));
      const co = censo[0] || null;
      if (!co || co.papel !== 'coordinator') throw new Error('ABORTA: nenhum coordenador de teste escolhivel (papel medido: ' + JSON.stringify(co) + ')');
      ato.coordenador = co;
      const linhas = f(await sql("select set_config('request.jwt.claim.sub', '" + co.id + "', true) as cfg; select public.bfr_confirm_school_calendar(2026) as confirmadas;"));
      ato.confirmadas = Number((linhas[0] || {}).confirmadas);
    } catch (e) {
      erroDeRuntime = String(e.message).slice(0, 400);
      reg.ato_runtime = { erro: erroDeRuntime };
    }
    reg.ato_runtime = { ...(reg.ato_runtime || {}), ...ato, mecanismo: 'a mesma resolução do PostgREST: set_config(request.jwt.claim.sub) local à transação -> auth.uid() -> profiles.role -> bfr_rls_session_role(); a chamada positiva corre na ligação postgres do c2-lib, não por JWT real (cadeias 0/15 — p73-estado-das-cadeias-24-11-a1.json)' };

    // conferência pós-ato
    const dias = f(await sql("select count(*) filter (where source_status = 'confirmed')::int as confirmadas, count(*) filter (where source_status = 'draft')::int as draft, count(*)::int as total, count(distinct confirmed_by)::int as confirmadores, count(*) filter (where confirmed_at is null)::int as sem_at from public.bfr_school_calendar_days"))[0] || {};
    const confirmadoPor = f(await sql('select distinct confirmed_by::text as id from public.bfr_school_calendar_days where school_year = 2026')).map((r) => r.id);
    const vis = await admin('/rest/v1/rpc/bfr_confirm_school_calendar', { method: 'POST', body: JSON.stringify({ target_school_year: 2026 }) });
    reg.conferencia = {
      dias: dias,
      confirmado_por: confirmadoPor,
      visibilidade_postgrest: { status: vis.status, corpo: JSON.stringify(vis.j).slice(0, 300) },
    };
    reg.conferencia_gates = [
      { id: 'falha_fechada_disparou', ok: reg.ato_runtime.falha_fechada.disparou === true, medido: reg.ato_runtime.falha_fechada.disparou },
      { id: 'confirmadas_365', ok: reg.ato_runtime.confirmadas === 365, medido: reg.ato_runtime.confirmadas, esperado: 365 },
      { id: 'dias_confirmados', ok: dias.confirmadas === 365 && dias.draft === 0 && dias.total === 365, medido: dias },
      { id: 'confirmado_pelo_coordenador_escolhido', ok: confirmadoPor.length === 1 && confirmadoPor[0] === (reg.ato_runtime.coordenador || {}).id, medido: confirmadoPor },
      { id: 'todos_com_at', ok: dias.sem_at === 0, medido: dias.sem_at, esperado: 0 },
      { id: 'postgrest_ve_a_funcao', ok: vis.status !== 404, medido: vis.status, esperado: 'diferente de 404 (o NOTIFY recarregou o schema)' },
    ];
  }

  // baselines depois
  const baseDepois = {};
  for (const m of MESAS_DE_BASELINE) baseDepois[m] = (f(await sql('select count(*)::int as n from public.' + m))[0] || {}).n;
  reg.baselines_depois = baseDepois;
  reg.baselines_iguais = JSON.stringify(reg.baselines_antes) === JSON.stringify(baseDepois);

  // pré-voo depois (modo oposto ao alvo)
  const pfDepois = correPreflight(REVERTER ? 'candidata' : 'reversao', 'a1dep' + Date.now());
  reg.preflight_depois = { ficha: pfDepois.ficha, veredicto: pfDepois.j.veredicto, catalogo_vivo: pfDepois.j.catalogo_vivo };
  reg.preflight_depois_verde = preflightVerde(pfDepois.j, REVERTER ? 'candidata' : 'reversao');
} catch (e) {
  if (!erroDeEscrita && !erroDeRuntime) erroDeRuntime = String(e.message).slice(0, 400);
}

reg.tempo_ms = Date.now() - t0;
reg.escreveu_banco = escreveuBanco;
reg.erro_de_escrita = erroDeEscrita;
reg.erro_de_runtime = erroDeRuntime;
const conferenciaVerde = escreveuBanco && !erroDeEscrita && !erroDeRuntime
  && (REVERTER
    ? reg.preflight_depois_verde === true && reg.baselines_iguais === true
    : (reg.conferencia_gates || []).every((g) => g.ok) && reg.preflight_depois_verde === true && reg.baselines_iguais === true);
if (MODO === 'aplicacao') {
  reg.veredicto = !escreveuBanco ? 'P145_A1_APLICACAO_ABORTADA'
    : (conferenciaVerde ? 'P145_A1_APLICADA_E_CONFERIDA' : 'P145_A1_APLICADA_COM_CONFERENCIA_VERMELHA');
} else if (MODO === 'reaplicacao') {
  reg.veredicto = !escreveuBanco ? 'P145_A1_REAPLICACAO_ABORTADA'
    : (conferenciaVerde ? 'P145_A1_REAPLICADA_E_CONFERIDA' : 'P145_A1_REAPLICADA_COM_CONFERENCIA_VERMELHA');
} else {
  reg.veredicto = !escreveuBanco ? 'P145_A1_REVERSAO_ABORTADA'
    : (conferenciaVerde ? 'P145_A1_REVERTIDA_E_CONFERIDA' : 'P145_A1_REVERTIDA_COM_CONFERENCIA_VERMELHA');
}
reg.o_que_prova = 'Com a frase literal do modo: os dois ficheiros SQL estão íntegros (bytes/md5 contra as fichas do pré-voo fresco), a varredura de perigos por família dá zero fora dos atos declarados, o pré-voo candidata (35 portões) passou antes da escrita, o pré-voo reversao (37 portões) passou depois, as baselines das 5 mesas não se moveram, e — no modo aplicacao — a porta por papel falha fechada sem claims, a chamada com a claim de sessão do coordenador de teste devolveu 365 e os dias ficaram confirmed pelo coordenador escolhido, com o PostgREST a ver a função (sem 404). O mecanismo de sessão está DECLARADO acima: é a mesma resolução do PostgREST, mas não passa por JWT real (as 15 cadeias estão mortas — artefacto p73 de 24/11).';
reg.o_que_NAO_prova = 'Não prova uma passada de navegador com JWT real de cada papel (exige re-login/mint, sem OK). Não prova o comportamento do formulário de horários (turnos continuam draft — contrato do consumidor). Não autoriza nem executa a reversão, o REVOKE 15+4, a publicação, o push, o mint ou a rotação — cada um tem a sua frase.';
reg.node_exit_esperado = conferenciaVerde ? 0 : 1;

if (existsSync(OUT)) { OUT = OUT.replace(/\.json$/, '-' + Date.now() + '.json'); }
writeFileSync(OUT, JSON.stringify(reg, null, 2) + '\n');
console.log('FICHEIRO ' + OUT);
console.log('VEREDICTO ' + reg.veredicto + ' · escreveu_banco=' + escreveuBanco + ' · conferencia_verde=' + conferenciaVerde);
if (!conferenciaVerde) { console.error('VERMELHO: ver reg.'); process.exit(1); }
process.exit(0);
