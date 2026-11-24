#!/usr/bin/env node
// P143-PREFLIGHT — só leitura, zero escrita. A candidata scripts/p143-revoke-anon-e-publico-ddl-candidata.sql
// revoga o EXECUTE do papel anon em 19 funcoes de public (15 entradas nominais e 14 linhas de PUBLIC: os 4
// so-PUBLIC do sm37g + 10 dos 15 explicitos que tambem tem entrada PUBLIC — a classe "ambos" que a particao do
// p142 escondia por ordem de eliminacao). Um REVOKE pode ser (i) um no-op decorativo se o grau do anonimo chegar
// por um caminho que a linha nao nomeia, (ii) dirigido a uma assinatura que o servidor nao reconhece, (iii)
// aplicado ao objecto errado, ou (iv) a peca que fecha o grau que um gatilho ou uma policy precisa. Nada disso se
// le no texto do SQL; mede-se no catalogo, neste instante, contra o registo que gerou as duas pecas.
//
// Uso: node scripts/p143-revoke-anon-e-publico-preflight.mjs            (modo candidata: exige o estado ANTES)
//      node scripts/p143-revoke-anon-e-publico-preflight.mjs --reversao (modo reversao: exige o estado DEPOIS)
//      P143PF_SUF=novo distingue corridas; P143PF_REG=evidence/p143-…json liga ao registo do gerador.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sql } from './c2-lib.mjs';
import { tiposDaAssinatura, assinaturaCorresponde } from './p73-assinatura-lib.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(AQUI);
const EU = readFileSync(fileURLToPath(import.meta.url));
const md5 = (b) => createHash('md5').update(b).digest('hex');
const MODO = process.argv.includes('--reversao') ? 'reversao' : 'candidata';
const SUF = process.env.P143PF_SUF ? '-' + process.env.P143PF_SUF : '-23-11';
const REL_REG = process.env.P143PF_REG;
if (!REL_REG) { console.error('ABORTA: passe P143PF_REG=evidence/p143-revoke-anon-e-publico-….json (o registo do gerador).'); process.exit(2); }
const OUT = join(REPO, 'evidence', 'p143-revoke-anon-e-publico-preflight-' + MODO + SUF + '.json');
if (existsSync(OUT)) { console.error('ABORTA: ja existe ' + OUT + ' — passe P143PF_SUF novo.'); process.exit(2); }
const CAM_CAND = 'scripts/p143-revoke-anon-e-publico-ddl-candidata.sql';
const CAM_REV = 'scripts/p143-revoke-anon-e-publico-ddl-reversao.sql';
const t0 = Date.now();
const cru = (c) => readFileSync(join(REPO, c), 'utf8');
const rawCand = cru(CAM_CAND), rawRev = cru(CAM_REV);
const soCodigo = (t) => t.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n');
const conta = (re, t) => (t.match(re) || []).length;

// ---- o registo do gerador, com a pegada dele -----------------------------------------------------------
const F_REG = join(REPO, REL_REG);
if (!existsSync(F_REG)) { console.error('ABORTA: falta ' + F_REG); process.exit(2); }
const bufReg = readFileSync(F_REG);
const gen = JSON.parse(bufReg.toString('utf8'));
if (!gen || !gen.ficheiros_gerados || !gen.declaracoes_geradas || !gen.medido_por_nome || !gen.censo_vivo) {
  console.error('ABORTA: o registo do gerador nao traz ficheiros_gerados/declaracoes_geradas/medido_por_nome/censo_vivo.'); process.exit(2);
}

// ---- o que as duas pecas escrevem, lido do codigo e nao da minha memoria --------------------------------
const RE_GRAU = (kw) => new RegExp('^\\s*' + kw + '\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+(?:public\\.)?([a-z0-9_]+)\\s*\\(([^)]*)\\)\\s+(?:FROM|TO)\\s+([a-z0-9_\\s]+);', 'gmi');
const grausDe = (t, kw) => [...t.matchAll(RE_GRAU(kw))].map((m) => ({ nome: m[1], ident: m[2].trim(), papel: m[3].trim() }));
const revogados = grausDe(soCodigo(rawCand), 'REVOKE');
const devolvidos = grausDe(soCodigo(rawRev), 'GRANT');
const estruturaDe = (t) => { const s = soCodigo(t); const c = (re) => (s.match(re) || []).length;
  return { begin: c(/^BEGIN;/gm), commit: c(/^COMMIT;/gm), revoke: c(/^\s*REVOKE EXECUTE/gim), grant: c(/^\s*GRANT EXECUTE/gim),
    statement_fora_dos_graus: c(/^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|COPY|GRANT\s+(?!EXECUTE))\b/gim) }; };
const estCand = estruturaDe(rawCand), estRev = estruturaDe(rawRev);
const espelho = (a, b) => JSON.stringify(a.map((x) => [x.nome, x.ident, x.papel]).sort()) === JSON.stringify(b.map((x) => [x.nome, x.ident, x.papel]).sort());
const NOMES = [...new Set(revogados.map((x) => x.nome))].sort();
const RE_NOME = /^[a-z0-9_]+$/;
const RE_IDENT = /^[A-Za-z0-9_$"., \[\]()]*$/;
const identOk = (s) => RE_IDENT.test(String(s)) && !String(s).includes(';') && !String(s).includes('--');

// ---- o predicado de leitura vem do ficheiro do p139, como no gerador -----------------------------------
const fonte139 = readFileSync(join(AQUI, 'p139-acls-dos-nomes-do-ar-contra-o-alvo.mjs')).toString('utf8');
const linhaPredicado = fonte139.split(/\r?\n/).find((l) => l.startsWith('const eLeitura ='));
if (!linhaPredicado) { console.error('ABORTA: nao li a linha `const eLeitura =` do p139.'); process.exit(2); }
const mundo = createContext({});
runInContext(linhaPredicado + '\nglobalThis.__eLeitura = eLeitura;', mundo);
const eLeitura = mundo.__eLeitura;
const formas = [];
const q = async (txt) => {
  const t = String(txt);
  formas.push(eLeitura(t));
  if (!eLeitura(t)) throw new Error('ABORTA: esta peca e so-leitura e alguem lhe passou ' + t.slice(0, 60));
  return sql(t);
};
const literal = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const lista = NOMES.map(literal).join(', ');

// ---- a guarda aborta antes do banco ---------------------------------------------------------------------
let guardaAbortou = false;
let guardaChegouAoBanco = false;
try { await q('REVOKE ALL ON FUNCTION public.x() FROM anon'); guardaChegouAoBanco = true; }
catch (e) { guardaAbortou = /ABORTA/.test(String(e.message)); }

// ---- o catalogo vivo, re-medido -------------------------------------------------------------------------
const censo = (await q([
  'select count(*)::int as total,',
  "       count(*) filter (where has_function_privilege('anon'::regrole, p.oid, 'EXECUTE'))::int as anon_pode,",
  "       count(*) filter (where coalesce(array_to_string(p.proacl,''),'') like '%anon=X%')::int as anon_por_entrada,",
  '       count(*) filter (where p.proacl is null)::int as acl_nula',
  'from pg_proc p join pg_namespace nn on nn.oid = p.pronamespace',
  "where nn.nspname = 'public' and p.prokind = 'f'",
].join('\n')))[0];
const linhas = await q([
  'select p.oid::text as oid, p.proname as nome,',
  '       pg_get_function_identity_arguments(p.oid) as ident,',
  "       has_function_privilege('anon'::regrole, p.oid, 'EXECUTE') as anon_pode,",
  '       coalesce(array_to_string(p.proacl, \',\'), \'\') as acl_texto',
  'from pg_proc p join pg_namespace n on n.oid = p.pronamespace',
  "where n.nspname = 'public' and p.prokind = 'f' and p.proname in (" + lista + ')',
  'order by 1',
].join('\n'));
const entradas = await q([
  'select p.proname as nome,',
  "  case when a.grantee is null or a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end as contemplado,",
  '  a.grantor::regrole::text as outorgante',
  'from pg_proc p join pg_namespace n on n.oid = p.pronamespace',
  'cross join lateral aclexplode(p.proacl) a',
  "where n.nspname = 'public' and p.prokind = 'f' and p.proname in (" + lista + ')',
  "  and a.privilege_type = 'EXECUTE'",
  'order by 1, 2',
].join('\n'));

// ---- o acrescimo ao mundo do gerador, atribuido por medida ------------------------------------------------
const NOME_A1 = 'bfr_confirm_school_calendar';
const a1Medido = (await q([
  'select count(*)::int as n,',
  "       count(*) filter (where has_function_privilege('anon'::regrole, p.oid, 'EXECUTE'))::int as anon_pode,",
  "       count(*) filter (where coalesce(array_to_string(p.proacl,''),'') like '%anon=%')::int as anon_por_entrada",
  'from pg_proc p join pg_namespace n on n.oid = p.pronamespace',
  "where n.nspname = 'public' and p.prokind = 'f' and p.proname = " + literal(NOME_A1),
].join('\n')))[0];

// ---- o mundo medido, nome a nome -------------------------------------------------------------------------
const porNome = {};
for (const nome of NOMES) {
  const linha = linhas.find((r) => r.nome === nome);
  const ent = entradas.filter((r) => r.nome === nome);
  const contemplados = [...new Set(ent.map((r) => r.contemplado))].sort();
  porNome[nome] = {
    linha: linha || null,
    contemplados,
    tem_anon: contemplados.includes('anon'),
    tem_public: contemplados.includes('PUBLIC'),
    restantes: contemplados.filter((c) => c !== 'anon' && c !== 'PUBLIC'),
    entradas_execute: ent.map((r) => r.contemplado + ' por ' + r.outorgante).sort(),
  };
}
const esperadoPorLinha = (papel) => MODO === 'candidata'
  ? (papel === 'anon' ? 'tem_anon' : 'tem_public')
  : null;
const entradaPresente = (nome, papel) => (papel === 'anon' ? porNome[nome].tem_anon : porNome[nome].tem_public);

// ---- portao ---------------------------------------------------------------------------------------------
const portoes = [];
const gate = (nome, obtido, esperado, detalhe) => {
  portoes.push({ nome, verde: JSON.stringify(obtido) === JSON.stringify(esperado), obtido, esperado, detalhe });
};

gate('a_pega_dos_ficheiros_lidos_e_a_do_registo_do_gerador',
  [Buffer.byteLength(rawCand, 'utf8'), md5(Buffer.from(rawCand, 'utf8')), Buffer.byteLength(rawRev, 'utf8'), md5(Buffer.from(rawRev, 'utf8'))],
  [gen.ficheiros_gerados.candidata.bytes, gen.ficheiros_gerados.candidata.md5, gen.ficheiros_gerados.reversao.bytes, gen.ficheiros_gerados.reversao.md5],
  { rel: REL_REG, nota: 'o preflight certifica exactamente os bytes que o gerador escreveu' });
gate('a_pega_do_emissor_do_gerador_bate_com_o_ficheiro_em_disco', (() => {
  const src = readFileSync(join(REPO, gen.peca));
  return [src.length === gen.emissor_bytes, md5(src) === gen.emissor_md5];
})(), [true, true], { peca: gen.peca });
gate('a_guarda_de_leitura_aborta_antes_de_chegar_ao_banco', [guardaAbortou, guardaChegouAoBanco], [true, false],
  { texto_passado: 'REVOKE ALL ON FUNCTION public.x() FROM anon', predicado_lido: linhaPredicado });
gate('o_predicado_de_leitura_dispara_nos_dois_lados',
  [[eLeitura('select 1'), eLeitura('with a as (select 1) select * from a'), eLeitura('REVOKE ALL ON FUNCTION public.x() FROM anon'), eLeitura('')]],
  [[true, true, false, false]], { origem: 'scripts/p139-acls-dos-nomes-do-ar-contra-o-alvo.mjs' });
gate('as_duas_pecas_tem_uma_so_transacco_de_graus_sem_dados_e_o_aviso_de_nao_aplicar',
  [estCand.begin, estCand.commit, estCand.revoke, estCand.grant, estCand.statement_fora_dos_graus,
   estRev.begin, estRev.commit, estRev.grant, estRev.revoke, estRev.statement_fora_dos_graus,
   rawCand.includes('NÃO APLICAR SEM FRASE LITERAL DO UTILIZADOR'), rawRev.includes('NÃO APLICAR SEM FRASE LITERAL DO UTILIZADOR')],
  [1, 1, revogados.length, 0, 0, 1, 1, devolvidos.length, 0, 0, true, true],
  { estCand, estRev });
gate('a_reversao_e_o_espelho_exacto_da_candidata_e_os_dois_mundos_trocados_chumbam',
  [espelho(revogados, devolvidos),
   espelho(revogados, devolvidos.map((x, i) => i === 0 ? { ...x, papel: 'postgres' } : x)),
   espelho(revogados, devolvidos.map((x, i) => i === 0 ? { ...x, nome: 'outro_nome' } : x))],
  [true, false, false], { revogados: revogados.length, devolvidos: devolvidos.length });
gate('as_declaracoes_batem_com_as_do_registo_do_gerador',
  [JSON.stringify(revogados.map((x) => [x.nome, x.ident, x.papel]).sort()), JSON.stringify(devolvidos.map((x) => [x.nome, x.ident, x.papel]).sort())],
  [JSON.stringify(gen.declaracoes_geradas.candidata.map((x) => [x.nome, x.ident, x.papel]).sort()), JSON.stringify(gen.declaracoes_geradas.reversao.map((x) => [x.nome, x.ident, x.papel]).sort())],
  { nota: 'os ficheiros nao mudaram desde a geracao, linha a linha' });
gate('os_nomes_e_as_identidades_passam_a_regua_de_forma',
  [NOMES.length, NOMES.every((n) => RE_NOME.test(n)), revogados.every((d) => identOk(d.ident)), revogados.every((d) => d.papel === 'anon' || d.papel === 'PUBLIC')],
  [19, true, true, true], { NOMES });
gate('nenhuma_palavra_reservada_e_chamada_como_funcao_nas_duas_pecas',
  [conta(/\b(current_role|session_user|current_user)\s*\(/gi, soCodigo(rawCand)), conta(/\b(current_role|session_user|current_user)\s*\(/gi, soCodigo(rawRev))],
  [0, 0],
  { nota: 'a regua de parseabilidade da casa: reservada sem aspas duplas e inexecutavel; aqui nao ha chamadas nenhumas, e o verde prova que os graus sao so nome e assinatura' });
gate('cada_nome_tem_exactamente_uma_linha_no_catalogo', [linhas.length, NOMES.length], [19, 19],
  { nomes_sem_linha: NOMES.filter((n) => !porNome[n].linha) });
gate('a_assinatura_de_cada_linha_casa_com_a_identidade_do_servidor_nos_dois_sentidos',
  [revogados.every((d) => {
    const linha = porNome[d.nome].linha;
    return linha !== null && assinaturaCorresponde(tiposDaAssinatura(d.ident), linha.ident)
      && assinaturaCorresponde(tiposDaAssinatura(linha.ident), d.ident);
  }), revogados.map((d) => [d.nome, d.ident, porNome[d.nome].linha && porNome[d.nome].linha.ident])],
  [true, revogados.map((d) => [d.nome, d.ident, porNome[d.nome].linha && porNome[d.nome].linha.ident])],
  { nota: 'a tolerancia e a da casa: o servidor pode devolver a assinatura com ou sem nomes de parametro, e as duas formas casam (medido em 20/11 no p73)' });
gate('cada_linha_revoga_o_caminho_que_o_nome_tem_' + (MODO === 'candidata' ? 'e_o_estado_vivo_e_o_de_antes' : 'e_o_estado_vivo_e_o_de_depois'),
  revogados.map((d) => MODO === 'candidata'
    ? [entradaPresente(d.nome, d.papel) === true, porNome[d.nome].linha.anon_pode === true]
    : [entradaPresente(d.nome, d.papel) === false, porNome[d.nome].linha.anon_pode === false]),
  revogados.map(() => [true, true]),
  { por_linha: revogados.map((d) => [d.nome, d.papel, entradaPresente(d.nome, d.papel), porNome[d.nome].linha && porNome[d.nome].linha.anon_pode]) });
// ---- a regua do censo, derivada do registo do gerador + o acrescimo atribuido -----------------------------
const censoBate = (censoVivo, a1, genCenso, modo) => {
  const esperado = modo === 'candidata'
    ? [genCenso.total + a1.n, genCenso.anon_pode, genCenso.anon_por_entrada, genCenso.acl_nula]
    : [genCenso.total + a1.n, 0, 0, 0];
  const vivo = [censoVivo.total, censoVivo.anon_pode, censoVivo.anon_por_entrada, censoVivo.acl_nula];
  const a1SemRotaAnon = a1.anon_pode === 0 && a1.anon_por_entrada === 0;
  return { ok: JSON.stringify(vivo) === JSON.stringify(esperado) && a1SemRotaAnon, vivo, esperado, a1SemRotaAnon };
};
const rCenso = censoBate(censo, a1Medido, gen.censo_vivo, MODO);
gate('o_censo_vivo_bate_com_o_mundo_do_modo_com_o_acrescimo_atribuido_ao_a1',
  [rCenso.ok, rCenso.vivo, rCenso.a1SemRotaAnon],
  [true, rCenso.esperado, true],
  { censo, gen_censo_vivo: gen.censo_vivo, a1: a1Medido, nome_a1: NOME_A1,
    nota: 'o total esperado e o do registo do gerador mais exatamente as funcoes do A1 medidas hoje (uma, criada em 24/11 pelo ciclo autorizado do A1, com acl so de postgres e authenticated): nenhuma pode dar EXECUTE ao anon; candidata exige os campos do anon iguais aos do gerador, reversao exige-os a zero' });
const fxCenso = [
  ['mundo_do_gerador_mais_a1_sem_rota_anon', censoBate({ total: 164, anon_pode: 19, anon_por_entrada: 15, acl_nula: 0 }, { n: 1, anon_pode: 0, anon_por_entrada: 0 }, gen.censo_vivo, 'candidata'), true],
  ['acrescimo_sem_atribuicao', censoBate({ total: 165, anon_pode: 19, anon_por_entrada: 15, acl_nula: 0 }, { n: 1, anon_pode: 0, anon_por_entrada: 0 }, gen.censo_vivo, 'candidata'), false],
  ['a1_com_rota_anon', censoBate({ total: 164, anon_pode: 20, anon_por_entrada: 16, acl_nula: 0 }, { n: 1, anon_pode: 1, anon_por_entrada: 1 }, gen.censo_vivo, 'candidata'), false],
  ['funcao_a_menos', censoBate({ total: 163, anon_pode: 19, anon_por_entrada: 15, acl_nula: 0 }, { n: 1, anon_pode: 0, anon_por_entrada: 0 }, gen.censo_vivo, 'candidata'), false],
  ['reversao_mundo_fechado', censoBate({ total: 164, anon_pode: 0, anon_por_entrada: 0, acl_nula: 0 }, { n: 1, anon_pode: 0, anon_por_entrada: 0 }, gen.censo_vivo, 'reversao'), true],
  ['reversao_ainda_aberta', censoBate({ total: 164, anon_pode: 19, anon_por_entrada: 15, acl_nula: 0 }, { n: 1, anon_pode: 0, anon_por_entrada: 0 }, gen.censo_vivo, 'reversao'), false],
];
gate('a_regua_do_censo_dispara_nos_dois_sentidos_com_a_delta_do_a1_atribuida',
  fxCenso.map(([n, r]) => [n, r.ok]),
  fxCenso.map(([n, , e]) => [n, e]),
  { nota: 'os seis mundos fabricados provam que a regua aceita exactamente o mundo do gerador mais a funcao do A1 sem rota anon, e chumba acrescimos sem atribuicao, rota anon na funcao nova e mundos a menos' });
gate('o_confronto_nome_a_nome_com_o_registo_do_gerador_' + (MODO === 'candidata' ? 'esta_em_delta_zero' : 'so_mostra_as_entradas_que_ficam'),
  NOMES.map((n) => MODO === 'candidata'
    ? [porNome[n].contemplados, porNome[n].entradas_execute]
    : [porNome[n].restantes, porNome[n].entradas_execute.filter((e) => !e.startsWith('anon por') && !e.startsWith('PUBLIC por'))]),
  NOMES.map((n) => {
    const r = gen.medido_por_nome[n];
    return MODO === 'candidata'
      ? [r.contemplados, r.entradas_execute]
      : [r.contemplados.filter((c) => c !== 'anon' && c !== 'PUBLIC'), r.entradas_execute.filter((e) => !e.startsWith('anon por') && !e.startsWith('PUBLIC por'))];
  }),
  { nota: 'as entradas de authenticated/postgres/service_role nao sao tocadas pela candidata: em candidata o conjunto inteiro bate com o gerador, em reversao o que resta bate com o que o gerador tinha sem anon/PUBLIC' });
gate('cada_query_passa_por_q_e_so_ha_um_toque_directo_de_sql',
  [formas.length === (EU.toString('utf8').split('aw' + 'ait q(').length - 1),
   (EU.toString('utf8').split('s' + 'ql(').length - 1) === 1,
   formas.length >= 3,
   formas.filter(Boolean).length === formas.length - 1],
  [true, true, true, true],
  { formas: formas.length, nota: 'o unico false e a sonda da guarda' });
gate('nenhum_identificador_pessoal_nem_token_entra_neste_registo', (() => {
  const candidato = JSON.stringify({ censo, porNome, revogados, devolvidos, estCand, estRev });
  const FIX_VARREDURA = 'maria' + '@example.edu ' + 'eyJ' + 'hbGciOiJIUzI1NiJ9' + '.' + 'abcdefghij' + '.' + 'klmnopqrst';
  const reEmail = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
  const reJwt = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g;
  return [(candidato.match(reEmail) || []).length, (candidato.match(reJwt) || []).length,
    (FIX_VARREDURA.match(reEmail) || []).length, (FIX_VARREDURA.match(reJwt) || []).length];
})(), [0, 0, 1, 1]);

const verdes = portoes.filter((g) => g.verde).length;
const falhas = portoes.length - verdes;
const veredito = 'P143_REVOKE_PREFLIGHT_' + (falhas === 0 ? 'VERDE' : 'VERMELHO') + '_' + MODO.toUpperCase() + ' ' + verdes + '/' + falhas
  + ' · nomes ' + NOMES.length
  + ' · linhas ' + revogados.length
  + ' · censo ' + censo.total + '/' + censo.anon_pode + '/' + censo.anon_por_entrada + '/' + censo.acl_nula
  + ' · ' + (Date.now() - t0) + ' ms';
const resultado = {
  peca: 'scripts/p143-revoke-anon-e-publico-preflight.mjs',
  modo: MODO,
  em: new Date().toISOString(),
  duracao_ms: Date.now() - t0,
  emissor_bytes: EU.length,
  emissor_md5: md5(EU),
  pergunta: 'o que o catalogo vivo diz hoje sobre as duas pecas do p143: a candidata revoga exactamente os caminhos medidos e a reversao devolve exactamente o que ela tira?',
  metodo: 'as declaracoes leem-se do codigo sem comentarios das duas pecas; o catalogo e re-medido (censo, identidades, entradas de ACL) com o predicado eLeitura lido do p139; o registo do gerador ' + REL_REG + ' e a testemunha do mundo antes; o acrescimo ao censo do gerador e atribuido por nome (a funcao do A1, 24/11) e re-medido sem rota anon; zero escrita.',
  identidade_do_medido: {
    registo_do_gerador: { rel: REL_REG, bytes: bufReg.length, md5: md5(bufReg) },
    ficheiros: { candidata: { caminho: CAM_CAND, bytes: Buffer.byteLength(rawCand, 'utf8'), md5: md5(Buffer.from(rawCand, 'utf8')) },
      reversao: { caminho: CAM_REV, bytes: Buffer.byteLength(rawRev, 'utf8'), md5: md5(Buffer.from(rawRev, 'utf8')) } },
    predicado_lido_da_fonte: linhaPredicado,
  },
  declaracoes: { candidata: revogados, reversao: devolvidos, estrutura: { candidata: estCand, reversao: estRev } },
  medido_por_nome: porNome,
  censo_vivo: censo,
  o_que_este_verde_nao_autoriza: 'nada: e leitura. Aplicar a candidata, reverter, publicar seja o que for, escrever no banco e git push continuam a pedir cada um a sua frase literal.',
  o_que_este_verde_nao_prova: MODO === 'candidata'
    ? 'que o REVOKE esta aplicado — este modo pressupoe o contrario: prova que o grau esta onde a peca o pode tocar e que a reversao e simetrica. '
    : 'que a peca e suficiente — este modo prova que o REVOKE esta aplicado (entradas ausentes e censo anonimo a zero), nao que bastava. '
    + 'Nao prova o efeito em RLS nem em triggers (o raio de estouro do gerador mede quem cita os nomes, mas o efeito so se ve com sessao), e nao fecha o mecanismo de default privileges.',
  portoes: { total: portoes.length, falhas, lista: portoes },
  veredito,
};
writeFileSync(OUT, JSON.stringify(resultado, null, 2) + '\n');
console.log(veredito);
portoes.forEach((g) => console.log('  portao ' + g.nome + ': ' + (g.verde ? 'VERDE' : 'VERMELHO obtido=' + JSON.stringify(g.obtido) + ' esperado=' + JSON.stringify(g.esperado))));
if (falhas > 0) {
  const vermelho = OUT.replace('.json', '-VERMELHO.json');
  writeFileSync(vermelho, JSON.stringify(resultado, null, 2) + '\n');
  console.error('VERMELHO: registo em ' + OUT + ' e copia em ' + vermelho);
  process.exit(1);
}
console.log('guardado em ' + OUT);
