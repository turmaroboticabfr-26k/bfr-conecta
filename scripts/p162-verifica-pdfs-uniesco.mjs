#!/usr/bin/env node
// P162 — SONDA DOS PDFs PUBLICOS (24/11). Classifica, por leitura, cada PDF servido no bundle v144c:
// cru: paginas (catalogo /Count e /Type /Page), imagens (/Subtype /Image, /XObject), FlateDecode, Tj/TJ;
// inflado: por stream FlateDecode mede bytes inflados, BT, Tj/TJ e, so nos streams de conteudo, os pedacos
// de texto e BFR/UNIESCO/CONECTA no texto visivel concatenado.
// E sonda, NAO e portao: classifica e sai 0. Nao publica, nao escreve fora de evidence/.
// A corrida "a" media so os crus e classificou os 3 como raster — o calendario e vetorial com texto.
// A corrida "b" pediu BT a qualquer stream inflado e apanhou BT/TJ de ruido binario: o stream /Image do
// horario-vespertino tem 1 "BT" em 6 MB de pixeis, deu 382 "pedacos" de lixo (1 294 907 B) e classificou
// o raster como vetorial. Da regra: heConteudo exige BT e Tj/TJ NO MESMO stream e exclui ditados /Image e
// /FontFile; o positivo prova-se no calendario (2 streams de conteudo reais) e o negativo nos horarios.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const heConteudo = (s) => s.BT > 0 && s.tj_tj_inflado > 0 && !/\/Image/.test(s.subtype_do_dict) && !/FontFile/.test(s.subtype_do_dict);

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.argv[2];
if (!SUF) { console.error('uso: node scripts/p162-verifica-pdfs-uniesco.mjs <sufixo>'); process.exit(2); }
const OUT_JSON = `${REPO}/evidence/p162-pdfs-24-11-${SUF}.json`;
const OUT_TXT = `${REPO}/evidence/p162-pdfs-24-11-${SUF}.txt`;
if (existsSync(OUT_JSON) || existsSync(OUT_TXT)) throw new Error('ABORTA: saida p162 com sufixo ' + SUF + ' ja existe — nunca se sobrescreve');

const PDFS = ['calendario-letivo-2026.pdf', 'horario-matutino-2026.pdf', 'horario-vespertino-2026.pdf'];
const medido = {};
for (const nome of PDFS) {
  const buf = readFileSync(`${REPO}/worker-deploy-v144c-uniesco/public/${nome}`);
  const txt = buf.toString('latin1');
  const conta = (re) => (txt.match(re) || []).length;
  const counts = (txt.match(/\/Count\s+(\d+)/g) || []).map((m) => Number(/\d+/.exec(m)[0]));
  const iBfr = txt.toLowerCase().indexOf('bfr');
  const contexto_bfr_cru = iBfr >= 0 ? txt.slice(Math.max(0, iBfr - 60), iBfr + 60) : null;
  const streams = [];
  const dictRe = /<<([^>]*)>>\s*stream\r?\n/g;
  let d;
  while ((d = dictRe.exec(txt))) {
    if (!/FlateDecode/.test(d[1])) continue;
    const ini = dictRe.lastIndex;
    const fim = txt.indexOf('endstream', ini);
    if (fim < 0) break;
    const corpo = txt.slice(ini, fim).replace(/\r?\n$/, '');
    let inf;
    try { inf = inflateSync(Buffer.from(corpo, 'latin1')).toString('latin1'); } catch { continue; }
    const contaInf = (r) => (inf.match(r) || []).length;
    const s = {
      bytes_inflados: inf.length,
      subtype_do_dict: (/Subtype\s*\/\w+/.exec(d[1]) || ['sem /Subtype no dict'])[0],
      BT: contaInf(/BT/g),
      tj_tj_inflado: contaInf(/Tj|TJ/g),
    };
    s.e_he_conteudo = heConteudo(s);
    s.pedacos_de_texto = s.e_he_conteudo ? [...inf.matchAll(/\(((?:[^()\\]|\\.)*)\)/g)].map((m) => m[1]).length : 0;
    s.texto_visivel = s.e_he_conteudo ? [...inf.matchAll(/\(((?:[^()\\]|\\.)*)\)/g)].map((m) => m[1]).join('') : '';
    streams.push(s);
  }
  const textoTotal = streams.filter((s) => s.e_he_conteudo).map((s) => s.texto_visivel).join('');
  medido[nome] = {
    bytes: buf.length,
    paginas_pelo_count_do_catalogo: counts,
    paginas_soma_do_count: counts.reduce((a, b) => a + b, 0),
    ocorrencias_de_pagina_solta: conta(/\/Type\s*\/Page[^s]/g),
    imagens_subtype_image_cru: conta(/\/Subtype\s*\/Image/g),
    xobjects_cru: conta(/\/XObject/g),
    flate_decode_cru: conta(/\/FlateDecode/g),
    tj_tj_cru: conta(/Tj|TJ/g),
    bfr_bruto_latin1: conta(/BFR/gi),
    contexto_bfr_cru,
    streams,
    texto_visivel_concatenado: textoTotal,
    bfr_no_texto: (textoTotal.match(/BFR/g) || []).length,
    uniesco_no_texto: (textoTotal.match(/UNIESCO/g) || []).length,
    conecta_no_texto: (textoTotal.match(/[Cc]onecta|CONECTA/g) || []).length,
    classificacao: (() => {
      const temConteudo = streams.some((s) => s.e_he_conteudo);
      const todosImage = streams.length >= 1 && streams.every((s) => /\/Image/.test(s.subtype_do_dict));
      if (temConteudo) return 'vetorial_com_texto';
      if (todosImage) return 'raster';
      return 'indeterminado';
    })(),
  };
}
const classes = { raster: 0, vetorial_com_texto: 0, indeterminado: 0 };
for (const m of Object.values(medido)) classes[m.classificacao]++;
const veredito = `P162_PDFS_CLASSIFICADOS raster=${classes.raster} texto=${classes.vetorial_com_texto} indeterminado=${classes.indeterminado}`;
const saida = {
  veredito, medido, classes,
  nota: 'sonda de leitura: classifica cada PDF pelos streams FlateDecode inflados; stream de conteudo = BT e Tj/TJ no mesmo stream e ditado fora de /Image e /FontFile; "raster" = so streams /Image; a marca dentro de um raster nao e mensuravel sem OCR; bfr_bruto_latin1 e o que aparece fora dos streams, com contexto',
  node_exit: 0,
};
writeFileSync(OUT_JSON, JSON.stringify(saida, null, 2) + '\n');
writeFileSync(OUT_TXT, veredito + ' · ' + PDFS.map((n) => `${n}: ${medido[n].classificacao} (streams=${medido[n].streams.length}, conteudo=${medido[n].streams.filter((s) => s.e_he_conteudo).length}, texto_bfr=${medido[n].bfr_no_texto}, texto_chars=${medido[n].texto_visivel_concatenado.length})`).join(' | ') + '\n');
console.log(veredito);
process.exit(0);
