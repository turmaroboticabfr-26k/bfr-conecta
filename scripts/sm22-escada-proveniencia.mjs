#!/usr/bin/env node
// SM-22 (peca 12, SOMENTE LEITURA): escada de proveniencia para PEN-32 e PEN-33.
// A peca 10 mostrou que os dois marcadores de texto corrido NAO discriminam: `setRole` ja citava
// `education_supervisor` na v119, anterior a correcao, pelo que «a palavra la esta» nao prova que
// a v120 tenha feito nada. A questao certa e outra: em que geracao o papel passa de palavra solta
// a CHAVE do mapa (e, no PEN-33, a par de rotulo proprio em `accountLabels`)? Para isso ha de se
// extrair o corpo com o MESCO extractor da peca 2 — contagem de chavetas a partir do fim dos
// parametros — e percorrer as geracoes na ordem em que foram publicadas.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-escada-proveniencia-32-33-18-11.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);
const md5 = (b) => createHash('md5').update(b).digest('hex');

// extractor identico ao da peca 2 (a regra do produtor, nao uma aproximacao): salta a lista de
// parametros por parentesis e so depois conta chavetas para o corpo.
function corpoFuncao(anchor, alvo) {
  const i = alvo.indexOf(anchor);
  if (i < 0) return null;
  const abreParams = alvo.indexOf('(', i);
  let n = 0, k = abreParams;
  for (; k < alvo.length; k++) {
    if (alvo[k] === '(') n++;
    else if (alvo[k] === ')') { n--; if (n === 0) break; }
  }
  const abre = alvo.indexOf('{', k);
  if (abre < 0) return null;
  let m = 0;
  for (let j = abre; j < alvo.length; j++) {
    if (alvo[j] === '{') m++;
    else if (alvo[j] === '}') { m--; if (m === 0) return alvo.slice(abre, j + 1); }
  }
  return null;
}
const PAPEIS = /['"](developer|administrator|principal|secretary|coordenation|coordinator|teacher|student|parent|guardian|inspector|education_supervisor|sports_operator|psychology|social_work|monitor|support|municipal[a-z_]*)['"]/g;
const chaves = (corpo) => [...new Set((corpo || '').match(PAPEIS) || [])].map((s) => s.replace(/['"]/g, ''));

const GERACOES = [
  ['v114-supervisao', 'bfr-candidata-v114-supervisao/index.html'],
  ['v119-anterior-a-correcao', 'bfr-candidata-v119-supervisao-embed/index.html'],
  ['v120-setrole-supervisor', 'bfr-candidata-v120-setrole-supervisor/index.html'],
  ['v121-rotulos-supervisor', 'bfr-candidata-v121-rotulos-supervisor/index.html'],
  ['v133-municipal', 'bfr-candidata-v133-secretaria-municipal/index.html'],
  ['v134-sidebar', 'bfr-candidata-v134-sidebar-escondida/index.html'],
];
const degraus = GERACOES.map(([nome, rel]) => {
  const p = join(REPO, rel);
  if (!existsSync(p)) return { geracao: nome, ficheiro: rel, existe: false };
  const t = readFileSync(p, 'utf8');
  const sr = corpoFuncao('function setRole(', t) || corpoFuncao('setRole(', t);
  // `accountLabels` nao e uma funcao: e um literal de objecto. Extrai-se pela ancora da declaracao
  // e pela mesma contagem de chavetas, a partir do PRIMEIRO `{` depois do `=`.
  const ai = t.search(/accountLabels\s*=\s*\{/);
  let al = null;
  if (ai >= 0) {
    const abre = t.indexOf('{', ai);
    let m = 0;
    for (let j = abre; j < t.length; j++) {
      if (t[j] === '{') m++;
      else if (t[j] === '}') { m--; if (m === 0) { al = t.slice(abre, j + 1); break; } }
    }
  }
  const paresAL = al ? [...al.matchAll(/['"]([a-z][a-z_]{3,26})['"]\s*:\s*\[\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g)].map((x) => x[1]) : [];
  const edSupAL = (al || '').includes('education_supervisor');
  const rotuloAL = edSupAL ? ((al.match(/education_supervisor['"]\s*:\s*\[\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/) || []).slice(1).join(' | ') || null) : null;
  // o `||` de recurso que a peca 10 marcou como DEFEITO: conta-se por geracao para se ver se ele
  // e de facto o defeito do PEN-33 ou apenas um fallback legitimo de outra chave (se o numero nao
  // mudar entre o «antes» e o «depois», nao e marcador de nada).
  const fallback = (t.match(/accountLabels\[[^\]]*\]\s*\|\|\s*accountLabels\.parent/g) || []).length;
  return { geracao: nome, ficheiro: rel, existe: true, bytes: Buffer.byteLength(t), md5: md5(Buffer.from(t)),
    setRole_ancora: !!sr, setRole_corpo_bytes: sr ? Buffer.byteLength(sr) : 0,
    setRole_papeis: chaves(sr), setRole_tem_education_supervisor: chaves(sr).includes('education_supervisor'),
    accountLabels_ancora: ai >= 0, accountLabels_pares: paresAL.length,
    accountLabels_tem_education_supervisor: edSupAL, accountLabels_rotulo: rotuloAL,
    fallback_parent_contado: fallback };
});
const ausentes = degraus.filter((d) => !d.existe).map((d) => d.geracao);
if (ausentes.length) throw new Error(`ABORTA: geracoes sem index.html [${ausentes.join(', ')}] — a escada ficaria com um degrau inventado`);

const out = {
  em: new Date().toISOString(),
  metodo: 'leitura local das geracoes com o extractor de corpo da peca 2; zero rede; zero escrita',
  pergunta: 'em que geracao education_supervisor pasa de palavra solta a chave de setRole e a par de accountLabels',
  degraus,
  leitura: {
    primeira_com_setRole_chave: (degraus.find((d) => d.setRole_tem_education_supervisor) || {}).geracao || 'nenhuma',
    primeira_com_accountLabels_par: (degraus.find((d) => d.accountLabels_tem_education_supervisor) || {}).geracao || 'nenhuma',
    a_v119_ja_tinha_a_palavra_em_setRole: (degraus.find((d) => d.geracao === 'v119-anterior-a-correcao') || {}).setRole_tem_education_supervisor,
    discriminam_as_duas_anotacoes: (() => {
      const v119 = degraus.find((d) => d.geracao === 'v119-anterior-a-correcao');
      const v121 = degraus.find((d) => d.geracao === 'v121-rotulos-supervisor');
      return !!(v119 && v121) && (v119.accountLabels_tem_education_supervisor !== v121.accountLabels_tem_education_supervisor);
    })(),
  },
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const d of degraus) console.log(`  ${d.geracao}: md5=${(d.md5 || '-').slice(0, 8)} setRole=${d.setRole_corpo_bytes}B papeis=${d.setRole_papeis.length} edSup_na_chave=${d.setRole_tem_education_supervisor} accountLabels_pares=${d.accountLabels_pares} edSup_no_mapa=${d.accountLabels_tem_education_supervisor} rotulo=${d.accountLabels_rotulo || '-'}`);
console.log(`\nleitura: ${JSON.stringify(out.leitura)}`);
console.log(`SM22_ESCADA_OK · registo evidence/sm22-escada-proveniencia-32-33-18-11.json`);
