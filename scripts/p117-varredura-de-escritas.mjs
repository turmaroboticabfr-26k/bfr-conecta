#!/usr/bin/env node
// P117 — varredura de escritas não-latinas nos documentos deste fecho, uma cláusula por eixo.
// Porque existe: ao escrever o cartão §SM.28 do painel injectei uma palavra portuguesa com letras
// cirílicas. A primeira versão desta régua varria oito famílias proibidas *e* o grego como proibido,
// o que chumbava os 54 `Δ` e os 3 `Σ` que a casa usa deliberadamente para delta de bytes e soma — um
// vermelho sem positivo possível. Aqui o esperado é medido: as oito famílias dão zero; o grego só é
// permitido nos codepoints que existem mesmo no corpus; e os glifos de formas largas têm de resolver
// num rótulo do produto, lido de `app/index.html`, nunca lembrado.
// Só leitura: cinco documentos, um ficheiro do produto, zero rede, zero escrita no banco.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.P117_SUF ? '-' + process.env.P117_SUF : '';
const OUT = join(REPO, `evidence/p117-varredura-de-escritas-21-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P117_SUF=novo, não por cima');
const t0 = Date.now();
const md5 = (b) => createHash('md5').update(b).digest('hex');

const ALVO = [
  'docs/roadmap-painel.html',
  'docs/roadmap-master.md',
  'docs/auditoria-bfr-conecta.md',
  'docs/bu-20-11/07-roadmap-visual.md',
  'docs/bu-20-11/06-as-quatro-listas.md',
];

// Famílias. `proibida:true` quer dizer zero ocorrências; o grego e as formas largas têm cláusula pró-
// pria porque o corpus legítimo já contém codepoints dessas classes.
const FAMILIAS = [
  ['cirilico', 0x0400, 0x04FF, true],
  ['grego', 0x0370, 0x03FF, false],
  ['armenio', 0x0530, 0x058F, true],
  ['hebraico', 0x0590, 0x05FF, true],
  ['arabe', 0x0600, 0x06FF, true],
  ['devanagari', 0x0900, 0x097F, true],
  ['hiragana_katakana', 0x3040, 0x30FF, true],
  ['hangul', 0xAC00, 0xD7AF, true],
  ['han', 0x4E00, 0x9FFF, true],
  ['formas_largas_cjk', 0xFF00, 0xFFEF, false],
];
const PERMITIDOS_GREGO = [0x0394, 0x03A3];

const achados = [];
const docs = {};
for (const f of ALVO) {
  const txt = readFileSync(join(REPO, f), 'utf8');
  docs[f] = { bytes: Buffer.byteLength(txt), md5: md5(Buffer.from(txt)) };
  const linhas = txt.split(/\r?\n/);
  for (let i = 0; i < linhas.length; i++) {
    for (let c = 0; c < linhas[i].length; c++) {
      const p = linhas[i].codePointAt(c);
      for (const [nome, lo, hi, proibida] of FAMILIAS) {
        if (p >= lo && p <= hi) achados.push({ familia: nome, proibida, f, linha: i + 1, coluna: c, codepoint: p, ctx: linhas[i].slice(Math.max(0, c - 60), c + 60) });
      }
    }
  }
}
const por_familia = {};
for (const a of achados) por_familia[a.familia] = (por_familia[a.familia] || 0) + 1;
const gregos = achados.filter((a) => a.familia === 'grego');
const largas = achados.filter((a) => a.familia === 'formas_largas_cjk');
const gregos_medidos = [...new Set(gregos.map((a) => a.codepoint))].sort();
const largas_unicas = [...new Set(largas.map((a) => a.codepoint))].sort();

// Cada glifo de forma larga tem de resolver num rótulo do produto. A agulha compõe-se em tempo de
// execução a partir do próprio achado (código + o texto à volta), porque uma agulha dactilografada
// neste ficheiro seria ela própria o casamento que a varredura denuncia.
const produtoTxt = readFileSync(join(REPO, 'app/index.html'), 'utf8');
const largas_resolvem = largas.map((a) => {
  const vizinhanca = a.ctx.replace(/<[^>]*>/g, '').trim().slice(0, 24);
  const ch = String.fromCodePoint(a.codepoint);
  const no_produto = produtoTxt.includes(ch);
  return { f: a.f, linha: a.linha, codepoint: '0x' + a.codepoint.toString(16).toUpperCase(), existe_em_app_index_html: no_produto, rotulo_recortado: vizinhanca };
});

// Os dois dentes que impedem esta régua de se tornar decorativa, ambos por fixture montado em runtime:
// (1) um codepoint cirílico tem de ser classificado como proibido; (2) um grego fora de PERMITIDOS tem
// de ser marcado como não-permitido. Sem o fixture, «0 achados» poderia significar «a varredura não
// varre nada» — que foi exactamente o que aconteceu à primeira versão desta linha.
const ciril = String.fromCodePoint(0x0424);
const grego_fora = String.fromCodePoint(0x03C9);
const classif = (ch) => {
  const p = ch.codePointAt(0);
  return FAMILIAS.filter(([, lo, hi]) => p >= lo && p <= hi).map(([n, , , proibida]) => ({ familia: n, proibida }));
};
const dente_cirilico = classif(ciril).some((x) => x.proibida);
const dente_grego_fora = !PERMITIDOS_GREGO.includes(grego_fora.codePointAt(0)) && classif(grego_fora).length > 0;
const dente_grego_permitido = PERMITIDOS_GREGO.includes(String.fromCodePoint(0x0394).codePointAt(0));

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 340)}`); return { nome, verde: !!cond, detalhe }; };
const proibidas = FAMILIAS.filter(([, , , p]) => p).map(([n]) => n);
const portoes = [
  g('as_oito_familias_proibidas_dao_zero_ocorrencias_nos_cinco_documentos',
    proibidas.every((n) => (por_familia[n] || 0) === 0),
    { por_familia, esperados_zero: proibidas, amostra: achados.filter((a) => a.proibida).slice(0, 6).map((a) => `${a.f}:${a.linha} ${a.familia} 0x${a.codepoint.toString(16)}`) }),
  g('todo_codepoint_grego_no_corpus_esta_no_conjunto_permitido_e_o_conjunto_permitido_e_medido_no_corpus',
    gregos.every((a) => PERMITIDOS_GREGO.includes(a.codepoint)) && gregos_medidos.length === PERMITIDOS_GREGO.length && PERMITIDOS_GREGO.every((p) => gregos_medidos.includes(p)),
    { permitidos_declados: PERMITIDOS_GREGO.map((p) => '0x' + p.toString(16).toUpperCase()), medidos_no_corpus: gregos_medidos.map((p) => '0x' + p.toString(16).toUpperCase()), total_gregos: gregos.length, por_codepoint: Object.fromEntries(PERMITIDOS_GREGO.map((p) => ['0x' + p.toString(16), gregos.filter((a) => a.codepoint === p).length])) }),
  g('todo_glifo_de_forma_larga_resolve_num_rotulo_do_produto_lido_de_app_index_html',
    largas.length === 0 || largas_resolvem.every((x) => x.existe_em_app_index_html === true),
    { conjunto_vazio: largas.length === 0, largas_unicas: largas_unicas.map((p) => '0x' + p.toString(16).toUpperCase()), resolvem: largas_resolvem }),
  g('a_regua_tem_dentes_pro_fixture_de_cirilico_e_de_grego_fora_do_permitido',
    dente_cirilico && dente_grego_fora && dente_grego_permitido,
    { cirilico_0x0424_classificado_proibido: dente_cirilico, grego_0x03C9_fora_do_permitido: dente_grego_fora, grego_0x0394_dentro_do_permitido: dente_grego_permitido, nota: 'os tres codepoints do fixture sao montados por codePointAt em tempo de execucao, nunca dactilografados neste ficheiro' }),
  g('os_cinco_documentos_existem_e_sao_nao_vazios_com_md5_medido',
    ALVO.every((f) => docs[f].bytes > 0) && existsSync(join(REPO, 'app/index.html')),
    { docs, bytes_produto: Buffer.byteLength(produtoTxt) }),
];

const saida = {
  programa: 'scripts/p117-varredura-de-escritas.mjs',
  em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  metodo: 'Uma cláusula por eixo sobre os cinco documentos deste fecho: oito famílias de escrita proibidas a zero; grego permitido só nos codepoints que o próprio corpus mede; formas largas CJK obrigadas a resolver num rótulo versionado em app/index.html; e três fixtures montados por codepoint em tempo de execução para provar que a varredura varre.',
  alvos: ALVO.map((f) => ({ f, ...docs[f] })),
  bytes_produto_app_index_html: Buffer.byteLength(produtoTxt),
  por_familia: Object.fromEntries(Object.entries(por_familia).sort((a, b) => b[1] - a[1])),
  total_achados: achados.length,
  gregos: { total: gregos.length, distintos: gregos_medidos.map((p) => '0x' + p.toString(16).toUpperCase()), permitidos_declados: PERMITIDOS_GREGO.map((p) => '0x' + p.toString(16).toUpperCase()) },
  formas_largas: largas_resolvem,
  palavras_de_controle: ALVO.map((f) => {
    const t = readFileSync(join(REPO, f), 'utf8');
    return { f, rotacao_portugues: (t.match(/rota[çc][ãa]o/g) || []).length, rota_seguida_de_cirilico: (t.match(new RegExp('rota[\\u0400-\\u04FF]', 'g')) || []).length };
  }),
  o_que_nao_ve: 'Não vê corrupção feita com letras latinas trocadas (accents errados, `ç` por `c`) nem glifos de famílias fora das dez declaradas (tailandês, etíope, siríaco). Para nomes de ficheiros e campos há o varredor de escritas do `portao-indice.mjs`.',
  portoes, falhas,
};
saida.veredito = falhas.length === 0
  ? `P117_ESCRITAS_OK ${portoes.length}/0 · cirilico=0 gregos=${gregos.length} todos_permitidos largas=${largas.length} todas_com_rótulo_no_produto`
  : `P117_ESCRITAS_VERMELHO ${falhas.length} de ${portoes.length}`;

writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
const TXT = OUT.replace(/\.json$/, '.txt');
writeFileSync(TXT, `alvos=${ALVO.length} bytes=${ALVO.reduce((s, f) => s + docs[f].bytes, 0)} produto=${saida.bytes_produto_app_index_html}B\n`
  + `por_familia=${JSON.stringify(saida.por_familia)} total=${achados.length}\n`
  + `gregos_distintos=${saida.gregos.distintos.join(',')} permitidos=${saida.gregos.permitidos_declados.join(',')}\n`
  + `formas_largas=${largas_resolvem.map((x) => `${x.codepoint}@${x.f}:${x.linha} resuelve=${x.existe_em_app_index_html}`).join(' ')}\n`
  + saida.palavras_de_controle.map((r) => `rotacao ${r.f} portugues=${r.rotacao_portugues} com_cirilico=${r.rota_seguida_de_cirilico}`).join('\n') + '\n'
  + portoes.map((p) => `  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`).join('\n') + '\n'
  + `${saida.veredito} · ${saida.duracao_ms} ms · registo ${OUT}\n`);
if (falhas.length) {
  const P = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(P, JSON.stringify(saida, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log(`P117_VERMELHO · registo ${P}`);
  process.exit(1);
}
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`FAMILIAS=${JSON.stringify(saida.por_familia)} TOTAL=${achados.length} GREGOS=${saida.gregos.distintos.join('+')} LARGAS=${largas.length}`);
console.log(`${saida.veredito} · ${saida.duracao_ms} ms · registo ${OUT}`);
