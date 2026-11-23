// p135-sonda-adendos-de-fecho — sonda que mede, no ledger, a forma «adendo com a data ANTES da palavra de fecho».
// So-leitura: nao escreve ficheiro, imprime e sai. Nao dactilografa a janela nem as palavras: le as duas do
// instrumento (p133) e imprime o que leu, para que um leitor confira que esta saida usa a predica de hoje e nao
// uma copia envelhecida. Saida versionada em evidence/p135-sonda-adendos-de-fecho-22-11.txt.
const fs = require('node:fs');
const RAIZ = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/';
const INSTRUMENTO = RAIZ + 'scripts/p133-inventario-das-pendencias-abertas.mjs';
const ESC = String.fromCharCode(92) + '|';
const LE = /^\| PEN-\d+ \|/;

const fonte = fs.readFileSync(INSTRUMENTO, 'utf8');
const mJanela = /const JANELA_FECHO = (\d+);/.exec(fonte);
const mPalavras = /const PALAVRAS_DE_FECHO = '([^']+)';/.exec(fonte);
if (!mJanela) throw new Error('ABORTA: nao li JANELA_FECHO no instrumento - a sonda nao pode adivinha-lo');
if (!mPalavras) throw new Error('ABORTA: nao li PALAVRAS_DE_FECHO no instrumento - as palavras tem de vir da fonte');
const JANELA_FECHO = Number(mJanela[1]);
const PALAVRAS_DE_FECHO = mPalavras[1];
console.log('lido_do_instrumento: JANELA_FECHO=' + JANELA_FECHO + ' PALAVRAS_DE_FECHO=' + PALAVRAS_DE_FECHO);

const linhas = fs.readFileSync(RAIZ + 'docs/roadmap-master.md', 'utf8').split('\n');
const celulas = [];
for (const linha of linhas.filter((x) => LE.test(x))) {
  const c = linha.split(ESC).join('@@').split('|');
  if (c.length !== 7) continue;
  celulas.push({ id: c[1].trim(), pri: c[4].trim(), e: c[5].trim().replace(/\s+/g, ' ') });
}
console.log('celulas_de_cinco_celulas=' + celulas.length);

// 1) Quantos adendos ha, e quantos trazem a marca de data entre parenteses.
const reAdendo = /[Aa]dendo\b/g;
let adendos = 0; const adendosSemData = [];
const marcados = [];
for (const c of celulas) {
  let m; reAdendo.lastIndex = 0;
  while ((m = reAdendo.exec(c.e)) !== null) {
    adendos++;
    const janela = c.e.slice(m.index, m.index + 60);
    const md = /\((?:1[0-9]|2[0-9])\/1[12]\)/.exec(janela);
    if (!md) adendosSemData.push(c.id + ' @' + m.index + ' ## ' + janela);
    else marcados.push({ id: c.id, pos: m.index, fimData: m.index + md.index + md[0].length, marca: md[0] });
    if (m.index === reAdendo.lastIndex) reAdendo.lastIndex++;
  }
}
console.log('adendos_nas_linhas_pen=' + adendos + ' com_marca_de_data=' + marcados.length + ' sem_marca=' + adendosSemData.length);
for (const x of adendosSemData) console.log('   sem_marca: ' + x);

// 2) A distancia, em caracteres, do fim da marca ate a palavra de fecho mais proxima depois dela.
const rePalavra = new RegExp('\\b(?:' + PALAVRAS_DE_FECHO + ')\\b', 'g');
const gaps = []; const semPalavra = []; const comLetraNoMeio = [];
for (const a of marcados) {
  const c = celulas.find((x) => x.id === a.id);
  const resto = c.e.slice(a.fimData, a.fimData + 60);
  rePalavra.lastIndex = 0;
  const mp = rePalavra.exec(resto);
  if (!mp) { semPalavra.push(a.id + ' ' + a.marca + ' ## ' + resto.slice(0, 60)); continue; }
  const intervalo = mp.index;
  const intermediario = resto.slice(0, intervalo);
  gaps.push(intervalo);
  const linha = { id: a.id, marca: a.marca, intervalo, palavra: mp[0], intermediario };
  if (/[^ ]/.test(intermediario.replace(/[:\)\]\*\s]/g, ''))) comLetraNoMeio.push(linha);
}
const hist = {};
for (const g of gaps) hist[g] = (hist[g] || 0) + 1;
console.log('intervalo_marca_ate_palavra: ocorrencias=' + gaps.length + ' maior=' + (gaps.length ? Math.max(...gaps) : 'nenhum') + ' histograma=' + JSON.stringify(hist));
console.log('adendos_sem_palavra_de_fecho_ate_60_chars=' + semPalavra.length);
for (const x of semPalavra) console.log('   ' + x);
console.log('adendos_com_letra_entre_a_marca_e_a_palavra=' + comLetraNoMeio.length + ' (uma janela que so aceite pontuacao nao os alcanca)');
for (const x of comLetraNoMeio) console.log('   [' + x.id + ' ' + x.marca + '] intervalo=' + x.intervalo + ' intermediario=' + JSON.stringify(x.intermediario) + ' palavra=' + x.palavra);

// 2b) O mesmo intervalo medido por outra face: quantos caracteres de pura pontuacao ha entre a marca de data e a
//     primeira letra ou digito, em TODOS os adendos (tambem nos que nao fecham). E esta forma, e nao um chute, que
//     da a margem da janela inversa: a janela tem de cobrir o invólucro de markdown que a prosa usa.
const rePont = /^[^A-Za-z0-9\u00C0-\u00FF]*/;
const corrias = [];
for (const a of marcados) {
  const c = celulas.find((x) => x.id === a.id);
  const corrida = rePont.exec(c.e.slice(a.fimData, a.fimData + 60))[0];
  corrias.push({ id: a.id, marca: a.marca, chars: corrida.length, texto: corrida });
}
const histCorria = {};
for (const x of corrias) histCorria[x.chars] = (histCorria[x.chars] || 0) + 1;
console.log('corrida_de_pontuacao_apos_a_marca: ocorrencias=' + corrias.length + ' maior=' + Math.max(...corrias.map((x) => x.chars)) + ' histograma=' + JSON.stringify(histCorria));
for (const x of corrias) console.log('   [' + x.id + ' ' + x.marca + '] chars=' + x.chars + ' texto=' + JSON.stringify(x.texto));

// 3) O que a forma ancorada em «adendo + data + palavra» reclamaria, e se ela ja esta noutro sitio.
const reForma = new RegExp('[Aa]dendo\\b[^|\\n]{0,24}?\\((?:1[0-9]|2[0-9])\\/1[12]\\)[^A-Za-z0-9\\u00C0-\\u00FF]{0,' + JANELA_FECHO + '}(?:' + PALAVRAS_DE_FECHO + ')\\b', 'g');
const reclamados = [];
for (const c of celulas) {
  let m; reForma.lastIndex = 0;
  while ((m = reForma.exec(c.e)) !== null) {
    const jaFechoDatado = new RegExp('\\b(?:' + PALAVRAS_DE_FECHO + ')\\b[^.]{0,' + JANELA_FECHO + '}(?:1[0-9]|2[0-9])\\/1[12]').test(c.e);
    reclamados.push(c.id + ' @' + m.index + ' ja_tem_fecho_datado_adiante=' + jaFechoDatado + ' ## ' + m[0]);
  }
}
console.log('celulas_onde_a_forma_ancorada_dispara=' + reclamados.length);
for (const x of reclamados) console.log('   ' + x);

// 4) A mesma forma com palavra de ABERTURA: mostra que a familia nova nao reclama o que nao e fecho.
const reAbre = /[Aa]dendo\b[^|\n]{0,24}?\((?:1[0-9]|2[0-9])\/1[12]\)[^A-Za-z0-9\u00C0-\u00FF]{0,8}(?:Abert[oa]|CRIAD[OA]|PENDENTE)/g;
const abertos = [];
for (const c of celulas) { let m; reAbre.lastIndex = 0; while ((m = reAbre.exec(c.e)) !== null) { abertos.push(c.id + ' ## ' + m[0]); if (m.index === reAbre.lastIndex) reAbre.lastIndex++; } }
console.log('forma_ancorada_com_palavra_de_abertura=' + abertos.length);
for (const x of abertos) console.log('   ' + x);
