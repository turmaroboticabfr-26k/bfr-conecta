#!/usr/bin/env node
// V138 — candidata do painel municipal por município (PEN-39 deixa de ser DDL morto).
//
// O que existe porque alguém mediu: `scripts/p73-sonda-uso-quatro.mjs` (corrida `evidence/p73-sonda-uso-quatro-na-v136-20-11.json`,
// `P73_USO_QUATRO_NA_V136_VERDE 6/0 · 4 nomes · 0 ocorrencias`) provou que o módulo servido não chama nenhum dos
// quatro nomes novos do banco. Enquanto isso for verdade, a PEN-39 é uma função que ninguém chama. Esta peça escreve
// o consumo: duas chamadas RPC dentro do invólucro `data-bfr-municipal-module`, na mesma forma de `ler` (linhas,
// erro, total, cache), e um painel que pinta os grupos por município e por zona sem escrever um número à mão.
//
// Regras que esta peça obedece: 0 deploy, 0 DDL, 0 escrita no ar, 0 toque na v136 (a origem é lida e re-lida com a
// mesma pegada), e única escrita = bfr-candidata-v138-painel-municipal/ (index.html + portões). Se o diretório já
// existir, verifica byte a byte; se diferir, aborta. Os dois nomes de RPC e as colunas do desenho LEM do DDL aplicado
// (scripts/p73-pen39-ddl-candidata.sql) — se a PEN-39 mudar de assinatura, este gerador chumba em vez de pintá-la velha.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Script } from 'node:vm';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ORIGEM = join(DIR, 'bfr-candidata-v136-secretaria-de-educacao/index.html');
const DIARIO136 = join(DIR, 'audit-publicacao-v136.json');
const DIARIO138 = join(DIR, 'audit-publicacao-v138.json');
const ESP137 = join(DIR, 'worker-deploy-v137-remendo-pen40/esperado-v137.json');
const DDL39 = join(DIR, 'scripts/p73-pen39-ddl-candidata.sql');
const PARA = join(DIR, 'bfr-candidata-v138-painel-municipal');
const SAIDA = join(PARA, 'index.html');
const PORTOES = join(PARA, 'portoes-v138-candidata.json');
const EV = join(DIR, 'evidence/v138-gera-candidata-20-11.json');
const EVV = join(DIR, 'evidence/v138-gera-candidata-20-11-VERMELHO.json');
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const bytes = (s) => Buffer.byteLength(s, 'utf8');
// Os diários de publicação guardam a pegada como UMA string composta, `"<md5> (<N> B)"`; comparar essa string
// com um md5 de 32 caracteres é sempre falso. Des-compacta-se e conferem-se os dois lados.
const pegada = (v) => {
  const m = /^([0-9a-f]{32}) \((\d+) B\)$/.exec(String(v));
  return m ? { md5: m[1], bytes: Number(m[2]) } : { md5: String(v), bytes: null };
};
const batePegada = (rec, md5Esperado, bytesEsperado) => rec.md5 === md5Esperado && (rec.bytes === null || rec.bytes === bytesEsperado);

for (const p of [EV, EVV]) if (existsSync(p)) throw new Error('ABORTA: artefacto ' + p + ' já existe — renomear como ANTERIOR e re-correr');
const t0 = Date.now();
const html = readFileSync(ORIGEM, 'utf8');
const md5Origem = md5(html);
const bytesOrigem = bytes(html);
const diario = JSON.parse(readFileSync(DIARIO136, 'utf8'));
const esp137 = JSON.parse(readFileSync(ESP137, 'utf8'));

// ── 1. o invólucro do módulo, uma só vez ────────────────────────────────────────────────────────────────
const abre = /<script\b[^>]*\bdata-bfr-municipal-module\b[^>]*>/.exec(html);
const idxAbre = html.indexOf(abre[0]);
const desde = idxAbre + abre[0].length;
const ateFim = html.indexOf('</script>', desde);
const dentro = html.slice(desde, ateFim);

// ── 2. nomes e colunas lêem-se do DDL que está no banco ─────────────────────────────────────────────────
// O `RETURNS TABLE` da PEN-39 traz `uf char(2)` no meio da lista: um `[^)]*` corta a lista ali e devolve as
// três primeiras colunas, o que faria este gerador chumbar colunas que o banco de facto devolve. Por isso a
// extracção percorre os parênteses por profundidade e parte as vírgulas só na profundidade 1.
const ddl = readFileSync(DDL39, 'utf8');
function colunasDeTable(texto, desdeParentese) {
  const partes = [];
  let atual = '', profundidade = 1, i = desdeParentese;
  while (i < texto.length) {
    const ch = texto[i];
    if (ch === '(') { profundidade++; atual += ch; }
    else if (ch === ')') { profundidade--; if (profundidade === 0) { partes.push(atual); break; } atual += ch; }
    else if (ch === ',' && profundidade === 1) { partes.push(atual); atual = ''; }
    else atual += ch;
    i++;
  }
  return partes.map((p) => p.trim().split(/\s+/)[0]).filter((c) => /^[a-z_][a-z0-9_]*$/i.test(c));
}
function funcoesDoDDL(texto) {
  const re = /CREATE\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*\(\s*\)\s*RETURNS\s+TABLE\s*\(/gi;
  const out = [];
  let m;
  while ((m = re.exec(texto)) !== null) out.push({ nome: m[1], colunas: colunasDeTable(texto, re.lastIndex) });
  return out;
}
const funcs = funcoesDoDDL(ddl);
// O dente do parser, provado num mundo fabricado desta corrida: uma lista com `char(2)` no meio tem de chegar
// às colunas que vêm depois dele, e uma coluna que o snippet não declara não pode aparecer.
const FIX_DDL = 'CREATE FUNCTION public.f_x() \nRETURNS TABLE (a uuid, b char(2), c integer, d boolean)\nLANGUAGE sql AS $fn$ SELECT 1; $fn$;';
const fixCols = funcoesDoDDL(FIX_DDL)[0].colunas;
const denteDoParser = fixCols.join(',') === 'a,b,c,d' && funcoesDoDDL(FIX_DDL).every((f) => !f.colunas.includes('escolas_fantasmas'));
const TOTAIS = funcs.find((f) => /totais/.test(f.nome));
const DISTRIB = funcs.find((f) => /distribuicao/.test(f.nome));
const COLUNAS = new Set(funcs.flatMap((f) => f.colunas));
const NOME_ESCRITA = 'bfr_school_set_municipality';

// ── 3. as três substituições (âncoras contadas, não aproximadas) ────────────────────────────────────────
const A1 = '  const CARREGADORES = {';
const A2 = '      return { escolas, alunos, turmas, processos, freq, profissionais };';
const A3 = '      + avisoEscopo(d.alunos, es.length);';
const A4 = '  function painel(d) {';
const B1 = [
  '  // V138 (PEN-39): os dois agregados do municipio vivem no banco e leem-se por RPC. Os nomes e as colunas',
  '  // deste bloco nao sao dactilografados — o gerador le-os de scripts/p73-pen39-ddl-candidata.sql e chumba se',
  '  // o desenho usar uma coluna que o DDL nao devolve.',
  "  const NOME_TOTAIS = '" + (TOTAIS ? TOTAIS.nome : '') + "';",
  "  const NOME_DISTRIB = '" + (DISTRIB ? DISTRIB.nome : '') + "';",
  '  async function lerRpc(chave, nome, params) {',
  '    const c = client();',
  "    if (!c || typeof c.rpc !== 'function') return { linhas: [], total: 0, erro: 'sem cliente Supabase com rpc' };",
  '    if (cache[chave]) return cache[chave];',
  '    estado.carregando[chave] = true; desenharCabeca();',
  '    try {',
  '      const r = await c.rpc(nome, params || {});',
  '      const rows = Array.isArray(r.data) ? r.data : (r.data ? [r.data] : []);',
  "      const out = { linhas: rows, erro: r.error ? (r.error.message || r.error.code || 'erro') : '', total: rows.length };",
  '      if (out.erro) estado.erros[chave] = out.erro;',
  '      cache[chave] = out; return out;',
  '    } catch (e) {',
  '      const out = { linhas: [], total: 0, erro: String((e && e.message) || e) };',
  "      estado.erros[chave] = out.erro; return out;",
  '    } finally { estado.carregando[chave] = false; }',
  '  }',
  '',
].join('\n') + A1;
const B2 = [
  '      const totais = await lerRpc(\'municipal_totais\', NOME_TOTAIS, {});',
  '      const zonas = await lerRpc(\'municipal_zonas\', NOME_DISTRIB, {});',
  '      return { escolas, alunos, turmas, processos, freq, profissionais, totais, zonas };',
].join('\n');
const B4 = [
  '  function painelMunicipal(d) {',
  "    const t = d.totais || { linhas: [], erro: 'ausente neste carregamento' };",
  "    const z = d.zonas || { linhas: [], erro: 'ausente neste carregamento' };",
  '    if (t.erro) return \'<div class="mun-warn"><strong>\' + esc(NOME_TOTAIS) + \' nao respondeu</strong><div>\' + esc(t.erro) + \'</div></div>\';',
  '    const grupos = (t.linhas || []).filter((r) => r.municipio != null && !r.e_bucket_sem_municipio);',
  '    const semCasa = (t.linhas || []).filter((r) => r.e_bucket_sem_municipio);',
  "    const cartoes = grupos.map((r) => cartao(esc(r.nome || 'sem nome') + ' (' + esc(r.uf || '--') + ')', num(r.escolas) + ' escolas',",
  "      'alunos ' + num(r.alunos) + ' · turmas ' + num(r.turmas) + ' · sem zona ' + num(r.escolas_sem_zona)",
  "      + ' · em funcionamento ' + num(r.escolas_ativas) + ' · fora de ativo ' + num(r.escolas_fora_de_ativo))).join('');",
  "    const cartaoSemCasa = semCasa.map((r) => cartao('Escolas ainda sem municipio', num(r.escolas),",
  "      'grupo devolvido por ' + esc(NOME_TOTAIS) + ' com o bucket a true · alunos ' + num(r.alunos))).join('');",
  '    const porZona = {};',
  '    for (const r of (z.linhas || [])) {',
  "      const k = (r.zona == null ? 'sem zona declarada' : String(r.zona));",
  '      const a = porZona[k] || { escolas: 0, alunos: 0 };',
  '      a.escolas += Number(r.escolas || 0); a.alunos += Number(r.alunos || 0); porZona[k] = a;',
  '    }',
  '    const linhasZona = Object.keys(porZona).sort((a, b) => porZona[b].escolas - porZona[a].escolas)',
  "      .map((k) => '<span class=\"mun-chip\">' + esc(k) + ' · ' + num(porZona[k].escolas) + ' escolas · ' + num(porZona[k].alunos) + ' alunos</span>').join(' ');",
  '    return \'<div class="mun-panel"><h3>Rede por municipio (contagem do banco, via RPC)</h3><div class="mun-cards">\'',
  "      + (cartoes + cartaoSemCasa || '<div class=\"mun-empty\">' + esc(NOME_TOTAIS) + ' devolveu 0 grupos: nenhum municipio tem escolas ligadas por este acesso — ligar escola a municipio e a etapa 1 do runbook, e o painel nao inventa a linha.</div>')",
  '      + \'</div></div>\'',
  '      + \'<div class="mun-panel"><h3>Distribuidao por zona</h3><div class="mun-filters">\'',
  "      + (linhasZona || '<div class=\"mun-empty\">' + esc(NOME_DISTRIB) + ' devolveu 0 linhas por este acesso.</div>')",
  "      + (z.erro ? '<div class=\"mun-warn\">' + esc(NOME_DISTRIB) + ' nao respondeu: ' + esc(z.erro) + '</div>' : '')",
  '      + \'</div></div>\';',
  '  }',
  '',
].join('\n') + A4;
const B3 = '      + painelMunicipal(d)\n' + A3;

const alvo = (ancora) => html.indexOf(ancora);
const ancoras = [[A1, B1], [A2, B2], [A3, B3], [A4, B4]];
let novo = html;
const substituicoes = [];
for (const [de, para] of ancoras) {
  const c = n(novo, de);
  substituicoes.push({ ancora_chars: de.length, ocorrencias: c, dentro_do_involucro: alvo(de) >= desde && alvo(de) <= ateFim, doc_linha: c ? novo.slice(0, alvo(de)).split('\n').length : null });
  if (c !== 1) throw new Error('ABORTA: ancora com ' + c + ' ocorrencias — o desenho do modulo mudou, este gerador nao adivinha: ' + JSON.stringify(de.slice(0, 60)));
  novo = novo.split(de).join(para);
}

// ── 4. o corpo do módulo resultante, re-extraído e compilado ────────────────────────────────────────────
const abreNovo = /<script\b[^>]*\bdata-bfr-municipal-module\b[^>]*>/.exec(novo);
const desdeNovo = novo.indexOf(abreNovo[0]) + abreNovo[0].length;
const fimNovo = novo.indexOf('</script>', desdeNovo);
const dentroNovo = novo.slice(desdeNovo, fimNovo);
let compila = true, erroCompila = null;
try { new Script(dentroNovo); } catch (e) { compila = false; erroCompila = String(e && e.message); }
let compilaPartido = true;
try { new Script(dentroNovo + '  function { '); } catch (e) { compilaPartido = false; }
const foraAntes = md5(html.slice(0, desde) + html.slice(ateFim));
const foraDepois = md5(novo.slice(0, desdeNovo) + novo.slice(fimNovo));
const blocoDesenho = dentroNovo.slice(dentroNovo.indexOf('function painelMunicipal(d)'), dentroNovo.indexOf('function painel(d)'));
const camposLidosDoDesenho = [...blocoDesenho.matchAll(/\br\.([a-z_][a-z0-9_]*)/g)].map((m) => m[1]);
const camposForaDoDDL = [...new Set(camposLidosDoDesenho.filter((c) => !COLUNAS.has(c)))];
const colunaInventadaNaLista = COLUNAS.has('escolas_fantasmas');

let comoEscrita;
if (existsSync(SAIDA)) {
  if (md5(readFileSync(SAIDA, 'utf8')) !== md5(novo)) throw new Error('ABORTA: ' + SAIDA + ' difere do gerado — renomear a árvore como ANTERIOR e re-correr');
  comoEscrita = 'nao reescrita nesta corrida: ja existia e bate byte a byte com o gerado';
} else { if (!existsSync(PARA)) mkdirSync(PARA); writeFileSync(SAIDA, novo); comoEscrita = 'escrita agora'; }

const relectura = readFileSync(SAIDA, 'utf8');
const falhas = [];
const G = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  G('a_origem_e_a_shell_que_o_diario_da_v136_registou_e_que_o_esperado_da_v137_estende', batePegada(pegada(diario.md5.shell_depois_v136), md5Origem, bytesOrigem) && batePegada(pegada(diario.md5['bfr-candidata-v136-secretaria-de-educacao/index.html']), md5Origem, bytesOrigem) && batePegada(pegada(esp137.htmlMd5), md5Origem, bytesOrigem) && (esp137.htmlBytes === undefined || esp137.htmlBytes === bytesOrigem) && !batePegada(pegada(md5Origem + ' (1 B)'), md5Origem, bytesOrigem) && !batePegada(pegada('f'.repeat(32) + ' (' + bytesOrigem + ' B)'), md5Origem, bytesOrigem), { origem: { md5: md5Origem, bytes: bytesOrigem }, diario_shell: diario.md5.shell_depois_v136, diario_candidata: diario.md5['bfr-candidata-v136-secretaria-de-educacao/index.html'], esperado_v137_htmlMd5: esp137.htmlMd5, esperado_v137_htmlBytes: esp137.htmlBytes, fixtures_rejeitados: ['bytes trocados', 'md5 trocado'] }),
  G('o_involucro_do_modulo_e_unico_e_o_ancorado_cai_todo_dentro_dele', n(html, abre[0]) === 1 && dentro.length > 5000 && substituicoes.every((s) => s.ocorrencias === 1 && s.dentro_do_involucro === true), { involucre: { desde: idxAbre, corpo_chars: dentro.length }, substituicoes }),
  G('os_dois_nomes_de_RPC_sao_lidos_do_DDL_e_aparecem_exactamente_uma_vez_cada', !!TOTAIS && !!DISTRIB && TOTAIS.nome !== DISTRIB.nome && n(dentroNovo, "'" + TOTAIS.nome + "'") === 1 && n(dentroNovo, "'" + DISTRIB.nome + "'") === 1, { ddl_funcoes: funcs.map((f) => f.nome + '(' + f.colunas.join('|') + ')'), nomes: [TOTAIS && TOTAIS.nome, DISTRIB && DISTRIB.nome] }),
  G('a_porta_de_etiquetagem_nao_e_chamada_pela_candidata', n(dentroNovo, NOME_ESCRITA) === 0, { ocorrencias_do_nome_de_escrita: n(dentroNovo, NOME_ESCRITA) }),
  G('cada_coluna_que_o_desenho_le_esta_no_RETURNS_TABLE_do_DDL_e_a_regua_tem_dente', camposForaDoDDL.length === 0 && camposLidosDoDesenho.length >= 8 && colunaInventadaNaLista === false && denteDoParser, { lidas: [...new Set(camposLidosDoDesenho)], fora_do_ddl: camposForaDoDDL, fixture_coluna_inventada: colunaInventadaNaLista, ddl_colunas: funcs.map((f) => f.nome + '(' + f.colunas.length + '): ' + f.colunas.join(',')), fixture_parser_char_com_parenteses: fixCols.join(',') }),
  G('o_corpo_do_modulo_resultante_compila_e_uma_variavel_partida_nao_compila', compila === true && compilaPartido === false, { compila, erro_compila: erroCompila, fixture_partido_compila: compilaPartido }),
  G('nada_fora_do_involucre_mudou_byte_a_byte_e_a_v136_ficou_intacta', foraAntes === foraDepois && md5(readFileSync(ORIGEM, 'utf8')) === md5Origem, { fora_antes: foraAntes, fora_depois: foraDepois, origem_relida: md5(readFileSync(ORIGEM, 'utf8')) }),
  G('a_candidata_escrita_e_o_que_o_gerador_produz_e_nao_esta_publicada', md5(relectura) === md5(novo) && !existsSync(DIARIO138), { saida: { bytes: bytes(relectura), md5: md5(relectura) }, bundle_existe: existsSync(join(DIR, 'worker-deploy-v138-painel-municipal')), diario_de_publicacao_existe: existsSync(DIARIO138),
    porque_bundle_nao_decide: 'o marcador de publicacao neste repo e audit-publicacao-vNNN.json: existe para v133, v134, v135 e v136 e nao existe para a v137, cujo worker-deploy-v137-remendo-pen40 esta no disco ha dois dias sem deploy — o bundle local e um passo de preparacao, nao de publicacao' }),
];
const veredito = falhas.length === 0 ? 'V138_CANDIDATA_OK ' + portoes.length + '/0' : 'V138_CANDIDATA_VERMELHO ' + falhas.length;
const registo = {
  version: 'v138', em: new Date().toISOString(), escrita: comoEscrita, duracao_ms: Date.now() - t0,
  pen: 'PEN-39 (v138): o painel municipal passa a chamar as duas RPC de agregados; enquanto isto nao for publicado a PEN-39 e DDL que ninguem chama',
  origem: { dir: 'bfr-candidata-v136-secretaria-de-educacao', ficheiro: 'index.html', md5: md5Origem, bytes: bytes(html) },
  saida: { dir: 'bfr-candidata-v138-painel-municipal', ficheiro: 'index.html', md5: md5(relectura), bytes: bytes(relectura) },
  fonte_dos_nomes: { ficheiro: 'scripts/p73-pen39-ddl-candidata.sql', funcoes: funcs },
  substituicoes,
  invariantes: { involucro_unico: n(html, abre[0]) === 1, fora_do_involucre_identico: foraAntes === foraDepois, v136_intacta: md5(readFileSync(ORIGEM, 'utf8')) === md5Origem, modulo_chars: { antes: dentro.length, depois: dentroNovo.length } },
  superficie_depois: { chamadas_de_rpc_no_modulo: [...dentroNovo.matchAll(/\bc\.rpc\(/g)].length, nomes_declados: [TOTAIS && TOTAIS.nome, DISTRIB && DISTRIB.nome], colunas_lidas_no_desenho: [...new Set(camposLidosDoDesenho)], painelMunicipal_definido: n(dentroNovo, 'function painelMunicipal(d)') === 1, painelMunicipal_chamado: n(dentroNovo, '+ painelMunicipal(d)') === 1 },
  delta_bytes: bytes(novo) - bytes(html),
  publicado: false,
  ok_literal_em_falta: '(sem OK literal — candidata pronta; a publicacao exige OK literal novo, e o bundle v138 ainda por gerar)',
  o_que_ainda_nao_e_prova: 'nada deste registo prova o que a tela mostra ao utilizador: isso mede-se no browser depois de publicar (a sonda de uso dos quatro nomes passa entao a contar 2 nomes no modulo servido). O que aqui se prova e a candidata: texto, ancoras, colunas e compilacao.',
  portoes, veredito,
};
writeFileSync(PORTOES, JSON.stringify(registo, null, 2) + '\n');
for (const p of portoes) console.log('  portao ' + p.nome + ': ' + (p.verde ? 'VERDE' : 'VERMELHO'));
if (falhas.length) {
  writeFileSync(EVV, JSON.stringify({ ...registo, falhas }, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log('V138_CANDIDATA_VERMELHO ' + falhas.length + ' · registo ' + EVV);
  process.exit(1);
}
writeFileSync(EV, JSON.stringify({ ...registo, falhas }, null, 2) + '\n');
console.log('ORIGEM ' + md5Origem + ' ' + registo.origem.bytes + ' B · SAIDA ' + registo.saida.md5 + ' ' + registo.saida.bytes + ' B · delta ' + registo.delta_bytes + ' B');
console.log('NOMES ' + JSON.stringify(registo.superficie_depois.nomes_declados) + ' · rpc_no_modulo ' + registo.superficie_depois.chamadas_de_rpc_no_modulo + ' · colunas ' + JSON.stringify(registo.superficie_depois.colunas_lidas_no_desenho));
console.log(veredito + ' · ' + registo.duracao_ms + ' ms · portoes ' + PORTOES + ' · registo ' + EV);
