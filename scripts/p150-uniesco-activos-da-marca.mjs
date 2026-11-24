#!/usr/bin/env node
// P150 — ACTIVOS DA MARCA UNIESCO, DERIVADOS DO LOGO OFICIAL (24/11).
//
// O logo oficial chega em RGB sem canal alfa, sobre branco. Nada aqui desenha nem re-interpreta a marca:
// cada saida e o recorte exacto do ficheiro fornecido, com o branco tornado transparente e re-amostrado por
// area (sem esticar, sem cortar o risco). O codec PNG e Node puro porque a maquina nao tem sharp, pngjs nem Python.
//
// Regras: 0 deploy, 0 DDL, 0 escrita no banco, 0 publicacao. Escreve so marca-uniesco/.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OFICIAL = 'C:/Users/pcmac/.qoder/tmp/C--Users-pcmac-Documents-Qoder-2026-11-15-2e9c4296/images/2e9c4296-1bee-49dd-9f1e-defbe54c4db8/af4c8cdd-f9df-4fe1-9121-e488c34af2da.png';
const SAIDA = `${REPO}/marca-uniesco`;
const REGISTO = `${SAIDA}/registo-p150.json`;
const SUF = (process.argv[2] || 'a').trim();
const md5 = (b) => createHash('md5').update(b).digest('hex');
const B = (b) => Buffer.byteLength(b);

// ——— codec PNG (8 bits, tipos 2 e 6, sem entrelacamento) ———
const CRC = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const x of buf) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (tipo, dados) => { const len = Buffer.alloc(4); len.writeUInt32BE(dados.length); const td = Buffer.concat([Buffer.from(tipo, 'latin1'), dados]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
function decodifica(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('ABORTA: nao e PNG');
  let pos = 8, w = 0, h = 0, prof = 0, tipo = 0, entrelacado = 0; const idat = [];
  while (pos < buf.length) {
    const tam = buf.readUInt32BE(pos), nome = buf.toString('latin1', pos + 4, pos + 8), dados = buf.subarray(pos + 8, pos + 8 + tam);
    if (nome === 'IHDR') { w = dados.readUInt32BE(0); h = dados.readUInt32BE(4); prof = dados[8]; tipo = dados[9]; entrelacado = dados[12]; }
    else if (nome === 'IDAT') idat.push(dados);
    else if (nome === 'IEND') break;
    if (crc32(buf.subarray(pos + 4, pos + 8 + tam)) !== buf.readUInt32BE(pos + 8 + tam)) throw new Error('ABORTA: CRC do bloco ' + nome + ' nao bate');
    pos += 12 + tam;
  }
  if (prof !== 8 || (tipo !== 2 && tipo !== 6) || entrelacado !== 0) throw new Error(`ABORTA: PNG fora do suportado (prof=${prof} tipo=${tipo} entrelacado=${entrelacado})`);
  const bpp = tipo === 6 ? 4 : 3, bruto = inflateSync(Buffer.concat(idat)), stride = w * bpp, rgba = Buffer.alloc(w * h * 4);
  if (bruto.length !== (stride + 1) * h) throw new Error('ABORTA: o fluxo descomprimido tem ' + bruto.length + ' B, esperava ' + ((stride + 1) * h));
  let ant = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = bruto[y * (stride + 1)], linha = Buffer.from(bruto.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? linha[i - bpp] : 0, b = ant[i], c = i >= bpp ? ant[i - bpp] : 0;
      if (f === 1) linha[i] = (linha[i] + a) & 255; else if (f === 2) linha[i] = (linha[i] + b) & 255; else if (f === 3) linha[i] = (linha[i] + ((a + b) >> 1)) & 255; else if (f === 4) linha[i] = (linha[i] + paeth(a, b, c)) & 255; else if (f !== 0) throw new Error('ABORTA: filtro ' + f);
    }
    for (let x = 0; x < w; x++) { const s = x * bpp, d = (y * w + x) * 4; rgba[d] = linha[s]; rgba[d + 1] = linha[s + 1]; rgba[d + 2] = linha[s + 2]; rgba[d + 3] = tipo === 6 ? linha[s + 3] : 255; }
    ant = linha;
  }
  return { w, h, rgba, tipo };
}
function codifica(w, h, rgba) {
  const stride = w * 4, raw = Buffer.alloc((stride + 1) * h);
  let ant = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const linha = rgba.subarray(y * stride, (y + 1) * stride), paeth4 = Buffer.alloc(stride);
    let custoSem = 0, custoPaeth = 0;
    for (let i = 0; i < stride; i++) { const a = i >= 4 ? linha[i - 4] : 0, b = ant[i], c = i >= 4 ? ant[i - 4] : 0; const d = (linha[i] - paeth(a, b, c)) & 255; paeth4[i] = d; custoSem += linha[i] < 128 ? linha[i] : 256 - linha[i]; custoPaeth += d < 128 ? d : 256 - d; }
    const comPaeth = custoPaeth < custoSem, o = y * (stride + 1);
    raw[o] = comPaeth ? 4 : 0; (comPaeth ? paeth4 : linha).copy(raw, o + 1); ant = Buffer.from(linha);
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// o codec tem dentes: codifica -> decodifica devolve os mesmos pixeis
{
  const w = 5, h = 3, rgba = Buffer.alloc(w * h * 4); for (let i = 0; i < rgba.length; i++) rgba[i] = (i * 37 + 11) & 255;
  if (!decodifica(codifica(w, h, rgba)).rgba.equals(rgba)) throw new Error('ABORTA: o codec PNG nao e inverso de si mesmo');
}

// ——— branco -> alfa (o risco escuro fica opaco, o fundo branco fica transparente) ———
const px = (img, x, y) => (y * img.w + x) * 4;
function removeBranco(img, opacoAte, transparenteDe) {
  let opacos = 0, claros = 0;
  for (let i = 0; i < img.rgba.length; i += 4) { const m = Math.min(img.rgba[i], img.rgba[i + 1], img.rgba[i + 2]); if (m <= opacoAte) { img.rgba[i + 3] = 255; opacos++; } else if (m >= transparenteDe) { img.rgba[i + 3] = 0; claros++; } else img.rgba[i + 3] = Math.round((255 * (transparenteDe - m)) / (transparenteDe - opacoAte)); }
  return { opacos, claros, parciais: img.w * img.h - opacos - claros };
}
const caixaDeTinta = (img) => { let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1; for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.rgba[px(img, x, y) + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }; };
const linhasDeTinta = (img) => { const v = []; for (let y = 0; y < img.h; y++) { let c = 0; for (let x = 0; x < img.w; x++) if (img.rgba[px(img, x, y) + 3] > 8) c++; v.push(c); } return v; };

// ——— re-amostragem por area, ponderada pelo alfa (nao escurece as bordas) ———
function reamostra(img, cx, cy, cw, ch, W, H, fundo) {
  const out = Buffer.alloc(W * H * 4), sx = cw / W, sy = ch / H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const xa = cx + x * sx, xb = Math.min(cx + (x + 1) * sx, img.w), ya = cy + y * sy, yb = Math.min(cy + (y + 1) * sy, img.h);
    let r = 0, g = 0, b = 0, a = 0, area = 0;
    for (let yy = Math.floor(ya); yy < Math.ceil(yb); yy++) for (let xx = Math.floor(xa); xx < Math.ceil(xb); xx++) {
      if (xx >= img.w || yy >= img.h) continue;
      const peso = Math.max(0, Math.min(xx + 1, xb) - Math.max(xx, xa)) * Math.max(0, Math.min(yy + 1, yb) - Math.max(yy, ya)); if (peso <= 0) continue;
      const p = px(img, xx, yy), al = img.rgba[p + 3] / 255; area += peso; a += peso * al; r += peso * al * img.rgba[p]; g += peso * al * img.rgba[p + 1]; b += peso * al * img.rgba[p + 2];
    }
    const o = (y * W + x) * 4, al = area > 0 ? a / area : 0, al256 = Math.round(al * 255);
    if (!fundo) { out[o] = al > 0 ? Math.round(r / a) : 0; out[o + 1] = al > 0 ? Math.round(g / a) : 0; out[o + 2] = al > 0 ? Math.round(b / a) : 0; }
    else { out[o] = Math.round((al > 0 ? r / a : 0) * al + fundo[0] * (1 - al)); out[o + 1] = Math.round((al > 0 ? g / a : 0) * al + fundo[1] * (1 - al)); out[o + 2] = Math.round((al > 0 ? b / a : 0) * al + fundo[2] * (1 - al)); }
    out[o + 3] = fundo ? 255 : al256;
  }
  return { w: W, h: H, rgba: out };
}
// a re-amostragem preserva uma imagem ja no tamanho alvo
{
  const src = { w: 4, h: 4, rgba: Buffer.alloc(64) }; for (let i = 0; i < 16; i++) { src.rgba[i * 4] = 200; src.rgba[i * 4 + 1] = 30; src.rgba[i * 4 + 2] = 90; src.rgba[i * 4 + 3] = 255; }
  if (!reamostra(src, 0, 0, 4, 4, 4, 4, null).rgba.equals(src.rgba)) throw new Error('ABORTA: a re-amostragem 1:1 nao e identidade');
}

// ——— paleta medida do risco, nao escolhida a olho ———
const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const mediana = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
function corDominante(img, cx, cy, cw, ch) {
  const rs = [], gs = [], bs = [];
  for (let y = cy; y < cy + ch; y++) for (let x = cx; x < cx + cw; x++) { const p = px(img, x, y); if (img.rgba[p + 3] === 255 && Math.min(img.rgba[p], img.rgba[p + 1], img.rgba[p + 2]) < 140) { rs.push(img.rgba[p]); gs.push(img.rgba[p + 1]); bs.push(img.rgba[p + 2]); } }
  if (rs.length < 20) throw new Error('ABORTA: so ' + rs.length + ' pixeis de risco opaco na janela [' + cx + ',' + cy + ',' + cw + ',' + ch + '] - a paleta seria inventada');
  return { hex: hex(mediana(rs), mediana(gs), mediana(bs)), amostra: rs.length };
}
const contraste = (c1, c2) => { const L = (h) => { const f = (v) => { const s = parseInt(h.slice(v, v + 2), 16) / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }; return 0.2126 * f(1) + 0.7152 * f(3) + 0.0722 * f(5); }; const a = L(c1), b = L(c2); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
// controlo do contraste: branco sobre preto da 21, e um valor NaN nunca passa (foi assim que a 1.a corrida do a4 escondeu o defeito)
if (Math.abs(contraste('#ffffff', '#000000') - 21) > 0.01 || (contraste('#zzzzzz', '#ffffff') >= 7)) throw new Error('ABORTA: a regua de contraste nao tem dentes');

const falhas = [];
const g = (nome, cond, dado) => { const v = cond === true; if (!v) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 320)); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };

if (existsSync(SAIDA)) throw new Error('ABORTA: ' + SAIDA + ' ja existe — use outro nome, nunca por cima');
const oficial = readFileSync(OFICIAL);
const img = decodifica(oficial);
g('a1_o_oficial_e_quadrado_e_pesa_o_que_a_brief_anexou', img.w === img.h && img.w === 1254 && oficial.length === 1264269, { w: img.w, h: img.h, bytes: oficial.length, tipo_cor: img.tipo });
const OPA = 215, TRA = 244;
const branca = removeBranco(img, OPA, TRA);
const tinta = linhasDeTinta(img);
const caixa = caixaDeTinta(img);
// bandas verticais de tinta separadas por linhas sem risco: [simbolo] [palavra] [subtitulo + slogan em 1 ou 2 linhas]
const bandas = []; let dentro = false, ini = 0;
for (let y = 0; y < img.h; y++) { if (tinta[y] > 0 && !dentro) { dentro = true; ini = y; } else if (tinta[y] === 0 && dentro) { dentro = false; if (y - ini >= 6) bandas.push({ y0: ini, y1: y - 1, h: y - ini }); } }
if (dentro) bandas.push({ y0: ini, y1: img.h - 1, h: img.h - ini });
const VERMELHO = (motivo) => {
  const RED = `${REPO}/evidence/p150-activos-da-marca-24-11-${SUF}-VERMELHO.json`;
  if (existsSync(RED)) throw new Error('ABORTA: ' + RED + ' existe — use outro sufixo, nunca por cima');
  writeFileSync(RED, JSON.stringify({ veredito: 'P150_ACTIVOS_DA_MARCA_VERMELHO', sufixo: SUF, motivo, bandas, caixa, pixeis: branca }, null, 2) + '\n');
  console.log('VERMELHO  ' + motivo); process.exit(1);
};
if (bandas.length < 4) VERMELHO('o oficial deu ' + bandas.length + ' bandas de tinta, esperava pelo menos 4 (simbolo, palavra, subtitulo, slogan)');
console.log('  bandas=' + JSON.stringify(bandas) + ' caixa=' + JSON.stringify(caixa) + ' pixeis ' + JSON.stringify(branca));
g('a2_a_palavra_e_segunda_banda_e_a_mais_alta_depois_do_simbolo', bandas[1].h > Math.max(...bandas.slice(2).map((b) => b.h)), { bandas, nota: 'a 1.a e o simbolo, a 2.a a palavra, as restantes o subtitulo e o slogan (que pode ocupar 2 linhas)' });
const caixaDa = (b) => { let x0 = img.w, x1 = -1; for (let y = b.y0; y <= b.y1; y++) for (let x = 0; x < img.w; x++) if (img.rgba[px(img, x, y) + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; } return { x0, x1, w: x1 - x0 + 1 }; };
const cp = caixaDa(bandas[1]), cs = caixaDa(bandas[0]);
const esquerda = corDominante(img, cp.x0, bandas[1].y0, Math.round(cp.w * 0.09), bandas[1].h);
const meio = corDominante(img, cp.x0 + Math.round(cp.w * 0.46), bandas[1].y0, Math.round(cp.w * 0.08), bandas[1].h);
const direita = corDominante(img, cp.x1 - Math.round(cp.w * 0.09) + 1, bandas[1].y0, Math.round(cp.w * 0.09), bandas[1].h);
const simbolo = corDominante(img, cs.x0, bandas[0].y0, cs.w, bandas[0].h);
const azul = esquerda.hex, verde = direita.hex;
const lum = (h) => 0.2126 * parseInt(h.slice(1, 3), 16) + 0.7152 * parseInt(h.slice(3, 5), 16) + 0.0722 * parseInt(h.slice(5, 7), 16);
g('a3_a_palavra_grada_de_azul_para_verde_da_esquerda_para_a_direita', parseInt(azul.slice(5, 7), 16) > parseInt(verde.slice(5, 7), 16) + 40 && parseInt(verde.slice(3, 5), 16) > parseInt(azul.slice(3, 5), 16) + 40, { esquerda: azul, meio: meio.hex, direita: verde, amostras: [esquerda.amostra, meio.amostra, direita.amostra] });
// o navy institucional E o azul da marca, sem escurecimento inventado; a regua e AAA (7:1) para texto normal sobre ele
const navy = azul;
g('a4_o_navy_institucional_e_o_azul_da_marca_e_guarda_contraste_AAA_com_branco', navy === azul && contraste(navy, '#ffffff') >= 7, { navy, com_branco: Number(contraste(navy, '#ffffff').toFixed(2)), antigo_10295f: Number(contraste('#10295f', '#ffffff').toFixed(2)), nota: 'o contraste DESCE da medida antiga para a da marca e fica acima de AAA — declarado, nao escondido' });
g('a5_o_azul_da_marca_sobre_branco_guarda_4p5_para_texto_pequeno', contraste(azul, '#ffffff') >= 4.5, { azul, com_branco: Number(contraste(azul, '#ffffff').toFixed(2)), antigo_2563eb: Number(contraste('#2563eb', '#ffffff').toFixed(2)) });
// risco num fundo OPACO branco = pixel que nao e branco (o alfa e 255 em toda a parte, por isso a caixa por alfa nao serve aqui)
const caixaDoRiscoBranco = (im) => { let x0 = im.w, y0 = im.h, x1 = -1, y1 = -1; for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const p = px(im, x, y); if (Math.min(im.rgba[p], im.rgba[p + 1], im.rgba[p + 2]) < 235) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }; };

// ——— derivados ———
// composicao num UNICO passo: cada pixel da tela amostra directamente o quadrado do original (a corrida d re-amostrou
// duas vezes e o 2. passo recortou a palavra em vez de a reduzir)
const LADO = 800, OCUPACAO = 0.84;
const lado = Math.max(caixa.w, caixa.h), margem = Math.round((lado - Math.min(caixa.w, caixa.h)) / 2);
const qx = caixa.x0 - (caixa.w === lado ? 0 : margem), qy = caixa.y0 - (caixa.h === lado ? 0 : margem);
function compoe(img, cx, cy, cw, ch, W, ocupacao) {
  const alvo = Math.round(W * ocupacao), desloc = Math.round((W - alvo) / 2), sx = cw / alvo, sy = ch / alvo, out = Buffer.alloc(W * W * 4);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    if (x < desloc || y < desloc || x >= desloc + alvo || y >= desloc + alvo) continue;
    const xa = cx + (x - desloc) * sx, xb = xa + sx, ya = cy + (y - desloc) * sy, yb = ya + sy, o = (y * W + x) * 4;
    let r = 0, g = 0, b = 0, a = 0, area = 0;
    for (let yy = Math.floor(ya); yy < Math.ceil(yb); yy++) { if (yy < 0 || yy >= img.h) continue; for (let xx = Math.floor(xa); xx < Math.ceil(xb); xx++) { if (xx < 0 || xx >= img.w) continue;
      const peso = Math.max(0, Math.min(xx + 1, xb) - Math.max(xx, xa)) * Math.max(0, Math.min(yy + 1, yb) - Math.max(yy, ya)); if (peso <= 0) continue;
      const p = px(img, xx, yy), al = img.rgba[p + 3] / 255; area += peso; a += peso * al; r += peso * al * img.rgba[p]; g += peso * al * img.rgba[p + 1]; b += peso * al * img.rgba[p + 2]; } }
    out[o] = a > 0 ? Math.round(r / a) : 0; out[o + 1] = a > 0 ? Math.round(g / a) : 0; out[o + 2] = a > 0 ? Math.round(b / a) : 0; out[o + 3] = Math.round((a / (sx * sy)) * 255);
  }
  return { w: W, h: W, rgba: out };
}
const logo800 = compoe(img, qx, qy, lado, lado, LADO, OCUPACAO);
const ladoSim = Math.max(cs.w, bandas[0].h), msx = Math.round((ladoSim - cs.w) / 2), msy = Math.round((ladoSim - bandas[0].h) / 2);
const icones = {};
for (const [nome, tam] of [['uniesco-simbolo-512.png', 512], ['uniesco-simbolo-192.png', 192], ['uniesco-simbolo-180.png', 180], ['uniesco-simbolo-64.png', 64]]) {
  const diam = Math.round(tam * 0.70), off = Math.round((tam - diam) / 2);
  const icone = { w: tam, h: tam, rgba: Buffer.alloc(tam * tam * 4) };
  for (let i = 0; i < tam * tam; i++) { icone.rgba[i * 4] = 255; icone.rgba[i * 4 + 1] = 255; icone.rgba[i * 4 + 2] = 255; icone.rgba[i * 4 + 3] = 255; }
  const sim = reamostra(img, cs.x0 - msx, bandas[0].y0 - msy, ladoSim, ladoSim, diam, diam, [255, 255, 255]);
  for (let y = 0; y < diam; y++) for (let x = 0; x < diam; x++) { const p = (y * diam + x) * 4, d = ((y + off) * tam + (x + off)) * 4; sim.rgba.copy(icone.rgba, d, p, p + 4); }
  icones[nome] = codifica(tam, tam, icone.rgba);
}
const logoBuf = codifica(LADO, LADO, logo800.rgba);
const relido = decodifica(logoBuf);
let cantosTransparentes = 0; for (const [x, y] of [[0, 0], [799, 0], [0, 799], [799, 799]]) if (relido.rgba[px(relido, x, y) + 3] === 0) cantosTransparentes++;
let centroComTinta = 0; for (let x = 0; x < LADO; x++) for (let y = 0; y < LADO; y++) if (relido.rgba[px(relido, x, y) + 3] > 8) centroComTinta++;
const cRelido = caixaDeTinta(relido);
// integridade do conteudo: um recorte perde bandas e desiguala as margens — a regua do centro («risco entre 650 e 700»)
// da corrida d foi satisfeita pela palavra cortada, por isso agora cada lado e cada banda e medida contra o original
const bandas800 = (() => { const t = linhasDeTinta(relido), v = []; let d = false, i = 0; for (let y = 0; y < LADO; y++) { if (t[y] > 0 && !d) { d = true; i = y; } else if (t[y] === 0 && d) { d = false; v.push({ y0: i, y1: y - 1, h: y - i }); } } if (d) v.push({ y0: i, y1: LADO - 1, h: LADO - i }); return v; })();
const xDa = (im, b) => { let a0 = im.w, a1 = -1; for (let y = b.y0; y <= b.y1; y++) for (let x = 0; x < im.w; x++) if (im.rgba[px(im, x, y) + 3] > 8) { if (x < a0) a0 = x; if (x > a1) a1 = x; } return { x0: a0, x1: a1 }; };
const margens = { esq: cRelido.x0, dir: LADO - 1 - cRelido.x1, cima: cRelido.y0, baixo: LADO - 1 - cRelido.y1 };
const razaoOriginal = caixa.w / caixa.h, razao800 = cRelido.w / cRelido.h;
const sim800 = xDa(relido, bandas800[0] || { y0: 0, y1: 0 }), palavra800 = xDa(relido, bandas800[1] || { y0: 0, y1: 0 });
const margemEsperada = Math.round((LADO - Math.round(LADO * OCUPACAO)) / 2);
// o risco nao e quadrado: na vertical sobra ainda metade da diferenca entre o lado do quadrado e a altura do risco
const margemVertical = margemEsperada + ((lado - caixa.h) / 2) * (Math.round(LADO * OCUPACAO) / lado);
g('a6_o_logo_800_tem_todas_as_bandas_do_original_margens_iguais_e_a_mesma_proporcao_de_risco',
  relido.w === LADO && relido.h === LADO && cantosTransparentes === 4
  && bandas800.length === bandas.length
  && [margens.esq, margens.dir].every((m) => Math.abs(m - margemEsperada) <= 1)
  && [margens.cima, margens.baixo].every((m) => Math.abs(m - margemVertical) <= 2)
  && Math.abs(razao800 / razaoOriginal - 1) <= 0.02
  && Math.abs(sim800.x0 - (LADO - 1 - sim800.x1)) <= 3
  && Math.abs(palavra800.x0 - (LADO - 1 - palavra800.x1)) <= 6,
  { bandas_do_original: bandas.length, bandas_no_800: bandas800.length, margens, margem_lateral_esperada: margemEsperada, margem_vertical_esperada: Number(margemVertical.toFixed(1)), razao_original: Number(razaoOriginal.toFixed(4)), razao_800: Number(razao800.toFixed(4)), simbolo_x: sim800, palavra_x: palavra800, caixa_do_risco: cRelido, pixeis_com_risco: centroComTinta });
const i512 = decodifica(icones['uniesco-simbolo-512.png']);
let cantosBrancos = 0; for (const [x, y] of [[0, 0], [511, 0], [0, 511], [511, 511]]) if (i512.rgba[px(i512, x, y)] === 255 && i512.rgba[px(i512, x, y) + 3] === 255) cantosBrancos++;
const cIcone = caixaDoRiscoBranco(i512);
// a corrida f passou com um quadrado TRANSPARENTE no lugar do fundo: a caixa nao-branca de um quadrado escuro cabe
// na mesma janela que a de um simbolo centrado — por isso o icone tem de ser opaco e a fatia de branco e medida
let naoOpacos = 0, brancos = 0;
for (let i = 0; i < i512.rgba.length; i += 4) { if (i512.rgba[i + 3] !== 255) naoOpacos++; if (Math.min(i512.rgba[i], i512.rgba[i + 1], i512.rgba[i + 2]) >= 250) brancos++; }
const fatiaBranca = brancos / (512 * 512);
// a fraccao de tinta dentro da caixa do simbolo e medida nos dois lados: no oficial (por alfa) e no icone (por nao-branco).
// A corrida j teve um teto de 60% inventado a partir da area do quadrado envolvente — o anel tem branco por dentro.
const tintaNaCaixa = (im, cx, cy, cw, ch, risco) => { let t = 0; for (let y = cy; y <= cy + ch; y++) for (let x = cx; x <= cx + cw; x++) if (risco(x, y)) t++; return t / ((cw + 1) * (ch + 1)); };
const tintaOficial = tintaNaCaixa(img, cs.x0, bandas[0].y0, cs.w - 1, bandas[0].h - 1, (x, y) => img.rgba[px(img, x, y) + 3] > 128);
const tintaIcone = tintaNaCaixa(i512, cIcone.x0, cIcone.y0, cIcone.w - 1, cIcone.h - 1, (x, y) => { const p = px(i512, x, y); return Math.min(i512.rgba[p], i512.rgba[p + 1], i512.rgba[p + 2]) < 235; });
// a corrida i passou com um QUADRADO PRETO: mesma caixa e mesma fatia de branco que o simbolo. O simbolo e um anel
// circular, por isso os quatro cantos da sua caixa sao brancos — um quadrado de fundo falha aqui em todos
const eBranco = (im, x, y) => { const p = px(im, x, y); return Math.min(im.rgba[p], im.rgba[p + 1], im.rgba[p + 2]) >= 250 && im.rgba[p + 3] === 255; };
const cantosDaCaixa = [[cIcone.x0 + 5, cIcone.y0 + 5], [cIcone.x1 - 5, cIcone.y0 + 5], [cIcone.x0 + 5, cIcone.y1 - 5], [cIcone.x1 - 5, cIcone.y1 - 5]].map(([x, y]) => eBranco(i512, x, y));
g('a7_os_icones_sao_o_simbolo_sozinho_opaco_centrado_em_fundo_branco_dentro_da_zona_mascaravel', cantosBrancos === 4 && naoOpacos === 0 && cantosDaCaixa.every(Boolean) && Math.abs(tintaIcone - tintaOficial) <= 0.02 && cIcone.w >= 330 && cIcone.w <= 360 && cIcone.h >= 330 && cIcone.h <= 360 && cIcone.x0 >= 76 && 512 - 1 - cIcone.x1 >= 76, { caixa_do_risco_512: cIcone, cantos_da_caixa_brancos: cantosDaCaixa, pixeis_nao_opacos: naoOpacos, fatia_de_branco_na_tela: Number(fatiaBranca.toFixed(4)), tinta_na_caixa_oficial: Number(tintaOficial.toFixed(4)), tinta_na_caixa_icone: Number(tintaIcone.toFixed(4)), zona_mascaravel_px: Math.round(512 * 0.1) });

if (falhas.length) {
  const RED = `${REPO}/evidence/p150-activos-da-marca-24-11-${SUF}-VERMELHO.json`;
  if (existsSync(RED)) throw new Error('ABORTA: ' + RED + ' existe — use outro sufixo, nunca por cima');
  writeFileSync(RED, JSON.stringify({ veredito: 'P150_ACTIVOS_DA_MARCA_VERMELHO ' + falhas.length, sufixo: SUF, falhas, bandas, caixa, pixeis: branca }, null, 2) + '\n');
  process.exit(1);
}
mkdirSync(SAIDA, { recursive: true });
copyFileSync(OFICIAL, `${SAIDA}/logo-oficial-1254.png`);
writeFileSync(`${SAIDA}/uniesco-logo-800.png`, logoBuf);
for (const [nome, buf] of Object.entries(icones)) writeFileSync(`${SAIDA}/${nome}`, buf);
const ficheiros = {};
for (const nome of ['logo-oficial-1254.png', 'uniesco-logo-800.png', ...Object.keys(icones)]) { const b = readFileSync(`${SAIDA}/${nome}`); ficheiros[nome] = { bytes: b.length, md5: md5(b) }; }
const registo = {
  programa: 'scripts/p150-uniesco-activos-da-marca.mjs', em: new Date().toISOString(),
  pergunta: 'os activos da marca sao recortes fieis do logo oficial, com o branco tornado transparente e sem distorcao?',
  origem: { ficheiro: 'logo-oficial-1254.png (o PNG anexado pelo dono, copiado byte a byte)', bytes: oficial.length, md5: md5(oficial), w: img.w, h: img.h, tipo_cor: img.tipo },
  regra_do_branco: { opaco_ate_min_rgb: OPA, transparente_de_min_rgb: TRA, pixeis: branca },
  bandas, caixa_do_risco: caixa,
  paleta_medida: { azul_da_marca: azul, meio_do_degrade: meio.hex, verde_da_marca: verde, navy_institucional: navy, simbolo: simbolo.hex, amostras: { esquerda: esquerda.amostra, meio: meio.amostra, direita: direita.amostra, simbolo: simbolo.amostra } },
  contraste_com_branco: { navy: Number(contraste(navy, '#ffffff').toFixed(2)), azul: Number(contraste(azul, '#ffffff').toFixed(2)), verde: Number(contraste(verde, '#ffffff').toFixed(2)), navy_antigo_10295f: Number(contraste('#10295f', '#ffffff').toFixed(2)), azul_antigo_2563eb: Number(contraste('#2563eb', '#ffffff').toFixed(2)) },
  ficheiros,
  portoes: { total: 7, falhas: 0 }, veredito: 'P150_ACTIVOS_DA_MARCA_UNIESCO_OK 7/0',
};
writeFileSync(REGISTO, JSON.stringify(registo, null, 2) + '\n');
console.log(registo.veredito + ' · azul=' + azul + ' meio=' + meio.hex + ' verde=' + verde + ' navy=' + navy + ' simbolo=' + simbolo.hex);
for (const [nome, f] of Object.entries(ficheiros)) console.log('  ' + nome + '  ' + f.bytes + ' B  ' + f.md5);
