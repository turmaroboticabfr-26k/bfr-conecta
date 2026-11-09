// Controlo negativo dos dois portoes de memoria (09/11). Tres coisas têm de ser provadas, nao
// afirmadas: (1) uma senha do corpus semeada num registo fora do repo faz o portao RECUSAR;
// (2) sem registos o portao falha ALTA (INSTRUMENTO CEGO), nao passa em branco; (3) ao vivo passa.
// Cada caso exige o MOTIVO no texto, nao so o codigo de saida: na primeira passada deste controlo
// o portao devolveu exit 1 por «nenhum ficheiro para verificar» em dois casos que nem exercitavam
// a camada D, e o veredito disse OK. Exit code so prova que alguem recusou, nao pelo que recusou.
// A colheita do corpus é copia literal do padrao do seg-fin-mem-varredura.mjs; para essa copia nao
// divergir em silencio, o veredito compara o tamanho do corpus local com o que o portao imprime.
// Nunca imprime um valor: so md5 de 12 hex, comprimento e contagens. Os artefactos semeados vivem
// em os.tmpdir() (fora do repo) e sao apagados no fim, com a ausencia provada.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '').replace(/\/$/, '');
const RX = /password\s*[:=]\s*["']([^"'\n]{4,})["']/gi;
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 12);

const corpus = new Set();
const walk = (dir, depth) => {
  if (depth < 0 || !fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, depth - 1);
    else if (/\.(mjs|js|sql|md|json)$/.test(e.name))
      for (const m of fs.readFileSync(p, 'latin1').matchAll(RX)) if (!m[1].includes('${')) corpus.add(m[1]);
  }
};
walk(REPO, 3);
if (!corpus.size) { console.log('INSTRUMENTO CEGO: zero senhas colhidas do disco — nada a semear'); process.exit(1); }
const senha = [...corpus][0];
console.log(`corpus colhido: ${corpus.size} | semeamos a de md5=${md5(senha)} len=${senha.length}`);

const SEED = path.join(os.tmpdir(), 'seed-camada-d');
const VAZIO = path.join(os.tmpdir(), 'vazio-camada-d');
const FALTA = path.join(os.tmpdir(), 'nao-existe-camada-d-9k');
for (const d of [SEED, VAZIO]) {
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
}
fs.writeFileSync(
  path.join(SEED, 'prova-camada-d.md'),
  `---\nname: prova\ndescription: registo semeado para o controlo negativo\nmetadata:\n  type: project\n---\n\n- **Senha**: \`${senha}\`\n`
);
fs.writeFileSync(path.join(VAZIO, 'MEMORY.md'), '# indice sem topic files\n');

// Ficheiro limpo explicito em vez de --staged: com a area de staging vazia os dois portoes devolvem
// INSTRUMENTO CEGO por motivo alheio ao que se quer medir.
const ALVO = 'docs/remedicao-seguranca-P1-P3.md';
const GATE = 'scripts/seg-precommit-gate.mjs';
const IDX = 'scripts/seg-fin-mem-indice.mjs';

const roda = (args) => {
  console.log(`\n$ node ${args.join(' ')}`);
  let out = '', code = 0;
  try {
    out = execFileSync('node', args, { cwd: REPO, encoding: 'utf8' });
  } catch (e) {
    out = String(e.stdout || '') + String(e.stderr || '');
    code = e.status ?? 1;
  }
  console.log(out.trimEnd());
  console.log(`EXIT=${code}`);
  return { code, out };
};

const r = [];
const caso = (label, args, codeEsperado, motivo) => {
  const { code, out } = roda(args);
  r.push({ label, code, codeEsperado, achou: out.includes(motivo), motivo });
  return out;
};

caso('D semeada deve recusar pelo segredo', [GATE, ALVO, `--mem-dir=${SEED}`], 1, 'PORTAO DE MEMORIA FALHA');
caso('D sem directorio deve falhar alta', [GATE, ALVO, `--mem-dir=${FALTA}`], 1, 'INSTRUMENTO CEGO: nao ha registos');
caso('indice sem directorio deve falhar alto', [IDX, `--mem-dir=${FALTA}`], 1, 'INSTRUMENTO CEGO');
caso('indice sem topic files deve falhar alto', [IDX, `--mem-dir=${VAZIO}`], 1, 'INSTRUMENTO CEGO');
const vivo = caso('D ao vivo deve passar', [GATE, ALVO], 0, 'PORTAO DE MEMORIA OK');

fs.rmSync(SEED, { recursive: true, force: true });
fs.rmSync(VAZIO, { recursive: true, force: true });
console.log('\n### limpeza');
let limpo = true;
for (const d of [SEED, VAZIO]) {
  const ainda = fs.existsSync(d);
  if (ainda) limpo = false;
  console.log(`${path.basename(d)} existe ainda? ${ainda ? 'SIM' : 'nao'}`);
}

const colhidoPeloPortao = Number((vivo.match(/corpus de senhas do disco: (\d+)/) || [])[1] ?? -1);
const mesmaColheita = colhidoPeloPortao === corpus.size;

console.log('\n### verdicto');
let ok = limpo && mesmaColheita;
for (const c of r) {
  const passa = c.code === c.codeEsperado && c.achou;
  if (!passa) ok = false;
  console.log(
    `${passa ? 'OK ' : 'FALHOU'} ${c.label}: exit ${c.code} (esperado ${c.codeEsperado}), motivo "${c.motivo}" ${c.achou ? 'presente' : 'AUSENTE'}`
  );
}
console.log(`${mesmaColheita ? 'OK ' : 'FALHOU'} colheita identica nos dois instrumentos: local ${corpus.size} x portao ${colhidoPeloPortao}`);
console.log(ok
  ? 'CONTROLO NEGATIVO OK — recusa pelo segredo, falha alta sem registos, passa ao vivo, artefactos apagados'
  : 'CONTROLO NEGATIVO FALHA');
process.exit(ok ? 0 : 1);
