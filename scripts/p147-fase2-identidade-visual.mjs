#!/usr/bin/env node
// P147 — inventário em leitura da FASE 2 da missão («preservação obrigatória da identidade visual») sobre o ar
// medido (v142, identidade conferida contra o artefacto do §SM.41 antes de contar). Só-leitura: escreve apenas
// o seu registo, com guarda de sobrescrita. Conta ocorrências no bundle; as famílias de matiz são constantes
// declaradas (azul/verde/turquesa = premissa do briefing). o_que_NAO_prova: contagens não julgam desenho
// «executivo/premium», e o varrimento é do bundle inteiro, não por módulo.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const SUF = process.env.P147_SUF ? '-' + process.env.P147_SUF : '-23-11';
const OUT = join(RAIZ, `evidence/p147-fase2-identidade-visual${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P147_SUF=novo, não por cima');

const ALVO = 'bfr-candidata-v142-painel-na-troca/index.html';
const IDENT_FONTE = 'evidence/p116-consistencia-de-versao-21-11-23-11-sm41.json';

const md5 = (s) => createHash('md5').update(s).digest('hex');
const texto = readFileSync(join(RAIZ, ALVO), 'utf8');
const bytes = Buffer.byteLength(texto, 'utf8');

let esperado = null;
try {
  const j = JSON.parse(readFileSync(join(RAIZ, IDENT_FONTE), 'utf8'));
  const l = j.ar.leituras[0];
  esperado = { md5: l.md5, bytes: l.bytes, diario: j.ar.diario };
} catch (e) {
  console.error('ABORTA: identidade do ar ilegível em ' + IDENT_FONTE + ': ' + e.message);
  process.exit(2);
}
if (!esperado || md5(texto) !== esperado.md5 || bytes !== esperado.bytes) {
  console.error(`ABORTA: ${ALVO} não bate com o ar medido (md5 ${md5(texto)}/${bytes} vs ${esperado.md5}/${esperado.bytes} em ${IDENT_FONTE}) — contar um ar não identificado é inválido`);
  process.exit(2);
}

const FAMILIAS = [
  { nome: 'azul', min: 200, max: 260 },
  { nome: 'turquesa', min: 160, max: 200 },
  { nome: 'verde', min: 80, max: 160 },
  { nome: 'amarelo', min: 50, max: 80 },
  { nome: 'laranja', min: 30, max: 50 },
  { nome: 'vermelho', min: 0, max: 30, extra: [330, 360] },
  { nome: 'roxo', min: 260, max: 330 }
];

const hexRgb = (h) => {
  let s = h.slice(1);
  if (s.length === 3 || s.length === 4) s = [...s.slice(0, 3)].map((c) => c + c).join('') + (s.length === 4 ? s[3] + s[3] : '');
  const n = parseInt(s.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const hueDe = ({ r, g, b }) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === r) h = 60 * (((g - b) / d) % 6);
  else if (max === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;
  return h;
};
const familiaDe = (hx) => {
  const { r, g, b } = hexRgb(hx);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const lum = (max + min) / 2 / 255;
  const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
  if (sat < 0.08 || lum <= 0.06 || lum >= 0.95) return 'neutro';
  const h = hueDe({ r, g, b });
  for (const f of FAMILIAS) {
    if (h >= f.min && h < f.max) return f.nome;
    if (f.extra && h >= f.extra[0] && h < f.extra[1]) return f.nome;
  }
  return 'fora';
};

const CONTADORES = {
  hex: (t) => (t.match(/#[0-9a-fA-F]{3,8}/g) || []).length,
  logo: (t) => (t.match(/logo/i) || []).length,
  svg: (t) => (t.match(/<svg\b/i) || []).length,
  viewBox: (t) => (t.match(/viewBox\s*=/gi) || []).length,
  tabela: (t) => (t.match(/<table\b/gi) || []).length,
  cartao: (t) => (t.match(/class\s*=\s*"[^"]*card/gi) || []).length,
  tipografia: (t) => (t.match(/font-family/gi) || []).length,
  grafico: (t) => (t.match(/chart|gráfico|grafico/gi) || []).length,
  mediaQuery: (t) => (t.match(/@media\b/g) || []).length,
  keyframes: (t) => (t.match(/@keyframes\b/g) || []).length,
  transition: (t) => (t.match(/transition\b/g) || []).length,
  customPropDistintas: (t) => new Set((t.match(/--[a-z0-9-]+/g) || []).map((s) => s.slice(2))).size,
  varUso: (t) => (t.match(/var\(--/g) || []).length
};

const fixturePos = '#123456 #12a456 #12b5a4 logo.png <svg viewBox="0 0 1 1"></svg> <table></table> <div class="card"></div> font-family chart @media x @keyframes y transition z --azul var(--azul)';
const fixtureNeg = 'zzzz qqqq xyz 12345';

const portoes = [];
const reg = (nome, ok, detalhe) => portoes.push({ nome, ok, detalhe });

const porFixture = (fixture, alvo) => Object.fromEntries(Object.entries(CONTADORES).map(([nome, fn]) => [nome, fn(fixture)]));
reg('contadores_disparam_no_fixture_positivo',
  Object.values(porFixture(fixturePos)).every((n) => n > 0),
  JSON.stringify(porFixture(fixturePos)));
reg('contadores_mudos_no_fixture_negativo',
  Object.values(porFixture(fixtureNeg)).every((n) => n === 0),
  JSON.stringify(porFixture(fixtureNeg)));

const famsFixture = {};
for (const m of fixturePos.match(/#[0-9a-fA-F]{3,8}/g) || []) {
  const f = familiaDe(m);
  famsFixture[f] = (famsFixture[f] || 0) + 1;
}
reg('fixture_classifica_azul_verde_turquesa',
  famsFixture.azul >= 1 && famsFixture.verde >= 1 && famsFixture.turquesa >= 1,
  JSON.stringify(famsFixture));

const noAr = Object.fromEntries(Object.entries(CONTADORES).map(([nome, fn]) => [nome, fn(texto)]));
const hexes = (texto.match(/#[0-9a-fA-F]{3,8}/g) || []).map((h) => h.toLowerCase());
const distintos = new Set(hexes);
const porFamilia = {};
for (const hx of distintos) {
  const f = familiaDe(hx);
  porFamilia[f] = (porFamilia[f] || 0) + 1;
}
const uso = {};
for (const hx of hexes) uso[hx] = (uso[hx] || 0) + 1;
const topHex = Object.entries(uso).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([h, n]) => ({ hex: h, ocorrencias: n, familia: familiaDe(h) }));

reg('paleta_nao_vazia', distintos.size > 0, `distintos ${distintos.size}`);
reg('familias_azul_verde_turquesa_presentes',
  (porFamilia.azul || 0) >= 1 && (porFamilia.verde || 0) >= 1 && (porFamilia.turquesa || 0) >= 1,
  JSON.stringify(porFamilia));
reg('logos_presentes', noAr.logo > 0, `logo ${noAr.logo}`);

const proprio = readFileSync(import.meta.filename, 'utf8');
const registo = {
  peca: 'p147-fase2-identidade-visual',
  em: new Date().toISOString(),
  emissor: 'scripts/p147-fase2-identidade-visual.mjs',
  emissor_bytes: proprio.length,
  emissor_md5: md5(proprio),
  alvo: ALVO,
  alvo_bytes: bytes,
  alvo_md5: md5(texto),
  identidade_lida_de: IDENT_FONTE,
  familias_de_matiz: FAMILIAS,
  contadores: noAr,
  paleta: { distintos: distintos.size, por_familia: porFamilia, top_hex: topHex },
  fixture_positivo: porFixture(fixturePos),
  fixture_negativo: porFixture(fixtureNeg),
  portoes,
  o_que_NAO_prova: 'contagens de ocorrência no bundle inteiro: não julgam se o desenho é «executivo/premium/profissional» (objetivo da FASE 2, não medida), nem medem aderência da paleta por módulo (o varrimento não delimita a região municipal)',
  veredito: `P147_FASE2_INVENTARIO_${portoes.every((p) => p.ok) ? 'VERDE' : 'VERMELHO'} ${portoes.filter((p) => p.ok).length}/${portoes.length}`
};
writeFileSync(OUT, JSON.stringify(registo, null, 2) + '\n');
console.log(`P147 registo ${OUT}`);
console.log('contadores:', Object.entries(noAr).map(([k, v]) => `${k}=${v}`).join(' '));
console.log('paleta por família:', JSON.stringify(porFamilia));
console.log('top hex:', topHex.map((h) => `${h.hex}(${h.familia})×${h.ocorrencias}`).join(' '));
console.log(registo.veredito);
if (portoes.some((p) => !p.ok)) {
  for (const f of portoes.filter((p) => !p.ok)) console.log(`FALHA ${f.nome}: ${f.detalhe}`);
  process.exit(1);
}
