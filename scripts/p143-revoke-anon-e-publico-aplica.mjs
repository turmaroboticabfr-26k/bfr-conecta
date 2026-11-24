#!/usr/bin/env node
// P143-REVOKE-APLICA — aplicador do REVOKE dos 15+4 (o EXECUTE do anonimo nas 19 funcoes). Padrao do p145:
// frase literal por modo, --selfteste offline, varredura de perigos por familia, pre-voo fresco do p143
// antes (candidata) e depois (reversao), baselines (censo de funcoes, grants dos papeis nao visados e o
// pg_default_acl — a licao do A1: o REVOKE por nome fecha as entradas vivas, e o mecanismo de default
// privileges fica medido, nao tocado), porta fechada na pratica com SET ROLE anon em dois representantes
// (um nominal-anon e um da classe PUBLIC) e veredicto. Nenhuma porta e alargada por esta peca; a recusa
// aborta antes do banco.
//
// Uso:
//   node scripts/p143-revoke-anon-e-publico-aplica.mjs --selfteste
//   node scripts/p143-revoke-anon-e-publico-aplica.mjs --ok "Aplicar o REVOKE 15+4"
//   node scripts/p143-revoke-anon-e-publico-aplica.mjs --reverter --ok "reverta o REVOKE 15+4 no banco"
//   node scripts/p143-revoke-anon-e-publico-aplica.mjs --so-conferencia --ok "Aplicar o REVOKE 15+4"
//     (zero escrita: a candidata ja esta aplicada; o pre-voo reversao verde antes e depois prova o estado,
//     e a conferencia re-mede baselines e a porta com o extrator corrigido)
//   P143_APL_SUF=novo distingue corridas (a guarda de sobrescrita aborta). --regista-recusa escreve o
//   registo da recusa pre-banco.
//
// O OK desta corrida (24/11) veio da escolha «Aplicar o REVOKE 15+4» (pergunta unica de escopo «O que
// «finalize» deve fechar?»), cujo texto autoriza a DDL do REVOKE no banco. A reversao continua SEM OK
// (frase propria, nao usada).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from './c2-lib.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(AQUI);
const EU = readFileSync(fileURLToPath(import.meta.url));
const md5 = (b) => createHash('md5').update(b).digest('hex');
const PREF = 'scripts/p143-revoke-anon-e-publico-preflight.mjs';
const CAM_CAND = 'scripts/p143-revoke-anon-e-publico-ddl-candidata.sql';
const CAM_REV = 'scripts/p143-revoke-anon-e-publico-ddl-reversao.sql';
const REL_REG = 'evidence/p143-revoke-anon-e-publico-23-11b.json';
const FRASE = 'Aplicar o REVOKE 15+4';
const FRASE_REV = 'reverta o REVOKE 15+4 no banco';
const UUID_FABRICADO = '00000000-0000-0000-0000-000000000000';
const PROBE_NOMINAL = 'public.bfr_get_student_photo_path(' + "'" + UUID_FABRICADO + "'::uuid" + ')';
const PROBE_PUBLIC = 'public.bfr_staff_audit_trigger()';

const argv = process.argv.slice(2);
const tem = (f) => argv.some((a) => a === f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const REVERTER = tem('--reverter');
const SO_CONFERENCIA = tem('--so-conferencia');
const MODO = REVERTER ? 'reversao' : 'aplicacao';
const SELFTESTE = tem('--selfteste');
const OK = val('--ok');
const SUF = process.env.P143_APL_SUF ? '-' + process.env.P143_APL_SUF : '-24-11';
let OUT = join(REPO, 'evidence', 'p143-revoke-anon-e-publico-aplica' + SUF + '.json');

// ---- varredura de perigos por familia (comentarios fora) -----------------------------------------------
const so_codigo = (t) => t
  .split('\n')
  .map((l) => (l.trim().startsWith('--') ? '' : l))
  .join('\n');
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
    create: c(/^\s*CREATE/gim),
    grant: c(/^\s*GRANT\s+/gim),
    revoke: c(/^\s*REVOKE\s+/gim),
    comment: c(/^\s*COMMENT\s+/gim),
    credencial: (fora.match(RE_CREDENCIAL) || []).length,
    begin: c(/^BEGIN;$/gm),
    commit: c(/^COMMIT;$/gm),
    notify: c(/^NOTIFY pgrst, 'reload schema';$/gm),
  };
};
const ZERO_COMUM = ['drop_table', 'drop_function', 'drop_schema_database', 'truncate', 'insert_into', 'delete_from', 'update_fora_de_funcao', 'alter', 'create', 'comment', 'credencial', 'notify'];
const ZERO_CANDIDATA = [...ZERO_COMUM, 'grant'];
const ZERO_REVERSAO = [...ZERO_COMUM, 'revoke'];

const estrutura = (p, modo) => {
  const g = [];
  g.push({ id: 'begin_commit', ok: p.begin === 1 && p.commit === 1, medido: [p.begin, p.commit], esperado: '[1,1]' });
  if (modo !== 'reversao') {
    g.push({ id: 'revoke_29_e_mais_nada', ok: p.revoke === 29 && p.grant === 0, medido: [p.revoke, p.grant], esperado: '[29,0]' });
  } else {
    g.push({ id: 'grant_29_e_mais_nada', ok: p.grant === 29 && p.revoke === 0, medido: [p.grant, p.revoke], esperado: '[29,0]' });
  }
  return g;
};

// ---- validacao do registo do pre-voo (veredicto + censo do modo) ----------------------------------------
const preflightVerde = (j, modo) => {
  if (!j || !j.portoes || j.portoes.total !== 17 || j.portoes.falhas !== 0) return false;
  const re = new RegExp('^P143_REVOKE_PREFLIGHT_VERDE_' + modo.toUpperCase() + ' 17/0\\b');
  if (!re.test(String(j.veredito || ''))) return false;
  const cat = j.censo_vivo || {};
  // total 164 = 163 do registo do gerador + a funcao do A1 (24/11), atribuida por medida no pre-voo
  if (modo === 'candidata') return cat.total === 164 && cat.anon_pode === 19 && cat.anon_por_entrada === 15 && cat.acl_nula === 0;
  return cat.total === 164 && cat.anon_pode === 0 && cat.anon_por_entrada === 0 && cat.acl_nula === 0;
};

const correPreflight = (modo, suf) => {
  const args = [join(REPO, PREF)];
  if (modo === 'reversao') args.push('--reversao');
  const r = spawnSync(process.execPath, args, {
    cwd: REPO,
    env: { ...process.env, P143PF_REG: REL_REG, P143PF_SUF: suf },
    encoding: 'utf8',
    timeout: 300000,
  });
  if (r.error) throw new Error('spawn do preflight: ' + r.error.message);
  const m = (r.stdout || '').match(/guardado em (\S+\.json)/);
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

// o formato real medido do servidor e 'sql HTTP 400: {"message":"Failed to run sql query: ERROR:  42501: ..."}';
// os dois primeiros padroes cobrem as formas alternativas que o supabase ja devolveu noutras pecas.
const extraiCodigo = (msg) => {
  const m = String(msg);
  return (m.match(/"code":"(\w+)"/) || [])[1]
    || (m.match(/SQLSTATE\s+(\w+)/i) || [])[1]
    || (m.match(/ERROR:\s+(\w+):/i) || [])[1]
    || null;
};

// ---- selfteste offline -----------------------------------------------------------------------------------
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
  teste('comentario_nao_conta', perigos('-- apagar DELETE FROM tudo\nSELECT 1;').delete_from === 0, 'DELETE FROM citado em comentario nao e varrido');
  teste('credencial_fora_conta', perigos("select 'service_role';").credencial === 1, 'service_role fora de comentario conta');
  teste('credencial_comentada_nao_conta', perigos('-- senha: service_role\nSELECT 1;').credencial === 0, 'credencial em comentario nao conta');
  teste('anon_e_publico_nao_sao_credencial', perigos('REVOKE EXECUTE ON FUNCTION public.x() FROM anon;').credencial === 0 && perigos('REVOKE EXECUTE ON FUNCTION public.y() FROM PUBLIC;').credencial === 0, 'os papeis alvo nao disparam a varredura de credenciais');
  const mundoCand = { veredito: 'P143_REVOKE_PREFLIGHT_VERDE_CANDIDATA 17/0', portoes: { total: 17, falhas: 0, lista: [] }, censo_vivo: { total: 164, anon_pode: 19, anon_por_entrada: 15, acl_nula: 0 } };
  const mundoRev = { veredito: 'P143_REVOKE_PREFLIGHT_VERDE_REVERSAO 17/0', portoes: { total: 17, falhas: 0, lista: [] }, censo_vivo: { total: 164, anon_pode: 0, anon_por_entrada: 0, acl_nula: 0 } };
  teste('preflightVerde_candidata', preflightVerde(mundoCand, 'candidata') === true, 'mundo candidata verde');
  teste('preflightVerde_reversao', preflightVerde(mundoRev, 'reversao') === true, 'mundo reversao verde');
  teste('preflightVerde_candidata_vermelha', preflightVerde({ ...mundoCand, veredito: 'P143_REVOKE_PREFLIGHT_VERDE_CANDIDATA 16/1', portoes: { total: 17, falhas: 1, lista: [] } }, 'candidata') === false, 'veredicto vermelho nao passa');
  teste('preflightVerde_portoes_que_nao_batem', preflightVerde({ ...mundoCand, portoes: { total: 16, falhas: 0, lista: [] } }, 'candidata') === false, 'portoes com contagem errada nao passa');
  teste('preflightVerde_reversao_estado_antes', preflightVerde({ ...mundoRev, censo_vivo: { total: 164, anon_pode: 19, anon_por_entrada: 15, acl_nula: 0 } }, 'reversao') === false, 'estado de antes nao passa o modo reversao');
  const msgReal42501 = 'sql HTTP 400: {"message":"Failed to run sql query: ERROR:  42501: permission denied for function bfr_get_student_photo_path\\n"}';
  teste('extraiCodigo_formato_http_real', extraiCodigo(msgReal42501) === '42501', 'o formato medido do servidor extrai 42501');
  teste('extraiCodigo_code_json', extraiCodigo('{"code":"0A000","message":"x"}') === '0A000', 'formato code json');
  teste('extraiCodigo_sqlstate', extraiCodigo('erro SQLSTATE 42501 linha 1') === '42501', 'formato SQLSTATE');
  teste('extraiCodigo_sem_codigo', extraiCodigo('falhou sem codigo nenhum') === null, 'sem codigo devolve null');
  const p = pegada(CAM_CAND);
  teste('pegada_confere', p.bytes === Buffer.byteLength(cand) && p.md5 === md5(cand), 'pegada do disco bate');
  const vermelhas = T.filter((t) => !t.ok);
  console.log('SELFTESTE ' + T.length + '/' + vermelhas.length + (vermelhas.length ? ' VERMELHO' : ' VERDE'));
  return vermelhas.length === 0;
};
if (SELFTESTE) { process.exit(selfteste() ? 0 : 1); }

// ---- recusa ----------------------------------------------------------------------------------------------
const fraseDoModo = () => (REVERTER ? FRASE_REV : FRASE);
const recusa = (motivo) => {
  const frase = fraseDoModo();
  console.error('ABORTA: ' + motivo + (OK === undefined ? ' (sem --ok)' : OK === frase ? '' : ' (--ok nao bate com a frase do modo)'));
  if (tem('--regista-recusa')) {
    OUT = OUT.replace(/\.json$/, '-recusa-' + Date.now() + '.json');
    writeFileSync(OUT, JSON.stringify({ peca: 'scripts/p143-revoke-anon-e-publico-aplica.mjs', em: new Date().toISOString(), modo: MODO, motivo, ok_usado: OK, frase_do_modo: frase, escreveu_banco: false }, null, 2) + '\n');
    console.error('FICHEIRO ' + OUT);
  }
  process.exit(2);
};
if (MODO === 'reversao') {
  console.error('AVISO: o modo reversao exige a frase "' + FRASE_REV + '" — esta peca foi construida sem esse OK.');
}
if (OK === undefined || OK !== fraseDoModo()) recusa('frase de autorizacao ausente ou divergente');

// ---- varredura e estrutura dos dois ficheiros -------------------------------------------------------------
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

// ---- baselines --------------------------------------------------------------------------------------------
const censoFuncoes = async () => (f(await sql("select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f'"))[0] || {}).n;
const grantsNaoVisados = async () => {
  const linhas = f(await sql([
    'select coalesce(case when a.grantee = 0 then',
    "'PUBLIC' else a.grantee::regrole::text end, '?') as papel, count(*)::int as n",
    'from pg_proc p join pg_namespace n on n.oid = p.pronamespace',
    'cross join lateral aclexplode(p.proacl) a',
    "where n.nspname = 'public' and p.prokind = 'f' and a.privilege_type = 'EXECUTE'",
    "  and coalesce(case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end, '?') in ('authenticated','service_role','postgres')",
    'group by 1 order by 1',
  ].join('\n')));
  const o = {};
  for (const r of linhas) o[r.papel] = r.n;
  return o;
};
const defaultAcl = async () => (f(await sql("select count(*)::int as total, count(*) filter (where defaclacl::text like '%anon=X%')::int as anon_x from pg_default_acl"))[0] || {});

// ---- porta na pratica --------------------------------------------------------------------------------------
const tentaComoAnon = async (chamada) => {
  try {
    const linhas = f(await sql('set role anon; select ' + chamada + ' as v;'));
    return { sem_erro: true, linhas: linhas.length, valor: JSON.stringify(linhas[0] || null).slice(0, 200), erro_codigo: null, mensagem: '' };
  } catch (e) {
    const msg = String(e.message);
    return { sem_erro: false, linhas: 0, valor: '', erro_codigo: extraiCodigo(msg), mensagem: msg.slice(0, 300) };
  }
};

// ---- fluxo ------------------------------------------------------------------------------------------------
const t0 = Date.now();
let escreveuBanco = false;
let erroDeEscrita = null;
let erroDeRuntime = null;
let erroPreflightAntes = null;
const reg = {
  peca: 'scripts/p143-revoke-anon-e-publico-aplica.mjs',
  emissor_bytes: EU.length,
  emissor_md5: md5(EU),
  em: new Date().toISOString(),
  modo: MODO,
  frase_usada: OK,
  ok_origem: 'escolha do utilizador 24/11: «Aplicar o REVOKE 15+4» (pergunta unica de escopo «O que «finalize» deve fechar?»; autoriza a DDL do REVOKE no banco; a reversao continua sem OK — frase propria nao usada)',
  ficheiros: { candidata: pegada(CAM_CAND), reversao: pegada(CAM_REV) },
  registo_do_gerador: { rel: REL_REG },
  varredura: { candidata: pc, reversao: pr, estrutura: estrut, zeros_exigidos: zerosAlvo },
  probes: { nominal: PROBE_NOMINAL, publico: PROBE_PUBLIC, nota: 'SET ROLE anon na mesma string do select: cada chamada de sql() e um pedido HTTP fresco, o estado de sessao nao vaza; com EXECUTE revogado o erro e 42501 permission denied for function, antes de qualquer execucao' },
};

try {
  // pre-voo antes: candidata no modo aplicacao, reversao no modo reversao, e no modo
  // --so-conferencia tambem reversao — o mundo esperado e o ja-aplicado, e este pre-voo
  // e a primeira prova desta corrida de que o estado aplicado existe
  const modoPre = REVERTER || SO_CONFERENCIA ? 'reversao' : 'candidata';
  let pfAntes;
  try {
    pfAntes = correPreflight(modoPre, 'rapl' + Date.now());
  } catch (e) {
    erroPreflightAntes = String(e.message).slice(0, 300);
    recusa('preflight antes: ' + erroPreflightAntes);
  }
  if (!preflightVerde(pfAntes.j, modoPre)) {
    recusa('preflight antes nao verde: ' + pfAntes.j.veredito);
  }
  const fichaAntes = pfAntes.j.identidade_do_medido ? pfAntes.j.identidade_do_medido.ficheiros : {};
  for (const [k, cert] of Object.entries({ candidata: rawCand, reversao: rawRev })) {
    if (!fichaAntes[k]) recusa('preflight sem ficha de ' + k);
    if (fichaAntes[k].md5 !== md5(cert) || fichaAntes[k].bytes !== Buffer.byteLength(cert)) recusa('pegada divergente em ' + k);
  }
  reg.preflight_antes = { ficha: pfAntes.ficha, veredicto: pfAntes.j.veredito, censo_vivo: pfAntes.j.censo_vivo };

  // baselines antes
  reg.baselines_antes = { funcoes_public: await censoFuncoes(), grants_nao_visados: await grantsNaoVisados(), pg_default_acl: await defaultAcl() };

  // escrita (o modo --so-conferencia nao escreve: a candidata ja foi aplicada na corrida r3)
  if (!SO_CONFERENCIA) {
    try {
      await sql(REVERTER ? rawRev : rawCand);
      escreveuBanco = true;
    } catch (e) {
      erroDeEscrita = String(e.message).slice(0, 400);
    }
  }

  // conferencia: pre-voo do modo oposto + baselines + porta na pratica
  const pfDepois = correPreflight(REVERTER ? 'candidata' : 'reversao', 'rdep' + Date.now());
  reg.preflight_depois = { ficha: pfDepois.ficha, veredicto: pfDepois.j.veredito, censo_vivo: pfDepois.j.censo_vivo };
  reg.preflight_depois_verde = preflightVerde(pfDepois.j, REVERTER ? 'candidata' : 'reversao');
  reg.baselines_depois = { funcoes_public: await censoFuncoes(), grants_nao_visados: await grantsNaoVisados(), pg_default_acl: await defaultAcl() };
  reg.baselines_iguais = JSON.stringify(reg.baselines_antes) === JSON.stringify(reg.baselines_depois);
  const portaNominal = await tentaComoAnon(PROBE_NOMINAL);
  const portaPublica = await tentaComoAnon(PROBE_PUBLIC);
  reg.porta_na_pratica = { nominal: portaNominal, publico: portaPublica };
  const portasFechadas = portaNominal.erro_codigo === '42501' && portaPublica.erro_codigo === '42501';
  const portasReabertas = portaNominal.sem_erro === true && portaPublica.erro_codigo === '0A000';
  reg.conferencia_gates = [
    { id: 'preflight_depois_verde', ok: reg.preflight_depois_verde === true, medido: reg.preflight_depois.veredicto },
    { id: 'baselines_iguais', ok: reg.baselines_iguais === true, medido: { antes: reg.baselines_antes, depois: reg.baselines_depois } },
    REVERTER
      ? { id: 'portas_reabertas', ok: portasReabertas, medido: { nominal: portaNominal, publico: portaPublica } }
      : { id: 'portas_fechadas', ok: portasFechadas, medido: { nominal: portaNominal, publico: portaPublica } },
  ];
} catch (e) {
  if (!erroDeEscrita && !erroDeRuntime) erroDeRuntime = String(e.message).slice(0, 400);
}

reg.tempo_ms = Date.now() - t0;
reg.escreveu_banco = escreveuBanco;
reg.erro_de_escrita = erroDeEscrita;
reg.erro_de_runtime = erroDeRuntime;
reg.modo_so_conferencia = SO_CONFERENCIA;
reg.escrita_da_corrida_anterior = SO_CONFERENCIA
  ? { ficha: 'evidence/p143-revoke-anon-e-publico-aplica-24-11-r3.json', escreveu_banco: true, motivo_da_conferencia_vermelha: 'extrator de codigo de erro cego ao formato real do servidor (defeito meu, corrigido nesta peca com fixtures)' }
  : null;
const conferenciaVerde = (SO_CONFERENCIA || escreveuBanco) && !erroDeEscrita && !erroDeRuntime
  && (reg.conferencia_gates || []).every((g) => g.ok);
reg.veredicto = SO_CONFERENCIA
  ? (conferenciaVerde ? 'P143_REVOKE_JA_APLICADO_CONFERIDO' : 'P143_REVOKE_JA_APLICADO_COM_CONFERENCIA_VERMELHA')
  : (!escreveuBanco
    ? (REVERTER ? 'P143_REVOKE_REVERSAO_ABORTADA' : 'P143_REVOKE_APLICACAO_ABORTADA')
    : (conferenciaVerde
      ? (REVERTER ? 'P143_REVOKE_REVERTIDO_E_CONFERIDO' : 'P143_REVOKE_APLICADO_E_CONFERIDO')
      : (REVERTER ? 'P143_REVOKE_REVERTIDO_COM_CONFERENCIA_VERMELHA' : 'P143_REVOKE_APLICADO_COM_CONFERENCIA_VERMELHA')));
reg.o_que_prova = SO_CONFERENCIA
  ? 'Corrida so-conferencia, zero escrita: a candidata ja tinha sido aplicada na corrida P143_APL_SUF=24-11-r3 (escreveu_banco=true), cuja conferencia ficou vermelha por um extrator de codigo de erro cego ao formato real do servidor (defeito meu, corrigido nesta peca com fixtures). Esta corrida prova o estado aplicado: pre-voo reversao VERDE antes e depois (17 portoes, censo 164/0/0/0, as 19 entradas anon/PUBLIC fechadas), baselines identicas (funcoes public 164, grants EXECUTE de authenticated/service_role/postgres intactos, pg_default_acl intacto) e a porta fechada na pratica: com SET ROLE anon, o representante nominal (bfr_get_student_photo_path, que o sm37 media em 200) e o representante PUBLIC (bfr_staff_audit_trigger) devolvem 42501 permission denied for function.'
  : 'Com a frase literal do modo: os dois ficheiros SQL estao integros (bytes/md5 contra as fichas do pre-voo fresco, que por sua vez conferem a pega do gerador), a varredura de perigos por familia da zero fora dos 29 graus declarados, o pre-voo candidata (17 portoes, censo 164/19/15/0: o 164 e o 163 do registo do gerador mais a funcao do A1 atribuida por medida) passou antes da escrita, o pre-voo reversao (17 portoes, censo 164/0/0/0) passou depois, as baselines nao se moveram — funcoes public 164 (163 do gerador + a do A1), os grants EXECUTE de authenticated/service_role/postgres ficaram identicos e o pg_default_acl ficou intacto (a licao do A1: o REVOKE por nome fecha as entradas vivas sem tocar no mecanismo que governa funcoes futuras) — e a porta fechou na pratica: com SET ROLE anon, o representante nominal (bfr_get_student_photo_path, que o sm37 media em 200) e o representante PUBLIC (bfr_staff_audit_trigger) devolvem 42501 permission denied for function. No modo reversao, as mesmas portas reabrem (o nominal devolve linha, o PUBLIC falha em 0A000 por ser funcao de gatilho chamada a seco, nao por privilegio).';
reg.o_que_NAO_prova = 'Nao prova o efeito em RLS nem em gatilhos disparados por tabela (o raio de estouro do gerador mede quem cita os nomes; o efeito so se ve com sessao real, e as cadeias estao 0/15). Nao fecha o mecanismo de default privileges — esse e outra decisao, fora desta peca, e a candidata declara que nao lhe toca (medido no baseline). Nao autoriza nem executa a reversao, a publicacao, o push, o mint ou a rotacao — cada um tem a sua frase.';
reg.node_exit_esperado = conferenciaVerde ? 0 : 1;

if (existsSync(OUT)) { OUT = OUT.replace(/\.json$/, '-' + Date.now() + '.json'); }
writeFileSync(OUT, JSON.stringify(reg, null, 2) + '\n');
console.log('FICHEIRO ' + OUT);
console.log('VEREDICTO ' + reg.veredicto + ' · escreveu_banco=' + escreveuBanco + ' · conferencia_verde=' + conferenciaVerde);
if (!conferenciaVerde) { console.error('VERMELHO: ver reg.'); process.exit(1); }
process.exit(0);
