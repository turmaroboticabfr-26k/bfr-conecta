#!/usr/bin/env node
// P149 — aderência da paleta por módulo (o que o p147 deixou por medir no §SM.44(4)): a região municipal,
// delimitada pelo marcador único do bundle, confrontada com o resto (shell). Só-leitura: escreve apenas o seu
// registo, com guarda de sobrescrita. A identidade do alvo é provada contra o artefacto do §SM.41 antes de
// contar (aborta se divergir). A régua (famílias de matiz + limiares neutros) é a mesma do p147 e a
// equivalência é provada por portão contra as contagens distintas registadas pelo p147 sobre o mesmo alvo.
// o_que_NAO_prova: contagens não julgam desenho «executivo/premium»; a shell agrupa todas as vistas que o
// bundle não delimita; não há render em navegador (cadeias 0/15 no p73 de 23/11); a régua é por família —
// tons novos dentro de família já presente passam, como a regra dos «mesmos tons» permite.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const SUF = process.env.P149_SUF ? '-' + process.env.P149_SUF : '-24-11';
const OUT = join(RAIZ, 'evidence/p149-sm48-aderencia-por-modulo' + SUF + '.json');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P149_SUF=novo, não por cima');

const ALVO = 'bfr-candidata-v142-painel-na-troca/index.html';
const IDENT_FONTE = 'evidence/p116-consistencia-de-versao-21-11-23-11-sm41.json';
const P147_REGISTO = 'evidence/p147-fase2-identidade-visual-23-11.json';
const MARCADOR = 'data-bfr-municipal-module';

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
  console.error('ABORTA: ' + ALVO + ' não bate com o ar medido (md5 ' + md5(texto) + '/' + bytes + ' vs ' + esperado.md5 + '/' + esperado.bytes + ' em ' + IDENT_FONTE + ') — contar um ar não identificado é inválido');
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

const REGEX_HEX = /#[0-9a-fA-F]{3,8}/g;
const hexesDe = (t) => (t.match(REGEX_HEX) || []).map((h) => h.toLowerCase());

const perfilDe = (t) => {
  const hexes = hexesDe(t);
  const distintos = new Set(hexes);
  const porFamilia = {};
  for (const hx of distintos) {
    const f = familiaDe(hx);
    porFamilia[f] = (porFamilia[f] || 0) + 1;
  }
  const usoPorFamilia = {};
  for (const hx of hexes) {
    const f = familiaDe(hx);
    usoPorFamilia[f] = (usoPorFamilia[f] || 0) + 1;
  }
  const uso = {};
  for (const hx of hexes) uso[hx] = (uso[hx] || 0) + 1;
  const topHex = Object.entries(uso).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([h, n]) => ({ hex: h, ocorrencias: n, familia: familiaDe(h) }));
  return { bytes: Buffer.byteLength(t, 'utf8'), ocorrencias: hexes.length, distintos: distintos.size, por_familia: porFamilia, uso_por_familia: usoPorFamilia, top_hex: topHex, distintos_set: distintos };
};

const portoes = [];
const reg = (nome, ok, detalhe) => portoes.push({ nome, ok, detalhe });

// ——— delimitação: o marcador municipal é único e é o único delimitador de módulo em <script> ———
const ocorrenciasMarcador = (texto.match(new RegExp(MARCADOR, 'g')) || []).length;
const outrosMarcadores = (texto.match(/<script[^>]*data-bfr-[a-z-]+module/g) || [])
  .filter((s) => !s.includes(MARCADOR));
const modInicio = texto.indexOf(MARCADOR);
const shell = modInicio >= 0 ? texto.slice(0, modInicio) : '';
const modulo = modInicio >= 0 ? texto.slice(modInicio) : '';
reg('delimitacao_defensavel',
  ocorrenciasMarcador === 1 && outrosMarcadores.length === 0 && shell.length > 0 && modulo.length > 0,
  'marcador=' + ocorrenciasMarcador + ' outros_marcadores_de_modulo=' + outrosMarcadores.length + ' shell_bytes=' + shell.length + ' modulo_bytes=' + modulo.length);

const perfShell = perfilDe(shell);
const perfModulo = perfilDe(modulo);

reg('regioes_com_paleta', perfShell.distintos > 0 && perfModulo.distintos > 0,
  'shell_distintos=' + perfShell.distintos + ' modulo_distintos=' + perfModulo.distintos);

// ——— fixture de contagem nos dois sentidos: hex injetado na cópia do módulo tem de contar 1, e 0 no original ———
// candidatos neutros (r=g=b): nunca mexem no portão da aderência, que exclui a família neutro
const candidatosInjecao = ['#ababab', '#bcbcbc', '#cdcdcd', '#dedede', '#efefef'];
const hexInjetado = candidatosInjecao.find((h) => !hexesDe(texto).includes(h));
if (!hexInjetado) {
  console.error('ABORTA: nenhum hex candidato de injeção está ausente do bundle');
  process.exit(2);
}
const copiaModulo = modulo + ' ' + hexInjetado;
const fInj = hexesDe(copiaModulo).filter((h) => h === hexInjetado).length;
const fOrig = hexesDe(modulo).filter((h) => h === hexInjetado).length;
reg('fixture_conta_nos_dois_sentidos', fInj === 1 && fOrig === 0, hexInjetado + ' injetado=' + fInj + ' original=' + fOrig);

// ——— fixture de classificação: as cores da régua classificam-se nas famílias esperadas ———
// matizes verificados à mão; o portão G3 re-confere a classificação em cada corrida
const CORES_FIXTURE = {
  azul: '#123456', turquesa: '#1abcde', verde: '#12a456',
  amarelo: '#bcae00', laranja: '#ff8000', vermelho: '#e6194b', roxo: '#7c28d6'
};
const classificacaoFixture = Object.fromEntries(Object.entries(CORES_FIXTURE).map(([fam, hx]) => [fam, familiaDe(hx)]));
reg('fixture_classifica_as_familias_da_regra',
  Object.entries(CORES_FIXTURE).every(([fam, hx]) => familiaDe(hx) === fam),
  JSON.stringify(classificacaoFixture));

// ——— régua da aderência: famílias da paleta municipal ⊆ famílias da shell (neutro fora) ———
const famsDe = (perf) => new Set(Object.keys(perf.por_familia).filter((f) => f !== 'neutro'));
const famsShell = famsDe(perfShell);
const famsModulo = famsDe(perfModulo);
const novas = [...famsModulo].filter((f) => !famsShell.has(f));
reg('familias_do_modulo_sao_subconjunto_das_da_shell', novas.length === 0,
  'familias_do_modulo=' + JSON.stringify([...famsModulo]) + ' fora_da_shell=' + JSON.stringify(novas));

// ——— fixture da régua de aderência nas duas direções possíveis ———
const todasAsFamilias = FAMILIAS.map((f) => f.nome);
const ausenteDaShell = todasAsFamilias.find((f) => !famsShell.has(f));
const fixtG5 = {};
if (ausenteDaShell) {
  // direção que morde: injetar uma cor da família ausente da shell tem de virar o portão para falso
  const copiaBate = copiaModulo + ' ' + CORES_FIXTURE[ausenteDaShell];
  const famsBate = famsDe(perfilDe(copiaBate));
  const virou = [...famsBate].some((f) => !famsShell.has(f));
  fixtG5.direcao = 'familia_ausente_da_shell_injetada_' + ausenteDaShell;
  fixtG5.virou_o_portao = virou === true;
  reg('fixture_da_regua_morde', virou === true, JSON.stringify(fixtG5));
} else {
  // a shell tem as 7 famílias: nenhuma injeção pode criar família nova — prova-se que não há sobremordida
  const copiaTodas = copiaModulo + ' ' + Object.values(CORES_FIXTURE).join(' ');
  const famsTodas = famsDe(perfilDe(copiaTodas));
  const extra = [...famsTodas].filter((f) => !famsShell.has(f));
  fixtG5.direcao = 'todas_as_familias_ja_na_shell_sem_bite_possivel';
  fixtG5.sem_familia_nova = extra.length === 0;
  reg('fixture_da_regua_nao_sobremorde', extra.length === 0, JSON.stringify(fixtG5));
}

// ——— mesma régua do p147: contagens distintas do bundle inteiro têm de bater com o registo dele ———
let p147 = null;
try {
  p147 = JSON.parse(readFileSync(join(RAIZ, P147_REGISTO), 'utf8'));
} catch (e) {
  console.error('ABORTA: registo do p147 ilegível em ' + P147_REGISTO + ': ' + e.message);
  process.exit(3);
}
const porFamiliaBundle = perfilDe(texto).por_familia;
const diffP147 = [];
for (const f of new Set([...Object.keys(p147.paleta.por_familia), ...Object.keys(porFamiliaBundle)])) {
  if ((p147.paleta.por_familia[f] || 0) !== (porFamiliaBundle[f] || 0)) {
    diffP147.push(f + ' p147=' + (p147.paleta.por_familia[f] || 0) + ' p149=' + (porFamiliaBundle[f] || 0));
  }
}
reg('mesma_regua_do_p147_no_bundle_inteiro',
  diffP147.length === 0 && p147.paleta.distintos === perfilDe(texto).distintos,
  'divergencias=' + JSON.stringify(diffP147) + ' distintos p147=' + p147.paleta.distintos + ' p149=' + perfilDe(texto).distintos);

// ——— medições cruzadas (não portões) ———
const hexesModulo = perfModulo.distintos_set;
const hexesShell = perfShell.distintos_set;
const soNoModulo = [...hexesModulo].filter((h) => !hexesShell.has(h));
const compartilhados = [...hexesModulo].filter((h) => hexesShell.has(h));
const familiasDoShellAusentesNoModulo = [...famsShell].filter((f) => !famsModulo.has(f));

const proprio = readFileSync(import.meta.filename, 'utf8');
const registo = {
  peca: 'p149-sm48-aderencia-por-modulo',
  em: new Date().toISOString(),
  emissor: 'scripts/p149-sm48-aderencia-por-modulo.mjs',
  emissor_bytes: proprio.length,
  emissor_md5: md5(proprio),
  alvo: ALVO,
  alvo_bytes: bytes,
  alvo_md5: md5(texto),
  identidade_lida_de: IDENT_FONTE,
  familias_de_matiz: FAMILIAS,
  delimitacao: { marcador: MARCADOR, ocorrencias_do_marcador: ocorrenciasMarcador, inicio_no_bundle: modInicio, outros_marcadores_de_modulo: outrosMarcadores.length },
  shell: { bytes: perfShell.bytes, ocorrencias: perfShell.ocorrencias, distintos: perfShell.distintos, por_familia: perfShell.por_familia, uso_por_familia: perfShell.uso_por_familia, top_hex: perfShell.top_hex },
  modulo_municipal: { bytes: perfModulo.bytes, ocorrencias: perfModulo.ocorrencias, distintos: perfModulo.distintos, por_familia: perfModulo.por_familia, uso_por_familia: perfModulo.uso_por_familia, top_hex: perfModulo.top_hex },
  cruzamentos: {
    hexes_compartilhados_com_a_shell: compartilhados.length,
    hexes_so_no_modulo: soNoModulo.length,
    hexes_so_no_modulo_lista: soNoModulo.map((h) => ({ hex: h, familia: familiaDe(h) })),
    familias_do_shell_ausentes_no_modulo: familiasDoShellAusentesNoModulo,
    familias_do_modulo: [...famsModulo],
    familias_da_shell: [...famsShell]
  },
  fixture: {
    hex_injetado: hexInjetado,
    conta_nos_dois_sentidos: { injetado: fInj, original: fOrig },
    classificacao: classificacaoFixture,
    regua: fixtG5
  },
  portoes,
  o_que_NAO_prova: 'contagens de cor no bundle servido: não julgam se o desenho é «executivo/premium/profissional» (objetivo da FASE 2, não medida). A shell agrupa todas as vistas que o bundle não delimita (o único delimitador de módulo em <script> é o municipal). A régua é por família de matiz: tons novos dentro de família já presente passam, como a regra dos «mesmos tons» permite. Não há render em navegador (cadeias 0/15 no p73 de 23/11).',
  veredito: 'P149_SM48_ADERENCIA_POR_MODULO_' + (portoes.every((p) => p.ok) ? 'VERDE' : 'VERMELHO') + ' ' + portoes.filter((p) => p.ok).length + '/' + portoes.length
};
writeFileSync(OUT, JSON.stringify(registo, null, 2) + '\n');
console.log('P149 registo ' + OUT);
console.log('shell: distintos=' + perfShell.distintos + ' ocorrencias=' + perfShell.ocorrencias + ' por_familia=' + JSON.stringify(perfShell.por_familia));
console.log('modulo: distintos=' + perfModulo.distintos + ' ocorrencias=' + perfModulo.ocorrencias + ' por_familia=' + JSON.stringify(perfModulo.por_familia));
console.log('cruzamentos: compartilhados=' + compartilhados.length + ' so_no_modulo=' + soNoModulo.length + ' familias_shell_ausentes_no_modulo=' + JSON.stringify(familiasDoShellAusentesNoModulo));
console.log(registo.veredito);
if (portoes.some((p) => !p.ok)) {
  for (const f of portoes.filter((p) => !p.ok)) console.log('FALHA ' + f.nome + ': ' + f.detalhe);
  process.exit(1);
}
