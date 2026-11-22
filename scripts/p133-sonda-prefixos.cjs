// p133-sonda-prefixos — Sonda que produz as familias do classificador do p133, com as contas que a legenda do
// p133 cita. So-leitura: nao escreve ficheiro, imprime e sai. Cada predica aqui e exactamente a que esta em
// IDIOMAS no instrumento, para que os numeros desta saida sejam a fonte verificavel dos numeros daquela frase.
const fs = require('node:fs');
const RAIZ = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/';
const ESC = String.fromCharCode(92) + '|';
const P = {
  fecho_datado: /\b(?:FECHAD[OA]S?|APLICAD[OA]S?|PUBLICAD[OA]S?|CANCELAD[OA]S?|ATENDID[OA]S?)\b[^.]{0,12}(?:1[0-9]|2[0-9])\/1[12]/,
  continua_estado: /\bcontinua (?:abert|pendente|por|sem prova|em aberto|nao|sem)/,
  nao_se_fecha: /n[ãa]o se fecha/,
  por_provar: /por provar/,
  estado_no_inicio: /^(?:\*\*)?(?:Abert[oa]|Criada?)[\s—-]/,
  estado_com_data: /\b(?:Abert[oa]|Criada)\s+(?:1[0-9]|2[0-9])\/1[12]/,
  palavra_solta_abert: /abert/i,
};
const LE = /^\| PEN-\d+ \|/;
const linhas = fs.readFileSync(RAIZ + 'docs/roadmap-master.md', 'utf8').split('\n');
const celulas = [];
for (const linha of linhas.filter((x) => LE.test(x))) {
  const c = linha.split(ESC).join('@@').split('|');
  if (c.length !== 7) continue;
  celulas.push({ id: c[1].trim(), pri: c[4].trim(), e: c[5].trim().replace(/\s+/g, ' ') });
}
console.log('celulas_de_cinco_celulas=' + celulas.length);

const legendaStatus = linhas.find((l) => /^Legenda de status:/.test(l)) || '';
const legendaPrior = linhas.find((l) => /^Legenda de prioridade:/.test(l)) || '';
const codigos = [...legendaStatus.matchAll(/\*\*([A-Z]{2,4})\*\*\s*=/g)].map((m) => m[1]);
const priCodigos = [...legendaPrior.matchAll(/\*\*([A-Z])\*\*\s+[^\s·]/g)].map((m) => m[1]);
console.log('legenda_status=' + JSON.stringify(codigos) + ' legenda_prioridade=' + JSON.stringify(priCodigos));

// Abreviaturas: a mesma forma que o instrumento — codigo seguido de `por`, travessao ou `=`, com os asteriscos
// do negrito aceites no meio. Separa as que estao no inicio das que estao dentro do texto.
const reAbb = new RegExp('\\b(?:' + codigos.filter((c) => c !== 'IF').join('|') + ')\\b(?:\\*\\*)?\\s*(?:por|—|=|-)', 'g');
let abbOcc = 0, abbInicio = 0, abbDentro = 0; const abbPorCodigo = {}, abbDentroCtx = [];
for (const c of celulas) {
  let m; reAbb.lastIndex = 0;
  while ((m = reAbb.exec(c.e)) !== null) {
    abbOcc++; const cod = m[0].match(/[A-Z]{2,4}/)[0]; abbPorCodigo[cod] = (abbPorCodigo[cod] || 0) + 1;
    if (m.index <= 2) abbInicio++; else { abbDentro++; abbDentroCtx.push(c.id + ' @' + m.index + ' ## ' + c.e.slice(Math.max(0, m.index - 50), m.index + 50)); }
  }
}
console.log('abreviatura_da_legenda: ocorrencias=' + abbOcc + ' no_inicio=' + abbInicio + ' dentro=' + abbDentro + ' por_codigo=' + JSON.stringify(abbPorCodigo));
for (const x of abbDentroCtx) console.log('   dentro: ' + x);
const reIF = /\bIF\b(?:\*\*)?\s*(?:por|—|=|-)/g;
let ifOcc = 0; for (const c of celulas) { reIF.lastIndex = 0; if (reIF.test(c.e)) ifOcc++; }
console.log('abreviatura_IF_no_corpus_linhas=' + ifOcc + ' (por isso so dispara em fixture)');

// Palavras de estado.
let iniLinhas = 0; const iniIds = [];
for (const c of celulas) if (P.estado_no_inicio.test(c.e)) { iniLinhas++; iniIds.push(c.id.replace('PEN-', '')); }
console.log('estado_no_inicio: linhas=' + iniLinhas + ' ids=' + iniIds.join(','));
let dataOcc = 0, dataInicio = 0, dataDentro = 0; const dataDentroCtx = [];
for (const c of celulas) {
  const g = new RegExp(P.estado_com_data.source, 'g'); let m;
  while ((m = g.exec(c.e)) !== null) {
    dataOcc++; if (m.index <= 2) dataInicio++; else dataDentroCtx.push(c.id + ' @' + m.index + ' ## ' + c.e.slice(Math.max(0, m.index - 60), m.index + 60));
  }
}
dataDentro = dataDentroCtx.length;
console.log('estado_com_data: ocorrencias=' + dataOcc + ' no_inicio=' + dataInicio + ' dentro=' + dataDentro);
for (const x of dataDentroCtx) console.log('   dentro: ' + x);

// O ruido que a ancora e a data colada deixam de fora: ocorrencias de «abert» que nenhuma familia apanha.
const apanha = (e) => Object.keys(P).filter((k) => k !== 'palavra_solta_abert' && new RegExp(P[k].source, P[k].flags.includes('g') ? P[k].flags : P[k].flags + 'g').test(e));
const ruidos = [];
for (const c of celulas) {
  const g = /abert/gi; let m;
  while ((m = g.exec(c.e)) !== null) {
    const recorte = c.e.slice(Math.max(0, m.index - 40), m.index + 40);
    if (!P.estado_no_inicio.test(c.e) && !new RegExp(P.estado_com_data.source, 'g').test(recorte)) ruidos.push(c.id + ' @' + m.index + ' ## ' + recorte);
    if (m.index === g.lastIndex) g.lastIndex++;
  }
}
console.log('palavra_solta_abert_nao_apanhada_por_familia_de_estado: ocorrencias=' + ruidos.length);
for (const x of ruidos.slice(0, 40)) console.log('   ' + x);

// Contagens das outras familias, para a frase do instrumento se poder conferir nesta saida.
for (const k of ['fecho_datado', 'continua_estado', 'nao_se_fecha', 'por_provar']) {
  const ids = celulas.filter((c) => P[k].test(c.e)).map((c) => c.id.replace('PEN-', ''));
  console.log(k + ': linhas=' + ids.length + ' ids=' + ids.join(','));
}
const priFora = {};
for (const c of celulas) if (!priCodigos.includes(c.pri)) priFora[c.pri] = (priFora[c.pri] || 0) + 1;
console.log('prioridades_fora_da_legenda=' + JSON.stringify(priFora));
const celulasSemNenhumaFamilia = celulas.filter((c) => apanha(c.e).length === 0).map((c) => c.id + ' [' + c.e.slice(0, 60) + ']');
console.log('celulas_sem_declaracao_medida=' + celulasSemNenhumaFamilia.length);
for (const x of celulasSemNenhumaFamilia) console.log('   ' + x);
