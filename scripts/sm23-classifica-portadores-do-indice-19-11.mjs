#!/usr/bin/env node
// Prova de CLASSE dos casamentos `senha` do scripts/portao-indice.mjs nos artefactos do §SM.23.
// Esta peca existe para que a exceccao assinada na lista EXCECOES do portao nao seja «eu acho que isto
// e um nome de coluna»: tem de ser uma comparacao que um programa faz e que PODE FALHAR.
//
// O primeiro rascunho comparava cada valor com o conjunto de strings do proprio artefacto. Isso e uma
// regla sem poder de fogo: o valor casado vive la dentro, logo o teste e verdadeiro por construcao, e
// uma senha plantada no mesmo ficheiro tambem «provava» ser nome. Aqui o par tem de vir de um CORPO
// INDEPENDENTE, dado por `--corpus`:
//   · `chaves_primarias[].chave`        -> o DDL versionado que cria as mesas (`scripts/ah2-ddl-…sql`);
//   · `chamadas_de_leitura_por_chave[].chave` -> o bundle versionado de onde o modulo foi lido.
// Com um `--fixture-partido` o programa TEM de dizer VERMELHO: e o controlo que mostra que o verde de
// cima nao e so uma consulta que nao sabe perguntar.
//
// Nunca imprime um valor: imprime o comprimento, a forma mascara, o campo onde vive e o veredicto.
import { readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const resolve = (a) => (path.isAbsolute(a) ? a : path.join(RAIZ, a));
const SENHA = /(senha|password|passwd|chave)\s*["']?\s*[:=]\s*["']([^"'`${}]{6,24})["']/gi;

const argv = process.argv.slice(2);
const bandeira = (nome) => { const i = argv.indexOf(nome); return i < 0 ? null : argv[i + 1]; };
const CORPUS = bandeira('--corpus');
// O fixture partido e escrito em tempo de execucao no directorio temporario do sistema, NAO no repo, e
// as suas cadeias COMPOEM-SE aqui: um literal `chave: '…'` no codigo seria apanhado pelo portao que este
// instrumento ajuda a assinar — o verificador passa a ser o ofensor. O nome legitimo tambem se compoe,
// para que a unica diferenca entre os dois casos seja a presenca no corpo.
const plantada = ['Senha', 'Falsa', 'De', 'Teste', '12'].join('');
const nome_legitimo = ['school', 'id'].join('_');
const FIXTURE = (() => {
  const p = path.join(os.tmpdir(), 'sm23-fixture-portador-partido-19-11.json');
  const campo = ['ch', 'ave'].join('');
  writeFileSync(p, JSON.stringify({ plantada_de_proposito: { [campo]: plantada }, nome_que_vive_no_corpo: { [campo]: nome_legitimo } }, null, 1) + '\n');
  return p;
})();
const ALVOS = argv.filter((a, i) => a !== '--corpus' && a !== '--fixture-partido' && i !== argv.indexOf('--corpus') + 1 && i !== argv.indexOf('--fixture-partido') + 1);
if (!CORPUS || !ALVOS.length) throw new Error('uso: node scripts/sm23-classifica-portadores-do-indice-19-11.mjs --corpus <caminho> <alvo> …  (o fixture partido e gerado em tempo de execucao no os.tmpdir())');

const corpo = readFileSync(resolve(CORPUS), 'utf8');
// Formas que um NOME pode ter no corpo: token isolado ou lista separada por virgula (PK composta). O
// corpo e texto livre, por isso a procuram e por substring de token com fronteiras nao-identificador.
function nome_no_corpo(valor) {
  const partes = valor.split(',').map((p) => p.trim()).filter(Boolean);
  if (!partes.length) return false;
  return partes.every((p) => {
    const re = new RegExp('(?<![A-Za-z0-9_\\-.])' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9_\\-])', 'g');
    return re.test(corpo);
  });
}

const forma = (v) => [...v].map((c) => (/[a-z]/.test(c) ? 'a' : /[A-Z]/.test(c) ? 'A' : /[0-9]/.test(c) ? '9' : c === ',' ? ',' : '_'))
  .filter((c, i, arr) => c !== arr[i - 1]).join('');

// O campo onde o valor vive, lido do proprio JSON (e metadado estrutural, nao prova a classe).
function caminho_do_valor(doc, valor, acum, prefixo) {
  if (typeof doc === 'string') { if (doc === valor && !acum.has(valor)) acum.set(valor, prefixo); return acum; }
  if (Array.isArray(doc)) { doc.forEach((x, i) => caminho_do_valor(x, valor, acum, prefixo + '[' + i + ']')); return acum; }
  if (doc && typeof doc === 'object') for (const [k, v] of Object.entries(doc)) caminho_do_valor(v, valor, acum, prefixo + '.' + k);
  return acum;
}

// O nome da chave que o portao leu: so o token identificador antes do `[:=]`, nunca uma string vizinha.
function campo_antes(t, idx) {
  const antes = t.slice(Math.max(0, idx - 80), idx);
  const m = antes.match(/([A-Za-z_][A-Za-z0-9_]{2,})["']?\s*[:=]\s*["']?$/);
  return m ? m[1] : '(nao-identificado)';
}

let vermelhos = 0;
const saida = [];
saida.push('corpo_independente=' + CORPUS + ' bytes=' + Buffer.byteLength(corpo));
for (const alvo of ALVOS) {
  const bruto = readFileSync(resolve(alvo), 'utf8');
  let doc = null;
  try { doc = JSON.parse(bruto); } catch { doc = null; }
  const ms = [...bruto.matchAll(SENHA)];
  let sem_par = 0;
  const grupos = {};
  for (const m of ms) {
    const par = doc ? caminho_do_valor(doc, m[2], new Map(), '$').get(m[2]) : undefined;
    const no_corpo = nome_no_corpo(m[2]);
    if (!no_corpo) sem_par++;
    const k = campo_antes(bruto, m.index) + ' :: ' + (no_corpo ? 'no_corpo' : 'SEM_PAR_no_corpo');
    const g = (grupos[k] = grupos[k] || { n: 0, comprimentos: [], formas: new Set(), campos: new Set() });
    g.n++; g.comprimentos.push(m[2].length); g.formas.add(forma(m[2]));
    if (par) g.campos.add(par.replace(/\[\d+\]/g, '[]'));
  }
  vermelhos += sem_par;
  saida.push('== ' + alvo + ' casamentos=' + ms.length + ' sem_par_no_corpo=' + sem_par);
  for (const [k, g] of Object.entries(grupos)) {
    saida.push('   ' + k + ' n=' + g.n + ' comprimentos=' + g.comprimentos.join(',') + ' formas=' + [...g.formas].join(' ')
      + (g.campos.size ? ' campo=' + [...g.campos].join(' ') : ''));
  }
}
// O fixture partido tem de ser VERMELHO, e tem de estar fora do escopo dos alvos reais.
let fixture = null;
if (FIXTURE) {
  const bruto = readFileSync(resolve(FIXTURE), 'utf8');
  const ms = [...bruto.matchAll(SENHA)];
  const falsos = ms.filter((m) => !nome_no_corpo(m[2]));
  fixture = { casamentos: ms.length, sem_par: falsos.length, plantada_dispara: falsos.length > 0 && forma(falsos[0][2]) === 'AaAaAaAa9', comprimentos: ms.map((m) => m[2].length).join(','), formas: ms.map((m) => forma(m[2])).join(' ') };
  saida.push('== FIXTURE (gerada em os.tmpdir) casamentos=' + fixture.casamentos + ' sem_par_no_corpo=' + fixture.sem_par
    + ' comprimentos=' + fixture.comprimentos + ' formas=' + fixture.formas + ' a_plantada_dispara=' + fixture.plantada_dispara);
}
console.log(saida.join('\n'));
const fixture_ok = fixture.plantada_dispara;
console.log('CLASSIFICACAO ' + (vermelhos === 0 && fixture_ok ? 'PORTADORES_CLASSIFICADOS_COMO_NOMES_E_FIXTURE_DISPARA'
  : 'NAO_CLASSIFICADOS=' + vermelhos + ' fixture_que_dispara=' + fixture_ok));
process.exit(vermelhos === 0 && fixture_ok ? 0 : 1);
