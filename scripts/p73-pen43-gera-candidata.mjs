#!/usr/bin/env node
// P73-PEN43-GERA-CANDIDATA — o remédio da PEN-43 escrito a partir do que o banco AFIRMA, nunca da minha memória.
// Porque esta peça existe antes do OK e não depois: a PEN-43 está registada como «as quatro funções novas são
// executáveis por anon» e o remédio citado na linha do ledger é um REVOKE por nome ao pseudo-papel `anon`. Esse
// remédio só é correcto sob três condições medidas, e todas envelhecem: (i) o grau do anónimo vem de uma entrada
// EXPLÍCITA na proacl — se vier do default a PUBLIC (proacl NULL), o REVOKE por nome é um no-op decorativo, porque
// o grau continuaria a chegar pela associação a PUBLIC; (ii) as assinaturas com que o REVOKE referencia as funções
// são os tipos que o `CREATE FUNCTION` da candidata declara, porque este servidor devolve identidades COM nomes de
// parâmetro; (iii) «de leitura» é acordado por duas vias independentes — a `provolatile` do catálogo e o que o corpo
// SQL escreve — e o gerador chumba se as duas divergirem. O quarto nome, a porta de etiquetagem, NÃO é revogado
// aqui: se ela continua executável por anónimo (para receber 42501 em vez de 404) é decisão da casa, não deste programa.
// 0 escrita no banco: só SELECTs ao catálogo, contados no registo. Única escrita: os dois .sql novos + o registo.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';
import { assinaturaCorresponde, tiposDeCreateFunction } from './p73-assinatura-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-pen43-gera-candidata-20-11e${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
const CAND = join(REPO, 'scripts/p73-pen43-ddl-candidata.sql');
const REVS = join(REPO, 'scripts/p73-pen43-ddl-reversao.sql');
const t0 = Date.now();
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');

const formas = [];
const q = async (txt) => { formas.push(/^\s*(select|with)\b/i.test(txt)); return sql(txt); };

const itens = (acl) => (acl === 'NULL_POR_DEFAULT' ? [] : String(acl).split('|').map((i) => {
  const eq = i.indexOf('=');
  return { concesso_a: eq < 0 ? i : i.slice(0, eq), graus: eq < 0 ? '' : (i.slice(eq + 1).split('/')[0] || '') };
}));
const temGrau = (acl, papel) => itens(acl).some((x) => x.concesso_a === papel && x.graus.includes('X'));
const temPublic = (acl) => itens(acl).some((x) => (x.concesso_a === 'public' || x.concesso_a === '') && x.graus.includes('X'));
const aclNula = (acl) => acl === 'NULL_POR_DEFAULT';

// (i)+(ii) nomes, tipos e corpo lidos dos ficheiros que os declaram.
const ficheiros = readdirSync(join(REPO, 'scripts')).filter((n) => /^p73-pen\d+-ddl-candidata\.sql$/.test(n)).sort();
const declaradas = [];
for (const n of ficheiros) {
  const texto = readFileSync(join(REPO, 'scripts', n), 'utf8');
  for (const m of texto.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*\(([^)]*)\)/gi)) {
    const nome = m[1];
    const corpo = new RegExp('CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+(?:public\\.)?' + nome + '\\b[\\s\\S]*?\\$fn\\$([\\s\\S]*?)\\$fn\\$', 'i');
    const cb = corpo.exec(texto);
    declaradas.push({
      ficheiro: 'scripts/' + n, nome, tipos: tiposDeCreateFunction(texto, nome),
      escreve_no_corpo: !!cb && /\b(insert\s+into|update\s+\w|delete\s+from|perform\s+\w+\()/i.test(cb[1]),
      corpo_chars: cb ? cb[1].length : 0,
    });
  }
}

const vivo = [];
for (const d of declaradas) {
  const r = await q("select p.proname as nome, p.provolatile as vol, p.prosecdef::text as definer,"
    + " coalesce(array_to_string(p.proacl, '|'), 'NULL_POR_DEFAULT') as acl,"
    + " pg_get_function_identity_arguments(p.oid) as ident"
    + " from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'"
    + " where p.proname = '" + d.nome + "'");
  vivo.push({ ...d, lido: r[0] || null });
}

const classif = vivo.map((v) => {
  const acl = v.lido ? v.lido.acl : 'AUSENTE';
  const vol = v.lido ? v.lido.vol : null;
  return {
    nome: v.nome, ficheiro: v.ficheiro, tipos: v.tipos, corpo_chars: v.corpo_chars,
    vol, definer: v.lido ? v.lido.definer : null, ident: v.lido ? v.lido.ident : null, acl,
    anon_explicito: temGrau(acl, 'anon'), public_explicito: temPublic(acl), acl_nula: aclNula(acl),
    escreve_no_corpo: v.escreve_no_corpo,
    escrita_por_volatilidade: vol === 'v',
    assinatura_casa: !!v.tipos && assinaturaCorresponde(v.tipos, String(v.lido ? v.lido.ident : '')),
  };
});
classif.forEach((c) => { c.acordam = c.escreve_no_corpo === c.escrita_por_volatilidade; });
const deLeitura = classif.filter((c) => !c.escrita_por_volatilidade);
const deEscrita = classif.filter((c) => c.escrita_por_volatilidade);
const revogaveis = (c) => c.anon_explicito && !c.public_explicito && !c.acl_nula;

const assina = (c) => 'public.' + c.nome + '(' + (c.tipos || []).join(', ') + ')';
const textoCand = [
  '-- PEN-43 - candidata de remedio: fecha o grau de EXECUTE do pseudo-papel anon nas funcoes municipais de LEITURA.',
  '-- Gerada por scripts/p73-pen43-gera-candidata.mjs: nomes, tipos e lista de revogados sao lidos dos CREATE FUNCTION',
  '-- das candidatas e da proacl viva, nunca dactilografados. Se uma candidata mudar, este ficheiro e re-gerado ou chumba.',
  '-- Eficacia medida: o grau do anon esta numa entrada EXPLICITA da proacl (nenhuma linha a PUBLIC), por isso o REVOKE',
  '-- por nome e o grau efetivo; se alguma vez passar a vir do default a PUBLIC, o portao da geradora da vermelho.',
  '-- 0 dados tocados: nenhuma linha deste ficheiro escreve em tables. Autorizacao exigida: APLICAR PEN-43 NO BANCO.',
  '',
].join('\n') + deLeitura.map((c) => 'REVOKE EXECUTE ON FUNCTION ' + assina(c) + ' FROM anon;').join('\n') + '\n\n'
  + '-- EM ABERTO (decisao da casa, nao deste ficheiro): ' + deEscrita.map((c) => assina(c)).join(', ') + '\n'
  + '-- e a porta de etiquetagem e tambem hoje executavel por anon. Manter o grau significa receber 42501 de\n'
  + '-- «nao e administrador» em vez de 404 de rota inexistente; revogar significa que um anonimo nem sabe que ela existe.\n'
  + '-- Medido em evidence/p73-sonda-exposicao-anonima-20-11-20-11h.json (4 de 4 com anon=X, escrita nao chamada).\n';
const textoRevs = [
  '-- PEN-43 - reversao do remedio: devolve o EXECUTE ao anon exactamente nos nomes que a candidata revogou.',
  '-- Gerada pelo mesmo programa; a lista e derivada dos mesmos CREATE FUNCTION, nunca recordada.\n',
].join('\n') + deLeitura.map((c) => 'GRANT EXECUTE ON FUNCTION ' + assina(c) + ' TO anon;').join('\n') + '\n';

for (const [p, t] of [[CAND, textoCand], [REVS, textoRevs]]) {
  if (existsSync(p)) { if (md5(readFileSync(p, 'utf8')) !== md5(t)) throw new Error('ABORTA: ' + p + ' difere do gerado — renomear como ANTERIOR e re-correr'); }
  else writeFileSync(p, t);
}

// ---- portoes, com os mundos falsificados dentro da propria corrida ----
const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const W_PUBLIC = { anon_explicito: temGrau('anon=X/postgres|public=X/postgres', 'anon'), public_explicito: temPublic('anon=X/postgres|public=X/postgres'), acl_nula: aclNula('anon=X/postgres|public=X/postgres') };
const W_NULA = { anon_explicito: temGrau('NULL_POR_DEFAULT', 'anon'), public_explicito: temPublic('NULL_POR_DEFAULT', 'anon'), acl_nula: aclNula('NULL_POR_DEFAULT') };
const fixTiposTrocados = assinaturaCorresponde(['text', 'uuid', 'uuid'], 'uuid, uuid, text');
const fixNomesDeParametro = assinaturaCorresponde(['uuid', 'uuid', 'text'], 'p_school uuid, p_municipality uuid, p_reason text');
const soLeituraDe = (nomes) => nomes.every((n) => !(classif.find((c) => c.nome === n) || { escrita_por_volatilidade: true }).escrita_por_volatilidade);
const fixIncluirEscrita = soLeituraDe(deEscrita.map((c) => c.nome).concat(deLeitura.map((c) => c.nome)));
const relectoCand = readFileSync(CAND, 'utf8');
const relectoRevs = readFileSync(REVS, 'utf8');
const conta = (t, re) => (t.match(re) || []).length;

const portoes = [
  g('os_quatro_nomes_sao_lidos_dos_ficheiros_e_resolvem_no_catalogo', declaradas.length === 4 && vivo.every((v) => v.lido) && declaradas.every((d) => d.tipos && d.corpo_chars > 0), { ficheiros, nomes: classif.map((c) => c.nome), tipos_null: classif.filter((c) => !c.tipos).map((c) => c.nome) }),
  g('as_duas_viias_de_classificacao_acordam_em_cada_nome', classif.every((c) => c.acordam), classif.map((c) => `${c.nome}:vol=${c.vol}:corpo_escreve=${c.escreve_no_corpo}`)),
  g('cada_assinatura_da_candidata_casa_com_a_identidade_do_servidor_e_a_regua_tem_dentes', classif.every((c) => c.assinatura_casa) && fixTiposTrocados === false && fixNomesDeParametro === true, { fix_tipos_trocados: fixTiposTrocados, fix_nomes_de_parametro: fixNomesDeParametro, por_nome: classif.map((c) => `${c.nome}:${c.assinatura_casa}:${(c.tipos || []).join('|')}:${c.ident}`) }),
  g('o_revoke_por_nome_e_o_grau_efetivo_e_os_dois_mundos_que_o_negam_disparam', classif.every(revogaveis) && revogaveis(W_PUBLIC) === false && revogaveis(W_NULA) === false, { real: classif.map((c) => `${c.nome}:anon=${c.anon_explicito}:public=${c.public_explicito}:nula=${c.acl_nula}`), mundo_public: W_PUBLIC, mundo_acl_nula: W_NULA }),
  g('a_candidata_revogue_somente_o_que_as_duas_viias_acordam_ser_leitura', deLeitura.length === 3 && deEscrita.length === 1 && soLeituraDe(deLeitura.map((c) => c.nome)) === true && fixIncluirEscrita === false, { leitura: deLeitura.map((c) => c.nome), escrita: deEscrita.map((c) => c.nome), fixture_incluir_escrita: fixIncluirEscrita }),
  g('a_contagem_textual_de_REVOKE_e_de_GRANT_bate_com_a_lista_derivada', conta(relectoCand, /^REVOKE EXECUTE/gm) === deLeitura.length && conta(relectoRevs, /^GRANT EXECUTE/gm) === deLeitura.length && conta(relectoRevs, /^REVOKE/gm) === 0 && conta(relectoCand, /^GRANT/gm) === 0, { revoke_candidata: conta(relectoCand, /^REVOKE EXECUTE/gm), grant_reversao: conta(relectoRevs, /^GRANT EXECUTE/gm), revoke_reversao: conta(relectoRevs, /^REVOKE/gm), grant_candidata: conta(relectoCand, /^GRANT/gm) }),
  g('nenhuma_query_deste_programa_escreveu_no_banco', formas.length === 4 && formas.every((x) => x === true), { queries: formas.length, nao_leitura: formas.filter((x) => !x).length }),
  g('os_dois_ficheiros_sao_o_que_o_gerador_produz_byte_a_byte', md5(relectoCand) === md5(textoCand) && md5(relectoRevs) === md5(textoRevs), { candidata: { bytes: Buffer.byteLength(relectoCand), md5: md5(relectoCand) }, reversao: { bytes: Buffer.byteLength(relectoRevs), md5: md5(relectoRevs) } }),
];

const out = {
  programa: 'scripts/p73-pen43-gera-candidata.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'que REVOKE por nome fecha hoje o grau de anon nas funcoes municipais de leitura, e o que fica por decidir?',
  metodo: 'nomes, tipos e corpo lidos dos CREATE FUNCTION das candidatas em disco; catalogo vivo por SELECT (provolatile, prosecdef, proacl, pg_get_function_identity_arguments); classificacao por duas vias; arquivos gerados com abort se diferirem do produzido',
  candidatas_lidas: ficheiros,
  por_nome: classif,
  revogados: deLeitura.map((c) => c.nome),
  em_aberto: { nomes: deEscrita.map((c) => c.nome), porque: 'porta de etiquetagem: revogar tira ate o 42501; a decisao e da casa' },
  fixtures: { tipos_trocados_nao_casa: fixTiposTrocados, nomes_de_parametro_casam: fixNomesDeParametro, mundo_acl_com_public: W_PUBLIC, mundo_acl_nulo: W_NULA, incluir_escrita_no_rollo: fixIncluirEscrita },
  arquivos: { candidata: { caminho: 'scripts/p73-pen43-ddl-candidata.sql', bytes: Buffer.byteLength(relectoCand), md5: md5(relectoCand) }, reversao: { caminho: 'scripts/p73-pen43-ddl-reversao.sql', bytes: Buffer.byteLength(relectoRevs), md5: md5(relectoRevs) } },
  o_que_nao_prova: 'nao prova que o REVOKE foi aplicado; prova que a candidata existe, que o grau a revogar esta medido na proacl e que a regua de eficacia tem dois mundos que a negam. A aplicacao pede OK literal proprio.',
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? `P73_PEN43_CANDIDATA_OK ${portoes.length}/0` : `P73_PEN43_CANDIDATA_VERMELHO ${falhas.length}`;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`P73_PEN43_CANDIDATA_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('NOMES ' + JSON.stringify(classif.map((c) => `${c.nome}:vol=${c.vol}:anon=${c.anon_explicito}:public=${c.public_explicito}:sig=${c.assinatura_casa}:corpo_escreve=${c.escreve_no_corpo}`)));
console.log('REVOCADOS ' + JSON.stringify(deLeitura.map((c) => c.nome)) + ' · EM_ABERTO ' + JSON.stringify(out.em_aberto.nomes));
console.log('ARQUIVOS ' + JSON.stringify(out.arquivos.candidata) + ' | ' + JSON.stringify(out.arquivos.reversao));
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
