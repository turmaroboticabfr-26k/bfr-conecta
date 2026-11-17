// Varredura de escrita errada: procura glifos de famílias que não pertencem ao português da casa
// (cirílico, grego, kana, hangul, han, hebraico, árabe) nos documentos e scripts versionados.
// Só-leitura: escreve apenas o próprio diário e recusa-se a sobrescrever evidência existente.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const RAIZ = path.resolve(import.meta.dirname, '..');
const OUT = path.join(RAIZ, 'evidence/ah1-varre-escritas-17-11.json');
if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro nome');

// A primeira régua foi por codepoint (`cp >= 0x0400`, com lista de permitidos) e deu 562 ofensores no
// roadmap: contava `─` de diagramas, `−`, aspas curvas e emoji que a casa usa de propósito. Uma régua
// com centenas de falsos positivos é pior que nenhuma, porque passa a ser desligada à mão. Famílias
// nomeadas, uma faixa por família, é o que sobra.
const FAMILIAS = [
  ['cirilico', [[0x0400, 0x04FF], [0x0500, 0x052F]]],
  ['grego', [[0x0370, 0x03FF], [0x1F00, 0x1FFF]]],
  ['kana', [[0x3040, 0x30FF]]],
  ['hangul', [[0x1100, 0x11FF], [0xAC00, 0xD7AF]]],
  ['han', [[0x3400, 0x4DBF], [0x4E00, 0x9FFF]]],
  ['hebraico', [[0x0590, 0x05FF]]],
  ['arabe', [[0x0600, 0x06FF]]]
];
// Permitidos **declarados**, com o motivo escrito: Δ e Σ são notação de soma que a casa usa em tabelas
// de portões. Um permitido não declarado é o mesmo que alargar um portão às escondidas.
const PERMITIDOS = { grego: { 0x0394: 'DELTA de soma em tabela de portões', 0x03A3: 'SIGMA de total em tabela de portões' } };

const git = (args) => {
  try { return execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' }); } catch { return ''; }
};
const alvos = git(['ls-files', 'docs', 'scripts']).split('\n').filter(Boolean)
  .filter((f) => /\.(md|html|json|mjs|js|sql|sh|txt)$/.test(f));

const por_familia = Object.fromEntries(FAMILIAS.map(([n]) => [n, 0]));
const permitidos_contados = {};
const ofensores = [];
for (const f of alvos) {
  let t;
  try { t = fs.readFileSync(path.join(RAIZ, f), 'utf8'); } catch { continue; }
  t.split(/\r?\n/).forEach((l, i) => {
    for (const ch of l) {
      const cp = ch.codePointAt(0);
      const fam = FAMILIAS.find(([, faixas]) => faixas.some(([a, b]) => cp >= a && cp <= b));
      if (!fam) continue;
      por_familia[fam[0]]++;
      if (PERMITIDOS[fam[0]] && PERMITIDOS[fam[0]][cp]) {
        permitidos_contados[fam[0]] = (permitidos_contados[fam[0]] || 0) + 1;
        continue;
      }
      ofensores.push({ arquivo: f, linha: i + 1, codepoint: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'), caractere: ch, contexto: l.slice(0, 160) });
    }
  });
}
const veredito = {
  arquivos_varridos: alvos.length,
  por_familia,
  permitidos_declarados: Object.keys(PERMITIDOS).reduce((m, k) => { m[k] = Object.entries(PERMITIDOS[k]).map(([cp, motivo]) => `U+${Number(cp).toString(16).toUpperCase()} (${motivo})`); return m; }, {}),
  permitidos_batidos: permitidos_contados,
  ofensores: ofensores.length,
  estado: ofensores.length === 0 ? 'ESCRITAS_OK' : 'ESCRITA_ERRADA_PRESENTE'
};
const diario = {
  programa: 'scripts/ah1-varre-escritas.mjs',
  em: new Date().toISOString(),
  o_que_prova: `nenhum dos ${alvos.length} caminhos versionados em docs/ e scripts/ contém glifo das sete famílias varridas fora da lista de permitidos declarados; a contagem por família fica no diário, inclusive quando é zero — uma família com conjunto vazio imprime-se com o zero, suprimi-la transformaria «não sei» em «não existe»`,
  o_que_NAO_prova: 'que o texto esteja certo — a varredura só sabe de **escrita**, não de conteúdo. Não varre o índice do git (`git show :caminho`), varre a árvore de trabalho: um ficheiro modificado e ainda não gravado não é medido. Há famílias fora desta lista (arménio, copta, tailandês, devanágari) que continuariam invisíveis.',
  escopo: 'git ls-files docs scripts, filtrado por extensão de texto',
  familias: FAMILIAS.map(([n, faixas]) => ({ familia: n, faixas: faixas.map(([a, b]) => `U+${a.toString(16).toUpperCase()}–U+${b.toString(16).toUpperCase()}`) })),
  veredito,
  ofensores: ofensores.slice(0, 40)
};
fs.writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
console.log(JSON.stringify(veredito));
for (const o of ofensores.slice(0, 20)) console.log('OFENSOR', o.arquivo + ':' + o.linha, o.codepoint, JSON.stringify(o.caractere));
process.exit(veredito.estado === 'ESCRITAS_OK' ? 0 : 1);
